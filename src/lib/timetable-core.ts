export type WeekType = 'all' | 'odd' | 'even';

export const SCREEN_DEFAULT_W = 375;
export const SCREEN_DEFAULT_H = 864;
export const SAFE_TOP_DP = 24;
export const SAFE_BOTTOM_DP = 28;

export const TIME_COL = 40;
export const HEADER_H = 40;
export const ROW_H = 58;
export const LUNCH_H = 20;

/** 课程格高度（dp）：默认 64，可调区间 44~90，步进 2。 */
export const DEFAULT_CELL_HEIGHT = 64;
export const MIN_CELL_HEIGHT = 44;
export const MAX_CELL_HEIGHT = 90;
export const CELL_HEIGHT_STEP = 2;

/** 课程格圆角（dp）：默认 6，可调区间 0~18，步进 1。 */
export const DEFAULT_CELL_RADIUS = 6;
export const MIN_CELL_RADIUS = 0;
export const MAX_CELL_RADIUS = 18;

/** 课表背景色（8 个护眼底色之外也允许任意 hex）。 */
export const DEFAULT_GRID_BACKGROUND = '#F5F5F7';

/** 每周起始日：1=周一、6=周六、7=周日。 */
export const DEFAULT_WEEK_START_DAY: 1 | 6 | 7 = 1;

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * 可见星期序列：从 weekStartDay 开始顺时针排列 7 天，再按 showSaturday / showSunday 过滤。
 * 例：weekStartDay=7 且两天都显示 → [7, 1, 2, 3, 4, 5, 6]。
 */
export function visibleWeekDays(
  weekStartDay: 1 | 6 | 7,
  showSaturday: boolean,
  showSunday: boolean
): number[] {
  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    const day = ((weekStartDay - 1 + i) % 7) + 1;
    if (day === 6 && !showSaturday) continue;
    if (day === 7 && !showSunday) continue;
    days.push(day);
  }
  return days;
}

export const COURSE_COLORS: string[] = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#F43F5E', '#EAB308', '#22C55E', '#14B8A6', '#0EA5E9',
  '#7C3AED', '#D946EF', '#64748B', '#78716C', '#9CA3AF',
];

/**
 * 课表模块的本地主键：时间戳 + 进程内自增。
 * 同一毫秒内连续创建（双击保存、批量导入）也不会撞主键。
 */
let localIdSeed = 0;
export function createLocalId(prefix: 'c' | 's' | 'sched' | 'tt'): string {
  localIdSeed += 1;
  return `${prefix}_${Date.now()}_${localIdSeed}`;
}

export interface PeriodTime {
  start: string;
  end: string;
}

