declare module 'sql.js/dist/sql-asm.js' {
  export interface SqlJsStatement {
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  }

  export interface SqlJsQueryResult {
    columns: string[];
    values: unknown[][];
  }

  export interface SqlJsDatabase {
    exec(sql: string, params?: unknown[]): SqlJsQueryResult[];
    run(sql: string, params?: unknown[]): void;
    prepare(sql: string, params?: unknown[]): SqlJsStatement;
    getRowsModified(): number;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | null) => SqlJsDatabase;
  }

  export default function initSqlJs(config?: Record<string, unknown>): Promise<SqlJsStatic>;
}
