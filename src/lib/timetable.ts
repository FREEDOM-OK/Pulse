/** 课表相关的纯函数：周次、单双周、节次重叠。 */

import { parseDate } from './date';
import { periodRange } from './timetable-periods';
import type { PeriodTime } from '@/db/types';

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
export function slotStartTime(periodTimes: PeriodTime[], startPeriod: number): string {
  return periodTimes[startPeriod - 1]?.start ?? '';
}

/**
 * 周次文案：
 * - 空数组（= 每周）或覆盖全部周次 →「第 1 – 18 周」
 * - 全奇数 →「单周 第 1 – 18 周」；全偶数 →「双周 第 1 – 18 周」
 * - 其它 → 合并连续区间，如「第 1 – 3、5、9 – 10 周」
 */
export function formatWeeksRange(weeks: number[], totalWeeks: number): string {
  const total = Math.max(1, totalWeeks);
  const sorted = normalizeWeeks(weeks);
  if (sorted.length === 0 || sorted.length >= total) return `第 1 – ${total} 周`;

  const allOdd = sorted.every((week) => week % 2 === 1);
  const allEven = sorted.every((week) => week % 2 === 0);
  if (allOdd && sorted.length > 1) return `单周 第 ${sorted[0]} – ${sorted[sorted.length - 1]} 周`;
  if (allEven) return `双周 第 ${sorted[0]} – ${sorted[sorted.length - 1]} 周`;

  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const week of sorted.slice(1)) {
    if (week === prev + 1) {
      prev = week;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start} – ${prev}`);
    start = week;
    prev = week;
  }
  parts.push(start === prev ? `${start}` : `${start} – ${prev}`);
  return `第 ${parts.join('、')} 周`;
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
  /** 起止时间 "HH:mm – HH:mm"，取不到时为空串。 */
  time: string;
}

/** 某门课在某一周被跳过。 */
export interface CourseExceptionLike {
  courseId: number;
  week: number;
}

/** 某一天实际要上的课（已过滤单双周、周次与「本周删除」），按开始节次升序。 */
export function coursesOnDate(
  date: string,
  courses: CourseLike[],
  termStart: string | null,
  periodTimes: PeriodTime[],
  exceptions: CourseExceptionLike[] = []
): CourseOnDate[] {
  const weekday = weekdayOf(date);
  const week = weekOfTerm(date, termStart);
  const skipped = new Set(
    exceptions.filter((item) => item.week === week).map((item) => item.courseId)
  );
  const result: CourseOnDate[] = [];

  for (const course of courses) {
    if (skipped.has(course.id)) continue;
    for (const slot of course.slots) {
      if (slot.weekday !== weekday) continue;
      if (!isSlotActive(slot.weeks, week)) continue;
      const range = periodRange(periodTimes, slot.startPeriod, slot.endPeriod);
      result.push({
        courseId: course.id,
        slotId: slot.id,
        name: course.name,
        color: course.color ?? DEFAULT_COURSE_COLOR,
        weekday: slot.weekday,
        startPeriod: slot.startPeriod,
        endPeriod: slot.endPeriod,
        time: range.start && range.end ? `${range.start} – ${range.end}` : '',
      });
    }
  }

  return result.sort((a, b) => a.startPeriod - b.startPeriod || a.slotId - b.slotId);
}