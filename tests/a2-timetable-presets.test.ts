import { afterEach, describe, expect, it } from 'vitest';
import { getDriver, resetDriverForTests } from '@/db/connection';
import { getPeriodTimes, getSetting } from '@/db/repositories/settings';
import { createTestContext } from './helpers/node-driver';
import {
  PERIOD_TIMES_KEY,
  SCHEDULE_TIMETABLE_MAP_KEY,
  TIME_TABLES_KEY,
  ensureTimetableSeed,
  parseScheduleTimeTableMap,
  parseTimeTables,
  resetTimetableSeedFlagForTests,
  writeActivePeriodTimes,
  writeScheduleTimeTableMap,
} from '@/features/timetable/repository';
import {
  DEFAULT_PERIOD_TIMES,
  PeriodTime,
  applyFixedDuration,
  relayoutPeriods,
  validatePeriods,
} from '@/lib/timetable-core';
import { listCoursesForDate } from '@/features/timetable/bridge';

afterEach(() => {
  resetDriverForTests();
  resetTimetableSeedFlagForTests();
});

const CUSTOM: PeriodTime[] = [
  { start: '07:30', end: '08:15' },
  { start: '08:25', end: '09:10' },
];

describe('多时间表：settings 键值存储', () => {
  it('首次播种写入 timeTables / scheduleTimeTableMap，并把课表绑到默认套', async () => {
    await createTestContext();
    await ensureTimetableSeed();

    const presets = parseTimeTables(
      (await getSetting(TIME_TABLES_KEY)) ?? undefined,
      DEFAULT_PERIOD_TIMES,
      45
    );
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe('default');
    expect(presets[0].name).toBe('默认');
    expect(presets[0].periods).toHaveLength(DEFAULT_PERIOD_TIMES.length);

    const schedule = await getDriver().getFirstAsync<{ id: string }>('SELECT id FROM schedules;');
    const map = parseScheduleTimeTableMap(
      (await getSetting(SCHEDULE_TIMETABLE_MAP_KEY)) ?? undefined
    );
    expect(map[schedule?.id ?? '']).toBe('default');
  });

  it('缺少 / 损坏的 timeTables 会回退成一套默认时间表', () => {
    const fallback = parseTimeTables('not-json', DEFAULT_PERIOD_TIMES, 50);
    expect(fallback).toHaveLength(1);
    expect(fallback[0].durationMinutes).toBe(50);
    expect(parseScheduleTimeTableMap('[]')).toEqual({});
  });

  it('写回激活时间表会同步 period.times 与 periodDuration', async () => {
    await createTestContext();
    await ensureTimetableSeed();

    await writeActivePeriodTimes(getDriver(), {
      id: 'school',
      name: '巨野一中',
      fixedDuration: true,
      durationMinutes: 40,
      periods: CUSTOM,
    });

    const stored = await getPeriodTimes();
    expect(stored).toEqual(CUSTOM);
    expect(await getSetting('timetable.periodDuration')).toBe('40');
    // 只写 settings 键，不动任何表结构。
    expect(await getSetting(PERIOD_TIMES_KEY)).not.toBeNull();
  });

  it('scheduleTimeTableMap 覆盖写入后可原样读回', async () => {
    await createTestContext();
    await ensureTimetableSeed();
    await writeScheduleTimeTableMap(getDriver(), { sched_a: 'school', sched_b: 'default' });
    const map = parseScheduleTimeTableMap(
      (await getSetting(SCHEDULE_TIMETABLE_MAP_KEY)) ?? undefined
    );
    expect(map).toEqual({ sched_a: 'school', sched_b: 'default' });
  });
});

describe('切换时间表后首页 / 计划页立即拿到新时间', () => {
  it('写回激活时间表后，listCoursesForDate 的时段文案跟着变', async () => {
    await createTestContext();
    await ensureTimetableSeed();

    const driver = getDriver();
    const schedule = await driver.getFirstAsync<{ id: string; start_date: string }>(
      'SELECT id, start_date FROM schedules;'
    );
    const scheduleId = schedule?.id ?? '';
    const day = schedule?.start_date ?? '2026-09-07';
    // start_date 是周一（第 1 周第 1 天），课排在每周第 1 天第 1 节。
    const now = '2026-09-01T00:00:00.000Z';
    await driver.runAsync(
      'INSERT INTO sched_courses (id, schedule_id, name, color, credits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      ['c_sync', scheduleId, '高等数学', '#3B82F6', '选填', now, now]
    );
    await driver.runAsync(
      `INSERT INTO sched_sessions
         (id, course_id, teacher, location, day_of_week, start_period, end_period, weeks, remark, custom_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      ['s_sync', 'c_sync', '张老师', 'A101', 1, 1, 1, JSON.stringify([1]), '', '']
    );

    const before = await listCoursesForDate(day);
    expect(before).toHaveLength(1);
    expect(before[0].time).toBe('08:00 – 08:45');

    await writeActivePeriodTimes(driver, {
      id: 'school',
      name: '巨野一中',
      fixedDuration: false,
      durationMinutes: 45,
      periods: CUSTOM,
    });

    const after = await listCoursesForDate(day);
    expect(after).toHaveLength(1);
    expect(after[0].time).toBe('07:30 – 08:15');
  });
});

describe('固定时长联动算法', () => {
  it('改开始时间后结束重算，后续重叠节次按课间顺延', () => {
    const periods: PeriodTime[] = [
      { start: '08:00', end: '08:45' },
      { start: '08:55', end: '09:40' },
      { start: '10:00', end: '10:45' },
    ];
    // 第 2 节推迟到 09:20 → 09:20+45=10:05；第 3 节与原第 2 节之间原本隔 20 分钟课间，
// 于是顺延到 10:25（保留原课间，而不是压成默认 10 分钟）。
    const edited = periods.map((p) => ({ ...p }));
    edited[1].start = '09:20';
    const next = relayoutPeriods(edited, 1, 45);
    expect(next[1]).toEqual({ start: '09:20', end: '10:05' });
    expect(next[2].start).toBe('10:25');
    expect(next[2].end).toBe('11:10');
    expect(validatePeriods(next)).toBeNull();
  });

  it('applyFixedDuration 把所有结束时间对齐成 start + 时长', () => {
    const next = applyFixedDuration(
      [
        { start: '08:00', end: '09:30' },
        { start: '09:40', end: '10:20' },
      ],
      50
    );
    expect(next[0].end).toBe('08:50');
    expect(next[1].end).toBe('10:30');
  });
});