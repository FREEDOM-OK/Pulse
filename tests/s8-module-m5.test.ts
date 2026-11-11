import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

/**
 * M5 安卓下拉拉伸。
 *
 * 手势本身按 AGENTS.md 不写 E2E（真机验证），这里只锁住实现的关键约束：
 * 安卓才接管、只在列表顶部向下拉时接管、松手弹回、iOS 原逻辑保留。
 */
describe('S8 M5 安卓下拉拉伸（PRD_module 第 7 / 第 10 节）', () => {
  const page = read('app/(tabs)/index.tsx');

  it('用 PanResponder 在安卓实现下拉拉伸', () => {
    expect(page).toContain('PanResponder.create(');
    expect(page).toContain("Platform.OS === 'android' ?");
    expect(page).toContain('onMoveShouldSetPanResponder');
    expect(page).toContain('styles.pullWrap');
  });

  it('只在列表顶部向下拉时接管，避免抢走 Tasks 的滚动', () => {
    expect(page).toContain('const atTopRef = useRef(true);');
    expect(page).toContain('atTopRef.current = event.nativeEvent.contentOffset.y <= 0;');
    expect(page).toContain('gesture.dy > 6 &&');
    expect(page).toContain('Math.abs(gesture.dy) > Math.abs(gesture.dx)');
  });

  it('松开后弹簧回弹，拉伸上限 120，超过阈值刷新', () => {
    expect(page).toContain('const next = Math.min(Math.max(gesture.dy * 0.5, 0), 120);');
    expect(page).toContain('const shouldRefresh = pullValueRef.current >= 64;');
    expect(page).toContain('bounciness: 6');
    expect(page).toContain('speed: 18');
    expect(page).toContain('outputRange: [1, 1.2]');
    expect(page).toContain('handleRefresh().catch');
  });

  it('Android 位移包裹全部内容，iOS 仍走原生 scrollY 插值', () => {
    expect(page).toContain('const contentTransform =');
    expect(page).toContain("Platform.OS === 'android' ? { transform: [{ translateY: pull }] } : undefined");
    expect(page).toContain('<Animated.View style={contentTransform}>');
    expect(page).toContain('const iosTitleScale = scrollY.interpolate({');
    expect(page).toContain('inputRange: [-180, 0]');
    expect(page).toContain('outputRange: [1.2, 1]');
  });
});