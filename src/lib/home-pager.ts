/**
 * 首页上下翻页的「松手后去哪一页」判定：纯函数，方便单测。
 * dragY 为负表示手指向上拖（看第二页），为正表示向下拖（回第一页）。
 */
export interface PagerRelease {
  dragY: number;
  velocityY: number;
  height: number;
  current: 0 | 1;
}

/** 拖过页面高度的 18% 就翻页；短距离快速甩动（速度 > 0.6）也可以翻。 */
export function resolvePagerTarget({ dragY, velocityY, height, current }: PagerRelease): 0 | 1 {
  if (height <= 0) return current;
  const ratio = dragY / height;

  if (current === 0) {
    if (ratio < -0.18) return 1;
    if (ratio < -0.05 && velocityY < -0.6) return 1;
    return 0;
  }

  if (ratio > 0.18) return 0;
  if (ratio > 0.05 && velocityY > 0.6) return 0;
  return 1;
}

export interface ScrollState {
  atTop: boolean;
  atBottom: boolean;
  scrollable: boolean;
}

export const INITIAL_SCROLL_STATE: ScrollState = {
  atTop: true,
  atBottom: false,
  scrollable: false,
};