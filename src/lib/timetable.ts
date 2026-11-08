/** 课表相关的纯函数：周次、单双周、节次重叠。 */

import { parseDate } from './date';

/** 周一 = 1 … 周日 = 7。 */
export function weekdayOf(dateStr: string): number {
  const day = parseDate(dateStr).getDay();
  return day === 0 ? 7 : day;
}

/** 学期起始日期所在周为第 1 周；未设置学期或早于起始日时返回 1。 */
export function weekOfTerm(today: string, termStart: string | null): number {
  if (!termStart) return 1;
  const start = parseDate(termStart).getTime();
  const current = parseDate(today).getTime();
  const diffDays = Math.floor((current - start) / 86_400_000);
  if (!Number.isFinite(diffDays) || diffDays < 0) return 1;
  return Math.floor(diffDays / 7) + 1;
}

/** 周次数组去重、过滤非法值并升序。空数组表示「每周」。 */
export function normalizeWeeks(weeks: number[]): number[] {
  const valid = weeks
    .map((week) => Math.round(week))
    .filter((week) => Number.isInteger(week) && week >= 1);
  return Array.from(new Set(valid)).sort((a, b) => a - b);
}

/** 该时段在第 week 周是否上课；weeks 为空表示每周。 */
export function isSlotActive(slotWeeks: number[], week: number): boolean {
  if (slotWeeks.length === 0) return true;
  return slotWeeks.includes(week);
}

/** 两组周次是否有交集；任一方为空数组（=每周）视为有交集。 */
export function weeksOverlap(a: number[], b: number[]): boolean {
  if (a.length === 0 || b.length === 0) return true;
  return a.some((week) => b.includes(week));
}

/** 两个节次区间是否重叠（共享同一节即算重叠，如 1-2 与 2-3）。 */
export function periodsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/** 第 startPeriod 节的开始时间；没有配置时返回空串。 */
export function slotStartTime(periodTimes: string[], startPeriod: number): string {
  return periodTimes[startPeriod - 1] ?? '';
}

export const DEFAULT_COURSE_COLOR = '#4C8DF6';

export interface CourseLike {
  id: number;
  name: string;
  color: string | null;
  slots: {
    id: number;
    weekday: number;
    startPeriod: number;
    endPeriod: number;
    weeks: number[];
  }[];
}

export interface CourseOnDate {
  courseId: number;
  slotId: number;
  name: string;
  color: string;
  weekday: number;
  startPeriod: number;
  endPeriod: number;
  /** 开始时间 HH:mm，取不到时为空串。 */
  time: string;
}

/** 某一天实际要上的课（已过滤单双周与周次），按开始节次升序。 */
export function coursesOnDate(
  date: string,
  courses: CourseLike[],
  termStart: string | null,
  periodTimes: string[]
): CourseOnDate[] {
  const weekday = weekdayOf(date);
  const week = weekOfTerm(date, termStart);
  const result: CourseOnDate[] = [];

  for (const course of courses) {
    for (const slot of course.slots) {
      if (slot.weekday !== weekday) continue;
      if (!isSlotActive(slot.weeks, week)) continue;
      result.push({
        courseId: course.id,
        slotId: slot.id,
        name: course.name,
        color: course.color ?? DEFAULT_COURSE_COLOR,
        weekday: slot.weekday,
        startPeriod: slot.startPeriod,
        endPeriod: slot.endPeriod,
        time: slotStartTime(periodTimes, slot.startPeriod),
      });
    }
  }

  return result.sort((a, b) => a.startPeriod - b.startPeriod || a.slotId - b.slotId);
}