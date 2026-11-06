import { configureDriver } from './connection';
import { migrate } from './migrations';
import { seedExercises } from './seed';
import { createWebDriver } from './web-driver';

let initPromise: Promise<void> | null = null;

/** Web 预览用：sql.js + localStorage，数据在浏览器刷新后仍保留。 */
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
  const driver = await createWebDriver();
  configureDriver(driver);
  await migrate();
  await seedExercises();
  driver.persist();
}
