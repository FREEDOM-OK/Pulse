/** 数据库驱动抽象：App 用 expo-sqlite 实现，测试用 node:sqlite 实现。 */

export type SqlParam = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SqlDriver {
  /** 执行一条或多条不带参数的 SQL。 */
  execAsync(sql: string): Promise<void>;
  /** 执行一条写语句，返回影响行数与自增主键。 */
  runAsync(sql: string, params?: SqlParam[]): Promise<RunResult>;
  /** 查询多行。 */
  getAllAsync<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  /** 查询单行，没有时返回 null。 */
  getFirstAsync<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  /** 在一个事务里执行 fn；fn 抛错则回滚。 */
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
