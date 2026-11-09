import { getSetting, setSetting } from './repositories/settings';
import { normalizePeriodTimes } from '@/lib/timetable-periods';

const PERIOD_TIMES_KEY = 'period.times';
const PERIOD_COUNT_KEY = 'timetable.periodCount';

/**
 * v1.2.1：把旧的 `period.times`（纯开始时间字符串数组）转成 `{ start, end }`。
 * 幂等：已经是对象数组时直接返回。
 */
export async function migratePeriodTimesV5(): Promise<void> {
  const raw = await getSetting(PERIOD_TIMES_KEY);
  if (!raw) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return;
  const needsMigration = parsed.some((item) => typeof item === 'string');
  if (!needsMigration) return;

  const countRaw = Number(await getSetting(PERIOD_COUNT_KEY));
  const count = Number.isFinite(countRaw) && countRaw >= 1 ? Math.round(countRaw) : parsed.length;
  const normalized = normalizePeriodTimes(parsed, count);
  await setSetting(PERIOD_TIMES_KEY, JSON.stringify(normalized));
}