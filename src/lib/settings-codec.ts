/**
 * `settings` 表键值编解码。
 *
 * 单独成文件是为了让「布尔值怎么落库」这件事可以被单测钉住：
 * 早期版本直接 `String(false)` 写成 'false'，读回时 `'false' !== '0'` 恒为 true，
 * 表现为「显示周六/周日开关点一下关掉、刷新又弹回开启」。
 */

/** 统一落库序列化：布尔 → '1' / '0'，对象/数组 → JSON，其余 → String。 */
export function serializeSettingValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** 布尔值读取：兼容 '1'/'0' 与历史遗留的 'true'/'false'，坏值回落 fallback。 */
export function parseBoolSetting(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return fallback;
}