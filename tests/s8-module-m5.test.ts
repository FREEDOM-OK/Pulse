import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

/**
 * M5 首页下拉拉伸（v1.2.11 起两端统一）。
 *
 * 手势本身按 AGENTS.md 不写 E2E（真机验证），这里只锁住实现的关键约束：
 * 只在列表顶部向下拉时接管、没有原生刷新指示器、刷新完成后才弹回。
 */
describe('S8 首页下拉拉伸（无原生刷新指示器）', () => {
  const page = read('app/(tabs)/index.tsx');

  it('两个平台都用手势实现下拉拉伸', () => {
    expect(page).toContain('PanResponder.create(');
    expect(page).not.toContain("Platform.OS === 'android'");
    expect(page).toContain('onMoveShouldSetPanResponder');
    expect(page).toContain('styles.pullWrap');
  });

  it('只在列表顶部向下拉时接管，避免抢走 Tasks 的滚动', () => {
    expect(page).toContain('const atTopRef = useRef(true);');
    expect(page).toContain('atTopRef.current = offsetY <= 0;');
    expect(page).toContain('gesture.dy > 6 &&');
    expect(page).toContain('Math.abs(gesture.dy) > Math.abs(gesture.dx)');
  });

  it('不再出现系统转圈，刷新完成后弹簧回弹', () => {
    expect(page).not.toContain('RefreshControl');
    expect(page).not.toContain('refreshControl=');
    expect(page).toContain('const next = Math.min(Math.max(gesture.dy * 0.5, 0), 120);');
    expect(page).toContain('const shouldRefresh = pullValueRef.current >= 64;');
    expect(page).toContain('.finally(() => {');
    expect(page).toContain('bounciness: 6');
    expect(page).toContain('speed: 18');
    expect(page).toContain('outputRange: [1, 1.2]');
  });

  it('位移包裹全部内容，两个平台一致', () => {
    expect(page).toContain('const contentTransform = { transform: [{ translateY: pull }] };');
    expect(page).toContain('<Animated.View style={contentTransform}>');
    expect(page).not.toContain('iosTitleScale');
    expect(page).toContain('bounces={false}');
  });
});