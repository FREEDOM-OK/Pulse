import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests, getDriver } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  createTask,
  createTaskSeries,
  deleteTask,
  getTaskStats,
  listTasksByDate,
  moveTaskToDate,
  toggleTask,
  updateTask,
} from '@/db/repositories/tasks';
import {
  createMemo,
  deleteMemo,
  listMemos,
  toggleMemoPinned,
  updateMemo,
} from '@/db/repositories/memos';
import {
  createExercise,
  deleteExercise,
  findExerciseByName,
  listExercises,
  listExercisesByCategory,
} from '@/db/repositories/exercises';
import {
  addTrainingItem,
  completeSet,
  countSetsForItem,
  deleteTrainingItem,
  getDayExercises,
  getTrainingSummary,
  listSetRecords,
  listSetRecordsForItem,
  listTrainingItems,
  undoSet,
  updateTrainingItem,
} from '@/db/repositories/training';
import {
  addDietRecord,
  deleteDietRecord,
  getDietSummary,
  listDietByDate,
  updateDietRecord,
} from '@/db/repositories/diet';
import {
  addWish,
  deletePlayed,
  getLatestPlayed,
  listPlayed,
  listWishlist,
  markPlayed,
  updatePlayed,
} from '@/db/repositories/games';
import { getTheme, setTheme, getAllSettings } from '@/db/repositories/settings';

const DATE = '2026-11-06';

afterEach(() => {
  resetDriverForTests();
});

describe('P1 今日计划仓储', () => {
  it('新增、统计、勾选、编辑、删除', async () => {
    await createTestContext();
    const id = await createTask({ date: DATE, title: '写周报', note: '周五前', time: '09:00' });

    let tasks = await listTasksByDate(DATE);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ title: '写周报', time: '09:00', done: 0 });
    expect(await getTaskStats(DATE)).toEqual({ total: 1, completed: 0 });

    const done = await toggleTask(id);
    expect(done).toBe(true);
    tasks = await listTasksByDate(DATE);
    expect(tasks[0].done).toBe(1);
    expect(tasks[0].completed_at).not.toBeNull();
    expect(await getTaskStats(DATE)).toEqual({ total: 1, completed: 1 });

    await updateTask(id, { title: '写月报', time: null });
    tasks = await listTasksByDate(DATE);
    expect(tasks[0].title).toBe('写月报');
    expect(tasks[0].time).toBeNull();

    await deleteTask(id);
    expect(await listTasksByDate(DATE)).toHaveLength(0);
  });

  it('顺延到另一天后从原日期消失', async () => {
    await createTestContext();
    const id = await createTask({ date: DATE, title: '买菜' });
    await moveTaskToDate(id, '2026-11-07');

    expect(await listTasksByDate(DATE)).toHaveLength(0);
    const moved = await listTasksByDate('2026-11-07');
    expect(moved.map((t) => t.title)).toEqual(['买菜']);
    expect(moved[0].date).toBe('2026-11-07');
  });

  it('一次添加到 3 天：每天一条独立任务，共用批次号', async () => {
    await createTestContext();
    const ids = await createTaskSeries({ date: DATE, title: '晨读' }, 3);
    expect(ids).toHaveLength(3);

    const days = ['2026-11-06', '2026-11-07', '2026-11-08'];
    for (const day of days) {
      const tasks = await listTasksByDate(day);
      expect(tasks.map((t) => t.title)).toEqual(['晨读']);
    }

    const all = await getDriver().getAllAsync<{ repeat_group_id: string }>(
      'SELECT repeat_group_id FROM tasks ORDER BY date'
    );
    expect(new Set(all.map((row) => row.repeat_group_id)).size).toBe(1);

    await toggleTask(ids[0]);
    expect((await listTasksByDate(days[0]))[0].done).toBe(1);
    expect((await listTasksByDate(days[1]))[0].done).toBe(0);
  });

  it('一次添加到 7 天：跨月正确', async () => {
    await createTestContext();
    await createTaskSeries({ date: '2026-10-28', title: '练琴' }, 7);
    expect(await listTasksByDate('2026-10-28')).toHaveLength(1);
    expect(await listTasksByDate('2026-11-03')).toHaveLength(1);
    expect(await listTasksByDate('2026-11-04')).toHaveLength(0);
  });

  it('同一天内新任务排在末尾', async () => {
    await createTestContext();
    await createTask({ date: DATE, title: 'A' });
    await createTask({ date: DATE, title: 'B' });
    await createTask({ date: DATE, title: 'C' });
    const titles = (await listTasksByDate(DATE)).map((t) => t.title);
    expect(titles).toEqual(['A', 'B', 'C']);
  });
});

