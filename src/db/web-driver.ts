/**
 * Web 端数据库驱动。
 *
 * 浏览器里不用 expo-sqlite（依赖 wasm worker / OPFS，在无头环境不稳定），
 * 改用 sql.js 的 asm.js 构建（纯 JS 的 SQLite），并把整个数据库文件
 * 持久化到 localStorage。仅用于开发预览，真实数据始终在手机上。
 */
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { SqlJsDatabase, SqlJsStatement, SqlJsStatic } from 'sql.js/dist/sql-asm.js';
import type { RunResult, SqlDriver, SqlParam } from './driver';

const STORAGE_KEY = 'life-app-sqlite-base64';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function readSavedDatabase(): Uint8Array | null {
  if (typeof localStorage === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return fromBase64(stored);
  } catch {
    return null;
  }
}

function rowFromStatement(statement: SqlJsStatement): Record<string, unknown> {
  return statement.getAsObject();
}

export interface WebDriver extends SqlDriver {
  persist: () => void;
}

export async function createWebDriver(): Promise<WebDriver> {
  // E2E 用：`?resetDb=1` 打开时先丢掉上一次存下的库，保证从空库开始。
  // 测试里如果先 localStorage.clear() 再 reload，上一次页面挂起的 50ms 落盘定时器
  // 会在两步之间把旧库写回去，看起来「清了库」其实还是旧数据。
  if (
    typeof window !== 'undefined' &&
    typeof localStorage !== 'undefined' &&
    new URLSearchParams(window.location.search).get('resetDb') === '1'
  ) {
    localStorage.removeItem(STORAGE_KEY);
    // 用完立刻把参数从地址栏抹掉，否则之后每次 reload/刷新都会再清一次库。
    const cleaned = new URL(window.location.href);
    cleaned.searchParams.delete('resetDb');
    window.history.replaceState(null, '', `${cleaned.pathname}${cleaned.search}${cleaned.hash}`);
  }

  const SQL: SqlJsStatic = await initSqlJs();
  const saved = readSavedDatabase();
  const db: SqlJsDatabase = saved ? new SQL.Database(saved) : new SQL.Database();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const persistNow = () => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, toBase64(db.export()));
    } catch {
      // 存储已满或被禁用时忽略，页面仍在内存里可用。
    }
  };

  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persistNow();
    }, 50);
  };

  return {
    persist: persistNow,

    execAsync: async (sql: string) => {
      db.exec(sql);
      scheduleSave();
    },

    runAsync: async (sql: string, params: SqlParam[] = []): Promise<RunResult> => {
      db.run(sql, params as unknown[]);
      const result = db.exec('SELECT last_insert_rowid() AS id');
      const lastInsertRowId = Number(result[0]?.values?.[0]?.[0] ?? 0);
      const changes = db.getRowsModified();
      scheduleSave();
      return { changes, lastInsertRowId };
    },

    getAllAsync: async <T>(sql: string, params: SqlParam[] = []): Promise<T[]> => {
      const statement = db.prepare(sql, params as unknown[]);
      const rows: T[] = [];
      try {
        while (statement.step()) {
          rows.push(rowFromStatement(statement) as T);
        }
      } finally {
        statement.free();
      }
      return rows;
    },

    getFirstAsync: async <T>(sql: string, params: SqlParam[] = []): Promise<T | null> => {
      const statement = db.prepare(sql, params as unknown[]);
      try {
        if (statement.step()) {
          return rowFromStatement(statement) as T;
        }
        return null;
      } finally {
        statement.free();
      }
    },

    withTransactionAsync: async (fn: () => Promise<void>) => {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
        scheduleSave();
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
