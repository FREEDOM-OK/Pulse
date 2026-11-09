/** 课表节次时间（开始 / 结束）相关的纯函数。 */

import type { PeriodTime } from '@/db/types';

/** 默认 11 节：08:00–08:45 … 20:50–21:35。 */
export const DEFAULT_PERIOD_TIMES: PeriodTime[] = [
  { start: '08:00', end: '08:45' },
  { start: '08:55', end: '09:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '14:00', end: '14:45' },
  { start: '14:55', end: '15:40' },
  { start: '16:00', end: '16:45' },
  { start: '16:55', end: '17:40' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' },
  { start: '20:50', end: '21:35' },
  // 12–16 节只有把「节数」调大时才会用到，时间排在 21:35 之后。
  { start: '21:45', end: '22:30' },
  { start: '22:35', end: '23:20' },
  { start: '23:25', end: '00:10' },
  { start: '00:15', end: '01:00' },
  { start: '01:05', end: '01:50' },
];

export const MIN_PERIOD_COUNT = 1;
export const MAX_PERIOD_COUNT = 16;
export const DEFAULT_PERIOD_COUNT = 11;

export const MIN_ROW_HEIGHT = 32;
export const MAX_ROW_HEIGHT = 128;
export const DEFAULT_ROW_HEIGHT = 64;

/** HH:MM（24 小时制）。 */
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function toMinutes(value: string): number {
  if (!isValidTime(value)) return -1;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

/** 分钟数转 HH:MM；跨天时对 24 小时取模。 */
export function fromMinutes(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function clampPeriodCount(value: number): number {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) return DEFAULT_PERIOD_COUNT;
  return Math.min(MAX_PERIOD_COUNT, Math.max(MIN_PERIOD_COUNT, rounded));
}

export function clampRowHeight(value: number): number {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) return DEFAULT_ROW_HEIGHT;
  return Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, rounded));
}

function isPeriodTime(value: unknown): value is PeriodTime {
  if (!value || typeof value !== 'object') return false;
  const item = value as { start?: unknown; end?: unknown };
  return typeof item.start === 'string' && typeof item.end === 'string' && isValidTime(item.start) && isValidTime(item.end);
}

/**
 * 归一化节次时间，兼容三种历史数据：
 * - 旧结构：`['08:00', '08:55', …]`，结束时间 = 下一节开始；最后一节 = 开始 + 45 分钟。
 * - 新结构：`[{ start, end }, …]`。
 * - 损坏值：回退到默认作息。
 * 结果长度固定为 periodCount，不足时用默认作息补齐。
 */
export function normalizePeriodTimes(raw: unknown, periodCount: number): PeriodTime[] {
  const count = clampPeriodCount(periodCount);
  const source = Array.isArray(raw) ? raw : [];

  const converted: PeriodTime[] = source.map((item, index) => {
    if (typeof item === 'string') {
      const next = source[index + 1];
      const nextStart = typeof next === 'string' ? next : null;
      const start = isValidTime(item) ? item : DEFAULT_PERIOD_TIMES[index]?.start ?? '';
      const end = nextStart && isValidTime(nextStart)
        ? nextStart
        : fromMinutes(toMinutes(start) + 45);
      return { start, end };
    }
    if (isPeriodTime(item)) return { start: item.start, end: item.end };
    return { start: '', end: '' };
  });

  return Array.from({ length: count }, (_, index) => {
    const value = converted[index];
    if (value && isValidTime(value.start) && isValidTime(value.end)) return value;
    return DEFAULT_PERIOD_TIMES[index] ?? { start: '', end: '' };
  });
}

/** 第 startPeriod~endPeriod 节的起止时间；越界自动裁剪，取不到时返回空串。 */
export function periodRange(
  times: PeriodTime[],
  startPeriod: number,
  endPeriod: number
): { start: string; end: string } {
  if (times.length === 0) return { start: '', end: '' };
  const start = Math.min(Math.max(1, startPeriod), times.length);
  const end = Math.min(Math.max(start, endPeriod), times.length);
  return {
    start: times[start - 1]?.start ?? '',
    end: times[end - 1]?.end ?? '',
  };
}

/** 返回第一个与上一节时间重叠的节次（1 起），没有冲突返回 null。跨零点的节次按次日计算。 */
export function findPeriodOverlap(times: PeriodTime[]): number | null {
  let prevEnd = Number.NaN;
  for (let index = 0; index < times.length; index += 1) {
    const current = times[index];
    if (!current || !isValidTime(current.start) || !isValidTime(current.end)) {
      prevEnd = Number.NaN;
      continue;
    }
    let start = toMinutes(current.start);
    let end = toMinutes(current.end);
    if (!Number.isNaN(prevEnd) && start < prevEnd - 1440 / 2) start += 1440;
    if (end <= start) end += 1440;
    if (!Number.isNaN(prevEnd) && start < prevEnd) return index + 1;
    prevEnd = end;
  }
  return null;
}