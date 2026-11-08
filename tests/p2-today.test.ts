import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests, getDriver } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  createTask,
  createTaskSeries,
  getTaskStats,
  listTasksByDate,
  moveTaskToDate,
  toggleTask,
  updateTask,
} from '@/db/repositories/tasks';
import {
  isValidTime,
  parseDurationInput,
  parseTimeInput,
  validateDurationMinutes,
  validateGameName,
  validateRating,
  validateTaskTitle,
} from '@/lib/validation';

const TODAY = '2026-11-06';

afterEach(() => {
  resetDriverForTests();
});

describe('P2 任务表单校验', () => {
  it('时间格式只接受 HH:mm，空值表示不设置', () => {
    expect(isValidTime('09:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('9:00')).toBe(false);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('09:60')).toBe(false);

    expect(parseTimeInput('')).toEqual({ value: null, error: null });
    expect(parseTimeInput('  ')).toEqual({ value: null, error: null });
    expect(parseTimeInput(' 08:15 ')).toEqual({ value: '08:15', error: null });
    expect(parseTimeInput('8:15').error).not.toBeNull();
  });

  it('必填项与长度限制', () => {
    expect(validateTaskTitle('   ')).toBe('任务内容不能为空');
    expect(validateTaskTitle('写周报')).toBeNull();
    expect(validateTaskTitle('x'.repeat(121))).not.toBeNull();

    expect(validateGameName('  ')).toBe('游戏名不能为空');
    expect(validateGameName('塞尔达')).toBeNull();
  });

  it('游玩时长与星级范围', () => {
    expect(validateDurationMinutes(0)).not.toBeNull();
    expect(validateDurationMinutes(1441)).not.toBeNull();
    expect(validateDurationMinutes(90)).toBeNull();

    expect(validateRating(0)).not.toBeNull();
    expect(validateRating(6)).not.toBeNull();
    expect(validateRating(3.5)).not.toBeNull();
    expect(validateRating(4)).toBeNull();

    expect(parseDurationInput('2', '30')).toEqual({ value: 150, error: null });
    expect(parseDurationInput('', '45')).toEqual({ value: 45, error: null });
    expect(parseDurationInput('1', '75').error).not.toBeNull();
    expect(parseDurationInput('-1', '0').error).not.toBeNull();
  });
});

describe('P2 任务操作细节', () => {
  it('顺延保留完成状态与备注', async () => {
    await createTestContext();
    const id = await createTask({ date: TODAY, title: '交材料', note: '带原件' });
    await toggleTask(id);
    await moveTaskToDate(id, '2026-11-08');

    const moved = (await listTasksByDate('2026-11-08'))[0];
    expect(moved.done).toBe(1);
    expect(moved.note).toBe('带原件');
    expect(moved.completed_at).not.toBeNull();
  });

  it('取消完成后 completed_at 被清空', async () => {
    await createTestContext();
    const id = await createTask({ date: TODAY, title: '浇花' });
    await toggleTask(id);
    await toggleTask(id);

    const task = (await listTasksByDate(TODAY))[0];
    expect(task.done).toBe(0);
    expect(task.completed_at).toBeNull();
    expect(await getTaskStats(TODAY)).toEqual({ total: 1, completed: 0 });
  });

  it('编辑可清空备注与时间', async () => {
    await createTestContext();
    const id = await createTask({ date: TODAY, title: '买菜', note: '记得买葱', time: '18:00' });
    await updateTask(id, { note: null, time: null });

    const task = (await listTasksByDate(TODAY))[0];
    expect(task.note).toBeNull();
    expect(task.time).toBeNull();
  });

  it('批量添加时每条都带同样的备注与时间', async () => {
    await createTestContext();
    await createTaskSeries({ date: TODAY, title: '背单词', note: '30 个', time: '07:30' }, 3);

    for (const date of ['2026-11-06', '2026-11-07', '2026-11-08']) {
      const tasks = await listTasksByDate(date);
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({ note: '30 个', time: '07:30', done: 0 });
    }
  });

  it('同一天多次添加按顺序追加，统计随之变化', async () => {
    await createTestContext();
    await createTask({ date: TODAY, title: 'A' });
    await createTaskSeries({ date: TODAY, title: 'B' }, 2);

    const tasks = await listTasksByDate(TODAY);
    expect(tasks.map((task) => task.title)).toEqual(['A', 'B']);
    expect(tasks.map((task) => task.sort_order)).toEqual([1, 2]);
    expect(await getTaskStats(TODAY)).toEqual({ total: 2, completed: 0 });

    const rows = await getDriver().getAllAsync<{ date: string }>(
      "SELECT date FROM tasks WHERE title = 'B' ORDER BY date"
    );
    expect(rows.map((row) => row.date)).toEqual(['2026-11-06', '2026-11-07']);
  });
});
