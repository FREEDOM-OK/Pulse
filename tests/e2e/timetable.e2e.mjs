import { sleep } from './browser.mjs';

/**
 * P4 课表（移植后新 UI）：
 * 设置页 → 课表管理 → 外观饱和度持久化 → 网格添加课程（含第二节时段）
 * → 详情抽屉 → ⋯ 抽屉（周数/课表/四个入口 + 回到本周）→ 今日计划点课程深链
 * 回课表并开抽屉 → 文本导入。
 *
 * Web 端数据库存在 localStorage，场景开头清库，保证从「只有播种课表」的干净状态开始。
 * 所有交互都走 accessibilityLabel，文案与 src/app/timetable/* 保持一致。
 */
export async function run(page, baseUrl) {
  const stamp = String(Date.now()).slice(-4);
  const courseName = `高等数学${stamp}`;
  const todayCourse = `线性代数${stamp}`;

  // ---------- 1. 设置页 ----------
  await page.gotoFresh(`${baseUrl}/timetable/settings`);
  await page.waitForText('设置');
  await page.waitForLabel('节次设置');
  await page.waitForLabel('导入课表');
  await page.waitForLabel('全部课程');

  // 课表管理页能进去、能返回（字段在「新建」抽屉里）
  await page.clickLabel('课表管理');
  await page.waitForText('课表管理');
  await page.waitForLabel('新建课表');
  await page.clickLabel('新建课表');
  await page.waitForText('开学日期 (YYYY-MM-DD)');
  await page.waitForText('总周数 (1–60)');
  await page.clickLabel('取消');
  await page.clickLabel('返回');
  await page.waitForText('设置');

  // 色彩饱和度 60% 并跨刷新持久化
  await page.clickLabel('色彩饱和度');
  await page.waitForLabel('饱和度60%');
  await page.clickLabel('饱和度60%');
  await page.waitForText('60%');
  await page.reload();
  await page.waitForText('60%');

  // ---------- 2. 网格添加课程 ----------
  await page.goto(`${baseUrl}/timetable`);
  await page.waitForLabel('添加课程');
  await page.waitForLabel('导入课表');
  // 播种课表的开学日是「本周一」，当前周次由系统算，脚本读出来而不是写死
  const currentWeek = Number(/第 (\d+) 周/.exec(await page.text())[1]);

  // 点周三第 3 节的空白格，带上 day/period 进入表单
  await page.clickLabel('周三第3节 添加课程');
  await page.waitForText('添加课程');
  await page.fillByLabel('课程名称', courseName);
  await page.fillByLabel('地点 时段1', 'A101');

  // 再加一个时段，验证多时段卡片
  await page.clickLabel('添加时段');
  await page.waitForText('时段2');

  // 第一个时段改成 第 1-2 节
  await page.clickLabel('选择节次 时段1');
  await page.waitForText('选择上课时间');
  await page.clickLabel('开始第1节');
  await page.clickLabel('结束第2节');
  await page.clickLabel('确定节次');
  await sleep(300);

  await page.clickLabel('保存课程');
  await sleep(800);
  await page.waitForText(courseName);
  await page.waitForLabel(`${courseName} 周三第1-2节`);

  // ---------- 3. 详情抽屉 ----------
  await page.clickLabel(`${courseName} 周三第1-2节`);
  await page.waitForText('备注');
  await page.waitForLabel('编辑课程');
  await page.clickLabel('关闭详情');
  await sleep(400);

  // ---------- 4. ⋯ 底部抽屉与回到本周 ----------
  // 保存后 viewingWeek 会跳到课程首周；新的「回到本周」在 ⋯ 抽屉里（顶栏翻周胶囊已删除）
  await page.clickLabel('更多操作');
  await page.waitForText('周数');
  await page.waitForLabel('上课时间');
  await page.waitForLabel('课程设置');
  await page.waitForLabel('已添课程');
  await page.waitForLabel('上课提醒');
  await page.waitForLabel('回到本周');
  // 若保存后正好也在本周，「回到本周」会置灰；此时只需关掉抽屉即可。
  const backDisabled = await page.evaluate(
    "document.querySelector('[aria-label=\"回到本周\"]')?.getAttribute('aria-disabled') === 'true'"
  );
  if (backDisabled) {
    await page.clickLabel('关闭抽屉');
  } else {
    await page.clickLabel('回到本周');
  }
  await sleep(500);
  await page.waitForText(`第 ${currentWeek} 周`);
  await page.waitForText(courseName);

  // ---------- 5. 今日计划 → 深链回课表 ----------
  // ＋ 默认落在今天，保证今日计划里能看到这门课
  await page.clickLabel('添加课程');
  await page.waitForText('添加课程');
  await page.fillByLabel('课程名称', todayCourse);
  await page.clickLabel('保存课程');
  await sleep(400);
  // ＋ 落在「今天」，若今天正好是周三就会和上面那门课撞节次，脚本要能确认冲突后继续。
  if (await page.has('冲突确认')) {
    await page.clickText('仍然保存');
  }
  await sleep(800);
  await page.waitForText(todayCourse);

  await page.goto(`${baseUrl}/today`);
  await page.waitForText(todayCourse);
  await page.clickText(todayCourse);
  await sleep(600);
  // 深链生效：落在课表本页并直接打开详情抽屉
  await page.waitForLabel('编辑课程');
  await page.waitForText(`第 ${currentWeek} 周`);
  await page.clickLabel('关闭详情');
  await sleep(300);

  // ---------- 6. 文本导入 ----------
  await page.goto(`${baseUrl}/timetable/import`);
  await page.waitForText('导入课表');
  await page.clickLabel('粘贴示例');
  await page.clickLabel('解析');
  await page.waitForText('解析到');
  await page.clickLabel('确认导入');
  await page.waitForText('将覆盖当前课表的全部课程');
  await page.clickText('确定');
  await sleep(1200);
  await page.goto(`${baseUrl}/timetable`);
  await page.waitForText('高等数学');
  await page.waitForText('大学英语');
}