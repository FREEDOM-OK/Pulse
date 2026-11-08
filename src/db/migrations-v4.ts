import { getDriver } from './connection';
import { deleteSetting, getSetting } from './repositories/settings';
import { todayStr, nowIsoMonotonic } from '@/lib/date';

/** v1.1 遗留的「快速备忘」键。 */
export const QUICK_MEMO_KEY = 'memo.quick';

const MAX_MEMO_LENGTH = 200;

/**
 * v4 数据迁移：settings 里遗留的快速备忘录 → 今天一条置顶备忘，然后删掉旧键。
 * 用 JS 的 todayStr() 取今天，避免 SQL date('now') 在时区上的偏差。幂等：没有值直接返回。
 */
export async function migrateLegacyQuickMemo(): Promise<void> {
  const text = await getSetting(QUICK_MEMO_KEY);
  if (!text || text.trim().length === 0) return;

  const driver = getDriver();
  await driver.withTransactionAsync(async () => {
    const now = nowIsoMonotonic();
    await driver.runAsync(
      `INSERT INTO memos (date, content, time, pinned, sort_order, created_at, updated_at)
       VALUES (?, ?, NULL, 1, 0, ?, ?)`,
      [todayStr(), text.trim().slice(0, MAX_MEMO_LENGTH), now, now]
    );
    await deleteSetting(QUICK_MEMO_KEY);
  });
}