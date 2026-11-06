/**
 * 导入备份时系统文件选择器的类型过滤规则。
 *
 * Android 各文件管理器对 `.json` 的 MIME 判定并不一致：有的报 `application/json`，
 * 有的报 `application/octet-stream`，还有的干脆不索引。若只按 MIME 过滤，本 App 导出的
 * 备份文件反而会被置灰选不中，列表里只剩 `text/plain` 命中的 .txt / .md 文件
 * （用户反馈的「点导入全是 md 文件」就是这个原因）。
 * 所以 Android 上放开成任意类型，选完再按 JSON 内容校验；iOS 用 MIME 是可靠的。
 */
export const ANY_DOCUMENT = '*/*';

export function backupPickerTypes(platform: string): string | string[] {
  if (platform === 'android') return ANY_DOCUMENT;
  return ['application/json', 'text/plain'];
}
