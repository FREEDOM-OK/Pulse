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
  TimeTablePreset,
  createLocalId,
  getFirstMondayOfCurrentMonth,
  isValidHhmm,
  toMinutes,
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
  /** 上课提醒总开关（`timetable.reminderEnabled`，'1' / '0'）。 */
  reminderEnabled: boolean;
  /** 每周起始日：1=周一、6=周六、7=周日（`timetable.weekStartDay`）。 */
  weekStartDay: 1 | 6 | 7;
  /** 是否显示周六列（`timetable.showSaturday`，'1' / '0'）。 */
  showSaturday: boolean;
  /** 是否显示周日列（`timetable.showSunday`，'1' / '0'）。 */
  showSunday: boolean;
  /** 课程格高度 dp，44~90（`timetable.cellHeight`）。 */
  cellHeight: number;
  /** 课程格圆角 dp，0~18（`timetable.cellRadius`）。 */
  cellRadius: number;
  /** 课表背景色（`timetable.gridBackgroundColor`）。 */
  gridBackgroundColor: string;
}

/** 课表设置键（节次时间复用主库的 `period.times`，其余用 `timetable.*`）。 */
export const TIMETABLE_KEY_PREFIX = 'timetable.';
export const PERIOD_TIMES_KEY = 'period.times';
/** 多时间表：`TimeTablePreset[]` 的 JSON。 */
export const TIME_TABLES_KEY = 'timetable.timeTables';
/** 课表 ↔ 时间表绑定：`Record<scheduleId, timeTableId>` 的 JSON。 */
export const SCHEDULE_TIMETABLE_MAP_KEY = 'timetable.scheduleTimeTableMap';
/** 首次初始化时生成的那套时间表 id。 */
export const DEFAULT_TIME_TABLE_ID = 'default';

/** 由当前 `period.times` + 单节时长造出「默认」时间表（零迁移入口）。 */
export function buildDefaultTimeTable(
  periods: PeriodTime[],
  durationMinutes: number
): TimeTablePreset {
  return {
    id: DEFAULT_TIME_TABLE_ID,
    name: '默认',
    fixedDuration: false,
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 45,
    periods: periods.map((p) => ({ start: p.start, end: p.end })),
  };
}

function sanitizePeriods(raw: unknown, fallback: PeriodTime[]): PeriodTime[] {
  if (!Array.isArray(raw)) return fallback.map((p) => ({ ...p }));
  const cleaned: PeriodTime[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const start = (item as PeriodTime).start;
    const end = (item as PeriodTime).end;
    if (typeof start !== 'string' || typeof end !== 'string') continue;
    if (!isValidHhmm(start) || !isValidHhmm(end)) continue;
    cleaned.push({ start, end });
  }
  return cleaned.length > 0 ? cleaned : fallback.map((p) => ({ ...p }));
}

/** 解析 `timetable.timeTables`；损坏 / 缺失时用当前 period.times 造一套「默认」。 */
export function parseTimeTables(
  raw: string | undefined,
  fallbackPeriods: PeriodTime[],
  fallbackDuration: number
): TimeTablePreset[] {
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [buildDefaultTimeTable(fallbackPeriods, fallbackDuration)];
  }
  const seen = new Set<string>();
  const presets: TimeTablePreset[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<TimeTablePreset>;
    const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const duration = Math.round(Number(candidate.durationMinutes));
    presets.push({
      id,
      name:
        typeof candidate.name === 'string' && candidate.name.trim()
          ? candidate.name.trim()
          : '未命名时间表',
      fixedDuration: candidate.fixedDuration === true,
      durationMinutes:
        Number.isFinite(duration) && duration >= 1 ? duration : fallbackDuration,
      periods: sanitizePeriods(candidate.periods, fallbackPeriods),
    });
  }
  return presets.length > 0
    ? presets
    : [buildDefaultTimeTable(fallbackPeriods, fallbackDuration)];
}

