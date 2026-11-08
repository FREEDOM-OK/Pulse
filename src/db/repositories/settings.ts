import { getDriver } from '../connection';

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