/** 游戏页左右滑动切换页签的纯逻辑，便于单元测试。 */
export type GamesTab = 'want' | 'played';

export const TAB_SWIPE_THRESHOLD = 32;

/** 水平位移是否已构成切换页签的滑动。 */
export function isTabSwipe(dx: number, dy: number, threshold = TAB_SWIPE_THRESHOLD): boolean {
  return Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.5;
}

/** 左滑进入「已玩记录」，右滑回到「想玩清单」，到达端点后保持不变。 */
export function tabAfterSwipe(tab: GamesTab, dx: number, dy: number): GamesTab {
  if (!isTabSwipe(dx, dy)) return tab;
  if (dx < 0) return tab === 'want' ? 'played' : tab;
  return tab === 'played' ? 'want' : tab;
}