/** 本地唯一 id（不依赖服务端）。 */

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function createRepeatGroupId(): string {
  return createId('repeat');
}
