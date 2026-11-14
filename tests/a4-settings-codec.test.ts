import { afterEach, describe, expect, it } from 'vitest';
import { getDriver, resetDriverForTests } from '@/db/connection';
import { getSetting } from '@/db/repositories/settings';
import { parseBoolSetting, serializeSettingValue } from '@/lib/settings-codec';
import { createTestContext } from './helpers/node-driver';

afterEach(() => {
  resetDriverForTests();
});

describe('settings 键值编解码', () => {
  it('布尔值落库成 1 / 0，而不是 true / false', () => {
    expect(serializeSettingValue(true)).toBe('1');
    expect(serializeSettingValue(false)).toBe('0');
  });

  it('对象走 JSON，数字与字符串走 String', () => {
    expect(serializeSettingValue({ a: 1 })).toBe('{"a":1}');
    expect(serializeSettingValue([1, 2])).toBe('[1,2]');
    expect(serializeSettingValue(58)).toBe('58');
    expect(serializeSettingValue('#F5F5F7')).toBe('#F5F5F7');
  });

  it('parseBoolSetting 同时认 1/0 与历史的 true/false', () => {
    expect(parseBoolSetting('1', false)).toBe(true);
    expect(parseBoolSetting('0', true)).toBe(false);
    expect(parseBoolSetting('true', false)).toBe(true);
    expect(parseBoolSetting('false', true)).toBe(false);
    expect(parseBoolSetting(undefined, true)).toBe(true);
    expect(parseBoolSetting('', false)).toBe(false);
    expect(parseBoolSetting('乱码', true)).toBe(true);
  });

  it('关闭「显示周日」后写库读回仍是关闭（不再被当成 truthy）', async () => {
    await createTestContext();
    await getDriver().runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('timetable.showSunday', ?);`,
      [serializeSettingValue(false)]
    );

    const raw = await getSetting('timetable.showSunday');
    expect(raw).toBe('0');
    expect(parseBoolSetting(raw ?? undefined, true)).toBe(false);
  });

  it('历史版本写下的 "false" 读回也按关闭处理', async () => {
    await createTestContext();
    await getDriver().runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('timetable.showSaturday', ?);`,
      ['false']
    );

    const raw = await getSetting('timetable.showSaturday');
    expect(parseBoolSetting(raw ?? undefined, true)).toBe(false);
  });
});