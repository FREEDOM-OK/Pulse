import { getDriver } from '../connection';
import {
  DEFAULT_ENABLED_CARDS,
  HOME_CARD_IDS,
  SORT_MODES,
  type HomeCardId,
  type SortMode,
} from '../types';

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

export const DEFAULT_PERIOD_TIMES: string[] = [
  '08:00',
  '08:55',
  '10:00',
  '10:55',
  '14:00',
  '14:55',
  '16:00',
  '16:55',
];

export const DEFAULT_TOTAL_WEEKS = 18;

/** 首页万事卡的顺序（只含开启的卡）。未设置或数据损坏时回默认。 */
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

/** 每天各节的开始时间（HH:mm 数组）。未设置时回默认作息。 */
export async function getPeriodTimes(): Promise<string[]> {
  const raw = await getSetting(PERIOD_TIMES_KEY);
  const parsed = parseStringArray(raw);
  if (!parsed || parsed.length === 0) return [...DEFAULT_PERIOD_TIMES];
  return parsed.map((time) => (/^\d{2}:\d{2}$/.test(time) ? time : ''));
}

export async function setPeriodTimes(times: string[]): Promise<void> {
  await setSetting(PERIOD_TIMES_KEY, JSON.stringify(times));
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