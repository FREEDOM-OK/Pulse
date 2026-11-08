import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests, getDriver } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  BACKUP_APP_ID,
  BackupError,
  clearAllData,
  exportBackup,
  importBackup,
  parseBackupPayload,
  summarizeBackup,
} from '@/db/repositories/backup';
import { createTask } from '@/db/repositories/tasks';
import { addTrainingItem, completeSet } from '@/db/repositories/training';
import { createEvent, listEventsByDate } from '@/db/repositories/events';
import { getProfile, saveProfile } from '@/db/repositories/profile';
import { addWish, markPlayed } from '@/db/repositories/games';
import { setTheme } from '@/db/repositories/settings';
import { createCustomExercise, findExerciseByName } from '@/db/repositories/exercises';
import { PRESET_EXERCISES } from '@/db/seed-data';
import { SCHEMA_VERSION } from '@/db/schema';

const DATE = '2026-11-06';

async function countRows(table: string): Promise<number> {
  const row = await getDriver().getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${table}`
  );
  return Number(row?.total ?? 0);
}

async function seedSampleData() {
  await createTask({ date: DATE, title: '写周报', time: '09:00' });
  const bench = await findExerciseByName('杠铃卧推');
  if (!bench) throw new Error('预置动作「杠铃卧推」缺失');
  const itemId = await addTrainingItem({
    date: DATE,
    exerciseId: bench.id,
    exerciseName: bench.name,
    reps: 4,
    weight: 60,
  });
  await completeSet(itemId);
  await createEvent({ date: DATE, type: 'meal', title: '燕麦牛奶', amount: 12.5, note: '早餐' });
  const wishId = await addWish('塞尔达');
  await markPlayed(wishId, {
    durationMinutes: 150,
    experience: '很好玩',
    rating: 5,
    playedDate: DATE,
  });
  await setTheme('dark');
  await saveProfile({
    name: '小明',
    gender: 'male',
    birthday: '2000-01-02',
    avatarUri: 'file:///avatar.jpg',
  });
}

afterEach(() => {
  resetDriverForTests();
});

describe('P1 备份与恢复', () => {
  it('导出包含全部模块数据与设置，个人信息不含头像路径', async () => {
    await createTestContext();
    await seedSampleData();
    const payload = await exportBackup();

    expect(payload.app).toBe(BACKUP_APP_ID);
    expect(payload.schemaVersion).toBe(SCHEMA_VERSION);
    expect(payload.data.tasks).toHaveLength(1);
    expect(payload.data.trainingItems).toHaveLength(1);
    expect(payload.data.setRecords).toHaveLength(1);
    expect(payload.data.events).toHaveLength(1);
    expect(payload.data.playedGames).toHaveLength(1);
    expect(payload.data.settings).toMatchObject({
      theme: 'dark',
      'profile.name': '小明',
      'profile.gender': 'male',
      'profile.birthday': '2000-01-02',
    });
    expect(payload.data.settings).not.toHaveProperty('profile.avatar');

    const summary = summarizeBackup(payload);
    expect(summary.tasks).toBe(1);
    expect(summary.setRecords).toBe(1);
    expect(summary.events).toBe(1);
  });

  it('清空后导入备份，数据完全恢复', async () => {
    await createTestContext();
    await seedSampleData();
    const before = await exportBackup();

    await clearAllData();
    expect(await countRows('tasks')).toBe(0);
    expect(await countRows('set_records')).toBe(0);
    expect(await countRows('events')).toBe(0);
    expect(await countRows('played_games')).toBe(0);
    expect(await countRows('exercises')).toBe(PRESET_EXERCISES.length);
    expect((await getProfile()).name).toBe('用户');

    const parsed = parseBackupPayload(JSON.parse(JSON.stringify(before)));
    await importBackup(parsed);

    const after = await exportBackup();
    expect(after.data.tasks).toEqual(before.data.tasks);
    expect(after.data.trainingItems).toEqual(before.data.trainingItems);
    expect(after.data.setRecords).toEqual(before.data.setRecords);
    expect(after.data.events).toEqual(before.data.events);
    expect(after.data.playedGames).toEqual(before.data.playedGames);
    expect(after.data.wishlist).toEqual(before.data.wishlist);
    expect(after.data.exercises).toEqual(before.data.exercises);
    expect(after.data.settings).toEqual(before.data.settings);
    expect((await getProfile()).name).toBe('小明');
  });

  it('清空全部数据时保留基础动作，只删除自定义动作', async () => {
    await createTestContext();
    await createCustomExercise('临时自定义动作', 'sets');

    await clearAllData();

    expect(await findExerciseByName('临时自定义动作')).toBeNull();
    expect(await countRows('exercises')).toBe(PRESET_EXERCISES.length);
    expect(await findExerciseByName('杠铃卧推')).toMatchObject({ isPreset: true });
    expect(await findExerciseByName('爬坡快走')).toMatchObject({ trackingType: 'duration' });
  });

  it('按时间动作保存分钟数，并能随备份完整恢复', async () => {
    await createTestContext();
    const itemId = await addTrainingItem({
      date: DATE,
      exerciseId: null,
      exerciseName: '慢跑',
      trackingType: 'duration',
      durationMinutes: 25,
    });
    const record = await completeSet(itemId);

    expect(record).toMatchObject({
      tracking_type: 'duration',
      duration_minutes: 25,
      reps: 1,
      weight: 0,
    });

    const payload = await exportBackup();
    expect(payload.data.trainingItems[0]).toMatchObject({
      trackingType: 'duration',
      durationMinutes: 25,
    });
    expect(payload.data.setRecords[0]).toMatchObject({
      trackingType: 'duration',
      durationMinutes: 25,
    });

    await clearAllData();
    await importBackup(parseBackupPayload(JSON.parse(JSON.stringify(payload))));
    const restored = (await exportBackup()).data;
    expect(restored.trainingItems[0]).toMatchObject({
      trackingType: 'duration',
      durationMinutes: 25,
    });
    expect(restored.setRecords[0]).toMatchObject({
      trackingType: 'duration',
      durationMinutes: 25,
    });
  });

  it('导入后可继续正常使用（主键不冲突）', async () => {
    await createTestContext();
    await seedSampleData();
    const payload = parseBackupPayload(JSON.parse(JSON.stringify(await exportBackup())));

    await clearAllData();
    await importBackup(payload);

    const taskId = await createTask({ date: DATE, title: '导入后的新任务' });
    const eventId = await createEvent({ date: DATE, type: 'shopping', title: '导入后的新事件' });
    expect(taskId).toBeGreaterThan(0);
    expect(eventId).toBeGreaterThan(0);
    const taskRow = await getDriver().getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM tasks'
    );
    expect(Number(taskRow?.total)).toBe(2);
    expect(await listEventsByDate(DATE)).toHaveLength(2);
  });

  it('v1/v2 备份里的饮食记录会转成好饭事件，备忘被忽略', async () => {
    await createTestContext();
    await importBackup(
      parseBackupPayload({
        app: BACKUP_APP_ID,
        schemaVersion: 2,
        exportedAt: '2026-11-06T00:00:00.000Z',
        data: {
          tasks: [],
          exercises: [],
          trainingItems: [],
          setRecords: [],
          wishlist: [],
          playedGames: [],
          dietRecords: [
            {
              id: 1,
              date: DATE,
              mealType: 'lunch',
              content: '鸡胸肉饭',
              calories: 520,
              createdAt: '2026-11-06T12:00:00.000Z',
            },
          ],
          memos: [{ id: 1, content: '旧备忘', tags: [], pinned: 0 }],
          settings: {},
        },
      })
    );

    const events = await listEventsByDate(DATE);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'meal',
      title: '鸡胸肉饭',
      amount: null,
      note: '午餐 · 520 千卡',
    });
  });

  it('非法备份文件被拒绝且不影响现有数据', async () => {
    await createTestContext();
    await seedSampleData();

    expect(() => parseBackupPayload(null)).toThrow(BackupError);
    expect(() => parseBackupPayload('not-json')).toThrow(BackupError);
    expect(() => parseBackupPayload({ app: 'other-app', schemaVersion: 1, data: {} })).toThrow(
      '这不是本 App 的备份文件'
    );
    expect(() =>
      parseBackupPayload({
        app: BACKUP_APP_ID,
        schemaVersion: 99,
        data: {},
      })
    ).toThrow('备份来自更新版本的 App');

    const validShape = {
      app: BACKUP_APP_ID,
      schemaVersion: 1,
      exportedAt: '',
      data: {
        tasks: [],
        exercises: [],
        trainingItems: [],
        setRecords: [],
        wishlist: [],
        playedGames: [],
      },
    };
    expect(() => parseBackupPayload(validShape)).toThrow('缺少 settings');

    expect(() =>
      parseBackupPayload({
        app: BACKUP_APP_ID,
        schemaVersion: 3,
        exportedAt: '',
        data: {
          tasks: [],
          exercises: [],
          trainingItems: [],
          setRecords: [],
          wishlist: [],
          playedGames: [],
          settings: {},
        },
      })
    ).toThrow('缺少 events');

    expect(await countRows('tasks')).toBe(1);
  });

  it('备份摘要字段完整', async () => {
    await createTestContext();
    await seedSampleData();
    const summary = summarizeBackup(await exportBackup());
    expect(summary).toMatchObject({
      tasks: 1,
      trainingItems: 1,
      setRecords: 1,
      events: 1,
      playedGames: 1,
    });
    expect(summary).not.toHaveProperty('dietRecords');
    expect(summary).toMatchObject({ memos: 0, courses: 0, courseSlots: 0 });
    expect(typeof summary.exportedAt).toBe('string');
  });
});