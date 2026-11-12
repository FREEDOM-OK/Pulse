import { afterEach, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers/node-driver';
import { resetDriverForTests } from '@/db/connection';
import { SCHEMA_VERSION } from '@/db/schema';
import { BACKUP_VERSION } from '@/db/repositories/backup';
import {
  getCardColor,
  getCardStyle,
  getDashMode,
  getHideCompleted,
  getMiddleTab,
  setCardColor,
  setCardStyle,
  setDashMode,
  setHideCompleted,
  setMiddleTab,
  setSetting,
} from '@/db/repositories/settings';
import { DEFAULT_CARD_COLOR } from '@/db/types';

afterEach(() => {
  resetDriverForTests();
});

describe('S0 数据层 v6 设置', () => {
  it('schema 与备份版本都已升到当前值', async () => {
    await createTestContext();
    expect(SCHEMA_VERSION).toBe(9);
    expect(BACKUP_VERSION).toBe(SCHEMA_VERSION);
  });

  it('新增设置项的默认值', async () => {
    await createTestContext();
    expect(await getMiddleTab()).toBe('fitness');
    expect(await getDashMode()).toBe('carousel');
    expect(await getCardStyle()).toBe('default');
    expect(await getCardColor()).toBe(DEFAULT_CARD_COLOR);
    expect(await getHideCompleted()).toBe(false);
  });

  it('底栏第三格可切到课表并持久化', async () => {
    await createTestContext();
    await setMiddleTab('timetable');
    expect(await getMiddleTab()).toBe('timetable');
  });

  it('非法设置值回落默认，不抛错', async () => {
    await createTestContext();
    await setSetting('tab.middle', 'games');
    await setSetting('home.dashMode', 'fan');
    await setSetting('home.cardStyle', 'neon');
    await setSetting('home.cardColor', 'red');
    expect(await getMiddleTab()).toBe('fitness');
    expect(await getDashMode()).toBe('carousel');
    expect(await getCardStyle()).toBe('default');
    expect(await getCardColor()).toBe(DEFAULT_CARD_COLOR);
  });

  it('Dash 模式、卡片样式与自定义颜色可写可读', async () => {
    await createTestContext();
    await setDashMode('stack');
    await setCardStyle('cartoon');
    await setCardColor('#123ABC');
    expect(await getDashMode()).toBe('stack');
    expect(await getCardStyle()).toBe('cartoon');
    // 颜色统一存小写，避免同色不同值。
    expect(await getCardColor()).toBe('#123abc');
  });

  it('完成后隐藏开关只认 true', async () => {
    await createTestContext();
    await setHideCompleted(true);
    expect(await getHideCompleted()).toBe(true);
    await setHideCompleted(false);
    expect(await getHideCompleted()).toBe(false);
    await setSetting('today.hideCompleted', 'yes');
    expect(await getHideCompleted()).toBe(false);
  });
});