export const DEFAULT_PERIOD_TIMES: PeriodTime[] = [
  { start: '08:00', end: '08:45' },
  { start: '08:55', end: '09:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '14:00', end: '14:45' },
  { start: '14:55', end: '15:40' },
  { start: '16:00', end: '16:45' },
  { start: '16:55', end: '17:40' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' },
  { start: '20:50', end: '21:35' },
];

/** 把「第 a–b 周 + 单/双周」展开成周次数组（1 起，去重升序） */
export function weeksFromRange(start: number, end: number, type: WeekType): number[] {
  const res: number[] = [];
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  for (let w = min; w <= max; w++) {
    if (type === 'all') res.push(w);
    else if (type === 'odd' && w % 2 !== 0) res.push(w);
    else if (type === 'even' && w % 2 === 0) res.push(w);
  }
  return Array.from(new Set(res)).sort((a, b) => a - b);
}

/** 把周次数组压成最短文案："1-5,7,9,11-15"；空数组返回 "" */
export function formatWeeks(weeks: number[]): string {
  if (!weeks || weeks.length === 0) return '';
  const sorted = Array.from(new Set(weeks)).sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      parts.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  parts.push(start === end ? `${start}` : `${start}-${end}`);
  return parts.join(',');
}

/** 课程在某周是否上课；weeks 为空数组时视为每周 */
export function isActiveOn(weeks: number[], week: number): boolean {
  if (!weeks || weeks.length === 0) return true;
  return weeks.includes(week);
}

/** 颜色降饱和：把 #RRGGBB 转 HSV，S 乘 factor（clamp 0–1），转回 #RRGGBB；factor >= 1 原样返回 */
export function softenColor(hex: string, factor: number): string {
  if (factor >= 1) return hex.toUpperCase();
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  s = Math.max(0, Math.min(1, s * factor));

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let ro = 0;
  let go = 0;
  let bo = 0;
  switch (i % 6) {
    case 0: ro = v; go = t; bo = p; break;
    case 1: ro = q; go = v; bo = p; break;
    case 2: ro = p; go = v; bo = t; break;
    case 3: ro = p; go = q; bo = v; break;
    case 4: ro = t; go = p; bo = v; break;
    case 5: ro = v; go = p; bo = q; break;
  }

  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(ro)}${toHex(go)}${toHex(bo)}`;
}

/** 前景色：按 WCAG 相对亮度，> 0.5 返回 'rgba(0,0,0,0.87)'，否则返回 '#FFFFFF' */
export function foregroundFor(hex: string): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const toLinear = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.5 ? 'rgba(0,0,0,0.87)' : '#FFFFFF';
}

/** 当前第几周（1 起）。今天早于开学日 → 1。用本地日期，按天差 // 7 + 1 */
export function currentWeekNumber(startDate: string, today: Date): number {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
  if (diffDays < 0) return 1;
  return Math.floor(diffDays / 7) + 1;
}

/** 某周某天对应日期（dayOfWeek 1=周一）。start + (week-1)*7 + (day-1) 天 */
export function weekDateFor(startDate: string, week: number, dayOfWeek: number): Date {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const date = new Date(sy, sm - 1, sd);
  const addDays = (week - 1) * 7 + (dayOfWeek - 1);
  date.setDate(date.getDate() + addDays);
  return date;
}

/** 'M/D'，例如 9/8 */
export function formatMD(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 周次区间文案，例如 '9/8–9/14'（用 en dash –，不是连字符 -） */
export function weekRangeLabel(startDate: string, week: number): string {
  const mon = weekDateFor(startDate, week, 1);
  const sun = weekDateFor(startDate, week, 7);
  return `${formatMD(mon)}–${formatMD(sun)}`;
}

/** 第 p 节的顶部 y（p 从 1 起） */
export function rowTop(p: number, rowH: number, lunchH: number, lunchAfter: number): number {
  return (p - 1) * rowH + (lunchAfter > 0 && p - 1 >= lunchAfter ? lunchH : 0);
}

/** 第 p 节的底部 y */
export function rowBottom(p: number, rowH: number, lunchH: number, lunchAfter: number): number {
  return p * rowH + (lunchAfter > 0 && p > lunchAfter ? lunchH : 0);
}

/** 跨午休时切成两块：[[start, lunchAfter], [lunchAfter+1, end]] */
export function blocksOf(start: number, end: number, lunchAfter: number): [number, number][] {
  if (lunchAfter > 0 && start <= lunchAfter && end > lunchAfter) {
    return [
      [start, lunchAfter],
      [lunchAfter + 1, end],
    ];
  }
  return [[start, end]];
}

/** `HH:MM` → 当天分钟数；非法输入返回 NaN（与 toMinutes 的区别：宽进，接受 8:23 这种写法）。 */
export function timeToMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * 真实时间 → 网格 Y 坐标（自定义时间的课程块靠它做像素级定位）。
 *
 * - 落在某节课的 [start, end] 内：按该节行高线性插值；
 * - 落在午休区间：按午休条高度线性插值；
 * - 落在普通课间：两节课之间没有像素空间，直接贴在下课那条线上；
 * - 早于第一节 → 0；晚于最后一节下课 → 网格底部。
 */
export function timeToGridY(
  targetMin: number,
  periods: PeriodTime[],
  rowH: number,
  lunchH: number,
  lunchAfter: number
): number {
  if (!Array.isArray(periods) || periods.length === 0) return 0;
  if (!Number.isFinite(targetMin)) return 0;

  const firstStart = timeToMinutes(periods[0].start);
  if (Number.isFinite(firstStart) && targetMin < firstStart) return 0;

  const lastEnd = timeToMinutes(periods[periods.length - 1].end);
  if (Number.isFinite(lastEnd) && targetMin > lastEnd) {
    return rowBottom(periods.length, rowH, lunchH, lunchAfter);
  }

  for (let i = 0; i < periods.length; i++) {
    const p = i + 1;
    const startMin = timeToMinutes(periods[i].start);
    const endMin = timeToMinutes(periods[i].end);
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) continue;

    const topY = rowTop(p, rowH, lunchH, lunchAfter);
    const bottomY = topY + rowH;

    if (targetMin >= startMin && targetMin <= endMin) {
      return topY + ((targetMin - startMin) / Math.max(1, endMin - startMin)) * rowH;
    }

    const next = periods[i + 1];
    if (next) {
      const nextStart = timeToMinutes(next.start);
      if (Number.isFinite(nextStart) && targetMin > endMin && targetMin < nextStart) {
        // 午休区间：这一段在网格里真的有 lunchH 像素，可以按比例落点。
        if (p === lunchAfter && lunchH > 0) {
          return bottomY + ((targetMin - endMin) / Math.max(1, nextStart - endMin)) * lunchH;
        }
        return bottomY;
      }
    }
  }

  return rowBottom(periods.length, rowH, lunchH, lunchAfter);
}

/**
 * 自定义时间段 → 与之有交集的起止节次（用于详情里显示「第 X - Y 节」）。
 * 与任何节次都不相交时返回 null，调用方保持原节次不动。
 */
export function periodsForTimeRange(
  startTime: string,
  endTime: string,
  periods: PeriodTime[]
): { startPeriod: number; endPeriod: number } | null {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) {
    return null;
  }

  let first = -1;
  let last = -1;
  periods.forEach((periodTime, index) => {
    const sMin = timeToMinutes(periodTime.start);
    const eMin = timeToMinutes(periodTime.end);
    if (!Number.isFinite(sMin) || !Number.isFinite(eMin)) return;
    if (sMin < endMin && eMin > startMin) {
      if (first === -1) first = index + 1;
      last = index + 1;
    }
  });

  if (first === -1 || last === -1) return null;
  return { startPeriod: first, endPeriod: last };
}

/** '周一 第3-4节 · 1-16周 · 张老师 · A101'（空字段跳过） */
export function sessionSummary(s: {
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
  weeks: number[];
  teacher: string;
  location: string;
}): string {
  const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const dayStr = days[s.dayOfWeek] || '';
  const periodStr = `第${s.startPeriod}-${s.endPeriod}节`;
  const weekStr = s.weeks && s.weeks.length > 0 ? `${formatWeeks(s.weeks)}周` : '每周';
  const parts = [`${dayStr} ${periodStr}`, weekStr];
  if (s.teacher) parts.push(s.teacher);
  if (s.location) parts.push(s.location);
  return parts.join(' · ');
}

/** 计算本学期第一个周一（YYYY-MM-DD） */
export function getFirstMondayOfCurrentMonth(today: Date = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), 1);
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() + 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface ParsedSessionInput {
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
  weeks: number[];
  teacher: string;
  location: string;
}

export interface ParsedCourseInput {
  name: string;
  color: string;
  sessions: ParsedSessionInput[];
}

export interface ParseResult {
  courses: ParsedCourseInput[];
  totalSessions: number;
  errors: string[];
}

/** 9.1 导入课表文本解析器（逐字对齐错误格式） */
export function parseImportText(text: string, totalWeeks: number): ParseResult {
  const lines = text.split(/\r?\n/);
  const errors: string[] = [];
  const courseMap = new Map<string, ParsedCourseInput>();
  let totalSessions = 0;

  const dayMap: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7,
    '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 7,
    '礼拜一': 1, '礼拜二': 2, '礼拜三': 3, '礼拜四': 4, '礼拜五': 5, '礼拜六': 6, '礼拜日': 7,
    'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 7,
  };

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) return;

    const tokens = line.split(/\s+/);
    if (tokens.length < 3) {
      errors.push(`第 ${lineNum} 行：字段不足，至少需要「名称 星期 节次」`);
      return;
    }

    const [name, dayToken, periodToken, ...rest] = tokens;
    const dayOfWeek = dayMap[dayToken.toLowerCase()];
    if (!dayOfWeek) {
      errors.push(`第 ${lineNum} 行：无法识别星期「${dayToken}」`);
      return;
    }

    const pMatch = periodToken.match(/^(?:第)?(\d+)(?:[-~到])(\d+)(?:节)?$/);
    if (!pMatch) {
      errors.push(`第 ${lineNum} 行：无法识别节次「${periodToken}」`);
      return;
    }
    const startPeriod = parseInt(pMatch[1], 10);
    const endPeriod = parseInt(pMatch[2], 10);

    let weeks = weeksFromRange(1, totalWeeks, 'all');
    let teacher = '';
    let location = '';

    if (rest.length > 0) {
      const firstRest = rest[0];
      const isWeekToken = /^[\d,，;；\-~到单双]+$/.test(firstRest);
      if (isWeekToken) {
        rest.shift();
        let type: WeekType = 'all';
        let cleanStr = firstRest;
        if (cleanStr.includes('单')) {
          type = 'odd';
          cleanStr = cleanStr.replace(/单/g, '');
        }
        if (cleanStr.includes('双')) {
          type = 'even';
          cleanStr = cleanStr.replace(/双/g, '');
        }

        const parts = cleanStr.split(/[,，;；]/).filter(Boolean);
        const wSet = new Set<number>();
        parts.forEach((part) => {
          const rMatch = part.match(/^(\d+)(?:[-~到])(\d+)$/);
          if (rMatch) {
            weeksFromRange(parseInt(rMatch[1], 10), parseInt(rMatch[2], 10), type).forEach((w) => wSet.add(w));
          } else {
            const num = parseInt(part, 10);
            if (!isNaN(num)) {
              if (type === 'all' || (type === 'odd' && num % 2 !== 0) || (type === 'even' && num % 2 === 0)) {
                wSet.add(num);
              }
            }
          }
        });
        if (wSet.size > 0) {
          weeks = Array.from(wSet).sort((a, b) => a - b);
        }
      }
    }

    if (rest.length === 1) {
      location = rest[0];
    } else if (rest.length >= 2) {
      teacher = rest[0];
      location = rest[1];
    }

    if (!courseMap.has(name)) {
      const colorIdx = courseMap.size % COURSE_COLORS.length;
      courseMap.set(name, {
        name,
        color: COURSE_COLORS[colorIdx],
        sessions: [],
      });
    }
    courseMap.get(name)!.sessions.push({
      dayOfWeek,
      startPeriod,
      endPeriod,
      weeks,
      teacher,
      location,
    });
    totalSessions++;
  });

  return {
    courses: Array.from(courseMap.values()),
    totalSessions,
    errors,
  };
}

// —— 多时间表（TimeTablePreset）——
//
// 只借用 `settings` 表的键值存储，不新增表、不迁移 Schema：
//   `timetable.timeTables`             → TimeTablePreset[] 的 JSON
//   `timetable.scheduleTimeTableMap`   → Record<scheduleId, timeTableId> 的 JSON
// 当前生效的节次时间仍然写回主库的 `period.times`，首页 / 计划页 / 课表网格
// 都读这一份，所以三端天然同步。

/** 一套时间表：名称 + 是否固定时长 + 每节时长 + 各节起止时间。 */
export interface TimeTablePreset {
  id: string;
  name: string;
  /** 是否开启「固定上课时长」：开时每节 end 恒等于 start + durationMinutes。 */
  fixedDuration: boolean;
  /** 每节课时长（分钟），30–90，步进 5。 */
  durationMinutes: number;
  periods: PeriodTime[];
}

/** 单套时间表最多节数（与 `periods.tsx` 的「添加」上限一致）。 */
export const MAX_PERIODS = 20;
/** 固定时长的可选范围与步进。 */
export const MIN_DURATION_MINUTES = 30;
export const MAX_DURATION_MINUTES = 90;
export const DURATION_STEP = 5;
/** 新增一节课时在没有上一节可参考时的兜底时间。 */
export const DEFAULT_PERIOD_START = '08:00';
/** 自动顺延时使用的默认课间休息（分钟）。 */
export const DEFAULT_BREAK_MINUTES = 10;

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** 校验 `HH:MM`（24 小时制）。 */
export function isValidHhmm(value: string): boolean {
  return HHMM_RE.test(value);
}

/** `HH:MM` → 当天分钟数；非法输入返回 NaN。 */
export function toMinutes(value: string): number {
  const match = HHMM_RE.exec(value);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 分钟数 → `HH:MM`，按 24 小时取模。 */
export function fromMinutes(total: number): string {
  const normalized = ((Math.round(total) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** `HH:MM` 加若干分钟，跨天自动回绕。 */
export function addMinutes(value: string, delta: number): string {
  const base = toMinutes(value);
  if (!Number.isFinite(base)) return value;
  return fromMinutes(base + delta);
}

/**
 * 固定时长联动：把第 `index` 节的 end 重算为 start + duration，
 * 后续节次若与前一节重叠，则按「原课间间隔（缺失时 10 分钟）」整体后推。
 * 不重叠的后续节次只重算 end，不动 start。
 */
export function relayoutPeriods(
  periods: PeriodTime[],
  index: number,
  durationMinutes: number
): PeriodTime[] {
  if (index < 0 || index >= periods.length) return periods.map((p) => ({ ...p }));
  const gaps = periods.map((period, i) => {
    if (i === 0) return DEFAULT_BREAK_MINUTES;
    const prevEnd = toMinutes(periods[i - 1].end);
    const start = toMinutes(period.start);
    if (!Number.isFinite(prevEnd) || !Number.isFinite(start)) return DEFAULT_BREAK_MINUTES;
    const gap = start - prevEnd;
    return gap >= 0 ? gap : DEFAULT_BREAK_MINUTES;
  });

  const next = periods.map((p) => ({ ...p }));
  next[index].end = addMinutes(next[index].start, durationMinutes);

  for (let i = index + 1; i < next.length; i++) {
    const start = toMinutes(next[i].start);
    const prevEnd = toMinutes(next[i - 1].end);
    if (!Number.isFinite(start) || !Number.isFinite(prevEnd)) continue;
    if (start < prevEnd) {
      next[i].start = fromMinutes(prevEnd + gaps[i]);
    }
    next[i].end = addMinutes(next[i].start, durationMinutes);
  }
  return next;
}

/** 把整套节次的 end 全部重算为 start + duration（切换固定时长 / 修改时长时用）。 */
export function applyFixedDuration(periods: PeriodTime[], durationMinutes: number): PeriodTime[] {
  if (periods.length === 0) return [];
  let next: PeriodTime[] = periods.map((p) => ({ ...p }));
  next = relayoutPeriods(next, 0, durationMinutes);
  return next;
}

/** 在末尾追加一节：接在上一节 end 后 10 分钟开始。 */
export function appendPeriod(periods: PeriodTime[], durationMinutes: number): PeriodTime[] {
  const last = periods[periods.length - 1];
  const start = last ? addMinutes(last.end, DEFAULT_BREAK_MINUTES) : DEFAULT_PERIOD_START;
  return [...periods.map((p) => ({ ...p })), { start, end: addMinutes(start, durationMinutes) }];
}

/** 校验一套节次时间，返回第一条错误文案；合法返回 null。 */
export function validatePeriods(periods: PeriodTime[]): string | null {
  if (periods.length === 0) return '至少保留一节课';
  for (let i = 0; i < periods.length; i++) {
    const { start, end } = periods[i];
    if (!isValidHhmm(start) || !isValidHhmm(end)) {
      return `第 ${i + 1} 节的开始/结束时间格式应为 HH:MM`;
    }
    if (toMinutes(start) >= toMinutes(end)) {
      return `第 ${i + 1} 节的结束时间需晚于开始时间`;
    }
    if (i > 0 && toMinutes(start) < toMinutes(periods[i - 1].end)) {
      return `第 ${i + 1} 节与第 ${i} 节时间重叠`;
    }
  }
  return null;
}
