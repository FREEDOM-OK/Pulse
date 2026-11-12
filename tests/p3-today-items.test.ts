import { describe, expect, it } from 'vitest';
import type { MemoRow, TaskRow } from '@/db/types';
import type { CourseOnDate } from '@/features/timetable/bridge';
import { buildTodayItems, courseToTodayItem, memoToTodayItem, taskToTodayItem } from '@/lib/today-items';
import { sortTodayItems } from '@/lib/today-sort';

const DATE = '2026-11-08';

function task(over: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 1,
    date: DATE,
    title: '开会',
    note: null,
    time: null,
    done: 0,
    completed_at: null,
    repeat_group_id: null,
    sort_order: 0,
    pinned: 0,
    created_at: `${DATE}T09:00:00.000Z`,
    ...over,
  };
}

function memo(over: Partial<MemoRow> = {}): MemoRow {
  return {
    id: 1,
    date: DATE,
    content: '交房租',
    time: null,
    pinned: 0,
    sort_order: 0,
    created_at: `${DATE}T09:00:00.000Z`,
    updated_at: `${DATE}T09:00:00.000Z`,
    ...over,
  };
}

function course(over: Partial<CourseOnDate> = {}): CourseOnDate {
  return {
    courseId: 'c7',
    slotId: 's11',
    name: '高等数学',
    color: '#4C8DF6',
    weekday: 7,
    startPeriod: 1,
    endPeriod: 2,
    time: '08:00',
    ...over,
  };
}

describe('buildTodayItems', () => {
  it('计划条映射：key 带前缀、置顶与完成各自取 0/1 标志', () => {
    const item = taskToTodayItem(task({ id: 5, title: '写周报', pinned: 1, done: 1, note: '附带数据' }));
    expect(item).toMatchObject({
      kind: 'task',
      key: 'task-5',
      title: '写周报',
      pinned: true,
      done: true,
      note: '附带数据',
      time: null,
    });
  });

  it('备忘条映射：没有完成概念，内容映射到 title', () => {
    const item = memoToTodayItem(memo({ id: 3, content: '买牛奶', time: '18:30', pinned: 1 }));
    expect(item).toMatchObject({
      kind: 'memo',
      key: 'memo-3',
      title: '买牛奶',
      time: '18:30',
      pinned: true,
      done: false,
    });
  });

  it('课程派生行：sort_order 取开始节次，携带课程子对象', () => {
    const item = courseToTodayItem(DATE, course({ slotId: 's2', startPeriod: 3, endPeriod: 4 }));
    expect(item.kind).toBe('course');
    expect(item.key).toBe('course-s2');
    expect(item.date).toBe(DATE);
    expect(item.sort_order).toBe(3);
    expect(item.course).toEqual({
      slotId: 's2',
      courseId: 'c7',
      name: '高等数学',
      color: '#4C8DF6',
      startPeriod: 3,
      endPeriod: 4,
      room: undefined,
    });
  });

  it('三类条目合并后 key 唯一', () => {
    const items = buildTodayItems(
      DATE,
      [task({ id: 1 }), task({ id: 2 })],
      [memo({ id: 1 }), memo({ id: 2 })],
      [course({ slotId: 's1' })]
    );
    expect(items).toHaveLength(5);
    const keys = items.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('与排序内核串联：备忘在前模式下备忘排在计划前面', () => {
    const items = buildTodayItems(DATE, [task({ id: 1, title: '任务A' })], [memo({ id: 1 })], []);
    const sorted = sortTodayItems(items, 'memo-first');
    expect(sorted.active.map((item) => item.kind)).toEqual(['memo', 'task']);
  });

  it('空数据得到空列表', () => {
    expect(buildTodayItems(DATE, [], [], [])).toEqual([]);
  });
});