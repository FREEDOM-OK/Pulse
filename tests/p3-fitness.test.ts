import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests, getDriver } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  addTrainingItem,
  completeSet,
  countSetsForItem,
  deleteSetRecord,
  deleteTrainingItem,
  getDayExercises,
  getTrainingSummary,
  listSetRecords,
  listTrainingItems,
  undoSet,
  updateTrainingItem,
} from '@/db/repositories/training';

const DATE = '2026-11-06';
const OTHER_DATE = '2026-11-07';

async function addItem(exerciseName: string, reps = 4, weight = 60) {
  return addTrainingItem({
    date: DATE,
    exerciseId: 1,
    exerciseName,
    reps,
    weight,
  });
}

afterEach(() => {
  resetDriverForTests();
});

describe('P3 健身：卡片与完成记录', () => {
  it('新建卡片会修正非法次数与重量', async () => {
    await createTestContext();
    const id = await addTrainingItem({
      date: DATE,
      exerciseId: null,
      exerciseName: '俯卧撑',
      reps: 0,
      weight: -20,
    });
    const item = (await listTrainingItems(DATE)).find((row) => row.id === id);
    expect(item?.reps).toBe(1);
    expect(item?.weight).toBe(0);
  });

  it('卡片被删除后再点完成会报错，但历史记录不清空', async () => {
    await createTestContext();
    const id = await addItem('卧推');
    await completeSet(id);
    await deleteTrainingItem(id);

    await expect(completeSet(id)).rejects.toThrow('训练项目不存在');
    expect(await listSetRecords(DATE)).toHaveLength(1);
  });

  it('撤销不存在的记录不会报错', async () => {
    await createTestContext();
    await expect(undoSet(9999)).resolves.toBeUndefined();
  });

  it('撤销唯一的组后，下一组从第 1 组重新开始', async () => {
    await createTestContext();
    const id = await addItem('深蹲', 5, 100);
    const record = await completeSet(id);
    await undoSet(record.id);

    expect(await countSetsForItem(id)).toBe(0);
    const again = await completeSet(id);
    expect(again.set_index).toBe(1);
  });

  it('撤销中间一组后剩余组重新编号，排序号不变', async () => {
    await createTestContext();
    const id = await addItem('卧推');
    await completeSet(id);
    const second = await completeSet(id);
    await completeSet(id);

    await undoSet(second.id);
    const records = await listSetRecords(DATE);
    expect(records.map((row) => row.set_index)).toEqual([1, 2]);
    expect(records.map((row) => row.sort_order)).toEqual([1, 3]);
  });

  it('删除已完成的一组（左滑删除）后剩余组重新编号', async () => {
    await createTestContext();
    const id = await addItem('卧推', 5, 60);
    const first = await completeSet(id);
    await completeSet(id);
    const third = await completeSet(id);
    await completeSet(id);

    await deleteSetRecord(third.id);

    const records = await listSetRecords(DATE);
    expect(records.map((row) => row.set_index)).toEqual([1, 2, 3]);
    expect(await countSetsForItem(id)).toBe(3);
    expect(records.some((row) => row.id === third.id)).toBe(false);
    expect(records.some((row) => row.id === first.id)).toBe(true);
  });

  it('不同日期的训练互不影响', async () => {
    await createTestContext();
    const today = await addItem('卧推');
    const tomorrow = await addTrainingItem({
      date: OTHER_DATE,
      exerciseId: 1,
      exerciseName: '深蹲',
      reps: 5,
      weight: 80,
    });

    await completeSet(today);
    await completeSet(tomorrow);
    await completeSet(tomorrow);

    expect(await listSetRecords(DATE)).toHaveLength(1);
    expect(await listSetRecords(OTHER_DATE)).toHaveLength(2);
    expect((await listSetRecords(OTHER_DATE)).map((row) => row.set_index)).toEqual([1, 2]);
    expect(await getTrainingSummary(DATE)).toMatchObject({ sets: 1, firstExercise: '卧推' });
    expect(await getTrainingSummary(OTHER_DATE)).toMatchObject({ sets: 2, firstExercise: '深蹲' });
  });

  it('只有卡片没有记录时，汇总为 0 组', async () => {
    await createTestContext();
    await addItem('引体向上', 8, 0);
    expect(await getTrainingSummary(DATE)).toEqual({ sets: 0, items: 1, firstExercise: null });
    expect(await getDayExercises(DATE)).toEqual([]);
  });

  it('同一天的多个动作各自动作汇总按首次点击顺序', async () => {
    await createTestContext();
    const squat = await addItem('深蹲', 5, 100);
    const bench = await addItem('卧推', 4, 60);

    await completeSet(squat);
    await completeSet(bench);
    await completeSet(bench);

    expect(await getDayExercises(DATE)).toEqual([
      { exerciseName: '深蹲', sets: 1 },
      { exerciseName: '卧推', sets: 2 },
    ]);
  });

  it('改次数/重量只影响之后的完成记录，历史记录不变', async () => {
    await createTestContext();
    const id = await addItem('卧推', 4, 60);
    await completeSet(id);
    await updateTrainingItem(id, { reps: 6, weight: 65 });
    await completeSet(id);

    const records = await listSetRecords(DATE);
    expect(records.map((row) => [row.reps, row.weight])).toEqual([
      [4, 60],
      [6, 65],
    ]);
  });

  it('动作库中的动作被删除后，卡片仍保留名字快照', async () => {
    await createTestContext();
    await getDriver().runAsync('DELETE FROM exercises WHERE name = ?', ['卧推']);
    const id = await addItem('卧推');
    await completeSet(id);

    const item = (await listTrainingItems(DATE))[0];
    expect(item.exercise_name).toBe('卧推');
    expect((await listSetRecords(DATE))[0].exercise_name).toBe('卧推');
  });

  it('点完成时使用界面最新的次数/重量，并回写到卡片', async () => {
    await createTestContext();
    const id = await addItem('卧推', 8, 0);
    const record = await completeSet(id, { reps: 5, weight: 60 });

    expect(record.reps).toBe(5);
    expect(record.weight).toBe(60);

    const item = (await listTrainingItems(DATE))[0];
    expect(item.reps).toBe(5);
    expect(item.weight).toBe(60);
  });
});