describe('P1 备忘仓储', () => {
  it('标签最多保留 3 个，置顶排最前', async () => {
    await createTestContext();
    const a = await createMemo({ content: '交房租', tags: ['财务', '生活', '多余', '第四个'] });
    const b = await createMemo({ content: '给车做保养', tags: ['生活'] });

    let memos = await listMemos();
    expect(memos).toHaveLength(2);
    const memoA = memos.find((memo) => memo.id === a);
    expect(memoA?.tags).toEqual(['财务', '生活', '多余']);

    await toggleMemoPinned(b);
    memos = await listMemos();
    expect(memos[0].content).toBe('给车做保养');
    expect(memos[0].pinned).toBe(true);
    expect(memos[1].content).toBe('交房租');

    await toggleMemoPinned(b);
    await updateMemo(a, { content: '交房租和水电费', tags: ['财务'] });
    memos = await listMemos();
    expect(memos[0].content).toBe('交房租和水电费');
    expect(memos[0].tags).toEqual(['财务']);

    await deleteMemo(a);
    expect(await listMemos()).toHaveLength(1);
  });
});

describe('P1 动作库仓储', () => {
  it('按部位分组，每组至少 4 个；可新增与删除自定义动作', async () => {
    await createTestContext();
    const grouped = await listExercisesByCategory();
    expect(Object.keys(grouped)).toHaveLength(7);
    for (const [category, list] of Object.entries(grouped)) {
      expect(list.length, `${category} 数量不足`).toBeGreaterThanOrEqual(4);
    }

    const id = await createExercise('壶铃摇摆', '腿');
    expect((await findExerciseByName('壶铃摇摆'))?.category).toBe('腿');

    const all = await listExercises();
    expect(all.some((exercise) => exercise.name === '深蹲')).toBe(true);

    await deleteExercise(id);
    expect(await findExerciseByName('壶铃摇摆')).toBeNull();
  });
});

describe('P1 健身仓储', () => {
  it('完成打卡按顺序编号，撤销后重新编号', async () => {
    await createTestContext();
    const itemId = await addTrainingItem({
      date: DATE,
      exerciseId: 1,
      exerciseName: '卧推',
      reps: 4,
      weight: 60,
    });
    expect((await listTrainingItems(DATE))[0].sort_order).toBe(1);

    await completeSet(itemId);
    await completeSet(itemId);
    const third = await completeSet(itemId);

    let records = await listSetRecords(DATE);
    expect(records.map((row) => row.set_index)).toEqual([1, 2, 3]);
    expect(records.map((row) => row.sort_order)).toEqual([1, 2, 3]);
    expect(records[0]).toMatchObject({ exercise_name: '卧推', reps: 4, weight: 60 });

    await undoSet(records[1].id);
    records = await listSetRecords(DATE);
    expect(records.map((row) => row.set_index)).toEqual([1, 2]);
    expect(records.map((row) => row.exercise_name)).toEqual(['卧推', '卧推']);
    expect(await countSetsForItem(itemId)).toBe(2);

    await completeSet(itemId);
    records = await listSetRecords(DATE);
    expect(records.map((row) => row.set_index)).toEqual([1, 2, 3]);

    expect(third.set_index).toBe(3);
    expect(await countSetsForItem(itemId)).toBe(3);
  });

  it('修改次数与重量后，新完成的组用新值', async () => {
    await createTestContext();
    const itemId = await addTrainingItem({
      date: DATE,
      exerciseId: 1,
      exerciseName: '深蹲',
      reps: 5,
      weight: 100,
    });
    await updateTrainingItem(itemId, { reps: 6, weight: 110 });
    await completeSet(itemId);

    const records = await listSetRecords(DATE);
    expect(records[0]).toMatchObject({ reps: 6, weight: 110 });
  });

  it('删除卡片后已完成记录与汇总仍保留', async () => {
    await createTestContext();
    const itemId = await addTrainingItem({
      date: DATE,
      exerciseId: 1,
      exerciseName: '卧推',
      reps: 4,
      weight: 60,
    });
    await completeSet(itemId);
    await completeSet(itemId);

    await deleteTrainingItem(itemId);
    expect(await listTrainingItems(DATE)).toHaveLength(0);
    expect(await listSetRecords(DATE)).toHaveLength(2);

    const summary = await getTrainingSummary(DATE);
    expect(summary.sets).toBe(2);
    expect(summary.firstExercise).toBe('卧推');

    const dayExercises = await getDayExercises(DATE);
    expect(dayExercises).toEqual([{ exerciseName: '卧推', sets: 2 }]);
  });

  it('多个动作的完成记录按点击顺序排列', async () => {
    await createTestContext();
    const bench = await addTrainingItem({
      date: DATE,
      exerciseId: 1,
      exerciseName: '卧推',
      reps: 4,
      weight: 60,
    });
    const squat = await addTrainingItem({
      date: DATE,
      exerciseId: 2,
      exerciseName: '深蹲',
      reps: 5,
      weight: 100,
    });

    await completeSet(bench);
    await completeSet(squat);
    await completeSet(bench);

    const records = await listSetRecords(DATE);
    expect(records.map((row) => row.exercise_name)).toEqual(['卧推', '深蹲', '卧推']);
    expect(records.map((row) => row.set_index)).toEqual([1, 1, 2]);
  });
});

