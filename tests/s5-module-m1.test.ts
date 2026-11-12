import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function readSource(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

/**
 * M1 三处修正（`PLAN_module_v1.2.2.md` 第 5 节）。
 * 组件在 node 环境里渲染不了，这里按本项目既有约定做源码级约束：
 * 断言的是「会改变行为的那几行」，而不是整段实现。
 */
describe('M1 日期条 / 健身已完成卡 / 滚轮高亮', () => {
  const dateStrip = readSource('components/ui/date-strip.tsx');

  it('日期条按自然周整页翻动，屏幕固定显示周一到周日', () => {
    expect(dateStrip).toContain('pagingEnabled');
    expect(dateStrip).toContain('onMomentumScrollEnd');
    expect(dateStrip).toContain('onScroll={');
    expect(dateStrip).toContain('settleTimer');
    expect(dateStrip).toContain('handledPage');
    expect(dateStrip).toContain('[addDays(weekStart, -7), weekStart, addDays(weekStart, 7)]');
    expect(dateStrip).toContain('const delta = page === 0 ? -7 : 7;');
    expect(dateStrip).toContain('onChange(addDays(value, delta));');
    expect(dateStrip).toContain('scrollTo({ x: pageWidth, animated: false })');
    expect(dateStrip).not.toContain('RANGE_DAYS');
  });

  it('健身已完成记录比待训练卡高：16pt 内边距 + 70 最小高度', () => {
    const row = readSource('components/fitness/set-record-row.tsx');
    expect(row).toContain('minHeight: 70');
    expect(row).toContain('paddingVertical: Spacing.three');
    expect(row).not.toContain('paddingVertical: Spacing.two,\n    borderRadius: Spacing.three');
  });

  it('滚轮高亮固定钉在中间行，不再画在列表项上', () => {
    const wheel = readSource('components/ui/wheel-picker.tsx');
    expect(wheel).not.toContain('itemIndex === index &&');
    expect(wheel).toContain('styles.highlight');
    expect(wheel).toContain('WHEEL_ITEM_HEIGHT * 2');
    expect(wheel).toContain('fadeFor(');
  });
});