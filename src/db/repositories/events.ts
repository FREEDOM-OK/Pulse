import { getDriver } from '../connection';
import { todayStr } from '@/lib/date';
import type { EventRow, EventType } from '../types';

export interface CreateEventInput {
  type: EventType;
  title: string;
  amount?: number | null;
  note?: string | null;
  /** 默认今天；第一版 UI 固定传今天。 */
  date?: string;
}

function normalizeAmount(amount: number | null | undefined): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  return amount;
}

function normalizeNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export async function createEvent(input: CreateEventInput): Promise<number> {
  const title = input.title.trim();
  if (title === '') throw new Error('请输入名称');
  const result = await getDriver().runAsync(
    `INSERT INTO events (date, type, title, amount, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.date ?? todayStr(),
      input.type,
      title,
      normalizeAmount(input.amount),
      normalizeNote(input.note),
      new Date().toISOString(),
    ]
  );
  return result.lastInsertRowId;
}

export async function listEventsByDate(date: string): Promise<EventRow[]> {
  return getDriver().getAllAsync<EventRow>(
    'SELECT * FROM events WHERE date = ? ORDER BY created_at DESC, id DESC',
    [date]
  );
}

export async function countEventsByDate(date: string): Promise<number> {
  const row = await getDriver().getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM events WHERE date = ?',
    [date]
  );
  return row?.count ?? 0;
}

export async function getEventDays(from: string, to: string): Promise<string[]> {
  const rows = await getDriver().getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM events WHERE date BETWEEN ? AND ?',
    [from, to]
  );
  return rows.map((row) => row.date);
}

export async function deleteEvent(id: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM events WHERE id = ?', [id]);
}