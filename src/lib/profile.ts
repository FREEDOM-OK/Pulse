/** 个人资料与生日的校验（纯函数，便于单测）。 */

import { PROFILE_GENDERS, type ProfileGender, type ProfileRow } from '@/db/types';

export const DEFAULT_PROFILE: ProfileRow = {
  name: '用户',
  gender: 'secret',
  birthday: null,
  avatarUri: null,
};

export function normalizeName(raw: string): string {
  return raw.trim();
}

/** 返回错误文案；合法时返回 null。 */
export function validateName(raw: string): string | null {
  const name = normalizeName(raw);
  if (name === '') return '请输入用户名';
  if ([...name].length > 16) return '用户名最多 16 个字';
  return null;
}

export function isProfileGender(value: string): value is ProfileGender {
  return (PROFILE_GENDERS as string[]).includes(value);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 生日格式必须为真实存在的 YYYY-MM-DD；空值视为合法（不填生日）。 */
export function isValidBirthday(value: string | null): boolean {
  if (value == null || value === '') return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const thisYear = new Date().getFullYear();
  if (year < 1900 || year > thisYear) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

export interface BirthdayDraft {
  year: string;
  month: string;
  day: string;
}

export type BirthdayResult = { ok: true; value: string | null } | { ok: false; message: string };

/**
 * 三个输入框 → 存储值。
 * 三项全空 = 不填生日；只填一部分、或日期不存在 → 报错。
 */
export function composeBirthday(draft: BirthdayDraft): BirthdayResult {
  const year = draft.year.trim();
  const month = draft.month.trim();
  const day = draft.day.trim();
  const emptyCount = [year, month, day].filter((part) => part === '').length;
  if (emptyCount === 3) return { ok: true, value: null };
  if (emptyCount > 0) {
    return { ok: false, message: '请填写完整的生日，或三项都留空' };
  }
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
    return { ok: false, message: '请填写正确的日期' };
  }
  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = Number(day);
  const thisYear = new Date().getFullYear();
  if (yearNum < 1900 || yearNum > thisYear) {
    return { ok: false, message: '请填写正确的日期' };
  }
  if (monthNum < 1 || monthNum > 12) {
    return { ok: false, message: '请填写正确的日期' };
  }
  if (dayNum < 1 || dayNum > daysInMonth(yearNum, monthNum)) {
    return { ok: false, message: '请填写正确的日期' };
  }
  return { ok: true, value: `${year}-${pad(monthNum)}-${pad(dayNum)}` };
}

/** YYYY-MM-DD → 三个输入框的初值。 */
export function splitBirthday(value: string | null): BirthdayDraft {
  if (!value) return { year: '', month: '', day: '' };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: '', month: '', day: '' };
  return { year: match[1], month: match[2], day: match[3] };
}

export type ProfileValidation =
  | { ok: true; profile: ProfileRow }
  | { ok: false; field: 'name' | 'birthday'; message: string };

export function validateProfile(input: ProfileRow): ProfileValidation {
  const nameError = validateName(input.name);
  if (nameError) return { ok: false, field: 'name', message: nameError };
  if (!isValidBirthday(input.birthday)) {
    return { ok: false, field: 'birthday', message: '请填写正确的日期' };
  }
  return {
    ok: true,
    profile: {
      name: normalizeName(input.name),
      gender: isProfileGender(input.gender) ? input.gender : 'secret',
      birthday: input.birthday || null,
      avatarUri: input.avatarUri || null,
    },
  };
}