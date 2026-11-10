import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  createMemo,
  deleteMemo,
  listMemosByDate,
  toggleMemoPin,
  updateMemo,
} from '@/db/repositories/memos';
import { createTask, listTasksByDate, setTaskPinned } from '@/db/repositories/tasks';
import { getSetting, setSetting } from '@/db/repositories/settings';
import { migrateLegacyQuickMemo, QUICK_MEMO_KEY } from '@/db/migrations-v4';
import { todayStr } from '@/lib/date';

afterEach(() => {
  resetDriverForTests();
});

describe('P0 schema v4：置顶与备忘', () => {
  it('任务可以置顶，数据行带 pinned', async () => {
    await createTestContext();
    const id = await createTask({ date: '2026-11-08', title: '写周报' });
    await setTaskPinned(id, true);
    const rows = await listTasksByDate('2026-11-08');
    expect(rows[0].pinned).toBe(1);
  });

  it('备忘置顶排在最前，按 sort_order 兜底', async () => {
    await createTestContext();
    const normal = await createMemo({ date: '2026-11-08', content: '普通备忘' });
    const pinned = await createMemo({ date: '2026-11-08', content: '置顶备忘', pinned: true });
    const rows = await listMemosByDate('2026-11-08');
    expect(rows.map((row) => row.id)).toEqual([pinned, normal]);
  });

  it('备忘支持改内容、改时间与删除', async () => {
    await createTestContext();
    const id = await createMemo({ date: '2026-11-08', content: '旧内容' });
    await updateMemo(id, { content: '新内容', time: '09:30' });
    const [row] = await listMemosByDate('2026-11-08');
    expect(row.content).toBe('新内容');
    expect(row.time).toBe('09:30');
    expect(row.updated_at).not.toBe('');

    await deleteMemo(id);
    expect(await listMemosByDate('2026-11-08')).toEqual([]);
  });

  it('toggleMemoPin 能在置顶与取消置顶之间切换', async () => {
    await createTestContext();
    const id = await createMemo({ date: '2026-11-08', content: '交房租' });
    expect(await toggleMemoPin(id)).toBe(true);
    expect((await listMemosByDate('2026-11-08'))[0].pinned).toBe(1);
    expect(await toggleMemoPin(id)).toBe(false);
    expect((await listMemosByDate('2026-11-08'))[0].pinned).toBe(0);
  });
});

describe('P0 快速备忘迁移', () => {
  it('把 settings.memo.quick 迁成今天一条置顶备忘并清掉旧键', async () => {
    await createTestContext();
    await setSetting(QUICK_MEMO_KEY, '  周五前交房租  ');
    await migrateLegacyQuickMemo();

    const rows = await listMemosByDate(todayStr());
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe('周五前交房租');
    expect(rows[0].pinned).toBe(1);
    expect(await getSetting(QUICK_MEMO_KEY)).toBeNull();
  });

  it('没有旧键时什么都不做，且可重复执行', async () => {
    await createTestContext();
    await migrateLegacyQuickMemo();
    await migrateLegacyQuickMemo();
    expect(await listMemosByDate(todayStr())).toEqual([]);
  });
});