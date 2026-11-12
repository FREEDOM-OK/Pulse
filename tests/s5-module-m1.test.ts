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

  it('日期条按自然周分页，一次滑动翻整周并立即同步选中日期', () => {
    expect(dateStrip).toContain('const WEEKS_EACH_SIDE = 50;');
    expect(dateStrip).toContain('WEEKS_EACH_SIDE * 2 + 1');
    expect(dateStrip).toContain('pagingEnabled');
    expect(dateStrip).toContain('onMomentumScrollEnd');
    expect(dateStrip).toContain('Math.round(offsetX / pageWidth)');
    expect(dateStrip).toContain('const nextDate = week.days.some((day) => day.date === today)');
    expect(dateStrip).toContain('week.days[weekdayIndex].date');
    expect(dateStrip).toContain('onChange(nextDate)');
    expect(dateStrip).toContain('settleTimerRef');
    expect(dateStrip).not.toContain('RANGE_DAYS');
    expect(dateStrip).not.toContain('ScrollViewInstance');
    expect(dateStrip).not.toContain('<ScrollView');
    expect(dateStrip).not.toContain('onOpenCalendar');
  });

  it('日期条使用 40×60 日期格与 38×56 黑色胶囊，选中态 150ms 渐显', () => {
    expect(dateStrip).toContain('const CELL_WIDTH = 40;');
    expect(dateStrip).toContain('const CELL_HEIGHT = 60;');
    expect(dateStrip).toContain('const PILL_WIDTH = 38;');
    expect(dateStrip).toContain('const PILL_HEIGHT = 56;');
    expect(dateStrip).toContain('const PILL_RADIUS = 19;');
    expect(dateStrip).toContain('duration: 150');
    expect(dateStrip).toContain('justifyContent: \'space-between\'');
    expect(dateStrip).toContain('paddingHorizontal: 16');
    expect(dateStrip).toContain('outlineWidth: 0');
    expect(dateStrip).not.toContain('borderWidth: 1.5');
    expect(dateStrip).toContain('memo(');
  });

  it('计划页在日期文字右侧提供按需显示的“回今天”胶囊', () => {
    const today = readSource('app/(tabs)/today.tsx');
    expect(today).toContain("date !== todayStr()");
    expect(today).toContain('marginLeft: 8');
    expect(today).toContain('borderRadius: 11');
    expect(today).toContain("backgroundColor: '#F2F2F7'");
    expect(today).toContain('回今天');
    expect(today).toContain('setDate(todayStr())');
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