/** 游戏游玩时长的滚轮换算；纯函数便于测试。 */
export const WHEEL_ITEM_HEIGHT = 40;

export function buildWheelValues(min: number, max: number): number[] {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) return [];
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

export function wheelIndexForOffset(
  offset: number,
  min: number,
  max: number,
  itemHeight = WHEEL_ITEM_HEIGHT
): number {
  if (itemHeight <= 0 || max < min) return 0;
  const maxIndex = max - min;
  return Math.min(maxIndex, Math.max(0, Math.round(offset / itemHeight)));
}

export function durationPartsFromMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const safeTotal = Number.isFinite(totalMinutes) ? Math.max(0, Math.floor(totalMinutes)) : 0;
  return {
    hours: Math.floor(safeTotal / 60),
    minutes: safeTotal % 60,
  };
}

export function durationPartsToMinutes(hours: number, minutes: number): number {
  return Math.max(0, Math.floor(hours)) * 60 + Math.max(0, Math.floor(minutes));
}
