import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests, getDriver } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import { clearAllData, exportBackup, importBackup, parseBackupPayload } from '@/db/repositories/backup';
import { getDayDetail, getMonthActivity } from '@/db/repositories/calendar';

import { addDays } from '@/lib/date';
import { validateTaskTitle } from '@/lib/validation';

function measure(fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  return fn().then(() => performance.now() - start);
}

afterEach(() => {
  resetDriverForTests();
});

describe('P9 边界与性能', () => {
  it('长文本边界：任务 120 字', () => {
    expect(validateTaskTitle('x'.repeat(120))).toBeNull();
    expect(validateTaskTitle('x'.repeat(121))).not.toBeNull();
  });

  it('空库导出、清空、导入都不报错', async () => {
    await createTestContext();
    const payload = await exportBackup();
    expect(payload.data.tasks).toHaveLength(0);
    // 预置动作永久保留、不随备份导出，所以空库里没有自定义动作。
    expect(payload.data.exercises).toHaveLength(0);

    await clearAllData();
    await clearAllData();
    // 基础必备动作永久保留，但不在备份里；所以导出的自定义动作为 0。
    expect((await exportBackup()).data.exercises).toHaveLength(0);
    const presetCount = await getDriver().getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM exercises WHERE is_preset = 1'
    );
    expect(presetCount?.n).toBeGreaterThan(0);

    await importBackup(parseBackupPayload(JSON.parse(JSON.stringify(payload))));
    expect((await exportBackup()).data.exercises).toEqual(payload.data.exercises);
  });

  it('闰年与月末日期递增正确', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('大量数据下查询仍然很快（3000 组训练 + 1000 条事件）', async () => {
    await createTestContext();
    const driver = getDriver();

    await driver.withTransactionAsync(async () => {
      for (let index = 0; index < 3000; index += 1) {
        const date = `2026-11-${String((index % 28) + 1).padStart(2, '0')}`;
        await driver.runAsync(
          `INSERT INTO set_records
           (training_item_id, date, exercise_name, set_index, reps, weight, completed_at, sort_order)
           VALUES (NULL, ?, '卧推', ?, 8, 60, '2026-11-06T10:00:00.000Z', ?)`,
          [date, (index % 40) + 1, index]
        );
      }
      for (let index = 0; index < 1000; index += 1) {
        const date = `2026-11-${String((index % 28) + 1).padStart(2, '0')}`;
        await driver.runAsync(
          `INSERT INTO events (date, type, title, amount, note, created_at)
           VALUES (?, 'meal', '测试餐', 20.5, NULL, '2026-11-06T10:00:00.000Z')`,
          [date]
        );
      }
    });

    const monthMs = await measure(async () => {
      const activity = await getMonthActivity('2026-11-01', '2026-11-30');
      expect(Object.keys(activity)).toHaveLength(28);
    });

    const dayMs = await measure(async () => {
      const detail = await getDayDetail('2026-11-06');
      expect(detail.fitness[0].exerciseName).toBe('卧推');
    });

    expect(monthMs).toBeLessThan(1500);
    expect(dayMs).toBeLessThan(1500);
  });
});
