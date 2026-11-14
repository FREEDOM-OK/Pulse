import { describe, expect, test } from 'vitest';
import {
  weeksFromRange,
  formatWeeks,
  isActiveOn,
  rowTop,
  rowBottom,
  blocksOf,
  periodsForTimeRange,
  softenColor,
  foregroundFor,
  parseImportText,
  timeToGridY,
  timeToMinutes,
} from '@/lib/timetable-core';

describe('timetable-core unit tests', () => {
  test('weeksFromRange(1,16,"all") -> [1..16]', () => {
    expect(weeksFromRange(1, 16, 'all')).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
  });

  test('weeksFromRange(1,8,"odd") -> [1,3,5,7]', () => {
    expect(weeksFromRange(1, 8, 'odd')).toEqual([1, 3, 5, 7]);
  });

  test('formatWeeks([1,2,3,5,7,9,10]) -> "1-3,5,7,9-10"', () => {
    expect(formatWeeks([1, 2, 3, 5, 7, 9, 10])).toBe('1-3,5,7,9-10');
  });

  test('formatWeeks([]) -> ""', () => {
    expect(formatWeeks([])).toBe('');
  });

  test('isActiveOn([], 17) -> true', () => {
    expect(isActiveOn([], 17)).toBe(true);
  });

  test('rowTop(1,58,20,4) -> 0', () => {
    expect(rowTop(1, 58, 20, 4)).toBe(0);
  });

  test('rowTop(5,58,20,4) -> 252', () => {
    expect(rowTop(5, 58, 20, 4)).toBe(252);
  });

  test('rowBottom(4,58,20,4) -> 232', () => {
    expect(rowBottom(4, 58, 20, 4)).toBe(232);
  });

  test('每节底线严格等于 top(k)+ROW_H（午休后不丢线）', () => {
    const ROW_H = 58;
    const LUNCH_H = 20;
    for (const lunchAfter of [0, 4, 5]) {
      for (let k = 1; k <= 11; k += 1) {
        expect(rowBottom(k, ROW_H, LUNCH_H, lunchAfter)).toBe(
          rowTop(k, ROW_H, LUNCH_H, lunchAfter) + ROW_H,
        );
      }
    }
    // 第 6 节 14:55 与第 7 节 16:00 的分界：top(7) 必须正好压在 bottom(6) 上
    expect(rowBottom(6, ROW_H, LUNCH_H, 4)).toBe(368);
    expect(rowTop(7, ROW_H, LUNCH_H, 4)).toBe(368);
  });

  test('blocksOf(3,6,4) -> [[3,4],[5,6]]', () => {
    expect(blocksOf(3, 6, 4)).toEqual([
      [3, 4],
      [5, 6],
    ]);
  });

  test('blocksOf(1,2,0) -> [[1,2]]', () => {
    expect(blocksOf(1, 2, 0)).toEqual([[1, 2]]);
  });

  test('softenColor("#EF4444", 0.8) -> "#EF6666"', () => {
    expect(softenColor('#EF4444', 0.8)).toBe('#EF6666');
  });

  test('foregroundFor("#EF4444") -> "#FFFFFF"', () => {
    expect(foregroundFor('#EF4444')).toBe('#FFFFFF');
  });

  test('parseImportText merges courses and reports exact errors', () => {
    const sample = `
高等数学 周一 1-2 1-16 张老师 A101
高等数学 周三 3-4 1-16 张老师 A101
大学英语 周三 3-4 1-16单 李老师 B203
体育 周五 5-6 王老师 操场
`;
    const res = parseImportText(sample, 20);
    expect(res.errors).toEqual([]);
    expect(res.courses.length).toBe(3);
    expect(res.totalSessions).toBe(4);

    const errSample = `高等数学 周一
高数 周八 1-2
英语 周一 1`;
    const errRes = parseImportText(errSample, 20);
    expect(errRes.errors).toEqual([
      '第 1 行：字段不足，至少需要「名称 星期 节次」',
      '第 2 行：无法识别星期「周八」',
      '第 3 行：无法识别节次「1」',
    ]);
  });
});

const CUSTOM_PERIODS = [
  { start: '07:40', end: '08:30' },
  { start: '08:30', end: '09:20' },
  { start: '09:20', end: '10:10' },
  { start: '10:30', end: '11:20' },
];

describe('自定义时间的网格映射', () => {
  test('timeToMinutes 接受 8:23，非法输入返回 NaN', () => {
    expect(timeToMinutes('08:23')).toBe(503);
    expect(timeToMinutes('8:23')).toBe(503);
    expect(timeToMinutes('')).toBeNaN();
    expect(timeToMinutes('abc')).toBeNaN();
  });

  test('节内按比例插值：08:00 落在第 1 节的 40%', () => {
    expect(timeToGridY(timeToMinutes('08:00'), CUSTOM_PERIODS, 58, 20, 4)).toBeCloseTo(
      0 + (20 / 50) * 58,
      5
    );
    expect(timeToGridY(timeToMinutes('09:08'), CUSTOM_PERIODS, 58, 20, 4)).toBeCloseTo(
      58 + (38 / 50) * 58,
      5
    );
  });

  test('早于第一节 → 0；晚于最后一节 → 网格底部', () => {
    expect(timeToGridY(timeToMinutes('07:00'), CUSTOM_PERIODS, 58, 20, 4)).toBe(0);
    expect(timeToGridY(timeToMinutes('12:00'), CUSTOM_PERIODS, 58, 20, 4)).toBe(
      rowBottom(CUSTOM_PERIODS.length, 58, 20, 4)
    );
  });

  test('午休区间按 lunchH 比例插值（lunchAfter=3，10:25 → 174 + 15）', () => {
    expect(timeToGridY(timeToMinutes('10:25'), CUSTOM_PERIODS, 58, 20, 3)).toBeCloseTo(189, 5);
  });

  test('普通课间没有像素空间，贴在下课那条线上', () => {
    expect(timeToGridY(timeToMinutes('10:25'), CUSTOM_PERIODS, 58, 20, 4)).toBe(174);
  });

  test('periodsForTimeRange 反推有交集的起止节次', () => {
    expect(periodsForTimeRange('08:00', '09:08', CUSTOM_PERIODS)).toEqual({
      startPeriod: 1,
      endPeriod: 2,
    });
    expect(periodsForTimeRange('09:20', '10:10', CUSTOM_PERIODS)).toEqual({
      startPeriod: 3,
      endPeriod: 3,
    });
    expect(periodsForTimeRange('06:00', '06:30', CUSTOM_PERIODS)).toBeNull();
  });
});
