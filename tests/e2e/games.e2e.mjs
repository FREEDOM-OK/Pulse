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

  await page.goto(`${baseUrl}/games`);
  await page.waitForText('想玩清单是空的');

  // 空白区域左滑 -> 已玩记录；拖动过程中顶部页签框要跟着手指走
  // 注意：Web 上要一小步一小步地移动（CDP 只发两次大跨度 mousemove 时不会触发 PanResponder）。
  const area = await page.rectOfLabel('游戏列表区域');
  if (!area) throw new Error('找不到游戏列表区域');
  const swipeY = area.y + area.height * 0.7;
  const startX = area.x + area.width * 0.8;
  const endX = area.x + area.width * 0.25;
  const indicatorBefore = await page.rectOfLabel('页签指示器');
  if (!indicatorBefore) throw new Error('找不到页签指示器');
  await page.mouseDown(startX, swipeY);
  for (let step = 1; step <= 8; step += 1) {
    await page.mouseMove(startX + ((endX - startX) * step) / 8, swipeY);
    await sleep(16);
  }
  await sleep(200);
  const indicatorMid = await page.rectOfLabel('页签指示器');
  await page.mouseUp(endX, swipeY);
  await sleep(600);
  const indicatorMoved = (indicatorMid ? indicatorMid.x : indicatorBefore.x) - indicatorBefore.x;
  if (indicatorMoved < 8) {
    throw new Error(`拖动时页签指示器没有跟着手走，只移动了 ${indicatorMoved}px`);
  }
  await page.waitForText('还没有游玩记录');
  // 右滑回到想玩清单
  await page.mouseDrag(area.x + area.width * 0.1, swipeY, area.x + area.width * 0.75, swipeY);
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

  // 长按想玩行弹出「编辑 / 删除」菜单（不再用左滑）
  await page.longPressText('听说探索感很强');
  await page.waitForLabel('编辑');
  await page.waitForLabel('删除');
  await page.clickLabel('取消');
  await sleep(400);
  await page.waitForText('塞尔达');

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

  // 长按已玩卡片，选「编辑」把评分改到 5 星
  await page.longPressText('探索感很强，地图很大');
  await page.waitForLabel('编辑');
  await page.clickLabel('编辑');
  await page.waitForText('编辑已玩记录');
  await page.waitForLabel(`游玩日期 ${dateStr(selectedDate)}`);
  await page.clickLabel('5 星', -1);
  await page.clickText('保存');
  await sleep(400);
  await page.waitForLabel('评分 5 星');

  // 刷新后仍在
  await page.reload();
  await page.goto(`${baseUrl}/games`);
  await page.clickText('已玩记录');
  await page.waitForText('塞尔达');
  await page.waitForText(dayLabel(selectedDate));

  // 长按已玩卡片弹出菜单，删除这条记录
  await page.longPressText('探索感很强，地图很大');
  await page.waitForLabel('删除');
  await page.clickLabel('删除');
  await page.waitForText('删除这条游玩记录？');
  await page.clickText('确认删除');
  await sleep(400);
  await page.waitForText('还没有游玩记录');
}