describe('P1 饮食仓储', () => {
  it('按餐次记录、热量合计、编辑与删除', async () => {
    await createTestContext();
    await addDietRecord({ date: DATE, mealType: 'breakfast', content: '燕麦牛奶', calories: 320 });
    await addDietRecord({ date: DATE, mealType: 'lunch', content: '鸡胸肉饭', calories: 780 });
    await addDietRecord({ date: DATE, mealType: 'snack', content: '苹果' });

    const records = await listDietByDate(DATE);
    expect(records).toHaveLength(3);
    expect(records.map((row) => row.meal_type)).toEqual(['breakfast', 'lunch', 'snack']);
    expect(await getDietSummary(DATE)).toEqual({ totalCalories: 1100, records: 3 });

    await updateDietRecord(records[2].id, { calories: 90 });
    expect((await getDietSummary(DATE)).totalCalories).toBe(1190);

    await deleteDietRecord(records[0].id);
    expect((await getDietSummary(DATE)).totalCalories).toBe(870);
  });

  it('不填热量的记录不计入合计', async () => {
    await createTestContext();
    await addDietRecord({ date: DATE, mealType: 'dinner', content: '随便吃了点' });
    expect(await getDietSummary(DATE)).toEqual({ totalCalories: 0, records: 1 });
  });
});

describe('P1 游戏仓储', () => {
  it('想玩 -> 玩了：生成已玩记录并移出想玩清单', async () => {
    await createTestContext();
    const wishId = await addWish('塞尔达：王国之泪', '想玩很久了');
    expect(await listWishlist()).toHaveLength(1);

    const playedId = await markPlayed(wishId, {
      durationMinutes: 150,
      experience: '探索感很强',
      rating: 5,
      playedDate: DATE,
    });

    expect(await listWishlist()).toHaveLength(0);
    const played = await listPlayed();
    expect(played).toHaveLength(1);
    expect(played[0]).toMatchObject({
      id: playedId,
      game_name: '塞尔达：王国之泪',
      duration_minutes: 150,
      rating: 5,
      played_date: DATE,
    });
    expect((await getLatestPlayed())?.game_name).toBe('塞尔达：王国之泪');
  });

  it('评分与时长会被限制在合法范围', async () => {
    await createTestContext();
    const wishId = await addWish('黑神话：悟空');
    await markPlayed(wishId, {
      durationMinutes: 0,
      experience: '',
      rating: 9,
      playedDate: DATE,
    });
    const played = await listPlayed();
    expect(played[0].rating).toBe(5);
    expect(played[0].duration_minutes).toBe(1);
    expect(played[0].experience).toBeNull();
  });

  it('已记录过的想玩条目不能重复标记', async () => {
    await createTestContext();
    const wishId = await addWish('艾尔登法环');
    await markPlayed(wishId, {
      durationMinutes: 60,
      experience: '',
      rating: 4,
      playedDate: DATE,
    });
    await expect(
      markPlayed(wishId, { durationMinutes: 60, experience: '', rating: 4, playedDate: DATE })
    ).rejects.toThrow('该游戏已经记录过游玩');
  });

  it('已玩记录可修改与删除，并按日期倒序', async () => {
    await createTestContext();
    const first = await addWish('游戏A');
    const second = await addWish('游戏B');
    const a = await markPlayed(first, {
      durationMinutes: 60,
      experience: '还行',
      rating: 3,
      playedDate: '2026-11-05',
    });
    await markPlayed(second, {
      durationMinutes: 120,
      experience: '很棒',
      rating: 5,
      playedDate: '2026-11-06',
    });

    const played = await listPlayed();
    expect(played.map((row) => row.game_name)).toEqual(['游戏B', '游戏A']);

    await updatePlayed(a, { rating: 4, experience: '越玩越好' });
    const updated = (await listPlayed()).find((row) => row.id === a);
    expect(updated?.rating).toBe(4);
    expect(updated?.experience).toBe('越玩越好');

    await deletePlayed(a);
    expect(await listPlayed()).toHaveLength(1);
  });
});

describe('P1 设置仓储', () => {
  it('主题设置可写入、读取、覆盖', async () => {
    await createTestContext();
    expect(await getTheme()).toBe('system');
    await setTheme('dark');
    expect(await getTheme()).toBe('dark');
    await setTheme('light');
    expect(await getTheme()).toBe('light');
    expect(await getAllSettings()).toEqual({ theme: 'light' });
  });
});
