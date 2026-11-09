import { afterEach, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers/node-driver';
import { resetDriverForTests } from '@/db/connection';
import {
  getPeriodCount,
  getPeriodTimes,
  getRowHeight,
  getShowWeekend,
  setPeriodCount,
  setPeriodTimes,
  setRowHeight,
  setSetting,
  setShowWeekend,
} from '@/db/repositories/settings';
import { migratePeriodTimesV5 } from '@/db/migrations-v5';
import {
  DEFAULT_PERIOD_COUNT,
  DEFAULT_PERIOD_TIMES,
  DEFAULT_ROW_HEIGHT,
  normalizePeriodTimes,
  periodRange,
  findPeriodOverlap,
} from '@/lib/timetable-periods';

afterEach(() => {
  resetDriverForTests();
});

describe('T0 课表设置项', () => {
  it('默认值：11 节、显示周末、格子 64', async () => {
    await createTestContext();
    expect(await getPeriodCount()).toBe(DEFAULT_PERIOD_COUNT);
    expect(await getShowWeekend()).toBe(true);
    expect(await getRowHeight()).toBe(DEFAULT_ROW_HEIGHT);
    expect(await getPeriodTimes()).toHaveLength(DEFAULT_PERIOD_COUNT);
    expect((await getPeriodTimes())[0]).toEqual({ start: '08:00', end: '08:45' });
  });

  it('设置项持久化并按范围收敛', async () => {
    await createTestContext();
    await setPeriodCount(9);
    await setShowWeekend(false);
    await setRowHeight(96);

    expect(await getPeriodCount()).toBe(9);
    expect(await getShowWeekend()).toBe(false);
    expect(await getRowHeight()).toBe(96);
    expect(await getPeriodTimes()).toHaveLength(9);

    await setRowHeight(500);
    expect(await getRowHeight()).toBe(128);
    await setRowHeight(0);
    expect(await getRowHeight()).toBe(32);
    await setPeriodCount(40);
    expect(await getPeriodCount()).toBe(16);
    await setPeriodCount(0);
    expect(await getPeriodCount()).toBe(1);
  });

  it('损坏的存储值回落到默认', async () => {
    await createTestContext();
    await setSetting('timetable.periodCount', 'abc');
    await setSetting('timetable.rowHeight', '{}');
    await setSetting('timetable.showWeekend', 'maybe');
    expect(await getPeriodCount()).toBe(DEFAULT_PERIOD_COUNT);
    expect(await getRowHeight()).toBe(DEFAULT_ROW_HEIGHT);
    expect(await getShowWeekend()).toBe(true);
  });

  it('节数调大时自动补足时间，调小时截断', async () => {
    await createTestContext();
    await setPeriodCount(13);
    const times = await getPeriodTimes();
    expect(times).toHaveLength(13);
    expect(times[11]).toEqual(DEFAULT_PERIOD_TIMES[11]);

    await setPeriodCount(3);
    expect(await getPeriodTimes()).toHaveLength(3);
  });

  it('setPeriodTimes 归一化后写入', async () => {
    await createTestContext();
    await setPeriodTimes([{ start: '09:00', end: '09:45' }]);
    const times = await getPeriodTimes();
    expect(times).toHaveLength(DEFAULT_PERIOD_COUNT);
    expect(times[0]).toEqual({ start: '09:00', end: '09:45' });
  });
});

describe('T0 period.times 迁移', () => {
  it('旧字符串数组补出结束时间并补齐到 11 节', async () => {
    await createTestContext();
    await setSetting('period.times', JSON.stringify(['08:00', '08:55', '10:00']));
    await migratePeriodTimesV5();

    const times = await getPeriodTimes();
    expect(times).toHaveLength(DEFAULT_PERIOD_COUNT);
    expect(times[0]).toEqual({ start: '08:00', end: '08:55' });
    expect(times[2]).toEqual({ start: '10:00', end: '10:45' });
  });

  it('已是对象数组时保持不变（幂等）', async () => {
    await createTestContext();
    const custom = [{ start: '07:40', end: '08:30' }];
    await setSetting('period.times', JSON.stringify(custom));
    await migratePeriodTimesV5();
    const times = await getPeriodTimes();
    expect(times[0]).toEqual(custom[0]);
  });

  it('损坏值回默认而不抛错', async () => {
    await createTestContext();
    await setSetting('period.times', '{not json');
    await migratePeriodTimesV5();
    expect((await getPeriodTimes())[0]).toEqual(DEFAULT_PERIOD_TIMES[0]);
  });
});

describe('T0 纯函数', () => {
  it('normalizePeriodTimes 处理字符串、对象与越界', () => {
    const fromStrings = normalizePeriodTimes(['08:00', '09:00'], 3);
    expect(fromStrings).toEqual([
      { start: '08:00', end: '09:00' },
      { start: '09:00', end: '09:45' },
      { start: '10:00', end: '10:45' },
    ]);

    const clipped = normalizePeriodTimes([{ start: '00:01', end: '00:02' }], 2);
    expect(clipped).toHaveLength(2);
    expect(clipped[0]).toEqual({ start: '00:01', end: '00:02' });

    expect(normalizePeriodTimes(null, 2)).toEqual(DEFAULT_PERIOD_TIMES.slice(0, 2));
  });

  it('periodRange 裁剪越界节次', () => {
    expect(periodRange(DEFAULT_PERIOD_TIMES, 1, 2)).toEqual({ start: '08:00', end: '09:40' });
    expect(periodRange(DEFAULT_PERIOD_TIMES, 0, 99)).toEqual({ start: '08:00', end: '01:50' });
    expect(periodRange([], 1, 1)).toEqual({ start: '', end: '' });
  });

  it('findPeriodOverlap 找第一个重叠节次', () => {
    expect(findPeriodOverlap(DEFAULT_PERIOD_TIMES)).toBeNull();
    const overlapping = [
      { start: '08:00', end: '09:00' },
      { start: '08:50', end: '09:30' },
    ];
    expect(findPeriodOverlap(overlapping)).toBe(2);
  });
});