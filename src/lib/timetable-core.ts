export type WeekType = 'all' | 'odd' | 'even';

export const SCREEN_DEFAULT_W = 375;
export const SCREEN_DEFAULT_H = 864;
export const SAFE_TOP_DP = 24;
export const SAFE_BOTTOM_DP = 28;

export const TIME_COL = 40;
export const HEADER_H = 40;
export const ROW_H = 58;
export const LUNCH_H = 20;

export const COURSE_COLORS: string[] = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#F43F5E', '#EAB308', '#22C55E', '#14B8A6', '#0EA5E9',
  '#7C3AED', '#D946EF', '#64748B', '#78716C', '#9CA3AF',
];

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
export function blocksOf(start: number, end: number, lunchAfter: number): Array<[number, number]> {
  if (lunchAfter > 0 && start <= lunchAfter && end > lunchAfter) {
    return [
      [start, lunchAfter],
      [lunchAfter + 1, end],
    ];
  }
  return [[start, end]];
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
