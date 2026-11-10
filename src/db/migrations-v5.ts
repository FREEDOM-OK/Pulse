import { getPeriodTimes, getSetting, setPeriodTimes } from './repositories/settings';

const PERIOD_TIMES_KEY = 'period.times';

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

  // setPeriodTimes 内部会把纯时间字符串补齐结束时间，复用同一套归一化逻辑。
  await setPeriodTimes(parsed);
  // 触发一次读取，确保写入结果可解析（异常时回落默认值）。
  await getPeriodTimes();
}