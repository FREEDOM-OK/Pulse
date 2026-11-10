import { afterEach, describe, expect, it } from 'vitest';
import { getDriver, resetDriverForTests } from '@/db/connection';
import { ALL_TABLES, SCHEMA_VERSION } from '@/db/schema';
import { createTestContext } from './helpers/node-driver';
import {
  BACKUP_VERSION,
  exportBackup,
  importBackup,
  parseBackupPayload,
} from '@/db/repositories/backup';
import { getPeriodTimes, getSetting } from '@/db/repositories/settings';
import { DEFAULT_PERIOD_TIMES } from '@/lib/timetable-core';
import {
  ensureTimetableSeed,
  resetTimetableSeedFlagForTests,
  PERIOD_TIMES_KEY,
} from '@/features/timetable/repository';
import { listCoursesForDate } from '@/features/timetable/bridge';

/** 2026-09-07 是周一，作为第 1 周起点。 */
const TERM_START = '2026-09-07';

afterEach(() => {
  resetDriverForTests();
  resetTimetableSeedFlagForTests();
});

async function seedSchedule(weekStart = TERM_START): Promise<string> {
  const driver = getDriver();
  const now = '2026-09-01T00:00:00.000Z';
  await driver.runAsync(
    'INSERT INTO schedules (id, name, start_date, total_weeks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
    ['sched_test', '测试课表', weekStart, 20, now, now]
  );
  return 'sched_test';
}

async function addCourse(
  scheduleId: string,
  name: string,
  slots: Array<{ day: number; start: number; end: number; weeks: number[] }>
): Promise<string> {
  const driver = getDriver();
  const now = '2026-09-01T00:00:00.000Z';
  const courseId = `c_${name}`;
  await driver.runAsync(
    'INSERT INTO sched_courses (id, schedule_id, name, color, credits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [courseId, scheduleId, name, '#3B82F6', '选填', now, now]
  );
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    await driver.runAsync(
      `INSERT INTO sched_sessions
         (id, course_id, teacher, location, day_of_week, start_period, end_period, weeks, remark, custom_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        `${courseId}_s${i}`,
        courseId,
        '张老师',
        'A101',
        slot.day,
        slot.start,
        slot.end,
        JSON.stringify(slot.weeks),
        '',
        '',
      ]
    );
  }
  return courseId;
}

describe('A1 数据层 v7：课表接主库', () => {
  it('schema 升到 7，课表三表存在、旧三表已删除', async () => {
    await createTestContext();
    expect(SCHEMA_VERSION).toBe(7);
    expect(BACKUP_VERSION).toBe(7);
    expect(ALL_TABLES).toContain('schedules');

    const rows = await getDriver().getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    );
    const names = rows.map((row) => row.name);
    expect(names).toEqual(expect.arrayContaining(['schedules', 'sched_courses', 'sched_sessions']));
    expect(names).not.toContain('courses');
    expect(names).not.toContain('course_slots');
    expect(names).not.toContain('course_exceptions');
  });

  it('首次播种会创建「我的课表」与默认节次时间', async () => {
    await createTestContext();
    await ensureTimetableSeed();

    const schedule = await getDriver().getFirstAsync<{ name: string }>(
      'SELECT name FROM schedules;'
    );
    expect(schedule?.name).toBe('我的课表');
    expect(await getSetting('timetable.periodDuration')).toBe('45');
    expect(await getSetting(PERIOD_TIMES_KEY)).not.toBeNull();
    expect(await getPeriodTimes()).toHaveLength(DEFAULT_PERIOD_TIMES.length);

    // 二次播种不重复插课表
    await ensureTimetableSeed();
    const count = await getDriver().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM schedules;');
    expect(count?.n).toBe(1);
  });

  it('listCoursesForDate 按星期与周次过滤', async () => {
    await createTestContext();
    const scheduleId = await seedSchedule();
    await addCourse(scheduleId, '高等数学', [{ day: 1, start: 1, end: 2, weeks: [] }]);
    await addCourse(scheduleId, '大学英语', [{ day: 3, start: 3, end: 4, weeks: [1, 3, 5] }]);

    const monday = await listCoursesForDate('2026-09-07');
    expect(monday.map((item) => item.name)).toEqual(['高等数学']);
    expect(monday[0].time).toBe('08:00 – 09:40');

    const wednesdayWeek1 = await listCoursesForDate('2026-09-09');
    expect(wednesdayWeek1.map((item) => item.name)).toEqual(['大学英语']);

    // 第 2 周周一：单双周过滤后英语课不该出现
    const wednesdayWeek2 = await listCoursesForDate('2026-09-16');
    expect(wednesdayWeek2).toEqual([]);
  });

  it('listCoursesForDate 支持自定义时间覆盖节次时间', async () => {
    await createTestContext();
    const scheduleId = await seedSchedule();
    const courseId = await addCourse(scheduleId, '物理', [{ day: 1, start: 1, end: 2, weeks: [] }]);
    await getDriver().runAsync(
      "UPDATE sched_sessions SET custom_time = ? WHERE course_id = ?;",
      [JSON.stringify({ enabled: true, startTime: '07:30', endTime: '09:10' }), courseId]
    );

    const [item] = await listCoursesForDate('2026-09-07');
    expect(item.time).toBe('07:30 – 09:10');
  });

  it('备份 v7 带上课表三表并能往返导入', async () => {
    await createTestContext();
    const scheduleId = await seedSchedule();
    await addCourse(scheduleId, '数据结构', [{ day: 2, start: 1, end: 2, weeks: [1, 2] }]);

    const payload = await exportBackup();
    expect(payload.schemaVersion).toBe(7);
    expect(payload.data.schedules).toHaveLength(1);
    expect(payload.data.schedCourses).toHaveLength(1);
    expect(payload.data.schedSessions).toHaveLength(1);

    await importBackup(payload);
    const courses = await listCoursesForDate('2026-09-08');
    expect(courses.map((item) => item.name)).toEqual(['数据结构']);
  });

  it('导入 v6 备份时课表三项为空', async () => {
    await createTestContext();
    const payload = await exportBackup();
    const legacy = {
      ...payload,
      schemaVersion: 6,
      data: {
        ...payload.data,
        schedules: undefined,
        schedCourses: undefined,
        schedSessions: undefined,
      },
    };
    const parsed = parseBackupPayload(JSON.parse(JSON.stringify(legacy)));
    expect(parsed.data.schedules).toEqual([]);
    expect(parsed.data.schedCourses).toEqual([]);
    expect(parsed.data.schedSessions).toEqual([]);
  });
});