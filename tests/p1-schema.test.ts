import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configureDriver, getDriver, resetDriverForTests } from '@/db/connection';
import { migrate, getSchemaVersion } from '@/db/migrations';
import { seedExercises } from '@/db/seed';
import { PRESET_EXERCISES } from '@/db/seed-data';
import { MIGRATIONS, SCHEMA_VERSION } from '@/db/schema';
import { EXERCISE_CATEGORIES } from '@/db/types';
import { createNodeDriver, createTestContext } from './helpers/node-driver';

const TABLES = [
  'tasks',
  'exercises',
  'training_items',
  'set_records',
  'events',
  'wishlist',
  'played_games',
  'settings',
  'memos',
  'courses',
  'course_slots',
];

describe('P1 数据库结构与迁移', () => {
  afterEach(() => {
    resetDriverForTests();
  });

  it('迁移后 11 张业务表都存在，饮食表已移除、备忘与课表表存在', async () => {
    await createTestContext();
    const rows = await getDriver().getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    );
    const names = rows.map((row) => row.name);
    for (const table of TABLES) {
      expect(names, `缺少表 ${table}`).toContain(table);
    }
    expect(names).not.toContain('diet_records');
    expect(names).toContain('memos');
  });

  it('v2 数据库升级到 v4 时把饮食记录迁移成好饭事件', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeapp-v2-'));
    const file = path.join(dir, 'v2.db');

    resetDriverForTests();
    const driver = createNodeDriver(file);
    configureDriver(driver);
    await driver.execAsync(MIGRATIONS[0]);
    await driver.execAsync(MIGRATIONS[1]);
    await driver.execAsync('PRAGMA user_version = 2');
    await driver.runAsync(
      `INSERT INTO diet_records (date, meal_type, content, calories, created_at)
       VALUES ('2026-11-07', 'lunch', '鸡胸肉饭', 520, '2026-11-07T12:00:00.000Z')`
    );

    await migrate();

    const rows = await getDriver().getAllAsync<{
      date: string;
      type: string;
      title: string;
      amount: number | null;
      note: string | null;
    }>('SELECT date, type, title, amount, note FROM events');
    expect(rows).toEqual([
      {
        date: '2026-11-07',
        type: 'meal',
        title: '鸡胸肉饭',
        amount: null,
        note: '午餐 · 520 千卡',
      },
    ]);
    expect(await getSchemaVersion()).toBe(SCHEMA_VERSION);

    driver.close();
    resetDriverForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('user_version 等于当前 schema 版本', async () => {
    await createTestContext();
    expect(await getSchemaVersion()).toBe(SCHEMA_VERSION);
  });

  it('重复执行迁移不报错、不重复建表', async () => {
    await createTestContext();
    await migrate();
    await migrate();
    expect(await getSchemaVersion()).toBe(SCHEMA_VERSION);
  });

  it('预置动作数量与分类符合 PRD', async () => {
    await createTestContext();
    const rows = await getDriver().getAllAsync<{ category: string }>(
      'SELECT category FROM exercises WHERE is_preset = 1'
    );
    expect(rows.length).toBe(PRESET_EXERCISES.length);
    expect(rows.length).toBeGreaterThanOrEqual(35);
    for (const category of EXERCISE_CATEGORIES) {
      const count = rows.filter((row) => row.category === category).length;
      expect(count, `${category} 动作不足 4 个`).toBeGreaterThanOrEqual(4);
    }
  });

  it('重复 seed 不会重复写入预置动作', async () => {
    await createTestContext();
    const inserted = await seedExercises();
    expect(inserted).toBe(0);
    const row = await getDriver().getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM exercises'
    );
    expect(Number(row?.total)).toBe(PRESET_EXERCISES.length);
  });

  it('数据写入后重开数据库仍存在（文件持久化）', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeapp-test-'));
    const file = path.join(dir, 'persist.db');

    resetDriverForTests();
    const first = createNodeDriver(file);
    configureDriver(first);
    await migrate();
    await seedExercises();
    await getDriver().runAsync(
      "INSERT INTO tasks (date, title, done, sort_order, created_at) VALUES ('2026-11-06', '持久化测试', 0, 1, '2026-11-06T00:00:00.000Z')"
    );
    first.close();

    resetDriverForTests();
    const second = createNodeDriver(file);
    configureDriver(second);
    await migrate();

    const rows = await getDriver().getAllAsync<{ title: string }>('SELECT title FROM tasks');
    expect(rows.map((row) => row.title)).toEqual(['持久化测试']);
    expect(await getSchemaVersion()).toBe(SCHEMA_VERSION);

    second.close();
    resetDriverForTests();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
