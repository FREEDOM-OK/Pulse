import { getDriver } from './connection';
import { MIGRATIONS } from './schema';

interface UserVersionRow {
  user_version: number;
}

/** 把数据库迁移到最新版本；可重复调用。 */
export async function migrate(): Promise<void> {
  const driver = getDriver();
  const row = await driver.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  const current = Number(row?.user_version ?? 0);

  for (let index = current; index < MIGRATIONS.length; index += 1) {
    await driver.execAsync('BEGIN');
    try {
      await driver.execAsync(MIGRATIONS[index]);
      await driver.execAsync(`PRAGMA user_version = ${index + 1}`);
      await driver.execAsync('COMMIT');
    } catch (error) {
      await driver.execAsync('ROLLBACK');
      throw error;
    }
  }
}

export async function getSchemaVersion(): Promise<number> {
  const row = await getDriver().getFirstAsync<UserVersionRow>('PRAGMA user_version');
  return Number(row?.user_version ?? 0);
}
