import { launchBrowser, waitForHttp } from './browser.mjs';
import { run as runToday } from './today.e2e.mjs';
import { run as runFitness } from './fitness.e2e.mjs';

import { run as runGames } from './games.e2e.mjs';
import { run as runHome } from './home.e2e.mjs';
import { run as runCalendar } from './calendar.e2e.mjs';
import { run as runSettings } from './settings.e2e.mjs';

const BASE_URL = process.env.E2E_URL ?? 'http://localhost:8090';

const scenarios = [
  { name: 'P2 今日计划', run: runToday },
  { name: 'P3 健身', run: runFitness },
  
  { name: 'P5 游戏', run: runGames },
  { name: 'P6 首页', run: runHome },
  { name: 'P7 日历回顾', run: runCalendar },
  { name: 'P8 数据与设置', run: runSettings },
];

async function main() {
  await waitForHttp(BASE_URL, 30000);

  // 支持只跑某个场景：node tests/e2e/run.mjs P5
  const filter = process.argv[2];
  const selected = filter ? scenarios.filter((scenario) => scenario.name.includes(filter)) : scenarios;
  if (selected.length === 0) {
    console.error(`没有匹配「${filter}」的场景`);
    process.exit(1);
  }

  const browser = await launchBrowser();
  let failed = 0;
  try {
    for (const scenario of selected) {
      const started = Date.now();
      try {
        await scenario.run(browser.page, BASE_URL);
        console.log(`✓ ${scenario.name} (${Date.now() - started}ms)`);
      } catch (error) {
        failed += 1;
        console.error(`✗ ${scenario.name}`);
        console.error(error instanceof Error ? error.message : error);
        try {
          await browser.page.screenshot(`tests/e2e/failure-${scenario.name}.png`);
        } catch {
          // ignore
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (failed > 0) {
    console.error(`\n${failed} 个 UI 场景失败`);
    process.exit(1);
  }
  console.log(`\n${selected.length} 个 UI 场景全部通过`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
