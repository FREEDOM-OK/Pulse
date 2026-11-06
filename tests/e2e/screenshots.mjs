import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser, sleep, waitForHttp } from './browser.mjs';

const BASE_URL = process.env.E2E_URL ?? 'http://localhost:8090';
const OUT_DIR = path.resolve('docs/screenshots');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await waitForHttp(BASE_URL, 30000);
  const browser = await launchBrowser();
  const page = browser.page;

  try {
    await page.goto(BASE_URL);
    await page.waitForText('今天');

    // 今日计划：两条任务，第一条完成
    await page.clickText('今日计划');
    await page.waitForText('这一天还没有任务');
    await page.clickLabel('添加任务');
    await page.waitForText('添加任务');
    await page.fill('例如：写周报', '写周报');
    await page.fill('09:00', '09:30');
    await page.clickText('保存');
    await page.waitForText('写周报');

    await page.clickLabel('添加任务');
    await page.fill('例如：写周报', '买菜');
    await page.clickText('保存');
    await page.waitForText('买菜');

    await page.clickLabel('标记为完成');
    await sleep(300);
    await page.screenshot(path.join(OUT_DIR, 'today.png'));

    // 备忘
    await page.clickText('首页');
    await page.waitForText('快速备忘');
    await page.clickLabel('添加备忘');
    await page.fill('例如：交房租', '交房租');
    await page.fill('例如：财务，生活', '财务');
    await page.clickText('保存');
    await page.waitForText('交房租');
    await page.screenshot(path.join(OUT_DIR, 'home-light.png'));

    // 健身：添加卧推，完成两组
    await page.clickText('健身');
    await page.waitForText('今天还没有安排训练');
    await page.clickText('动作库');
    await page.waitForText('选择动作');
    await page.clickText('卧推');
    await page.clickText('添加到今天');
    await page.waitForText('已练 0 组');
    await page.clickText('完成');
    await page.clickText('完成');
    await page.waitForText('共 2 组');
    // 左滑第 2 组，让截图里能看到「删除」按钮
    await page.swipeLeft('第2组');
    await sleep(300);
    await page.screenshot(path.join(OUT_DIR, 'fitness.png'));

    // 饮食
    await page.clickText('饮食');
    await page.waitForText('今天还没有饮食记录');
    await page.clickLabel('添加饮食');
    await page.waitForText('今日饮食添加');
    await page.clickText('午餐');
    await page.fill('例如：鸡胸肉饭', '鸡胸肉饭');
    await page.fill('例如：520', '520');
    await page.clickText('保存');
    await page.waitForText('鸡胸肉饭');
    await page.screenshot(path.join(OUT_DIR, 'diet.png'));

    // 游戏：想玩 -> 玩了
    await page.clickText('游戏');
    await page.waitForText('想玩清单是空的');
    await page.clickLabel('添加想玩的游戏');
    await page.fill('例如：塞尔达：王国之泪', '塞尔达：王国之泪');
    await page.clickText('保存');
    await page.waitForText('塞尔达：王国之泪');
    await page.clickText('玩了');
    await page.waitForText('玩了：塞尔达：王国之泪');
    await page.clickLabel('游玩小时 2');
    await page.clickLabel('游玩分钟 30');
    await page.fill('玩起来怎么样', '探索感很强，地图很大');
    await page.clickLabel('5 星', -1);
    await page.clickText('保存');
    await page.waitForText('想玩清单是空的');
    await page.clickText('已玩记录');
    await page.waitForText('探索感很强，地图很大');
    await page.screenshot(path.join(OUT_DIR, 'games.png'));

    // 日历回顾
    await page.clickText('首页');
    await page.waitForText('查看完整日历回顾');
    await page.clickLabel('查看日历回顾');
    await page.waitForText('日历回顾');
    await sleep(500);
    await page.screenshot(path.join(OUT_DIR, 'calendar.png'));

    // 深色主题
    await page.goto(BASE_URL);
    await page.waitForText('今天');
    await page.clickText('设置');
    await page.waitForText('数据与偏好');
    await page.clickText('深色');
    await sleep(500);
    await page.screenshot(path.join(OUT_DIR, 'settings-dark.png'));

    await page.clickText('首页');
    await page.waitForText('快速备忘');
    await sleep(400);
    await page.screenshot(path.join(OUT_DIR, 'home-dark.png'));

    await page.clickText('健身');
    await sleep(500);
    await page.screenshot(path.join(OUT_DIR, 'fitness-dark.png'));

    console.log('截图已生成：', fs.readdirSync(OUT_DIR).join(', '));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
