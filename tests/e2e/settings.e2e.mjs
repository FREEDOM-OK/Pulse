import { sleep } from './browser.mjs';

const THEME_LABELS = ['跟随系统', '浅色', '深色'];

async function checkedTheme(page) {
  const found = await page.evaluate(`(() => {
    const labels = ${JSON.stringify(THEME_LABELS)};
    for (const label of labels) {
      if (document.body.innerText.includes('✓ ' + label)) return label;
    }
    return null;
  })()`);
  return found;
}

/** P8 设置：主题切换与持久化、健身默认值、导出备份、清空数据（含自动备份） */
export async function run(page, baseUrl) {
  // 前面的场景会留下训练/饮食记录，这里先清空浏览器里的数据库，保证从空数据开始。
  await page.gotoFresh(baseUrl);
  await page.waitForText('首页');
  await page.clickLabel('我的');
  await page.waitForText('数据与偏好');

  // 默认跟随系统
  if ((await checkedTheme(page)) !== '跟随系统') {
    throw new Error(`默认主题应为跟随系统，实际：${await checkedTheme(page)}`);
  }

  // 切深色并验证
  await page.clickText('深色');
  await sleep(400);
  if ((await checkedTheme(page)) !== '深色') {
    throw new Error('切换深色失败');
  }

  // 刷新后仍是深色
  await page.reload();
  await page.clickLabel('我的');
  if ((await checkedTheme(page)) !== '深色') {
    throw new Error('刷新后深色主题没有保持');
  }

  // 设置健身默认次数/重量：点行打开弹窗 → 输入 → 保存，随后新增动作应带默认值
  await page.clickLabel('健身默认次数');
  await page.waitForText('修改默认次数');
  await page.fillByLabel('默认次数输入', '12');
  await page.clickLabel('保存健身默认值');
  await page.waitForNoText('修改默认次数');
  await page.waitForText('健身默认值已保存。');

  await page.clickLabel('健身默认重量');
  await page.waitForText('修改默认重量');
  await page.fillByLabel('默认重量输入', '40');
  await page.clickLabel('保存健身默认值');
  await page.waitForNoText('修改默认重量');
  await page.waitForText('健身默认值已保存。');

  await page.clickLabel('健身');
  await page.waitForText('待训练');
  await page.clickText('添加');
  await page.waitForText('选择动作');
  await page.clickText('杠铃卧推');
  await page.clickText('添加到所选日期');
  await page.waitForText('已练 0 组');

  const defaults = await page.evaluate(`(() => ({
    reps: document.querySelector('[aria-label="杠铃卧推 每组次数"]')?.value ?? null,
    weight: document.querySelector('[aria-label="杠铃卧推 重量"]')?.value ?? null,
  }))()`);
  if (String(defaults.reps) !== '12' || String(defaults.weight) !== '40') {
    throw new Error(`新增动作没有采用健身默认值：${JSON.stringify(defaults)}`);
  }

  await page.clickLabel('我的');
  await page.waitForText('数据与偏好');

  // 导出备份
  await page.clickLabel('备份数据');
  await page.waitForText('已导出：生活App备份-');

  // 清空数据
  await page.clickLabel('清空所有数据');
  await page.waitForText('清空所有数据？');
  await page.clickText('确认清空');
  await page.waitForText('已清空所有数据');
  if ((await checkedTheme(page)) !== '跟随系统') {
    throw new Error('清空数据后主题应恢复为跟随系统');
  }

  // 首页回到空状态
  await page.clickLabel('首页');
  await page.waitForText('今天还没有安排');
}
