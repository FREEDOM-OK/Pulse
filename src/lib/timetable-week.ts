/** 课表周与日期的换算（周一到周日为一周）。 */

import { addDays, toDateStr } from './date';
import { weekdayOf } from './timetable';

/** date 所在周的周一。 */
export function mondayOf(date: string): string {
  const weekday = weekdayOf(date);
  return addDays(date, -(weekday - 1));
}

/** 第 week 周的周一：学期开始日所在周的周一 + (week - 1) * 7。 */
export function weekStartDate(termStart: string | null, week: number): string {
  const base = mondayOf(termStart ?? toDateStr(new Date()));
  const safeWeek = Math.max(1, Math.round(week));
  return addDays(base, (safeWeek - 1) * 7);
}

/** 某一周要显示的日期列表：默认 7 天，关掉周末时取前 5 天。 */
export function weekDates(termStart: string | null, week: number, showWeekend = true): string[] {
  const monday = weekStartDate(termStart, week);
  const count = showWeekend ? 7 : 5;
  return Array.from({ length: count }, (_, index) => addDays(monday, index));
}

/** 显示成 2026/11/9 这种紧凑日期。 */
export function compactDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${year}/${Number(month)}/${Number(day)}`;
}