import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatDay,
  formatDuration,
  formatMonthDay,
  isToday,
  monthGrid,
  monthRange,
  parseDate,
  toDateStr,
  todayStr,
  weekdayLabel,
} from '@/lib/date';

describe('P1 日期工具', () => {
  it('todayStr 输出 YYYY-MM-DD', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isToday(todayStr())).toBe(true);
  });

  it('addDays 跨月与跨年正确', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-11-06', 6)).toBe('2026-11-12');
  });

  it('parseDate 使用本地时间且不回退一天', () => {
    const date = parseDate('2026-11-06');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(6);
    expect(toDateStr(date)).toBe('2026-11-06');
  });

  it('formatDay 输出中文日期与星期', () => {
    expect(formatDay('2026-11-06')).toBe('11月6日 周五');
  });

  it('formatMonthDay 只输出月日，星期单独给出', () => {
    expect(formatMonthDay('2026-11-06')).toBe('11月6日');
    expect(formatMonthDay('2026-01-01')).toBe('1月1日');
    expect(weekdayLabel(parseDate('2026-11-06'))).toBe('周五');
    expect(weekdayLabel(parseDate('2026-11-08'))).toBe('周日');
  });

  it('monthGrid 以周一开头并包含整月', () => {
    const weeks = monthGrid(2026, 10);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    const flat = weeks.flat();
    expect(flat).toContain('2026-11-01');
    expect(flat).toContain('2026-11-30');
    expect(flat).not.toContain('2026-12-01');

    const firstWeek = weeks[0];
    expect(firstWeek[6]).toBe('2026-11-01');
    expect(firstWeek.slice(0, 6).every((cell) => cell === null)).toBe(true);
  });

  it('monthRange 返回当月首尾', () => {
    expect(monthRange(2026, 10)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange(2026, 1)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('formatDuration 覆盖分钟与小时', () => {
    expect(formatDuration(0)).toBe('0 分钟');
    expect(formatDuration(45)).toBe('45 分钟');
    expect(formatDuration(60)).toBe('1 小时');
    expect(formatDuration(150)).toBe('2 小时 30 分钟');
  });
});
