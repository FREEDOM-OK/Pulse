import { afterEach, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers/node-driver';
import { resetDriverForTests } from '@/db/connection';
import {
  getAppSkin,
  getHomeBgColor,
  getHomeBgImage,
  getHomeBgMode,
  setAppSkin,
  setHomeBgColor,
  setHomeBgImage,
  setHomeBgMode,
  setSetting,
} from '@/db/repositories/settings';
import { DEFAULT_HOME_BG_COLOR } from '@/db/types';

afterEach(() => {
  resetDriverForTests();
});

describe('S5 外观设置（皮肤 / 首页背景）', () => {
  it('默认值：经典极简 + 默认底色 + 冰川浅蓝', async () => {
    await createTestContext();
    expect(await getAppSkin()).toBe('default');
    expect(await getHomeBgMode()).toBe('default');
    expect(await getHomeBgColor()).toBe(DEFAULT_HOME_BG_COLOR);
    expect(await getHomeBgImage()).toBeNull();
  });

  it('皮肤可切到毛玻璃并持久化', async () => {
    await createTestContext();
    await setAppSkin('glass');
    expect(await getAppSkin()).toBe('glass');
  });

  it('页面背景五种模式都可持久化（含两套预设渐变）', async () => {
    await createTestContext();
    for (const mode of ['mist', 'zen', 'color', 'image', 'default'] as const) {
      await setHomeBgMode(mode);
      expect(await getHomeBgMode()).toBe(mode);
    }
  });

  it('颜色读回小写，非法色值回落默认', async () => {
    await createTestContext();
    await setHomeBgColor('#AABBCC');
    expect(await getHomeBgColor()).toBe('#aabbcc');
    await setSetting('home.bgColor', 'not-a-color');
    expect(await getHomeBgColor()).toBe(DEFAULT_HOME_BG_COLOR);
  });

  it('图片为空串时视作未设置，存 null 会删除键', async () => {
    await createTestContext();
    await setSetting('home.bgImage', '');
    expect(await getHomeBgImage()).toBeNull();
    await setHomeBgImage('file:///mock/home/background.jpg');
    expect(await getHomeBgImage()).toBe('file:///mock/home/background.jpg');
    await setHomeBgImage(null);
    expect(await getHomeBgImage()).toBeNull();
  });

  it('非法皮肤 / 背景模式回落默认', async () => {
    await createTestContext();
    await setSetting('app.skin', 'neon');
    await setSetting('home.bgMode', 'video');
    expect(await getAppSkin()).toBe('default');
    expect(await getHomeBgMode()).toBe('default');
  });
});