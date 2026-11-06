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
