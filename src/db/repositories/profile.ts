import { getDriver } from '../connection';
import { DEFAULT_PROFILE, isProfileGender, validateProfile } from '@/lib/profile';
import type { ProfileRow } from '../types';
import { deleteSetting, getAllSettings, setSetting } from './settings';

export const PROFILE_NAME_KEY = 'profile.name';
export const PROFILE_GENDER_KEY = 'profile.gender';
export const PROFILE_BIRTHDAY_KEY = 'profile.birthday';
export const PROFILE_AVATAR_KEY = 'profile.avatar';

/** 读取个人资料；缺失或非法值回退为默认值。 */
export async function getProfile(): Promise<ProfileRow> {
  const settings = await getAllSettings();
  const name = settings[PROFILE_NAME_KEY]?.trim();
  const gender = settings[PROFILE_GENDER_KEY];
  const birthday = settings[PROFILE_BIRTHDAY_KEY]?.trim();
  const avatar = settings[PROFILE_AVATAR_KEY]?.trim();
  return {
    name: name && name !== '' ? name : DEFAULT_PROFILE.name,
    gender: gender && isProfileGender(gender) ? gender : DEFAULT_PROFILE.gender,
    birthday: birthday && birthday !== '' ? birthday : null,
    avatarUri: avatar && avatar !== '' ? avatar : null,
  };
}

/** 保存前统一校验；失败时返回给表单展示的文案。 */
export async function saveProfile(
  input: ProfileRow
): Promise<{ ok: true } | { ok: false; message: string }> {
  const validated = validateProfile(input);
  if (!validated.ok) return { ok: false, message: validated.message };
  const profile = validated.profile;
  await Promise.all([
    setSetting(PROFILE_NAME_KEY, profile.name),
    setSetting(PROFILE_GENDER_KEY, profile.gender),
  ]);
  if (profile.birthday) {
    await setSetting(PROFILE_BIRTHDAY_KEY, profile.birthday);
  } else {
    await deleteSetting(PROFILE_BIRTHDAY_KEY);
  }
  if (profile.avatarUri) {
    await setSetting(PROFILE_AVATAR_KEY, profile.avatarUri);
  } else {
    await deleteSetting(PROFILE_AVATAR_KEY);
  }
  return { ok: true };
}

export async function resetProfile(): Promise<void> {
  const driver = getDriver();
  await driver.runAsync('DELETE FROM settings WHERE key LIKE ?', ['profile.%']);
}