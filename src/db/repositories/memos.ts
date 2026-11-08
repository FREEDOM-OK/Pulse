import { getDriver } from '../connection';
import type { MemoRow } from '../types';
import { nowIsoMonotonic } from '@/lib/date';

export interface CreateMemoInput {
  date: string;
  content: string;
  time?: string | null;
  pinned?: boolean;
}

export interface MemoPatch {
  content?: string;
  time?: string | null;
  pinned?: boolean;
}

async function nextSortOrder(date: string): Promise<number> {
  const row = await getDriver().getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(sort_order) AS maxOrder FROM memos WHERE date = ?',
    [date]
  );
  return Number(row?.maxOrder ?? 0) + 1;
}

export async function listMemosByDate(date: string): Promise<MemoRow[]> {
  return getDriver().getAllAsync<MemoRow>(
    'SELECT * FROM memos WHERE date = ? ORDER BY pinned DESC, sort_order ASC, id ASC',
    [date]
  );
}

export async function listMemosInRange(from: string, to: string): Promise<MemoRow[]> {
  return getDriver().getAllAsync<MemoRow>(
    'SELECT * FROM memos WHERE date BETWEEN ? AND ? ORDER BY date ASC, pinned DESC, sort_order ASC, id ASC',
    [from, to]
  );
}

export async function getMemo(id: number): Promise<MemoRow | null> {
  return getDriver().getFirstAsync<MemoRow>('SELECT * FROM memos WHERE id = ?', [id]);
}

export async function createMemo(input: CreateMemoInput): Promise<number> {
  const sortOrder = await nextSortOrder(input.date);
  const now = nowIsoMonotonic();
  const result = await getDriver().runAsync(
    `INSERT INTO memos (date, content, time, pinned, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.date,
      input.content,
      input.time ?? null,
      input.pinned ? 1 : 0,
      sortOrder,
      now,
      now,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateMemo(id: number, patch: MemoPatch): Promise<void> {
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (patch.content !== undefined) {
    fields.push('content = ?');
    params.push(patch.content);
  }
  if (patch.time !== undefined) {
    fields.push('time = ?');
    params.push(patch.time);
  }
  if (patch.pinned !== undefined) {
    fields.push('pinned = ?');
    params.push(patch.pinned ? 1 : 0);
  }
  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  params.push(nowIsoMonotonic());
  params.push(id);

  await getDriver().runAsync(`UPDATE memos SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function toggleMemoPin(id: number): Promise<boolean> {
  const driver = getDriver();
  const row = await driver.getFirstAsync<{ pinned: number }>(
    'SELECT pinned FROM memos WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('备忘不存在');
  const next = row.pinned === 1 ? 0 : 1;
  await driver.runAsync('UPDATE memos SET pinned = ?, updated_at = ? WHERE id = ?', [
    next,
    nowIsoMonotonic(),
    id,
  ]);
  return next === 1;
}

export async function deleteMemo(id: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM memos WHERE id = ?', [id]);
}