/** 解析课表 ↔ 时间表绑定；损坏时返回空表（调用方会补齐缺失项）。 */
export function parseScheduleTimeTableMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const map: Record<string, string> = {};
    for (const [scheduleId, timeTableId] of Object.entries(parsed)) {
      if (typeof scheduleId === 'string' && typeof timeTableId === 'string' && timeTableId) {
        map[scheduleId] = timeTableId;
      }
    }
    return map;
  } catch {
    return {};
  }
}

/** 覆盖写入全部时间表。 */
export async function writeTimeTables(
  driver: SqlDriver,
  presets: TimeTablePreset[]
): Promise<void> {
  await driver.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
    TIME_TABLES_KEY,
    JSON.stringify(presets),
  ]);
}

/** 覆盖写入课表 ↔ 时间表绑定。 */
export async function writeScheduleTimeTableMap(
  driver: SqlDriver,
  map: Record<string, string>
): Promise<void> {
  await driver.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
    SCHEDULE_TIMETABLE_MAP_KEY,
    JSON.stringify(map),
  ]);
}

/**
 * 把某套时间表写回主库的 `period.times` 与 `timetable.periodDuration`。
 * 这是首页 / 今日计划 / 课表网格共享的唯一数据源，写完再 bumpDataVersion 即可三端同步。
 */
export async function writeActivePeriodTimes(
  driver: SqlDriver,
  preset: TimeTablePreset
): Promise<void> {
  await driver.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
    PERIOD_TIMES_KEY,
    JSON.stringify(preset.periods),
  ]);
  await driver.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', [
    'timetable.periodDuration',
    String(preset.durationMinutes),
  ]);
}

/** 两套节次时间是否等价（用于避免无意义的重写）。 */
export function samePeriods(a: PeriodTime[], b: PeriodTime[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((p, i) => p.start === b[i].start && p.end === b[i].end);
}

/** 一套时间表中的最长单节时长（用于 `periodDuration` 兜底）。 */
export function durationHintOf(periods: PeriodTime[]): number {
  let max = 0;
  for (const p of periods) {
    const diff = toMinutes(p.end) - toMinutes(p.start);
    if (Number.isFinite(diff) && diff > max) max = diff;
  }
  return max > 0 ? max : 45;
}

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
    ['timetable.reminderEnabled', '0'],
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

  // 多时间表：首次启动用现有 period.times 生成一套「默认」，并把所有课表绑上去。
  // 只写 settings 的两个键值，不建表、不动 Schema。
  const storedTimes = await driver.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?;',
    [PERIOD_TIMES_KEY]
  );
  let seedPeriods: PeriodTime[] = DEFAULT_PERIOD_TIMES;
  if (storedTimes?.value) {
    try {
      const parsed = JSON.parse(storedTimes.value);
      if (Array.isArray(parsed) && parsed.length > 0) seedPeriods = parsed as PeriodTime[];
    } catch {
      seedPeriods = DEFAULT_PERIOD_TIMES;
    }
  }
  const durationRow = await driver.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?;',
    ['timetable.periodDuration']
  );
  const seedDuration = Number(durationRow?.value) || 45;

  const timeTablesRow = await driver.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?;',
    [TIME_TABLES_KEY]
  );
  const presets = parseTimeTables(timeTablesRow?.value, seedPeriods, seedDuration);
  if (!timeTablesRow) {
    await driver.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);', [
      TIME_TABLES_KEY,
      JSON.stringify(presets),
    ]);
  }

  const mapRow = await driver.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?;',
    [SCHEDULE_TIMETABLE_MAP_KEY]
  );
  if (!mapRow) {
    const scheduleRows = await driver.getAllAsync<{ id: string }>('SELECT id FROM schedules;');
    const seededMap: Record<string, string> = {};
    for (const row of scheduleRows) seededMap[row.id] = presets[0].id;
    await driver.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);', [
      SCHEDULE_TIMETABLE_MAP_KEY,
      JSON.stringify(seededMap),
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