import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';

type WebNavigator = {
  clipboard?: { writeText?: (text: string) => Promise<void> };
};

/**
 * 写系统剪贴板。
 *
 * - Web：优先 `navigator.clipboard.writeText`（非安全上下文里可能不存在）；
 * - 原生：`expo-clipboard` 的 `setStringAsync`。
 *
 * 任何一环失败都只是返回 false，**绝不抛错**——调用方要保证「复制失败」不能把
 * 整个 Promise 链条掀翻（原生端未捕获的拒绝会直接闪回首页）。
 */
export async function writeClipboard(text: string): Promise<boolean> {
  const value = typeof text === 'string' ? text : '';
  if (!value) return false;

  if (Platform.OS === 'web') {
    try {
      const nav = (globalThis as unknown as { navigator?: WebNavigator }).navigator;
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(value);
        return true;
      }
    } catch {
      // 落到 expo-clipboard 再试一次（web 上它内部也会走 navigator.clipboard）
    }
  }

  try {
    await Clipboard.setStringAsync(value);
    return true;
  } catch {
    return false;
  }
}