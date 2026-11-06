/**
 * 手势竞争的小工具。
 *
 * 游戏页整块列表外面套了「左右滑动切换页签」的 PanResponder，它会先一步接住横向手势，
 * 导致行内的左滑删除几乎划不出来。这里记录「本次手势是从可滑动行开始的」，
 * 外层页签滑动遇到这个标记就直接放弃，把横向手势让给行。
 *
 * 约定：外层在**捕获**阶段清除标记，行在**冒泡**阶段重新标记。
 * 捕获总是早于冒泡，所以无论遍历方向如何，结果都正确。
 */
let rowGestureActive = false;

export function markRowGesture(): void {
  rowGestureActive = true;
}

export function clearRowGesture(): void {
  rowGestureActive = false;
}

export function isRowGestureActive(): boolean {
  return rowGestureActive;
}