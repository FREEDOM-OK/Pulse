/** 金额的解析与展示（纯函数，便于单测）。 */

/** 只接受「整数」或「整数.小数」；空字符串表示不填金额。 */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** 空金额不显示货币符号；去掉小数末尾多余的 0。 */
export function formatAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '';
  const rounded = Math.round(amount * 100) / 100;
  return `¥${String(rounded)}`;
}