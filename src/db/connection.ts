import type { SqlDriver } from './driver';

let current: SqlDriver | null = null;

/** 由 App 启动流程或测试注入具体的数据库实现。 */
export function configureDriver(driver: SqlDriver): void {
  current = driver;
}

export function isDriverReady(): boolean {
  return current !== null;
}

export function getDriver(): SqlDriver {
  if (!current) {
    throw new Error('数据库尚未初始化，请先调用 initDatabase() 或 configureDriver()');
  }
  return current;
}

/** 仅测试使用：清空已注入的驱动。 */
export function resetDriverForTests(): void {
  current = null;
}
