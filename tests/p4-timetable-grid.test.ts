import { describe, expect, it } from 'vitest';
import {
  blockRect,
  coursesForWeekday,
  formatWeeks,
  parseWeeksInput,
  visibleWeekdays,
  weekdayLabel,
  withAlpha,
} from '@/lib/timetable-grid';
import type { CourseLike } from '@/lib/timetable';

describe('课表网格纯函数', () => {
  it('默认显示周一~周五，开启含周末后是 7 列', () => {
    expect(visibleWeekdays(false)).toEqual([1, 2, 3, 4, 5]);
    expect(visibleWeekdays(true)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weekdayLabel(1)).toBe('周一');
    expect(weekdayLabel(7)).toBe('周日');
  });

  it('周次文案：每周/单周/双周/区间压缩', () => {
    expect(formatWeeks([])).toBe('每周');
    expect(formatWeeks([1, 3, 5, 7])).toBe('单周');
    expect(formatWeeks([2, 4, 6])).toBe('双周');
    expect(formatWeeks([1, 2, 3, 4, 5])).toBe('第1-5周');
    expect(formatWeeks([1, 2, 3, 9, 10])).toBe('第1-3,9-10周');
  });

  it('解析周次输入：空=每周、单双周、区间与逗号混写', () => {
    expect(parseWeeksInput('', 18)).toEqual([]);
    expect(parseWeeksInput('每周', 18)).toEqual([]);
    expect(parseWeeksInput('单周', 8)).toEqual([1, 3, 5, 7]);
    expect(parseWeeksInput('双周', 8)).toEqual([2, 4, 6, 8]);
    expect(parseWeeksInput('1-4', 18)).toEqual([1, 2, 3, 4]);
    expect(parseWeeksInput('1,3,5', 18)).toEqual([1, 3, 5]);
    expect(parseWeeksInput('1-3,9', 18)).toEqual([1, 2, 3, 9]);
    expect(parseWeeksInput('4-1', 18)).toEqual([1, 2, 3, 4]);
  });

  it('解析周次输入会裁掉越界与重复值', () => {
    expect(parseWeeksInput('0,1,25', 18)).toEqual([1]);
    expect(parseWeeksInput('2,2,3', 18)).toEqual([2, 3]);
    expect(parseWeeksInput('18-20', 18)).toEqual([18]);
  });

  it('课程块位置：单节与跨节的高度按每节高度计算', () => {
    const single = blockRect(1, 1, 60);
    expect(single.top).toBe(2);
    expect(single.height).toBe(56);

    const span = blockRect(3, 4, 60);
    expect(span.top).toBe(122);
    expect(span.height).toBe(116);
  });

  it('课程块位置：起止节写反也能纠正', () => {
    expect(blockRect(4, 3, 60)).toEqual(blockRect(3, 4, 60));
  });

  it('课程色加透明度：正常色值转 rgba，非法值回退蓝色', () => {
    expect(withAlpha('#4C8DF6', 0.12)).toBe('rgba(76,141,246,0.12)');
    expect(withAlpha('#ffffff', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(withAlpha('red', 0.12)).toBe('rgba(76,141,246,0.12)');
  });

  const courses: CourseLike[] = [
    {
      id: 1,
      name: '高等数学',
      color: '#4C8DF6',
      slots: [
        { id: 1, weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [] },
        { id: 2, weekday: 1, startPeriod: 3, endPeriod: 4, weeks: [2, 4] },
        { id: 3, weekday: 6, startPeriod: 1, endPeriod: 2, weeks: [] },
      ],
    },
    {
      id: 2,
      name: '英语',
      color: null,
      slots: [{ id: 4, weekday: 1, startPeriod: 5, endPeriod: 6, weeks: [1] }],
    },
  ];

  it('按星期取课并过滤单双周，默认颜色补齐', () => {
    const times = ['08:00', '08:55', '10:00', '10:55', '14:00', '14:55', '16:00', '16:55'];

    const oddWeek = coursesForWeekday(1, courses, 1, times);
    expect(oddWeek.map((item) => item.slotId)).toEqual([1, 4]);
    expect(oddWeek[1].color).toBe('#4C8DF6');
    expect(oddWeek[0].time).toBe('08:00');

    const evenWeek = coursesForWeekday(1, courses, 2, times);
    expect(evenWeek.map((item) => item.slotId)).toEqual([1, 2]);
    expect(evenWeek[1].time).toBe('10:00');

    expect(coursesForWeekday(6, courses, 1, times)).toHaveLength(1);
    expect(coursesForWeekday(7, courses, 1, times)).toHaveLength(0);
  });
});