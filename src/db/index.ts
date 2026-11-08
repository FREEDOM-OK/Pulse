import * as SQLite from 'expo-sqlite';
import { configureDriver } from './connection';
import { migrate } from './migrations';
import { migrateLegacyQuickMemo } from './migrations-v4';
import { seedExercises } from './seed';

let initPromise: Promise<void> | null = null;

/**
 * 打开本地数据库、执行迁移、写入预置动作。
 * 幂等：重复调用只初始化一次。
 */
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

async function doInit(): Promise<void> {
  const db = await SQLite.openDatabaseAsync('life-app.db');

  configureDriver({
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      const result = await db.runAsync(sql, params);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
    },
    getAllAsync: <T>(sql: string, params: (string | number | null)[] = []) =>
      db.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: (string | number | null)[] = []) =>
      db.getFirstAsync<T>(sql, params),
    withTransactionAsync: (fn) => db.withTransactionAsync(fn),
  });

  await db.execAsync('PRAGMA journal_mode = WAL');
  await migrate();
  await migrateLegacyQuickMemo();
  await seedExercises();
}
