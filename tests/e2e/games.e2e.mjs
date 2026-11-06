import { sleep } from './browser.mjs';

function dateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayLabel(date) {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

/** P5 游戏：添加想玩 -> 玩了弹窗（日期/时长/星级/体验）-> 已玩记录 -> 编辑 -> 删除 */
export async function run(page, baseUrl) {
  const today = new Date();
  const todayDate = dateStr(today);
  const selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() === 1 ? 2 : 1);

  await page.goto(baseUrl);
  await page.waitForText('首页');
  await page.clickText('游戏');
  await page.waitForText('想玩清单是空的');

  // 空白区域左滑 -> 已玩记录，右滑 -> 回到想玩清单
  const area = await page.rectOfLabel('游戏列表区域');
  if (!area) throw new Error('找不到游戏列表区域');
  const swipeY = area.y + area.height - 160;
  await page.drag(area.x + area.width * 0.75, swipeY, area.x + area.width * 0.1, swipeY);
  await page.waitForText('还没有游玩记录');
  await page.drag(area.x + area.width * 0.1, swipeY, area.x + area.width * 0.75, swipeY);
  await page.waitForText('想玩清单是空的');
  await page.waitForText('想玩 0 · 已玩 0');

  // 添加想玩的游戏
  await page.clickLabel('添加想玩的游戏');
  await page.waitForText('添加想玩的游戏');
  await page.fill('例如：塞尔达：王国之泪', '塞尔达');
  await page.fill('为什么想玩', '听说探索感很强');
  await page.clickText('保存');
  await page.waitForText('塞尔达');
  await page.waitForText('听说探索感很强');

  // 点了：默认今天，并改成另一个日期
  await page.clickText('玩了');
  await page.waitForText('玩了：塞尔达');
  await page.waitForLabel(`游玩日期 ${todayDate}`);
  await page.clickLabel(`游玩日期 ${todayDate}`);
  await page.waitForText('选择日期');
  await page.clickLabel(`选择日期 ${dateStr(selectedDate)}`);
  await page.waitForLabel(`游玩日期 ${dateStr(selectedDate)}`);
  await page.clickLabel('游玩小时 2');
  await page.clickLabel('游玩分钟 30');
  await page.fill('玩起来怎么样', '探索感很强，地图很大');
  await page.clickLabel('4 星', -1);
  await page.clickText('保存');

  // 想玩清单清空，已玩记录 +1
  await page.waitForText('想玩清单是空的');
  await page.waitForText('想玩 0 · 已玩 1');

  // 切到已玩记录，确认保存的游玩日期和时长
  await page.clickText('已玩记录');
  await page.waitForText(dayLabel(selectedDate));
  await page.waitForText('探索感很强，地图很大');
  await page.waitForText('2 小时 30 分钟');
  await page.waitForLabel('评分 4 星');

  // 编辑评分到 5 星
  await page.clickText('探索感很强，地图很大');
  await page.waitForText('编辑已玩记录');
  await page.waitForLabel(`游玩日期 ${dateStr(selectedDate)}`);
  await page.clickLabel('5 星', -1);
  await page.clickText('保存');
  await sleep(400);
  await page.waitForLabel('评分 5 星');

  // 刷新后仍在
  await page.reload();
  await page.clickText('游戏');
  await page.clickText('已玩记录');
  await page.waitForText('塞尔达');
  await page.waitForText(dayLabel(selectedDate));

  // 删除已玩记录
  await page.clickText('删除');
  await page.waitForText('删除这条游玩记录？');
  await page.clickText('确认删除');
  await sleep(400);
  await page.waitForText('还没有游玩记录');
}
