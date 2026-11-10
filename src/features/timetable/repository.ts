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

/** 返回主库驱动；首次调用时确保有默认课表与默认设置。 */
export async function getDb(): Promise<SqlDriver> {
  const driver = getDriver();
  if (!seeded) {
    await ensureTimetableSeed(driver);
    seeded = true;
  }
  return driver;
}

/** 测试用：重置「已播种」标记。 */
export function resetTimetableSeedFlagForTests(): void {
  seeded = false;
}

/** 幂等播种：至少一张「我的课表」+ 外观四项默认值。 */
export async function ensureTimetableSeed(driver: SqlDriver = getDriver()): Promise<void> {
  const existing = await driver.getFirstAsync<{ id: string }>(
    'SELECT id FROM schedules ORDER BY created_at ASC LIMIT 1;'
  );

  let firstScheduleId = existing?.id;
  if (!firstScheduleId) {
    firstScheduleId = `sched_${Date.now()}`;
    const now = new Date().toISOString();
    const startDate = getFirstMondayOfCurrentMonth(new Date());
    await driver.runAsync(
      'INSERT INTO schedules (id, name, start_date, total_weeks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
      [firstScheduleId, '我的课表', startDate, 20, now, now]
    );
  }

  const defaults: Array<[string, string]> = [
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
  const times = await driver.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?;',
    [PERIOD_TIMES_KEY]
  );
  if (!times) {
    await driver.runAsync('INSERT INTO settings (key, value) VALUES (?, ?);', [
      PERIOD_TIMES_KEY,
      JSON.stringify(DEFAULT_PERIOD_TIMES),
    ]);
  }

  seeded = true;
}