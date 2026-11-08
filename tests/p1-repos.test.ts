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
  countEventsByDate,
  createEvent,
  deleteEvent,
  getEventDays,
  listEventsByDate,
} from '@/db/repositories/events';
import {
  createCustomExercise,
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

describe('P1 事件仓储', () => {
  it('只有名称必填；金额可空可小数；按创建时间倒序', async () => {
    await createTestContext();
    await createEvent({ date: DATE, type: 'expense', title: '买键盘', amount: 399 });
    await createEvent({ date: DATE, type: 'shopping', title: '跑鞋' });
    await createEvent({ date: DATE, type: 'meal', title: '牛肉面', amount: 28.5, note: '加蛋' });

    const events = await listEventsByDate(DATE);
    expect(events.map((event) => event.title)).toEqual(['牛肉面', '跑鞋', '买键盘']);
    expect(events.map((event) => event.amount)).toEqual([28.5, null, 399]);
    expect(events[0].note).toBe('加蛋');
    expect(await countEventsByDate(DATE)).toBe(3);
  });

  it('名称不能为空；不同日期互不影响；可删除', async () => {
    await createTestContext();
    await expect(createEvent({ date: DATE, type: 'meal', title: '   ' })).rejects.toThrow();

    const keep = await createEvent({ date: DATE, type: 'meal', title: '早餐' });
    await createEvent({ date: '2026-11-07', type: 'meal', title: '午餐' });

    expect(await getEventDays('2026-11-01', '2026-11-30')).toEqual([DATE, '2026-11-07']);
    await deleteEvent(keep);
    expect(await listEventsByDate(DATE)).toHaveLength(0);
    expect(await countEventsByDate(DATE)).toBe(0);
  });
});

describe('P1 动作库仓储', () => {
  it('包含自定义类；自定义动作可按组或按时间计，基础动作不可删除', async () => {
    await createTestContext();
    const grouped = await listExercisesByCategory();
    expect(Object.keys(grouped)).toHaveLength(8);
    expect(grouped['自定义类']).toEqual([]);
    for (const category of ['胸', '背', '腿', '肩', '手臂', '核心', '有氧']) {
      expect(grouped[category].length, `${category} 数量不足`).toBeGreaterThanOrEqual(4);
    }

    const id = await createCustomExercise('壶铃摇摆', 'duration');
    expect(await findExerciseByName('壶铃摇摆')).toMatchObject({
      category: '自定义类',
      trackingType: 'duration',
    });

    const all = await listExercises();
    const barbellSquat = all.find((exercise) => exercise.name === '杠铃深蹲');
    expect(barbellSquat).toMatchObject({ isPreset: true, trackingType: 'sets' });
    expect(all.find((exercise) => exercise.name === '慢跑')).toMatchObject({
      trackingType: 'duration',
    });

    if (!barbellSquat) throw new Error('缺少基础动作：杠铃深蹲');
    await deleteExercise(barbellSquat.id);
    expect(await findExerciseByName('杠铃深蹲')).not.toBeNull();

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
    expect((await listTrainingItems())[0].sort_order).toBe(1);

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
    expect(await listTrainingItems()).toHaveLength(0);
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
