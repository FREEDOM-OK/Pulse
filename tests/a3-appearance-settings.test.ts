import { describe, expect, it } from 'vitest';
import {
  CELL_HEIGHT_STEP,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_RADIUS,
  DEFAULT_GRID_BACKGROUND,
  DEFAULT_WEEK_START_DAY,
  MAX_CELL_HEIGHT,
  MAX_CELL_RADIUS,
  MIN_CELL_HEIGHT,
  MIN_CELL_RADIUS,
  clampNumber,
  visibleWeekDays,
} from '@/lib/timetable-core';

describe('课表外观设置：默认值与范围', () => {
  it('默认值落在允许区间内，且与设置页文案一致', () => {
    expect(DEFAULT_CELL_HEIGHT).toBe(64);
    expect(DEFAULT_CELL_HEIGHT).toBeGreaterThanOrEqual(MIN_CELL_HEIGHT);
    expect(DEFAULT_CELL_HEIGHT).toBeLessThanOrEqual(MAX_CELL_HEIGHT);
    expect(DEFAULT_CELL_RADIUS).toBe(6);
    expect(MIN_CELL_RADIUS).toBe(0);
    expect(MAX_CELL_RADIUS).toBe(18);
    expect(CELL_HEIGHT_STEP).toBe(2);
    expect(DEFAULT_GRID_BACKGROUND).toBe('#F5F5F7');
    expect(DEFAULT_WEEK_START_DAY).toBe(1);
  });

  it('clampNumber 夹取越界值，NaN 回落到下界', () => {
    expect(clampNumber(30, MIN_CELL_HEIGHT, MAX_CELL_HEIGHT)).toBe(MIN_CELL_HEIGHT);
    expect(clampNumber(120, MIN_CELL_HEIGHT, MAX_CELL_HEIGHT)).toBe(MAX_CELL_HEIGHT);
    expect(clampNumber(60, MIN_CELL_HEIGHT, MAX_CELL_HEIGHT)).toBe(60);
    expect(clampNumber(Number.NaN, MIN_CELL_RADIUS, MAX_CELL_RADIUS)).toBe(MIN_CELL_RADIUS);
  });
});

describe('可见星期序列', () => {
  it('周一起始且全年显示时是 1…7', () => {
    expect(visibleWeekDays(1, true, true)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('周日起始时把周日排到最前', () => {
    expect(visibleWeekDays(7, true, true)).toEqual([7, 1, 2, 3, 4, 5, 6]);
  });

  it('周六起始时把周六排到最前', () => {
    expect(visibleWeekDays(6, true, true)).toEqual([6, 7, 1, 2, 3, 4, 5]);
  });

  it('关闭周六 / 周日时对应列被剔除', () => {
    expect(visibleWeekDays(1, false, true)).toEqual([1, 2, 3, 4, 5, 7]);
    expect(visibleWeekDays(1, true, false)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(visibleWeekDays(1, false, false)).toEqual([1, 2, 3, 4, 5]);
  });

  it('周日起始且隐藏周日时，长度仍是 6 且不含 7', () => {
    const days = visibleWeekDays(7, true, false);
    expect(days).toHaveLength(6);
    expect(days).not.toContain(7);
    expect(days[0]).toBe(1);
  });
});