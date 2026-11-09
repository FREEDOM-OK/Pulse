import { afterEach, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers/node-driver';
import { resetDriverForTests } from '@/db/connection';
import {
  BACKUP_APP_ID,
  BACKUP_VERSION,
  clearAllData,
  exportBackup,
  importBackup,
  parseBackupPayload,
  summarizeBackup,
} from '@/db/repositories/backup';
import {
  addCourseException,
  createCourse,
  listCourseExceptions,
  listCourses,
  removeCourseException,
} from '@/db/repositories/courses';
import { SCHEMA_VERSION } from '@/db/schema';
import { getPeriodCount, getRowHeight, getShowWeekend, setRowHeight } from '@/db/repositories/settings';

afterEach(() => {
  resetDriverForTests();
});

async function seedCourse() {
  return createCourse({
    name: '高等数学',
    teacher: '张老师',
    room: 'A301',
    color: '#4C8DF6',
    note: '带计算器',
    slots: [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [1, 2, 3] }],
  });
}

describe('T0 schema v5', () => {
  it('版本升到 5，并建出 course_exceptions 表', async () => {
    await createTestContext();
    expect(SCHEMA_VERSION).toBe(5);
    expect(BACKUP_VERSION).toBe(5);

    const tables = await (await import('@/db/connection')).getDriver().getAllAsync<{
      name: string;
    }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'course_exceptions'");
    expect(tables).toHaveLength(1);
  });

  it('同课程同一周只能有一条例外（唯一索引）', async () => {
    await createTestContext();
    const courseId = await seedCourse();
    await addCourseException(courseId, 2);
    await addCourseException(courseId, 2);
    expect(await listCourseExceptions()).toHaveLength(1);
    expect(await listCourses()).toHaveLength(1);
  });

  it('删除例外后恢复', async () => {
    await createTestContext();
    const courseId = await seedCourse();
    await addCourseException(courseId, 2);
    await removeCourseException(courseId, 2);
    expect(await listCourseExceptions()).toHaveLength(0);
  });
});

describe('T0 备份 v5', () => {
  it('导出包含课程与例外，导入后完整还原', async () => {
    await createTestContext();
    const courseId = await seedCourse();
    await addCourseException(courseId, 2);
    await setRowHeight(96);

    const payload = await exportBackup();
    expect(payload.schemaVersion).toBe(5);
    expect(payload.data.courseExceptions).toHaveLength(1);
    expect(payload.data.courseExceptions[0]).toMatchObject({ week: 2 });
    expect(summarizeBackup(payload)).toMatchObject({ courses: 1, courseSlots: 1, courseExceptions: 1 });

    await clearAllData();
    await importBackup(payload);

    const restored = await exportBackup();
    expect(restored.data.courses).toHaveLength(1);
    expect(restored.data.courseSlots).toHaveLength(1);
    expect(restored.data.courseExceptions).toHaveLength(1);
    expect(restored.data.courseExceptions[0]).toMatchObject({ week: 2 });
    expect(restored.data.settings['timetable.rowHeight']).toBe('96');
    expect(await getRowHeight()).toBe(96);
    expect(await getShowWeekend()).toBe(true);
    expect(await getPeriodCount()).toBe(11);
  });

  it('导入 v4 备份时例外为空且不报错', async () => {
    await createTestContext();
    const payload = await exportBackup();
    const legacy = JSON.parse(JSON.stringify(payload)) as Record<string, unknown> & {
      data: Record<string, unknown>;
    };
    legacy.schemaVersion = 4;
    delete legacy.data.courseExceptions;

    const parsed = parseBackupPayload(legacy);
    expect(parsed.data.courseExceptions).toEqual([]);
    await importBackup(parsed);
    expect(await listCourseExceptions()).toHaveLength(0);
  });

  it('v5 但缺少该数组时视为空', () => {
    const parsed = parseBackupPayload({
      app: BACKUP_APP_ID,
      schemaVersion: 5,
      exportedAt: '2026-11-09T00:00:00.000Z',
      data: {
        tasks: [],
        exercises: [],
        trainingItems: [],
        setRecords: [],
        wishlist: [],
        playedGames: [],
        events: [],
        memos: [],
        courses: [],
        courseSlots: [],
        settings: {},
      },
    });
    expect(parsed.data.courseExceptions).toEqual([]);
  });

  it('清空数据会清掉例外', async () => {
    await createTestContext();
    const courseId = await seedCourse();
    await addCourseException(courseId, 5);
    await clearAllData();
    expect(await listCourseExceptions()).toHaveLength(0);
    expect(await listCourses()).toHaveLength(0);
  });
});