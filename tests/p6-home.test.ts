import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import { getDayDetail, getMonthActivity } from '@/db/repositories/calendar';
import { createTask } from '@/db/repositories/tasks';
import { addTrainingItem, completeSet } from '@/db/repositories/training';
import { addDietRecord } from '@/db/repositories/diet';
import { addWish, markPlayed } from '@/db/repositories/games';

afterEach(() => {
  resetDriverForTests();
});

describe('P6 日历聚合查询', () => {
  it('月度标记只返回有数据的日期，并区分四个模块', async () => {
    await createTestContext();

    await createTask({ date: '2026-11-06', title: '写周报' });
    const itemId = await addTrainingItem({
      date: '2026-11-06',
      exerciseId: 1,
      exerciseName: '卧推',
      reps: 4,
      weight: 60,
    });
    await completeSet(itemId);
    await addDietRecord({ date: '2026-11-07', mealType: 'lunch', content: '鸡胸肉饭', calories: 520 });
    const wishId = await addWish('塞尔达');
    await markPlayed(wishId, {
      durationMinutes: 60,
      experience: '',
      rating: 4,
      playedDate: '2026-11-08',
    });

    const activity = await getMonthActivity('2026-11-01', '2026-11-30');
    expect(activity['2026-11-06']).toEqual({
      tasks: true,
      fitness: true,
      diet: false,
      games: false,
    });
    expect(activity['2026-11-07']).toEqual({
      tasks: false,
      fitness: false,
      diet: true,
      games: false,
    });
    expect(activity['2026-11-08']).toEqual({
      tasks: false,
      fitness: false,
      diet: false,
      games: true,
    });
    expect(activity['2026-11-09']).toBeUndefined();

    const nextMonth = await getMonthActivity('2026-12-01', '2026-12-31');
    expect(Object.keys(nextMonth)).toHaveLength(0);
  });

  it('某天明细按模块返回，没有数据时为空', async () => {
    await createTestContext();
    await createTask({ date: '2026-11-06', title: '写周报' });
    const itemId = await addTrainingItem({
      date: '2026-11-06',
      exerciseId: 1,
      exerciseName: '卧推',
      reps: 4,
      weight: 60,
    });
    await completeSet(itemId);
    await completeSet(itemId);
    await addDietRecord({ date: '2026-11-06', mealType: 'breakfast', content: '燕麦牛奶', calories: 320 });

    const detail = await getDayDetail('2026-11-06');
    expect(detail.tasks.map((task) => task.title)).toEqual(['写周报']);
    expect(detail.fitness).toEqual([{ exerciseName: '卧推', sets: 2 }]);
    expect(detail.diet.totalCalories).toBe(320);
    expect(detail.diet.records).toHaveLength(1);
    expect(detail.games).toHaveLength(0);

    const empty = await getDayDetail('2026-11-10');
    expect(empty.tasks).toHaveLength(0);
    expect(empty.fitness).toHaveLength(0);
    expect(empty.diet.records).toHaveLength(0);
    expect(empty.diet.totalCalories).toBe(0);
    expect(empty.games).toHaveLength(0);
  });
});
