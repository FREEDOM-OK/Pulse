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
    await page.waitForText('Hi，');
    await page.evaluate('localStorage.clear()');
    await page.reload();
    await page.waitForText('Hi，');

    // 首页第一页：添加一条消费事件
    await page.clickLabel('添加事件');
    await page.waitForText('添加重大消费');
    await page.clickText('添加重大消费');
    await page.waitForText('金额');
    await page.fillByLabel('事件名称', '超市采购');
    await page.fillByLabel('金额', '128.5');
    await page.clickLabel('保存事件');
    await page.waitForText('今日 1 条');
    await sleep(300);
    await page.screenshot(path.join(OUT_DIR, 'home-light.png'));

    // 今日计划：两条任务，第一条完成
    await page.goto(`${BASE_URL}/today`);
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

    // 健身：添加卧推，完成两组，长按第 2 组露出删除菜单
    await page.goto(`${BASE_URL}/fitness`);
    await page.waitForText('还没有待训练的动作');
    await page.clickText('添加');
    await page.waitForText('选择动作');
    await page.clickText('杠铃卧推');
    await page.clickText('添加到所选日期');
    await page.waitForText('已练 0 组');
    await page.clickText('完成');
    await page.clickText('完成');
    await page.waitForText('共 2 组');
    await page.longPressText('第2组');
    await page.waitForLabel('删除');
    await sleep(400);
    await page.screenshot(path.join(OUT_DIR, 'fitness.png'));
    await page.clickLabel('取消');

    // 游戏：想玩 -> 玩了
    await page.goto(`${BASE_URL}/games`);
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

    // 首页第二页：完整日历回顾
    await page.goto(BASE_URL);
    await page.waitForText('Hi，');
    await page.mouseDrag(488, 820, 488, 180, 14);
    await sleep(900);
    await page.screenshot(path.join(OUT_DIR, 'calendar.png'));

    // 个人资料页
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForText('数据与偏好');
    await page.clickLabel('账号 用户');
    await page.waitForText('个人资料');
    await sleep(400);
    await page.screenshot(path.join(OUT_DIR, 'profile.png'));

    // 深色主题
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForText('数据与偏好');
    await page.clickText('深色');
    await sleep(500);
    await page.screenshot(path.join(OUT_DIR, 'settings-dark.png'));

    await page.goto(BASE_URL);
    await sleep(600);
    await page.screenshot(path.join(OUT_DIR, 'home-dark.png'));

    await page.goto(`${BASE_URL}/fitness`);
    await sleep(600);
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