import { describe, expect, it } from 'vitest';
import { formatPlayedDate, resolvePlayedDate } from '@/lib/played-date';

describe('P5 游戏游玩日期', () => {
  it('新增记录默认使用当前本地日期，编辑记录沿用原日期', () => {
    const now = new Date(2026, 10, 6, 23, 45);
    expect(resolvePlayedDate(null, now)).toBe('2026-11-06');
    expect(resolvePlayedDate('2026-10-01', now)).toBe('2026-10-01');
  });

  it('只展示日期和星期，不包含时间', () => {
    expect(formatPlayedDate('2026-11-06')).toBe('2026年11月6日 周五');
    expect(formatPlayedDate('2026-11-06')).not.toMatch(/\d{2}:\d{2}/);
  });
});