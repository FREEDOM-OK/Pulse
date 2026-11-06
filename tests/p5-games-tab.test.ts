import { describe, expect, it } from 'vitest';
import { isTabSwipe, tabAfterSwipe } from '@/lib/games-tab';

describe('P5 游戏页左右滑动切换页签', () => {
  it('左滑从想玩清单进入已玩记录，右滑再回到想玩清单', () => {
    expect(tabAfterSwipe('want', -120, 10)).toBe('played');
    expect(tabAfterSwipe('played', 120, 10)).toBe('want');
  });

  it('已到端点时继续滑动保持当前页签', () => {
    expect(tabAfterSwipe('played', -120, 0)).toBe('played');
    expect(tabAfterSwipe('want', 120, 0)).toBe('want');
  });

  it('小位移或明显纵向滚动不算切换', () => {
    expect(isTabSwipe(20, 2)).toBe(false);
    expect(tabAfterSwipe('want', 20, 2)).toBe('want');
    expect(tabAfterSwipe('want', -120, 100)).toBe('want');
  });
});