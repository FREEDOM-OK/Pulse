import { getDriver } from '../connection';
import {
  CARD_STYLES,
  DASH_MODES,
  DEFAULT_CARD_COLOR,
  DEFAULT_ENABLED_CARDS,
  HOME_CARD_IDS,
  MIDDLE_TABS,
  SORT_MODES,
  type CardStyle,
  type DashMode,
  type HomeCardId,
  type MiddleTab,
  type SortMode,
} from '../types';
import { DEFAULT_PERIOD_TIMES, type PeriodTime } from '@/lib/timetable-core';

export type ThemeSetting = 'system' | 'light' | 'dark';

export async function getSetting(key: string): Promise<string | null> {
  const row = await getDriver().getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await getDriver().runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function deleteSetting(key: string): Promise<void> {
  await getDriver().runAsync('DELETE FROM settings WHERE key = ?', [key]);
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await getDriver().getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function getTheme(): Promise<ThemeSetting> {
  const value = await getSetting('theme');
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function setTheme(theme: ThemeSetting): Promise<void> {
  await setSetting('theme', theme);
}

const FITNESS_DEFAULTS_REPS_KEY = 'fitness.defaultReps';
const FITNESS_DEFAULTS_WEIGHT_KEY = 'fitness.defaultWeight';

export interface FitnessDefaults {
  reps: number;
  weight: number;
}

const FALLBACK_FITNESS_DEFAULTS: FitnessDefaults = { reps: 8, weight: 0 };

/** 读取健身模块的默认次数与重量；未设置或非法时回退为 8 次 / 0kg。 */
export async function getFitnessDefaults(): Promise<FitnessDefaults> {
  const [repsRaw, weightRaw] = await Promise.all([
    getSetting(FITNESS_DEFAULTS_REPS_KEY),
    getSetting(FITNESS_DEFAULTS_WEIGHT_KEY),
  ]);
  const reps = Math.round(Number(repsRaw));
  const weight = Math.round(Number(weightRaw));
  return {
    reps: Number.isInteger(reps) && reps >= 1 ? reps : FALLBACK_FITNESS_DEFAULTS.reps,
    weight: Number.isInteger(weight) && weight >= 0 ? weight : FALLBACK_FITNESS_DEFAULTS.weight,
  };
}

/** 保存健身模块的默认次数与重量，写入前做下限修正。 */
export async function setFitnessDefaults(defaults: FitnessDefaults): Promise<void> {
  const reps = Math.max(1, Math.round(defaults.reps));
  const weight = Math.max(0, Math.round(defaults.weight));
  await Promise.all([
    setSetting(FITNESS_DEFAULTS_REPS_KEY, String(reps)),
    setSetting(FITNESS_DEFAULTS_WEIGHT_KEY, String(weight)),
  ]);
}

// —— v1.2 新增设置：首页卡片、列表排序、学期配置、节次时间 ——

const HOME_CARDS_KEY = 'home.cards';
const TODAY_SORT_KEY = 'today.sortMode';
const TERM_START_KEY = 'term.startDate';
const TERM_WEEKS_KEY = 'term.totalWeeks';
const PERIOD_TIMES_KEY = 'period.times';

export const DEFAULT_TOTAL_WEEKS = 18;

/** 首页 Dash 卡片的顺序（只含开启的卡）。未设置或数据损坏时回默认。 */
export async function getHomeCards(): Promise<HomeCardId[]> {
  const raw = await getSetting(HOME_CARDS_KEY);
  const parsed = parseStringArray(raw);
  if (!parsed) return [...DEFAULT_ENABLED_CARDS];
  const cards = parsed.filter((id): id is HomeCardId =>
    (HOME_CARD_IDS as string[]).includes(id)
  );
  return cards.length > 0 ? Array.from(new Set(cards)) : [...DEFAULT_ENABLED_CARDS];
}

export async function setHomeCards(cards: HomeCardId[]): Promise<void> {
  const unique = Array.from(new Set(cards.filter((id) => HOME_CARD_IDS.includes(id))));
  await setSetting(HOME_CARDS_KEY, JSON.stringify(unique));
}

/** 今日列表排序模式；非法值回落到「备忘在前」。 */
export async function getSortMode(): Promise<SortMode> {
  const raw = await getSetting(TODAY_SORT_KEY);
  return (SORT_MODES as string[]).includes(raw ?? '') ? (raw as SortMode) : 'memo-first';
}

export async function setSortMode(mode: SortMode): Promise<void> {
  const safe = SORT_MODES.includes(mode) ? mode : 'memo-first';
  await setSetting(TODAY_SORT_KEY, safe);
}

export interface TermConfig {
  /** YYYY-MM-DD，未设置时为 null。 */
  startDate: string | null;
  totalWeeks: number;
}

export async function getTermConfig(): Promise<TermConfig> {
  const [startRaw, weeksRaw] = await Promise.all([
    getSetting(TERM_START_KEY),
    getSetting(TERM_WEEKS_KEY),
  ]);
  const totalWeeks = Math.round(Number(weeksRaw));
  return {
    startDate: startRaw && /^\d{4}-\d{2}-\d{2}$/.test(startRaw) ? startRaw : null,
    totalWeeks:
      Number.isInteger(totalWeeks) && totalWeeks >= 1 && totalWeeks <= 60
        ? totalWeeks
        : DEFAULT_TOTAL_WEEKS,
  };
}

export async function setTermConfig(config: TermConfig): Promise<void> {
  const totalWeeks = Math.min(60, Math.max(1, Math.round(config.totalWeeks)));
  await Promise.all([
    setSetting(TERM_START_KEY, config.startDate ?? ''),
    setSetting(TERM_WEEKS_KEY, String(totalWeeks)),
  ]);
}

/** 每天各节的起止时间；损坏或为空时回落到默认 11 节。 */
export async function getPeriodTimes(): Promise<PeriodTime[]> {
  return normalizePeriodTimeList(parseJsonValue(await getSetting(PERIOD_TIMES_KEY)));
}

export async function setPeriodTimes(times: unknown): Promise<void> {
  await setSetting(PERIOD_TIMES_KEY, JSON.stringify(normalizePeriodTimeList(times)));
}

/** 把任意输入归一化成 `PeriodTime[]`：对象原样、纯时间字符串补齐结束时间。 */
function normalizePeriodTimeList(raw: unknown): PeriodTime[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_PERIOD_TIMES.map((item) => ({ ...item }));
  }
  const timePattern = /^\d{1,2}:\d{2}$/;
  const list: PeriodTime[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (item && typeof item === 'object') {
      const start = (item as { start?: unknown }).start;
      const end = (item as { end?: unknown }).end;
      if (typeof start === 'string' && typeof end === 'string') {
        list.push({ start, end });
        continue;
      }
    }
    if (typeof item === 'string' && timePattern.test(item)) {
      const next = raw[i + 1];
      const nextStart =
        next && typeof next === 'object' && typeof (next as { start?: unknown }).start === 'string'
          ? (next as { start: string }).start
          : typeof next === 'string' && timePattern.test(next)
            ? next
            : '';
      list.push({ start: item, end: nextStart || addMinutesToTime(item, 45) });
      continue;
    }
    list.push({ ...DEFAULT_PERIOD_TIMES[Math.min(i, DEFAULT_PERIOD_TIMES.length - 1)] });
  }
  return list;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hourText, minuteText] = time.split(':');
  const total = Number(hourText) * 60 + Number(minuteText) + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// —— v1.2.2 新增设置：底栏第三格、Dash 卡片模式与样式、完成后隐藏 ——

const MIDDLE_TAB_KEY = 'tab.middle';
const DASH_MODE_KEY = 'home.dashMode';
const CARD_STYLE_KEY = 'home.cardStyle';
const CARD_COLOR_KEY = 'home.cardColor';
const HIDE_COMPLETED_KEY = 'today.hideCompleted';

/** 底栏第三个标签放健身还是课表；非法值回落健身。 */
export async function getMiddleTab(): Promise<MiddleTab> {
  const raw = await getSetting(MIDDLE_TAB_KEY);
  return (MIDDLE_TABS as string[]).includes(raw ?? '') ? (raw as MiddleTab) : 'fitness';
}

export async function setMiddleTab(value: MiddleTab): Promise<void> {
  const safe = MIDDLE_TABS.includes(value) ? value : 'fitness';
  await setSetting(MIDDLE_TAB_KEY, safe);
}

/** Dash 卡片模式；非法值回落滑动。 */
export async function getDashMode(): Promise<DashMode> {
  const raw = await getSetting(DASH_MODE_KEY);
  return (DASH_MODES as string[]).includes(raw ?? '') ? (raw as DashMode) : 'carousel';
}

export async function setDashMode(value: DashMode): Promise<void> {
  const safe = DASH_MODES.includes(value) ? value : 'carousel';
  await setSetting(DASH_MODE_KEY, safe);
}

/** Dash 卡片样式；非法值回落默认。 */
export async function getCardStyle(): Promise<CardStyle> {
  const raw = await getSetting(CARD_STYLE_KEY);
  return (CARD_STYLES as string[]).includes(raw ?? '') ? (raw as CardStyle) : 'default';
}

export async function setCardStyle(value: CardStyle): Promise<void> {
  const safe = CARD_STYLES.includes(value) ? value : 'default';
  await setSetting(CARD_STYLE_KEY, safe);
}

/** 自定义卡片颜色（#RRGGBB）；非法值回落深色主卡色。 */
export async function getCardColor(): Promise<string> {
  const raw = await getSetting(CARD_COLOR_KEY);
  return raw && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : DEFAULT_CARD_COLOR;
}

export async function setCardColor(value: string): Promise<void> {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_CARD_COLOR;
  await setSetting(CARD_COLOR_KEY, safe.toLowerCase());
}

/** 完成后是否自动隐藏已完成项（默认关闭）。 */
export async function getHideCompleted(): Promise<boolean> {
  return (await getSetting(HIDE_COMPLETED_KEY)) === 'true';
}

export async function setHideCompleted(value: boolean): Promise<void> {
  await setSetting(HIDE_COMPLETED_KEY, value ? 'true' : 'false');
}

// —— v1.3 课表设置：当前课表、单节时长、默认连堂、午休、饱和度 ——

const ACTIVE_SCHEDULE_KEY = 'timetable.activeScheduleId';
const PERIOD_DURATION_KEY = 'timetable.periodDuration';
const DEFAULT_SPAN_KEY = 'timetable.defaultSpan';
const LUNCH_AFTER_KEY = 'timetable.lunchAfter';
const SATURATION_KEY = 'timetable.saturation';

export const DEFAULT_PERIOD_DURATION = 45;
export const DEFAULT_SPAN = 2;
export const DEFAULT_LUNCH_AFTER = 4;
export const DEFAULT_SATURATION = 0.8;

export interface TimetableSettings {
  activeScheduleId: string;
  periodTimes: PeriodTime[];
  periodDuration: number;
  defaultSpan: number;
  lunchAfter: number;
  saturation: number;
}

export async function getActiveScheduleId(): Promise<string | null> {
  const raw = await getSetting(ACTIVE_SCHEDULE_KEY);
  return raw && raw.length > 0 ? raw : null;
}

export async function setActiveScheduleId(id: string): Promise<void> {
  await setSetting(ACTIVE_SCHEDULE_KEY, id);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** 课表设置聚合读取（含节次时间，节次时间仍存在 `period.times`）。 */
export async function getTimetableSettings(): Promise<TimetableSettings> {
  const [activeId, times, durationRaw, spanRaw, lunchRaw, satRaw] = await Promise.all([
    getActiveScheduleId(),
    getPeriodTimes(),
    getSetting(PERIOD_DURATION_KEY),
    getSetting(DEFAULT_SPAN_KEY),
    getSetting(LUNCH_AFTER_KEY),
    getSetting(SATURATION_KEY),
  ]);
  const saturation = Number(satRaw);
  return {
    activeScheduleId: activeId ?? '',
    periodTimes: times,
    periodDuration: clampInt(durationRaw, 20, 120, DEFAULT_PERIOD_DURATION),
    defaultSpan: clampInt(spanRaw, 1, 4, DEFAULT_SPAN),
    lunchAfter: clampInt(lunchRaw, 0, 16, DEFAULT_LUNCH_AFTER),
    saturation: Number.isFinite(saturation) && satRaw !== null
      ? Math.min(1, Math.max(0, saturation))
      : DEFAULT_SATURATION,
  };
}

/** 单键更新课表设置（外观类四项）。 */
export async function updateTimetableSetting(
  key: 'periodDuration' | 'defaultSpan' | 'lunchAfter' | 'saturation',
  value: number
): Promise<void> {
  if (key === 'periodDuration') {
    await setSetting(PERIOD_DURATION_KEY, String(clampInt(value, 20, 120, DEFAULT_PERIOD_DURATION)));
    return;
  }
  if (key === 'defaultSpan') {
    await setSetting(DEFAULT_SPAN_KEY, String(clampInt(value, 1, 4, DEFAULT_SPAN)));
    return;
  }
  if (key === 'lunchAfter') {
    await setSetting(LUNCH_AFTER_KEY, String(clampInt(value, 0, 16, DEFAULT_LUNCH_AFTER)));
    return;
  }
  const safe = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_SATURATION;
  await setSetting(SATURATION_KEY, String(safe));
}

/** 恢复外观四项默认值。 */
export async function resetTimetableAppearance(): Promise<void> {
  await Promise.all([
    setSetting(PERIOD_DURATION_KEY, String(DEFAULT_PERIOD_DURATION)),
    setSetting(DEFAULT_SPAN_KEY, String(DEFAULT_SPAN)),
    setSetting(LUNCH_AFTER_KEY, String(DEFAULT_LUNCH_AFTER)),
    setSetting(SATURATION_KEY, String(DEFAULT_SATURATION)),
  ]);
}

function parseJsonValue(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function parseStringArray(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return null;
  }
}