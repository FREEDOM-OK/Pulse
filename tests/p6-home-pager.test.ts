import { describe, expect, it } from 'vitest';
import { INITIAL_SCROLL_STATE, resolvePagerTarget } from '@/lib/home-pager';

describe('首页上下翻页判定', () => {
  it('拖过 18% 高度就翻页', () => {
    expect(resolvePagerTarget({ dragY: -180, velocityY: 0, height: 800, current: 0 })).toBe(1);
    expect(resolvePagerTarget({ dragY: 180, velocityY: 0, height: 800, current: 1 })).toBe(0);
  });

  it('拖动不足 18% 且没有速度时回弹', () => {
    expect(resolvePagerTarget({ dragY: -100, velocityY: 0, height: 800, current: 0 })).toBe(0);
    expect(resolvePagerTarget({ dragY: 100, velocityY: 0, height: 800, current: 1 })).toBe(1);
  });

  it('短距离快速甩动也能翻页', () => {
    expect(resolvePagerTarget({ dragY: -60, velocityY: -1.2, height: 800, current: 0 })).toBe(1);
    expect(resolvePagerTarget({ dragY: 60, velocityY: 1.2, height: 800, current: 1 })).toBe(0);
  });

  it('反方向的甩动不会翻页', () => {
    expect(resolvePagerTarget({ dragY: -60, velocityY: 1.2, height: 800, current: 0 })).toBe(0);
    expect(resolvePagerTarget({ dragY: 60, velocityY: -1.2, height: 800, current: 1 })).toBe(1);
  });

  it('高度未知时保持当前页', () => {
    expect(resolvePagerTarget({ dragY: -300, velocityY: -1, height: 0, current: 0 })).toBe(0);
  });

  it('初始滚动状态是「在顶部、不可滚动」', () => {
    expect(INITIAL_SCROLL_STATE).toEqual({ atTop: true, atBottom: false, scrollable: false });
  });
});