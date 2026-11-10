/**
 * 今日列表排序内核。
 *
 * 首页 Tasks 与「今日计划」共用同一套排序，模式来自 settings.today.sortMode。
 * 规则见 PRD v1.2 5.1：置顶永远最前，已完成任务沉底，不参与排序。
 */

import type { SortMode } from '@/db/types';

export type TodayItemKind = 'task' | 'memo' | 'course';

export interface TodayItemCourse {
  /** 课表时段 id（课表主键是字符串）。 */
  slotId: string | number;
  courseId: string | number;
  name: string;
  color: string;
  startPeriod: number;
  endPeriod: number;
}

export interface TodayItem {
  kind: TodayItemKind;
  /** 全局唯一：`task:1` / `memo:3` / `course:5`。 */
  key: string;
  date: string;
  title: string;
  /** HH:mm，没有时间时为 null。 */
  time: string | null;
  pinned: boolean;
  /** 只有 task 有意义，其余恒 false。 */
  done: boolean;
  sort_order: number;
  note?: string | null;
  /** kind === 'course' 时存在。 */
  course?: TodayItemCourse;
}

export interface TodaySorted {
  /** 未完成项，已按模式排好序。 */
  active: TodayItem[];
  /** 已完成任务，按原始顺序沉底折叠。 */
  completed: TodayItem[];
}

function timeKey(item: TodayItem): string | null {
  const value = item.time?.trim();
  return value ? value : null;
}

/** 课程行归入「备忘」分组：它天然带时间，但不可勾选。 */
function isTaskLike(item: TodayItem): boolean {
  return item.kind === 'task';
}

function groupRank(item: TodayItem, mode: SortMode): number {
  if (mode === 'mixed') return 0;
  const taskFirst = mode === 'task-first';
  const rank = isTaskLike(item) ? 0 : 1;
  return taskFirst ? rank : 1 - rank;
}

/** 组内：有时间的按时间升序 → 没时间的在后 → sort_order → key 兜底稳定。 */
function compareWithinGroup(a: TodayItem, b: TodayItem): number {
  const at = timeKey(a);
  const bt = timeKey(b);
  if (at && bt && at !== bt) return at < bt ? -1 : 1;
  if (at && !bt) return -1;
  if (!at && bt) return 1;
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  if (a.key === b.key) return 0;
  return a.key < b.key ? -1 : 1;
}

function compareByMode(a: TodayItem, b: TodayItem, mode: SortMode): number {
  const rankDiff = groupRank(a, mode) - groupRank(b, mode);
  if (rankDiff !== 0) return rankDiff;
  return compareWithinGroup(a, b);
}

/** 纯函数排序，不修改入参数组。 */
export function sortTodayItems(items: readonly TodayItem[], mode: SortMode): TodaySorted {
  const completed: TodayItem[] = [];
  const active: TodayItem[] = [];

  for (const item of items) {
    if (item.kind === 'task' && item.done) completed.push(item);
    else active.push(item);
  }

  const pinned = active.filter((item) => item.pinned);
  const rest = active.filter((item) => !item.pinned);

  // 已完成不参与模式排序，只保持原有的 sort_order 顺序，避免勾选后位置乱跳。
  completed.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  return {
    active: [...pinned.sort((a, b) => compareByMode(a, b, mode)), ...rest.sort((a, b) => compareByMode(a, b, mode))],
    completed,
  };
}