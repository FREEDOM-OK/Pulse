import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

describe('S4 今日/健身/资料/个性化细节（PRDv1.2.2 第 4–7 节）', () => {
  it('日期条选中态使用黑色胶囊，不再用描边标记今天', () => {
    const strip = read('components/ui/date-strip.tsx');
    expect(strip).toContain('const PILL_WIDTH = 38;');
    expect(strip).toContain('const PILL_HEIGHT = 56;');
    expect(strip).toContain('borderRadius: PILL_RADIUS');
    expect(strip).toContain("backgroundColor: '#000000'");
    expect(strip).not.toContain('borderWidth: 1.5');
  });

  it('健身页显示组数，日历按钮在添加左侧且同高 48', () => {
    const page = read('components/fitness/fitness-screen.tsx');
    expect(page).toContain('组');
    expect(page).toContain('accessibilityLabel="打开日历"');
    expect(page).toContain('headerButton');
    expect(page).toContain('height: 48');
    // 日历按钮必须出现在「添加」之前。
    expect(page.indexOf('accessibilityLabel="打开日历"')).toBeLessThan(
      page.indexOf('accessibilityLabel="添加训练"')
    );
    expect(page).not.toContain('onOpenCalendar');
  });

  it('健身完成一组后对勾 2.5 秒消失', () => {
    const page = read('components/fitness/fitness-screen.tsx');
    expect(page).toContain('flashId');
    expect(page).toContain('2500');
    const card = read('components/fitness/training-card.tsx');
    expect(card).toContain('flash');
    expect(card).toContain("'✓'");
  });

  it('个人资料生日改成三列滚轮', () => {
    const page = read('app/profile.tsx');
    expect(page).toContain('<WheelPicker');
    expect(page).toContain("key: 'year'");
    expect(page).toContain("key: 'month'");
    expect(page).toContain("key: 'day'");
    expect(page).not.toContain('accessibilityLabel="生日年份"');
  });

  it('个性化页可以隐藏已完成', () => {
    const page = read('app/personalize/index.tsx');
    expect(page).toContain('隐藏已完成');
    expect(page).toContain('setHideCompleted');
    expect(page).toContain('<Switch');
  });
});