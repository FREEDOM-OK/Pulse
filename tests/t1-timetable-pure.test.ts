import { describe, expect, it } from 'vitest';
import { compactDate, mondayOf, weekDates, weekStartDate } from '@/lib/timetable-week';
import { coursesOnDate, formatWeeksRange } from '@/lib/timetable';
import { DEFAULT_PERIOD_TIMES } from '@/lib/timetable-periods';

const TERM_START = '2026-08-31'; // 周一

describe('T1 周与日期换算', () => {
  it('mondayOf 取所在周的周一', () => {
    expect(mondayOf('2026-11-09')).toBe('2026-11-09'); // 周一
    expect(mondayOf('2026-11-12')).toBe('2026-11-09'); // 周四
    expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // 周日
    expect(mondayOf('2026-11-16')).toBe('2026-11-16'); // 下周一
  });

  it('weekStartDate 以学期开始日为第 1 周', () => {
    expect(weekStartDate(TERM_START, 1)).toBe('2026-08-31');
    expect(weekStartDate(TERM_START, 11)).toBe('2026-11-09');
    expect(weekStartDate(TERM_START, 0)).toBe('2026-08-31');
  });

  it('学期开始日不是周一时，第 1 周仍从那一周的周一算起', () => {
    expect(weekStartDate('2026-09-02', 1)).toBe('2026-08-31');
    expect(weekStartDate('2026-09-02', 2)).toBe('2026-09-07');
  });

  it('weekDates 默认 7 天，关掉周末后 5 天', () => {
    const full = weekDates(TERM_START, 11);
    expect(full).toHaveLength(7);
    expect(full[0]).toBe('2026-11-09');
    expect(full[6]).toBe('2026-11-15');

    const weekdays = weekDates(TERM_START, 11, false);
    expect(weekdays).toHaveLength(5);
    expect(weekdays[4]).toBe('2026-11-13');
  });

  it('compactDate 去掉前导零', () => {
    expect(compactDate('2026-11-09')).toBe('2026/11/9');
    expect(compactDate('2026-01-01')).toBe('2026/1/1');
  });
});

describe('T1 周次文案', () => {
  it('空数组或覆盖全部周次显示整段', () => {
    expect(formatWeeksRange([], 18)).toBe('第 1 – 18 周');
    expect(formatWeeksRange([1, 2, 3, 4], 4)).toBe('第 1 – 4 周');
  });

  it('全奇 / 全偶显示单双周', () => {
    expect(formatWeeksRange([1, 3, 5, 7], 18)).toBe('单周 第 1 – 7 周');
    expect(formatWeeksRange([2, 4, 6], 18)).toBe('双周 第 2 – 6 周');
  });

  it('混合周次合并连续区间', () => {
    expect(formatWeeksRange([1, 2, 3, 5, 9, 10], 18)).toBe('第 1 – 3、5、9 – 10 周');
  });
});

describe('T1 按周例外过滤', () => {
  const courses = [
    {
      id: 1,
      name: '高等数学',
      color: '#4C8DF6',
      slots: [{ id: 11, weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [] }],
    },
  ];

  it('没有例外时正常返回，带起止时间', () => {
    const rows = coursesOnDate('2026-11-09', courses, TERM_START, DEFAULT_PERIOD_TIMES);
    expect(rows).toHaveLength(1);
    expect(rows[0].time).toBe('08:00 – 09:40');
  });

  it('本周被排除后不返回，其它周不受影响', () => {
    const week = 11;
    const skipped = coursesOnDate('2026-11-09', courses, TERM_START, DEFAULT_PERIOD_TIMES, [
      { courseId: 1, week },
    ]);
    expect(skipped).toHaveLength(0);

    const otherWeek = coursesOnDate('2026-11-16', courses, TERM_START, DEFAULT_PERIOD_TIMES, [
      { courseId: 1, week },
    ]);
    expect(otherWeek).toHaveLength(1);
  });
});