import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import { addTrainingItem, listTrainingItems } from '@/db/repositories/training';
import { getFitnessDefaults, setFitnessDefaults } from '@/db/repositories/settings';

const DATE = '2026-11-06';

afterEach(() => {
  resetDriverForTests();
});

describe('P8 健身默认值设置', () => {
  it('未设置时回退为 8 次 / 0kg', async () => {
    await createTestContext();
    await expect(getFitnessDefaults()).resolves.toEqual({ reps: 8, weight: 0 });
  });

  it('保存后读回用户设置的默认值', async () => {
    await createTestContext();
    await setFitnessDefaults({ reps: 12, weight: 40 });
    await expect(getFitnessDefaults()).resolves.toEqual({ reps: 12, weight: 40 });
  });

  it('非法值会被修正到下限', async () => {
    await createTestContext();
    await setFitnessDefaults({ reps: 0, weight: -5 });
    await expect(getFitnessDefaults()).resolves.toEqual({ reps: 1, weight: 0 });
  });

  it('小数或非数字按四舍五入处理', async () => {
    await createTestContext();
    await setFitnessDefaults({ reps: 10.6, weight: 39.4 });
    await expect(getFitnessDefaults()).resolves.toEqual({ reps: 11, weight: 39 });
  });

  it('新增训练动作时套用默认次数与重量', async () => {
    await createTestContext();
    await setFitnessDefaults({ reps: 12, weight: 40 });

    const id = await addTrainingItem({ date: DATE, exerciseId: 1, exerciseName: '卧推' });
    const item = (await listTrainingItems()).find((row) => row.id === id);

    expect(item?.reps).toBe(12);
    expect(item?.weight).toBe(40);
  });

  it('手动传入的次数与重量优先于默认值', async () => {
    await createTestContext();
    await setFitnessDefaults({ reps: 12, weight: 40 });

    await addTrainingItem({
      date: DATE,
      exerciseId: 1,
      exerciseName: '深蹲',
      reps: 5,
      weight: 62.5,
    });
    const [item] = await listTrainingItems();

    expect(item.reps).toBe(5);
    expect(item.weight).toBe(62.5);
  });

  it('改默认值只影响之后新增的动作，已有卡片保持不变', async () => {
    await createTestContext();
    await setFitnessDefaults({ reps: 8, weight: 0 });
    await addTrainingItem({ date: DATE, exerciseId: 1, exerciseName: '卧推' });

    await setFitnessDefaults({ reps: 12, weight: 40 });
    await addTrainingItem({ date: DATE, exerciseId: 2, exerciseName: '深蹲' });

    const items = await listTrainingItems();
    expect(items.map((row) => [row.exercise_name, row.reps, row.weight])).toEqual([
      ['卧推', 8, 0],
      ['深蹲', 12, 40],
    ]);
  });
});
