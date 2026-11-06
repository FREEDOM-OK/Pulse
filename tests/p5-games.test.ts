import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  addWish,
  deleteWish,
  listPlayed,
  listWishlist,
  markPlayed,
  updatePlayed,
  updateWish,
} from '@/db/repositories/games';

const DATE = '2026-11-06';

afterEach(() => {
  resetDriverForTests();
});

describe('P5 游戏：想玩清单与已玩记录', () => {
  it('想玩清单最新的排在前面，编辑与删除生效', async () => {
    await createTestContext();
    const first = await addWish('游戏A', '想玩');
    await addWish('游戏B');

    let wishes = await listWishlist();
    expect(wishes.map((wish) => wish.name)).toEqual(['游戏B', '游戏A']);

    await updateWish(first, { name: '游戏A重制版', note: null });
    wishes = await listWishlist();
    const updated = wishes.find((wish) => wish.id === first);
    expect(updated?.name).toBe('游戏A重制版');
    expect(updated?.note).toBeNull();

    await deleteWish(first);
    wishes = await listWishlist();
    expect(wishes.map((wish) => wish.name)).toEqual(['游戏B']);
  });

  it('空体验存为 null，空白会被去掉', async () => {
    await createTestContext();
    const wishId = await addWish('游戏C');
    await markPlayed(wishId, {
      durationMinutes: 45,
      experience: '   ',
      rating: 3,
      playedDate: DATE,
    });

    const [record] = await listPlayed();
    expect(record.experience).toBeNull();
  });

  it('已玩记录的修改会被限制在合法范围', async () => {
    await createTestContext();
    const wishId = await addWish('游戏D');
    const id = await markPlayed(wishId, {
      durationMinutes: 60,
      experience: '不错',
      rating: 3,
      playedDate: DATE,
    });

    await updatePlayed(id, { rating: 0, durationMinutes: 0 });
    const [record] = await listPlayed();
    expect(record.rating).toBe(1);
    expect(record.duration_minutes).toBe(1);

    await updatePlayed(id, { rating: 9 });
    expect((await listPlayed())[0].rating).toBe(5);
  });

  it('按游玩日期倒序，同一天按记录先后倒序', async () => {
    await createTestContext();
    const a = await addWish('A');
    const b = await addWish('B');
    await markPlayed(a, { durationMinutes: 30, experience: '', rating: 3, playedDate: '2026-11-05' });
    await markPlayed(b, { durationMinutes: 30, experience: '', rating: 3, playedDate: '2026-11-06' });

    expect((await listPlayed()).map((row) => row.game_name)).toEqual(['B', 'A']);
  });
});
