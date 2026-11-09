/**
 * 课程表单的纯函数：周次文本互转、草稿校验（PRDv1.2.2 第 5.3 节）。
 */

export interface SlotDraft {
  weekday: number;
  startPeriod: number;
  endPeriod: number;
  /** 空数组表示每周。 */
  weeks: number[];
}

export interface CourseDraft {
  name: string;
  teacher: string;
  room: string;
  color: string;
  background: string;
  note: string;
  slots: SlotDraft[];
}

/** 把周次数组压成可编辑文本，例如 [1,2,3,5] → "1-3,5"。 */
export function weeksToRange(weeks: number[]): string {
  const sorted = Array.from(new Set(weeks.filter((week) => Number.isFinite(week) && week >= 1))).sort(
    (a, b) => a - b
  );
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return String(sorted[0]);

  // 连续奇数/偶数分开表达，避免「1-5」被误读成每周。
  const allOdd = sorted.every((week) => week % 2 === 1);
  const allEven = sorted.every((week) => week % 2 === 0);
  if (allOdd && sorted.length > 2 && stepIsTwo(sorted)) return formatSpan(sorted, '单周');
  if (allEven && sorted.length > 2 && stepIsTwo(sorted)) return formatSpan(sorted, '双周');

  const parts: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (const week of sorted.slice(1)) {
    if (week === previous + 1) {
      previous = week;
      continue;
    }
    parts.push(start === previous ? String(start) : `${start}-${previous}`);
    start = week;
    previous = week;
  }
  parts.push(start === previous ? String(start) : `${start}-${previous}`);
  return parts.join(',');
}

function stepIsTwo(sorted: number[]): boolean {
  return sorted.every((week, index) => index === 0 || week - sorted[index - 1] === 2);
}

function formatSpan(sorted: number[], prefix: string): string {
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  return `${prefix} ${start === end ? start : `${start}-${end}`}`;
}

/**
 * 把用户输入的周次文本解析成数组。可复用 timetable-grid 的 parseWeeksInput，
 * 这里额外支持「单周/双周/每周」简写并做去重排序。
 */
export function weeksFromRange(text: string, totalWeeks = 18): number[] {
  const raw = text.trim();
  if (!raw || raw === '每周' || raw === '每周都上') return [];
  if (raw === '单周') {
    return Array.from({ length: totalWeeks }, (_, index) => index + 1).filter((week) => week % 2 === 1);
  }
  if (raw === '双周') {
    return Array.from({ length: totalWeeks }, (_, index) => index + 1).filter((week) => week % 2 === 0);
  }
  const weeks = new Set<number>();
  for (const chunk of raw.split(/[,，、\s]+/)) {
    if (!chunk) continue;
    const range = chunk.match(/^(\d+)\s*[-~]\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const from = Math.max(1, Math.min(start, end));
      const to = Math.min(totalWeeks, Math.max(start, end));
      for (let week = from; week <= to; week += 1) weeks.add(week);
      continue;
    }
    const single = Number(chunk);
    if (Number.isInteger(single) && single >= 1 && single <= totalWeeks) weeks.add(single);
  }
  return Array.from(weeks).sort((a, b) => a - b);
}

/** 返回第一条错误文案，没有错误返回 null。 */
export function validateCourseDraft(draft: CourseDraft, periodCount: number): string | null {
  if (!draft.name.trim()) return '请填写课程名称';
  if (draft.name.trim().length > 30) return '课程名称最多 30 个字';
  if (draft.slots.length === 0) return '至少添加一个上课时段';
  for (const slot of draft.slots) {
    if (slot.weekday < 1 || slot.weekday > 7) return '星期不在有效范围';
    if (slot.startPeriod < 1 || slot.endPeriod > periodCount) {
      return `节次需在 1 – ${periodCount} 之间`;
    }
    if (slot.startPeriod > slot.endPeriod) return '开始节次不能晚于结束节次';
    if (slot.weeks.some((week) => week < 1)) return '周次需从第 1 周开始';
  }
  return null;
}