import { afterEach, describe, expect, it } from 'vitest';
import { resetDriverForTests } from '@/db/connection';
import { createTestContext } from './helpers/node-driver';
import {
  DEFAULT_PROFILE,
  composeBirthday,
  isValidBirthday,
  normalizeName,
  splitBirthday,
  validateName,
  validateProfile,
} from '@/lib/profile';
import { getProfile, resetProfile, saveProfile } from '@/db/repositories/profile';
import type { ProfileRow } from '@/db/types';

const CURRENT_YEAR = new Date().getFullYear();

afterEach(() => {
  resetDriverForTests();
});

describe('P1 个人资料：用户名与生日校验', () => {
  it('用户名去首尾空格，1~16 个字', () => {
    expect(normalizeName('  小明 ')).toBe('小明');
    expect(validateName('')).toBe('请输入用户名');
    expect(validateName('   ')).toBe('请输入用户名');
    expect(validateName('小明')).toBeNull();
    expect(validateName('名'.repeat(16))).toBeNull();
    expect(validateName('名'.repeat(17))).toBe('用户名最多 16 个字');
  });

  it('生日必须是真实的 YYYY-MM-DD，空值合法', () => {
    expect(isValidBirthday(null)).toBe(true);
    expect(isValidBirthday('')).toBe(true);
    expect(isValidBirthday('2000-02-29')).toBe(true);
    expect(isValidBirthday('2001-02-29')).toBe(false);
    expect(isValidBirthday('2000-13-01')).toBe(false);
    expect(isValidBirthday('1899-12-31')).toBe(false);
    expect(isValidBirthday(`${CURRENT_YEAR + 1}-01-01`)).toBe(false);
    expect(isValidBirthday('2000-1-2')).toBe(false);
  });

  it('三个输入框：全空=不填，部分填=提示补全，非法日期=报错', () => {
    expect(composeBirthday({ year: '', month: '', day: '' })).toEqual({ ok: true, value: null });
    expect(composeBirthday({ year: '2000', month: '', day: '' })).toEqual({
      ok: false,
      message: '请填写完整的生日，或三项都留空',
    });
    expect(composeBirthday({ year: '2000', month: '2', day: '29' })).toEqual({
      ok: true,
      value: '2000-02-29',
    });
    expect(composeBirthday({ year: '2001', month: '2', day: '29' }).ok).toBe(false);
    expect(composeBirthday({ year: '2000', month: '13', day: '1' }).ok).toBe(false);
    expect(composeBirthday({ year: '1800', month: '1', day: '1' }).ok).toBe(false);
  });

  it('splitBirthday 与 composeBirthday 互逆', () => {
    expect(splitBirthday('2000-01-02')).toEqual({ year: '2000', month: '01', day: '02' });
    expect(splitBirthday(null)).toEqual({ year: '', month: '', day: '' });
    expect(composeBirthday(splitBirthday('1999-12-31'))).toEqual({ ok: true, value: '1999-12-31' });
  });

  it('validateProfile 修正用户名空格与非法性别', () => {
    const result = validateProfile({
      name: '  小明 ',
      gender: 'other' as ProfileRow['gender'],
      birthday: '',
      avatarUri: '',
    });
    expect(result).toEqual({
      ok: true,
      profile: { name: '小明', gender: 'secret', birthday: null, avatarUri: null },
    });

    const bad = validateProfile({ ...DEFAULT_PROFILE, name: '' });
    expect(bad.ok).toBe(false);
  });
});

describe('P1 个人资料仓储', () => {
  it('默认值、保存后读回、重置', async () => {
    await createTestContext();
    expect(await getProfile()).toEqual(DEFAULT_PROFILE);

    await saveProfile({
      name: '小明',
      gender: 'male',
      birthday: '2000-01-02',
      avatarUri: null,
    });
    expect(await getProfile()).toEqual({
      name: '小明',
      gender: 'male',
      birthday: '2000-01-02',
      avatarUri: null,
    });

    await resetProfile();
    expect(await getProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('保存时拒绝空用户名并返回提示文案', async () => {
    await createTestContext();
    expect(
      await saveProfile({ name: ' ', gender: 'secret', birthday: null, avatarUri: null })
    ).toEqual({ ok: false, message: '请输入用户名' });
  });
});