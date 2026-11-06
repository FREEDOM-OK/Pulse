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
import { createMemo } from '@/db/repositories/memos';
import { addTrainingItem, completeSet } from '@/db/repositories/training';
import { addDietRecord } from '@/db/repositories/diet';
import { addWish, markPlayed } from '@/db/repositories/games';
import { setTheme } from '@/db/repositories/settings';

const DATE = '2026-11-06';

async function countRows(table: string): Promise<number> {
  const row = await getDriver().getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${table}`
  );
  return Number(row?.total ?? 0);
}

async function seedSampleData() {
  await createTask({ date: DATE, title: '写周报', time: '09:00' });
  await createMemo({ content: '交房租', tags: ['财务'] });
  const itemId = await addTrainingItem({
    date: DATE,
    exerciseId: 1,
    exerciseName: '卧推',
    reps: 4,
    weight: 60,
  });
  await completeSet(itemId);
  await addDietRecord({ date: DATE, mealType: 'breakfast', content: '燕麦牛奶', calories: 320 });
  const wishId = await addWish('塞尔达');
  await markPlayed(wishId, {
    durationMinutes: 150,
    experience: '很好玩',
    rating: 5,
    playedDate: DATE,
  });
  await setTheme('dark');
}

afterEach(() => {
  resetDriverForTests();
});

describe('P1 备份与恢复', () => {
  it('导出包含全部模块数据与设置', async () => {
    await createTestContext();
    await seedSampleData();
    const payload = await exportBackup();

    expect(payload.app).toBe(BACKUP_APP_ID);
    expect(payload.schemaVersion).toBe(1);
    expect(payload.data.tasks).toHaveLength(1);
    expect(payload.data.memos).toHaveLength(1);
    expect(payload.data.trainingItems).toHaveLength(1);
    expect(payload.data.setRecords).toHaveLength(1);
    expect(payload.data.dietRecords).toHaveLength(1);
    expect(payload.data.playedGames).toHaveLength(1);
    expect(payload.data.settings).toEqual({ theme: 'dark' });
    expect(payload.data.exercises.length).toBeGreaterThanOrEqual(35);

    const summary = summarizeBackup(payload);
    expect(summary.tasks).toBe(1);
    expect(summary.setRecords).toBe(1);
  });

  it('清空后导入备份，数据完全恢复', async () => {
    await createTestContext();
    await seedSampleData();
    const before = await exportBackup();

    await clearAllData();
    expect(await countRows('tasks')).toBe(0);
    expect(await countRows('memos')).toBe(0);
    expect(await countRows('set_records')).toBe(0);
    expect(await countRows('diet_records')).toBe(0);
    expect(await countRows('played_games')).toBe(0);
    expect(await countRows('exercises')).toBe(0);

    const parsed = parseBackupPayload(JSON.parse(JSON.stringify(before)));
    await importBackup(parsed);

    const after = await exportBackup();
    expect(after.data.tasks).toEqual(before.data.tasks);
    expect(after.data.memos).toEqual(before.data.memos);
    expect(after.data.trainingItems).toEqual(before.data.trainingItems);
    expect(after.data.setRecords).toEqual(before.data.setRecords);
    expect(after.data.dietRecords).toEqual(before.data.dietRecords);
    expect(after.data.playedGames).toEqual(before.data.playedGames);
    expect(after.data.wishlist).toEqual(before.data.wishlist);
    expect(after.data.exercises).toEqual(before.data.exercises);
    expect(after.data.settings).toEqual(before.data.settings);
  });

  it('导入后可继续正常使用（主键不冲突）', async () => {
    await createTestContext();
    await seedSampleData();
    const payload = parseBackupPayload(JSON.parse(JSON.stringify(await exportBackup())));

    await clearAllData();
    await importBackup(payload);

    const id = await createTask({ date: DATE, title: '导入后的新任务' });
    expect(id).toBeGreaterThan(0);
    const row = await getDriver().getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM tasks');
    expect(Number(row?.total)).toBe(2);
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
        memos: [],
        tasks: [],
        exercises: [],
        trainingItems: [],
        setRecords: [],
        dietRecords: [],
        wishlist: [],
        playedGames: [],
      },
    };
    expect(() => parseBackupPayload(validShape)).toThrow('缺少 settings');

    expect(await countRows('tasks')).toBe(1);
  });

  it('备份摘要字段完整', async () => {
    await createTestContext();
    await seedSampleData();
    const summary = summarizeBackup(await exportBackup());
    expect(summary).toMatchObject({
      tasks: 1,
      memos: 1,
      trainingItems: 1,
      setRecords: 1,
      dietRecords: 1,
      playedGames: 1,
    });
    expect(typeof summary.exportedAt).toBe('string');
  });
});
