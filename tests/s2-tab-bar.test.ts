import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readSource(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

describe('S2 底栏胶囊与第三标签（PRDv1.2.2 第 2.4 节）', () => {
  const bar = readSource('components/nav/app-tab-bar.tsx');

  it('读取 middle 并据此生成 4 个标签', () => {
    expect(bar).toContain('middle: MiddleTab');
    expect(bar).toContain('buildTabItems(middle)');
  });

  it('不再使用圆点高亮', () => {
    expect(bar).not.toContain('styles.dot');
    expect(bar).not.toContain('borderRadius: 1.5');
  });

  it('激活态是滑动的胶囊，时长取 Motion.move', () => {
    expect(bar).toContain('CAPSULE_WIDTH = 64');
    expect(bar).toContain('CAPSULE_HEIGHT = 36');
    expect(bar).toContain('Animated.timing(capsuleX');
    expect(bar).toContain('Motion.move');
    expect(bar).toContain('backgroundColor: theme.backgroundElement');
  });

  it('胶囊位置按槽位计算，账号槽位为 0/1/3/4', () => {
    expect(bar).toContain('const SLOT_INDEX = [0, 1, 3, 4]');
    expect(bar).toContain('(slotWidth - CAPSULE_WIDTH) / 2');
  });

  it('底栏上移 8，凸起按钮同步上移', () => {
    expect(bar).toContain('marginBottom: Spacing.one');
    expect(bar).toContain('marginTop: -16');
  });

  it('课表标签点击走 router.push，其余走 navigateToTab', () => {
    expect(bar).toContain("if (tab.name === 'timetable')");
    expect(bar).toContain("router.push('/timetable')");
    expect(bar).toContain('navigateToTab(route.key)');
  });

  it('激活文字加粗，并对读屏暴露选中状态', () => {
    expect(bar).toContain("fontWeight: active ? '700' : '500'");
    expect(bar).toContain('accessibilityState={{ selected: active }}');
  });

  it('布局把 middle 读取后传给底栏', () => {
    const layout = readSource('app/(tabs)/_layout.tsx');
    expect(layout).toContain('getMiddleTab()');
    expect(layout).toContain('<AppTabBar {...props} middle={middle} />');
    expect(layout).toContain('useDataVersion()');
  });
});

describe('S2 我的页入口（PRDv1.2.2 第 7.3 节）', () => {
  const settings = readSource('app/(tabs)/settings.tsx');

  it('常驻健身/课表/日历三条快捷入口', () => {
    expect(settings).toContain('快捷入口');
    expect(settings).toContain("router.push('/fitness')");
    expect(settings).toContain("router.push('/timetable')");
    expect(settings).toContain("router.push('/calendar')");
  });

  it('第三个标签可在健身与课表之间切换并持久化', () => {
    expect(settings).toContain('第三个标签');
    expect(settings).toContain('setMiddleTab(tab)');
    expect(settings).toContain('MIDDLE_TAB_LABELS[middle]');
    expect(settings).toContain('bumpDataVersion()');
  });

  it('有个性化入口', () => {
    expect(settings).toContain("router.push('/personalize')");
    expect(settings).toContain('个性化');
  });

  it('不再出现旧卡片名', () => {
    expect(settings).not.toContain('万事卡');
  });

  it('个性化页与第三层卡片样式页存在，并在根栈注册', () => {
    const index = readSource('app/personalize/index.tsx');
    expect(index).toContain('<Breadcrumb');
    expect(index).toContain('DASH_MODES');
    expect(index).toContain('CARD_STYLES');
    expect(fs.existsSync(path.join(ROOT, 'src', 'app', 'personalize', 'cards.tsx'))).toBe(true);

    const layout = readSource('app/_layout.tsx');
    expect(layout).toContain('name="personalize"');
    expect(layout).toContain('name="personalize/cards"');
  });
});