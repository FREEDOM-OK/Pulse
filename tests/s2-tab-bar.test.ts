import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readSource(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

describe('S2 悬浮胶囊底栏与第三标签（2026-11-11 第二版）', () => {
  const bar = readSource('components/nav/app-tab-bar.tsx');

  it('读取 middle 并据此生成 4 个真实标签', () => {
    expect(bar).toContain('middle: MiddleTab');
    expect(bar).toContain('buildTabItems(middle)');
  });

  it('底座为 66dp 高、33dp 圆角的纯白胶囊', () => {
    expect(bar).toContain('const BAR_HEIGHT = 66');
    expect(bar).toContain('const BAR_RADIUS = 33');
    expect(bar).toContain("const NAV_BACKGROUND = '#FFFFFF'");
    expect(bar).toContain('backgroundColor: NAV_BACKGROUND');
    expect(bar).toContain('shadowOffset: { width: 0, height: 6 }');
    expect(bar).toContain('shadowOpacity: 0.1');
    expect(bar).toContain('shadowRadius: 12');
    expect(bar).toContain('elevation: 8');
  });

  it('外层绝对悬浮、透明、可穿透点击且压在最上层', () => {
    expect(bar).toContain('position: \'absolute\'');
    expect(bar).toContain('left: 0');
    expect(bar).toContain('right: 0');
    expect(bar).toContain('bottom: 0');
    expect(bar).toContain('zIndex: 999');
    expect(bar).toContain("backgroundColor: 'transparent'");
    expect(bar).toContain('pointerEvents="box-none"');
  });

  it('5 个平级槽位、space-evenly，Tab 点击区统一 56dp', () => {
    expect(bar).toContain('const SLOT_COUNT = 5');
    expect(bar).toContain('const SLOT_INDEX = [0, 1, 3, 4] as const');
    expect(bar).toContain('const TAB_SIZE = 56');
    expect(bar).toContain("justifyContent: 'space-evenly'");
    expect(bar).toContain('width: TAB_SIZE');
    expect(bar).toContain('height: TAB_SIZE');
  });

  it('中间加号是 42dp 黑圆，完全嵌在 56dp 槽位内、没有负外边距', () => {
    expect(bar).toContain('const PLUS_CIRCLE_SIZE = 42');
    expect(bar).toContain("const PLUS_BACKGROUND = '#000000'");
    expect(bar).toContain('width: PLUS_CIRCLE_SIZE');
    expect(bar).toContain('height: PLUS_CIRCLE_SIZE');
    expect(bar).not.toContain('marginTop: -16');
    expect(bar).not.toContain('marginBottom: Spacing.one');
  });

  it('指示器为 52×46、圆角 23，按 activeSlot 做 250ms 贝塞尔滑动', () => {
    expect(bar).toContain('const INDICATOR_WIDTH = 52');
    expect(bar).toContain('const INDICATOR_HEIGHT = 46');
    expect(bar).toContain('const INDICATOR_RADIUS = 23');
    expect(bar).toContain("const INDICATOR_COLOR = '#F2F2F7'");
    expect(bar).toContain('indicatorLeft(activeSlot, barWidth)');
    expect(bar).toContain('duration: 250');
    expect(bar).toContain('Easing.bezier(0.25, 0.1, 0.25, 1)');
    expect(bar).toContain('withTiming(target, INDICATOR_TIMING)');
    expect(bar).not.toContain('withSpring');
    expect(bar).toContain('translateX: indicatorX.value');
  });

  it('底部留白为 20dp 加安全区，并提供 100dp 内容避让常量', () => {
    expect(bar).toContain('const BOTTOM_GAP = 20');
    expect(bar).toContain('paddingBottom: BOTTOM_GAP + insets.bottom');
    expect(bar).toContain('TAB_BAR_CLEARANCE = BAR_HEIGHT + BOTTOM_GAP + 14');
  });

  it('可滚动 Tab 页按底栏高度与安全区预留内容空间', () => {
    // 首页按新首页规格固定留 120dp；其余 Tab 页继续按底栏高度 + 安全区计算。
    expect(readSource('app/(tabs)/index.tsx')).toContain('paddingBottom: 120');
    expect(readSource('app/(tabs)/today.tsx')).toContain(
      'paddingBottom: TAB_BAR_CLEARANCE + insets.bottom'
    );
    expect(readSource('app/(tabs)/settings.tsx')).toContain(
      'paddingBottom: TAB_BAR_CLEARANCE + insets.bottom'
    );
    expect(readSource('components/fitness/fitness-screen.tsx')).toContain(
      "mode === 'tab' ? { paddingBottom: TAB_BAR_CLEARANCE + insets.bottom }"
    );
    expect(readSource('components/calendar/calendar-screen.tsx')).toContain(
      "mode === 'tab' ? { paddingBottom: TAB_BAR_CLEARANCE + insets.bottom }"
    );
  });

  it('选中色纯黑、未选中 #8E8E93，并带 180ms 颜色淡入', () => {
    expect(bar).toContain("const ACTIVE_COLOR = '#000000'");
    expect(bar).toContain("const INACTIVE_COLOR = '#8E8E93'");
    expect(bar).toContain('withTiming(active ? 1 : 0, { duration: 180 })');
    expect(bar).toContain('fontSize: 10');
  });

  it('第三格选课表时也留在 Tab 内，统一走 navigateToTab', () => {
    expect(bar).not.toContain("tab.name === 'middle' && middle === 'timetable'");
    expect(bar).not.toContain("router.push('/timetable')");
    expect(bar).toContain('navigateToTab(route.key)');
  });

  it('对读屏暴露 tab 与选中状态', () => {
    expect(bar).toContain('accessibilityRole="tab"');
    expect(bar).toContain('accessibilityState={{ selected: active }}');
    expect(bar).toContain('accessibilityLabel="新建"');
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