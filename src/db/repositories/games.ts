import { getDriver } from '../connection';
import type { PlayedGameRow, WishlistRow } from '../types';
import { nowIso } from '@/lib/date';

export interface PlayedInput {
  durationMinutes: number;
  experience: string;
  rating: number;
  playedDate: string;
}

export async function listWishlist(): Promise<WishlistRow[]> {
  return getDriver().getAllAsync<WishlistRow>(
    "SELECT * FROM wishlist WHERE status = 'want' ORDER BY created_at DESC, id DESC"
  );
}

export async function addWish(name: string, note?: string | null): Promise<number> {
  const result = await getDriver().runAsync(
    'INSERT INTO wishlist (name, note, status, created_at) VALUES (?, ?, ?, ?)',
    [name.trim(), note?.trim() || null, 'want', nowIso()]
  );
  return result.lastInsertRowId;
}

export async function updateWish(
  id: number,
  patch: { name?: string; note?: string | null }
): Promise<void> {
  const fields: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    fields.push('name = ?');
    params.push(patch.name.trim());
  }
  if (patch.note !== undefined) {
    fields.push('note = ?');
    params.push(patch.note?.trim() || null);
  }
  if (fields.length === 0) return;
  params.push(id);
  await getDriver().runAsync(`UPDATE wishlist SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteWish(id: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM wishlist WHERE id = ?', [id]);
}

/** 点了「玩了」：想玩条目转为已玩，并生成一条已玩记录。 */
export async function markPlayed(wishId: number, input: PlayedInput): Promise<number> {
  const driver = getDriver();
  let newId = 0;

  await driver.withTransactionAsync(async () => {
    const wish = await driver.getFirstAsync<WishlistRow>(
      'SELECT * FROM wishlist WHERE id = ?',
      [wishId]
    );
    if (!wish) throw new Error('想玩条目不存在');
    if (wish.status === 'played') throw new Error('该游戏已经记录过游玩');

    await driver.runAsync("UPDATE wishlist SET status = 'played' WHERE id = ?", [wishId]);

    const result = await driver.runAsync(
      `INSERT INTO played_games
       (wishlist_id, game_name, played_date, duration_minutes, experience, rating, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        wish.id,
        wish.name,
        input.playedDate,
        Math.max(1, Math.round(input.durationMinutes)),
        input.experience.trim() || null,
        Math.min(5, Math.max(1, Math.round(input.rating))),
        nowIso(),
      ]
    );
    newId = result.lastInsertRowId;
  });

  return newId;
}

export async function listPlayed(): Promise<PlayedGameRow[]> {
  return getDriver().getAllAsync<PlayedGameRow>(
    'SELECT * FROM played_games ORDER BY played_date DESC, id DESC'
  );
}

export async function updatePlayed(
  id: number,
  patch: { durationMinutes?: number; experience?: string | null; rating?: number; playedDate?: string }
): Promise<void> {
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (patch.durationMinutes !== undefined) {
    fields.push('duration_minutes = ?');
    params.push(Math.max(1, Math.round(patch.durationMinutes)));
  }
  if (patch.experience !== undefined) {
    fields.push('experience = ?');
    params.push(patch.experience?.trim() || null);
  }
  if (patch.rating !== undefined) {
    fields.push('rating = ?');
    params.push(Math.min(5, Math.max(1, Math.round(patch.rating))));
  }
  if (patch.playedDate !== undefined) {
    fields.push('played_date = ?');
    params.push(patch.playedDate);
  }
  if (fields.length === 0) return;

  params.push(id);
  await getDriver().runAsync(`UPDATE played_games SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deletePlayed(id: number): Promise<void> {
  await getDriver().runAsync('DELETE FROM played_games WHERE id = ?', [id]);
}

export async function getLatestPlayed(): Promise<PlayedGameRow | null> {
  return getDriver().getFirstAsync<PlayedGameRow>(
    'SELECT * FROM played_games ORDER BY played_date DESC, id DESC LIMIT 1'
  );
}

export async function listPlayedInRange(from: string, to: string): Promise<PlayedGameRow[]> {
  return getDriver().getAllAsync<PlayedGameRow>(
    'SELECT * FROM played_games WHERE played_date BETWEEN ? AND ? ORDER BY played_date DESC, id DESC',
    [from, to]
  );
}
