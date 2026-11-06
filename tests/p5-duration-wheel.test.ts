import { describe, expect, it } from 'vitest';
import {
  buildWheelValues,
  durationPartsFromMinutes,
  durationPartsToMinutes,
  WHEEL_ITEM_HEIGHT,
  wheelIndexForOffset,
} from '@/lib/duration-wheel';

describe('P5 游戏游玩时长滚轮', () => {
  it('默认从 0 开始，向下滚动依次得到 1、2、3、4、5', () => {
    const values = buildWheelValues(0, 5);
    expect(values).toEqual([0, 1, 2, 3, 4, 5]);
    expect(
      values.map((_, index) => wheelIndexForOffset(index * WHEEL_ITEM_HEIGHT, 0, 5))
    ).toEqual(values);
  });

  it('滚动偏移会吸附到最近整数，并限制在有效范围内', () => {
    expect(wheelIndexForOffset(-200, 0, 59)).toBe(0);
    expect(wheelIndexForOffset(WHEEL_ITEM_HEIGHT * 1.49, 0, 59)).toBe(1);
    expect(wheelIndexForOffset(WHEEL_ITEM_HEIGHT * 1.51, 0, 59)).toBe(2);
    expect(wheelIndexForOffset(WHEEL_ITEM_HEIGHT * 999, 0, 59)).toBe(59);
  });

  it('小时和分钟可以正确回填并换算为总分钟', () => {
    expect(durationPartsFromMinutes(0)).toEqual({ hours: 0, minutes: 0 });
    expect(durationPartsFromMinutes(150)).toEqual({ hours: 2, minutes: 30 });
    expect(durationPartsToMinutes(2, 30)).toBe(150);
    expect(durationPartsToMinutes(24, 0)).toBe(1440);
  });
});
