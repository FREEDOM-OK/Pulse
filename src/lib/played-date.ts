/** 游戏游玩日期的默认值与展示格式。 */
import { parseDate, todayStr, weekdayLabel } from './date';

export function resolvePlayedDate(
  playedDate: string | null | undefined,
  now: Date = new Date()
): string {
  return playedDate?.trim() || todayStr(now);
}

export function formatPlayedDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayLabel(date)}`;
}