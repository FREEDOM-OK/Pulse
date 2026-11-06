import { DatabaseSync } from 'node:sqlite';
import type { RunResult, SqlDriver, SqlParam } from '@/db/driver';
import { configureDriver, resetDriverForTests } from '@/db/connection';
import { migrate } from '@/db/migrations';
import { seedExercises } from '@/db/seed';

export interface NodeTestDriver extends SqlDriver {
  close: () => void;
  raw: DatabaseSync;
}

export function createNodeDriver(filename = ':memory:'): NodeTestDriver {
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = OFF');

  const driver: NodeTestDriver = {
    raw: db,
    close: () => db.close(),
    execAsync: async (sql: string) => {
      db.exec(sql);
    },
    runAsync: async (sql: string, params: SqlParam[] = []): Promise<RunResult> => {
      const statement = db.prepare(sql);
      const result = statement.run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    getAllAsync: async <T>(sql: string, params: SqlParam[] = []): Promise<T[]> => {
      const statement = db.prepare(sql);
      return statement.all(...params) as T[];
    },
    getFirstAsync: async <T>(sql: string, params: SqlParam[] = []): Promise<T | null> => {
      const statement = db.prepare(sql);
      const row = statement.get(...params);
      return (row ?? null) as T | null;
    },
    withTransactionAsync: async (fn: () => Promise<void>) => {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };

  return driver;
}

/** 建一个已迁移、已灌入预置动作的内存库，并注入为当前驱动。 */
export async function createTestContext(): Promise<NodeTestDriver> {
  resetDriverForTests();
  const driver = createNodeDriver(':memory:');
  configureDriver(driver);
  await migrate();
  await seedExercises();
  return driver;
}
