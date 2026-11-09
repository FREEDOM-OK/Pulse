import { afterEach, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers/node-driver';
import { getDriver, resetDriverForTests } from '@/db/connection';
import { SCHEMA_VERSION } from '@/db/schema';
import {
  createCourse,
  listCourses,
  updateCourse,
} from '@/db/repositories/courses';
import {
  BACKUP_VERSION,
  exportBackup,
  importBackup,
  parseBackupPayload,
} from '@/db/repositories/backup';
import {
  getCardColor,
  getCardStyle,
  getDashMode,
  getHideCompleted,
  getMiddleTab,
  setCardColor,
  setCardStyle,
  setDashMode,
  setHideCompleted,
  setMiddleTab,
  setSetting,
} from '@/db/repositories/settings';
import { DEFAULT_CARD_COLOR } from '@/db/types';

afterEach(() => {
  resetDriverForTests();
});

async function backgroundColumn(): Promise<string | null> {
  const rows = await getDriver().getAllAsync<{ name: string }>(
    'PRAGMA table_info(courses)'
  );
  return rows.some((row) => row.name === 'background') ? 'background' : null;
}

describe('S0 数据层 v6', () => {
  it('schema 升到 6，courses 新增 background 列', async () => {
    await createTestContext();
    expect(SCHEMA_VERSION).toBe(6);
    expect(BACKUP_VERSION).toBe(6);
    expect(await backgroundColumn()).toBe('background');
  });

  it('新增设置项的默认值', async () => {
    await createTestContext();
    expect(await getMiddleTab()).toBe('fitness');
    expect(await getDashMode()).toBe('carousel');
    expect(await getCardStyle()).toBe('default');
    expect(await getCardColor()).toBe(DEFAULT_CARD_COLOR);
    expect(await getHideCompleted()).toBe(false);
  });

  it('底栏第三格可切到课表并持久化', async () => {
    await createTestContext();
    await setMiddleTab('timetable');
    expect(await getMiddleTab()).toBe('timetable');
  });

  it('非法设置值回落默认，不抛错', async () => {
    await createTestContext();
    await setSetting('tab.middle', 'games');
    await setSetting('home.dashMode', 'fan');
    await setSetting('home.cardStyle', 'neon');
    await setSetting('home.cardColor', 'red');
    expect(await getMiddleTab()).toBe('fitness');
    expect(await getDashMode()).toBe('carousel');
    expect(await getCardStyle()).toBe('default');
    expect(await getCardColor()).toBe(DEFAULT_CARD_COLOR);
  });

  it('Dash 模式、卡片样式与自定义颜色可写可读', async () => {
    await createTestContext();
    await setDashMode('stack');
    await setCardStyle('cartoon');
    await setCardColor('#123ABC');
    expect(await getDashMode()).toBe('stack');
    expect(await getCardStyle()).toBe('cartoon');
    // 颜色统一存小写，避免同色不同值。
    expect(await getCardColor()).toBe('#123abc');
  });

  it('完成后隐藏开关只认 true', async () => {
    await createTestContext();
    await setHideCompleted(true);
    expect(await getHideCompleted()).toBe(true);
    await setHideCompleted(false);
    expect(await getHideCompleted()).toBe(false);
    await setSetting('today.hideCompleted', 'yes');
    expect(await getHideCompleted()).toBe(false);
  });

  it('建课时 background 缺省为 plain，可显式指定', async () => {
    await createTestContext();
    const plain = await createCourse({
      name: '高数',
      slots: [{ weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [] }],
    });
    const stripe = await createCourse({
      name: '英语',
      background: 'stripe',
      slots: [{ weekday: 2, startPeriod: 3, endPeriod: 4, weeks: [] }],
    });
    const byId = new Map((await listCourses()).map((course) => [course.id, course]));
    expect(byId.get(plain)?.background).toBe('plain');
    expect(byId.get(stripe)?.background).toBe('stripe');
  });

  it('改课可切换底色样式', async () => {
    await createTestContext();
    const id = await createCourse({
      name: '物理',
      slots: [{ weekday: 3, startPeriod: 1, endPeriod: 2, weeks: [] }],
    });
    await updateCourse(id, {
      name: '物理',
      background: 'grid',
      slots: [{ weekday: 3, startPeriod: 1, endPeriod: 2, weeks: [] }],
    });
    const course = (await listCourses()).find((item) => item.id === id);
    expect(course?.background).toBe('grid');
  });

  it('备份 v6 带上课程底色并可往返导入', async () => {
    await createTestContext();
    await setMiddleTab('timetable');
    await createCourse({
      name: '化学',
      background: 'grid',
      slots: [{ weekday: 4, startPeriod: 5, endPeriod: 6, weeks: [1, 3, 5] }],
    });
    const payload = await exportBackup();
    expect(payload.schemaVersion).toBe(6);
    expect(payload.data.courses[0]?.background).toBe('grid');

    await importBackup(payload);
    const courses = await listCourses();
    expect(courses).toHaveLength(1);
    expect(courses[0]?.background).toBe('grid');
    expect(await getMiddleTab()).toBe('timetable');
  });

  it('导入 v5 备份时课程底色回落 plain', async () => {
    await createTestContext();
    await createCourse({
      name: '生物',
      background: 'stripe',
      slots: [{ weekday: 5, startPeriod: 1, endPeriod: 2, weeks: [] }],
    });
    const payload = await exportBackup();
    const legacy = {
      ...payload,
      schemaVersion: 5,
      data: {
        ...payload.data,
        courses: payload.data.courses.map(({ background: _background, ...row }) => row),
      },
    };
    const parsed = parseBackupPayload(legacy);
    await importBackup(parsed);
    const courses = await listCourses();
    expect(courses[0]?.background).toBe('plain');
  });
});