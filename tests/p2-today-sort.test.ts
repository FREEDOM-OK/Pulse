import { describe, expect, it } from 'vitest';
import { sortTodayItems, type TodayItem } from '@/lib/today-sort';

function task(id: number, patch: Partial<TodayItem> = {}): TodayItem {
  return {
    kind: 'task',
    key: `task:${id}`,
    date: '2026-11-09',
    title: `任务${id}`,
    time: null,
    pinned: false,
    done: false,
    sort_order: id,
    ...patch,
  };
}

function memo(id: number, patch: Partial<TodayItem> = {}): TodayItem {
  return {
    kind: 'memo',
    key: `memo:${id}`,
    date: '2026-11-09',
    title: `备忘${id}`,
    time: null,
    pinned: false,
    done: false,
    sort_order: id,
    ...patch,
  };
}

function course(slotId: number, patch: Partial<TodayItem> = {}): TodayItem {
  return {
    kind: 'course',
    key: `course:${slotId}`,
    date: '2026-11-09',
    title: `课程${slotId}`,
    time: '08:00',
    pinned: false,
    done: false,
    sort_order: slotId,
    course: {
      slotId,
      courseId: 100,
      name: `课程${slotId}`,
      color: '#4C8DF6',
      startPeriod: 1,
      endPeriod: 2,
    },
    ...patch,
  };
}

const keys = (items: TodayItem[]) => items.map((item) => item.key);

describe('今日列表排序', () => {
  it('备忘在前：备忘有时间 → 备忘无时间 → 计划有时间 → 计划无时间', () => {
    const items = [
      task(1, { time: '18:00' }),
      task(2),
      memo(3),
      memo(4, { time: '09:00' }),
    ];

    const { active, completed } = sortTodayItems(items, 'memo-first');
    expect(keys(active)).toEqual(['memo:4', 'memo:3', 'task:1', 'task:2']);
    expect(completed).toEqual([]);
  });

  it('计划在前：计划优先，组内仍按时间升序、无时间在后', () => {
    const items = [memo(1, { time: '07:00' }), task(2), task(3, { time: '20:00' })];

    const { active } = sortTodayItems(items, 'task-first');
    expect(keys(active)).toEqual(['task:3', 'task:2', 'memo:1']);
  });

  it('按时间混排：备忘与计划合并后按时间升序，无时间的统一沉底', () => {
    const items = [
      task(1, { time: '12:00' }),
      memo(2, { time: '08:30' }),
      task(3),
      memo(4),
      course(5, { time: '10:00' }),
    ];

    const { active } = sortTodayItems(items, 'mixed');
    expect(keys(active)).toEqual(['memo:2', 'course:5', 'task:1', 'task:3', 'memo:4']);
  });

  it('置顶项在任何模式下都排在最前，置顶组内同样遵守模式', () => {
    const items = [
      task(1, { time: '08:00' }),
      memo(2, { pinned: true }),
      task(3, { pinned: true, time: '09:00' }),
    ];

    expect(keys(sortTodayItems(items, 'memo-first').active)).toEqual([
      'memo:2',
      'task:3',
      'task:1',
    ]);
    expect(keys(sortTodayItems(items, 'task-first').active)).toEqual([
      'task:3',
      'memo:2',
      'task:1',
    ]);
  });

  it('已完成任务沉底、不参与排序，且保持原有顺序', () => {
    const items = [
      task(1, { done: true, sort_order: 9 }),
      task(2, { time: '08:00' }),
      task(3, { done: true, sort_order: 2 }),
      memo(4),
    ];

    const { active, completed } = sortTodayItems(items, 'memo-first');
    expect(keys(active)).toEqual(['memo:4', 'task:2']);
    expect(keys(completed)).toEqual(['task:3', 'task:1']);
  });

  it('课程行归入备忘分组，按开始时间参与排序', () => {
    const items = [memo(1, { time: '10:00' }), course(2, { time: '08:00' })];

    expect(keys(sortTodayItems(items, 'memo-first').active)).toEqual(['course:2', 'memo:1']);
    expect(keys(sortTodayItems(items, 'task-first').active)).toEqual(['course:2', 'memo:1']);
  });

  it('时间为空串等同于没有时间', () => {
    const items = [course(1, { time: '' }), memo(2, { time: '09:00' })];

    const { active } = sortTodayItems(items, 'mixed');
    expect(keys(active)).toEqual(['memo:2', 'course:1']);
  });

  it('不修改传入的数组', () => {
    const items = [task(1, { time: '18:00' }), memo(2, { time: '08:00' })];
    const snapshot = keys(items);

    sortTodayItems(items, 'mixed');

    expect(keys(items)).toEqual(snapshot);
  });

  it('空列表返回空结果', () => {
    expect(sortTodayItems([], 'mixed')).toEqual({ active: [], completed: [] });
  });
});