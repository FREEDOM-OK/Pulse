/** 课表布局与展示相关的纯函数（网格、周次文案、时段解析）。 */

import {
  isSlotActive,
  type CourseExceptionLike,
  type CourseLike,
  type CourseOnDate,
  DEFAULT_COURSE_COLOR,
} from './timetable';
import { periodRange } from './timetable-periods';
import type { PeriodTime } from '@/db/types';

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
export const WEEKDAY_FULL_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 默认只显示周一到周五；打开「含周末」后 7 列横滑。 */
export function visibleWeekdays(includeWeekend: boolean): number[] {
  return includeWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_FULL_LABELS[weekday - 1] ?? '';
}

/**
 * 周次文案：空 = 每周；全奇数 = 单周；全偶数 = 双周；
 * 否则按连续区间压缩成「第1-8,10周」。
 */
export function formatWeeks(weeks: number[]): string {
  const list = Array.from(new Set(weeks.filter((week) => Number.isInteger(week) && week >= 1))).sort(
    (a, b) => a - b
  );
  if (list.length === 0) return '每周';
  if (list.every((week) => week % 2 === 1)) return '单周';
  if (list.every((week) => week % 2 === 0)) return '双周';

  const ranges: string[] = [];
  let start = list[0];
  let prev = list[0];
  for (let index = 1; index <= list.length; index += 1) {
    const current = list[index];
    if (current != null && current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    if (current != null) {
      start = current;
      prev = current;
    }
  }
  return `第${ranges.join(',')}周`;
}

/**
 * 解析表单里的周次输入：
 * 「」/「每周」→ []；「单周」→ 奇数 1..total；「双周」→ 偶数；
 * 「1-8」/「1,3,5」/「1-8,10」→ 展开后的数组。
 */
export function parseWeeksInput(text: string, totalWeeks = 18): number[] {
  const raw = text.trim();
  if (raw.length === 0 || raw === '每周') return [];
  if (raw === '单周') {
    return Array.from({ length: totalWeeks }, (_, index) => index + 1).filter(
      (week) => week % 2 === 1
    );
  }
  if (raw === '双周') {
    return Array.from({ length: totalWeeks }, (_, index) => index + 1).filter(
      (week) => week % 2 === 0
    );
  }

  const result: number[] = [];
  for (const part of raw.split(/[,，、\s]+/)) {
    if (part.length === 0) continue;
    const range = part.match(/^(\d+)\s*[-~]\s*(\d+)$/);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      const [min, max] = from <= to ? [from, to] : [to, from];
      for (let week = Math.max(1, min); week <= Math.min(totalWeeks, max); week += 1) {
        result.push(week);
      }
      continue;
    }
    const single = Number(part);
    if (Number.isInteger(single) && single >= 1 && single <= totalWeeks) result.push(single);
  }
  return Array.from(new Set(result)).sort((a, b) => a - b);
}

/** 把 #RRGGBB 转成带透明度的 rgba，用于课程块底色。 */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return `rgba(76,141,246,${alpha})`;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 课程块在某一列中的位置：top / height 由节次和每节高度算出来。 */
export function blockRect(
  startPeriod: number,
  endPeriod: number,
  periodHeight: number,
  gap = 4
): { top: number; height: number } {
  const start = Math.min(startPeriod, endPeriod);
  const end = Math.max(startPeriod, endPeriod);
  return {
    top: (start - 1) * periodHeight + gap / 2,
    height: Math.max(periodHeight / 2, (end - start + 1) * periodHeight - gap),
  };
}

/** 某一列（星期几）在第 week 周要上的课，按开始节次升序。 */
export function coursesForWeekday(
  weekday: number,
  courses: CourseLike[],
  week: number,
  periodTimes: PeriodTime[],
  exceptions: CourseExceptionLike[] = []
): CourseOnDate[] {
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
        weekday,
        startPeriod: slot.startPeriod,
        endPeriod: slot.endPeriod,
        time: range.start && range.end ? `${range.start} – ${range.end}` : '',
      });
    }
  }
  return result.sort((a, b) => a.startPeriod - b.startPeriod || a.slotId - b.slotId);
}