/** 日期与时长工具。所有日期都用本地 `YYYY-MM-DD` 字符串，避免时区偏移。 */

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function toDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayStr(now: Date = new Date()): string {
  return toDateStr(now);
}

export function nowIso(): string {
  return new Date().toISOString();
}

let lastMonotonicMs = 0;

/**
 * 严格单调递增的时间戳。
 * 同一毫秒内连续写入时也保证后写的更大，避免"更新时间倒序"出现并列、排序不稳定。
 */
export function nowIsoMonotonic(): string {
  const now = Date.now();
  lastMonotonicMs = now > lastMonotonicMs ? now : lastMonotonicMs + 1;
  return new Date(lastMonotonicMs).toISOString();
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

export function formatDay(dateStr: string): string {
  const date = parseDate(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAY_LABELS[date.getDay()]}`;
}

export function formatMonth(year: number, monthIndex: number): string {
  return `${year}年${monthIndex + 1}月`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayStr();
}

export function weekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()];
}

/** 生成月历网格：周一为一周起始，返回 4~6 周、每周 7 格，空位为 null。 */
export function monthGrid(year: number, monthIndex: number): (string | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toDateStr(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** 某个月的第一天和最后一天（用于区间查询）。 */
export function monthRange(year: number, monthIndex: number): { from: string; to: string } {
  return {
    from: toDateStr(new Date(year, monthIndex, 1)),
    to: toDateStr(new Date(year, monthIndex + 1, 0)),
  };
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 分钟';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0 && rest > 0) return `${hours} 小时 ${rest} 分钟`;
  if (hours > 0) return `${hours} 小时`;
  return `${rest} 分钟`;
}
