import type { SqlParam } from '../driver';
import { getDriver } from '../connection';
import type { MemoRow } from '../types';
import { nowIsoMonotonic } from '@/lib/date';

export interface Memo {
  id: number;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const MAX_MEMO_TAGS = 3;

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === 'string')
      : [];
  } catch {
    return [];
  }
}

function mapMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    content: row.content,
    tags: parseTags(row.tags),
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, MAX_MEMO_TAGS);
}

export async function listMemos(): Promise<Memo[]> {
  const rows = await getDriver().getAllAsync<MemoRow>(
    'SELECT * FROM memos ORDER BY pinned DESC, updated_at DESC, id DESC'
  );
  return rows.map(mapMemo);
}

export async function createMemo(input: { content: string; tags?: string[] }): Promise<number> {
  const timestamp = nowIsoMonotonic();
  const result = await getDriver().runAsync(
    'INSERT INTO memos (content, tags, pinned, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
    [input.content.trim(), JSON.stringify(normalizeTags(input.tags)), timestamp, timestamp]
  );
  return result.lastInsertRowId;
}

export async function updateMemo(
  id: number,
  patch: { content?: string; tags?: string[]; pinned?: boolean }
): Promise<void> {
  const fields: string[] = [];
  const params: SqlParam[] = [];

  if (patch.content !== undefined) {
    fields.push('content = ?');
    params.push(patch.content.trim());
  }
  if (patch.tags !== undefined) {
    fields.push('tags = ?');
    params.push(JSON.stringify(normalizeTags(patch.tags)));
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

export async function toggleMemoPinned(id: number): Promise<boolean> {
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
