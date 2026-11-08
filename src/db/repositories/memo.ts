import { deleteSetting, getSetting, setSetting } from './settings';

export const QUICK_MEMO_KEY = 'memo.quick';
export const QUICK_MEMO_MAX_LENGTH = 200;

/**
 * 首页「备忘录」框：只保存一段文字。
 * 存在 settings 表里，所以会跟着备份一起导出/导入，清空数据时一起消失。
 */
export async function getQuickMemo(): Promise<string> {
  return (await getSetting(QUICK_MEMO_KEY)) ?? '';
}

export async function saveQuickMemo(text: string): Promise<void> {
  const value = text.trim().slice(0, QUICK_MEMO_MAX_LENGTH);
  if (value.length === 0) {
    await deleteSetting(QUICK_MEMO_KEY);
    return;
  }
  await setSetting(QUICK_MEMO_KEY, value);
}