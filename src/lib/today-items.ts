/**
 * 把某一天的三种数据源（计划 / 备忘 / 课程）拼成今日列表的统一条目。
 * 纯函数，方便单测；排序交给 sortTodayItems。
 */

import type { MemoRow, TaskRow } from '@/db/types';
import type { CourseOnDate } from '@/lib/timetable';
import type { TodayItem } from '@/lib/today-sort';

export function taskToTodayItem(task: TaskRow): TodayItem {
  return {
    kind: 'task',
    key: `task-${task.id}`,
    date: task.date,
    title: task.title,
    time: task.time ?? null,
    pinned: task.pinned === 1,
    done: task.done === 1,
    sort_order: task.sort_order,
    note: task.note ?? undefined,
  };
}

export function memoToTodayItem(memo: MemoRow): TodayItem {
  return {
    kind: 'memo',
    key: `memo-${memo.id}`,
    date: memo.date,
    title: memo.content,
    time: memo.time ?? null,
    pinned: memo.pinned === 1,
    done: false,
    sort_order: memo.sort_order,
  };
}

export function courseToTodayItem(date: string, course: CourseOnDate): TodayItem {
  return {
    kind: 'course',
    key: `course-${course.slotId}`,
    date,
    title: course.name,
    time: course.time,
    pinned: false,
    done: false,
    sort_order: course.startPeriod,
    course: {
      slotId: course.slotId,
      courseId: course.courseId,
      name: course.name,
      color: course.color,
      startPeriod: course.startPeriod,
      endPeriod: course.endPeriod,
    },
  };
}

export function buildTodayItems(
  date: string,
  tasks: readonly TaskRow[],
  memos: readonly MemoRow[],
  courses: readonly CourseOnDate[]
): TodayItem[] {
  return [
    ...tasks.map(taskToTodayItem),
    ...memos.map(memoToTodayItem),
    ...courses.map((course) => courseToTodayItem(date, course)),
  ];
}