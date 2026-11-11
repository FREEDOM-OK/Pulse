/**
 * 课表数据访问层。
 *
 * 表结构由主库迁移（schema v7）建立；这里只做「同一驱动 + 默认数据播种」，
 * 不再单独 openDatabaseAsync，避免在 Web(sql.js) 与原生上分裂成两个库。
 */
import { getDriver } from '@/db/connection';
import type { SqlDriver } from '@/db/driver';
import {
  DEFAULT_PERIOD_TIMES,
  PeriodTime,
  createLocalId,
  getFirstMondayOfCurrentMonth,
} from '@/lib/timetable-core';

export interface ScheduleEntity {
  id: string;
  name: string;
  startDate: string;
  totalWeeks: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomTimeConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface SessionEntity {
  id: string;
  courseId: string;
  teacher: string;
  location: string;
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
  weeks: number[];
  remark?: string;
  customTime?: CustomTimeConfig;
}

export interface CourseEntity {
  id: string;
  scheduleId: string;
  name: string;
  color: string;
  credits?: string;
  createdAt: string;
  updatedAt: string;
  sessions: SessionEntity[];
}

export interface TimetableSettings {
  activeScheduleId: string;
  periodTimes: PeriodTime[];
  periodDuration: number;
  defaultSpan: number;
  lunchAfter: number;
  saturation: number;
}

/** 课表设置键（节次时间复用主库的 `period.times`，其余用 `timetable.*`）。 */
export const TIMETABLE_KEY_PREFIX = 'timetable.';
export const PERIOD_TIMES_KEY = 'period.times';

let seeded = false;
/**
 * 播种是单源的：首页、课表页、今日计划都会在启动阶段同时调用 getDb()，
 * 如果不合并成同一个 Promise，两次并发播种会同时通过「没有 period.times」的检查，
 * 第二次 `INSERT INTO settings` 就会抛 `UNIQUE constraint failed: settings.key`（整页红屏）。
 */
let seedPromise: Promise<void> | null = null;

/** 返回主库驱动；首次调用时确保有默认课表与默认设置。 */
export async function getDb(): Promise<SqlDriver> {
  const driver = getDriver();
  if (!seeded) {
    if (!seedPromise) {
      seedPromise = ensureTimetableSeed(driver).finally(() => {
        seedPromise = null;
      });
    }
    await seedPromise;
  }
  return driver;
}

/** 测试用：重置「已播种」标记。 */
export function resetTimetableSeedFlagForTests(): void {
  seeded = false;
  seedPromise = null;
}

/** 幂等播种：至少一张「我的课表」+ 外观四项默认值。 */
export async function ensureTimetableSeed(driver: SqlDriver = getDriver()): Promise<void> {
  const existing = await driver.getFirstAsync<{ id: string }>(
    'SELECT id FROM schedules ORDER BY created_at ASC LIMIT 1;'
  );

  let firstScheduleId = existing?.id;
  if (!firstScheduleId) {
    firstScheduleId = createLocalId('sched');
    const now = new Date().toISOString();
    const startDate = getFirstMondayOfCurrentMonth(new Date());
    await driver.runAsync(
      'INSERT INTO schedules (id, name, start_date, total_weeks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
      [firstScheduleId, '我的课表', startDate, 20, now, now]
    );
  }

  const defaults: [string, string][] = [
    ['timetable.activeScheduleId', firstScheduleId],
    ['timetable.periodDuration', '45'],
    ['timetable.defaultSpan', '2'],
    ['timetable.lunchAfter', '4'],
    ['timetable.saturation', '0.8'],
  ];
  for (const [key, value] of defaults) {
    await driver.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);', [
      key,
      value,
    ]);
  }

  // 节次时间：主库里可能已有用户改过的 period.times，只有缺失时才写默认值。
  // 用 INSERT OR IGNORE 兜住并发：即使两个调用同时判断为「缺失」，后到的也不会抛唯一约束错误。
  const times = await driver.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?;',
    [PERIOD_TIMES_KEY]
  );
  if (!times) {
    await driver.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);', [
      PERIOD_TIMES_KEY,
      JSON.stringify(DEFAULT_PERIOD_TIMES),
    ]);
  }

  seeded = true;
}

/**
 * 事务内保存课程及其全部时段：先 upsert 课程行，再整体替换时段。
 *
 * 用 `ON CONFLICT(id) DO UPDATE` 而不是「先判断存在与否再决定 INSERT/UPDATE」：
 * 双击保存、上一个页面还没刷新完就再次提交时，两次调用都会带同一个课表 id，
 * 走 INSERT 会抛 `UNIQUE constraint failed: sched_courses.id`。upsert 让写入幂等。
 * 时段用普通 INSERT（v8 起无唯一索引），同课同日同起始节的多段不会互相覆盖。
 */
export async function saveCourseWithSessions(
  course: Omit<CourseEntity, 'createdAt' | 'updatedAt'>
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sched_courses (id, schedule_id, name, color, credits, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         schedule_id = excluded.schedule_id,
         name = excluded.name,
         color = excluded.color,
         credits = excluded.credits,
         updated_at = excluded.updated_at;`,
      [
        course.id,
        course.scheduleId,
        course.name,
        course.color,
        course.credits || '选填',
        now,
        now,
      ]
    );

    // 课程行可能已存在：先清掉旧时段，再按当前表单整体重写。
    await db.runAsync('DELETE FROM sched_sessions WHERE course_id = ?;', [course.id]);

    for (const s of course.sessions) {
      await db.runAsync(
        `INSERT INTO sched_sessions
          (id, course_id, teacher, location, day_of_week, start_period, end_period, weeks, remark, custom_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          s.id,
          course.id,
          s.teacher || '',
          s.location || '',
          s.dayOfWeek,
          s.startPeriod,
          s.endPeriod,
          JSON.stringify(s.weeks),
          s.remark || '',
          s.customTime ? JSON.stringify(s.customTime) : '',
        ]
      );
    }
  });
}

/** 事务内删除课程及其全部时段。 */
export async function deleteCourseWithSessions(courseId: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sched_sessions WHERE course_id = ?;', [courseId]);
    await db.runAsync('DELETE FROM sched_courses WHERE id = ?;', [courseId]);
  });
}