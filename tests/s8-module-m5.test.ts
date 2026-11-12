import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

/**
 * M5 首页下拉拉伸（v1.2.14 起三端统一走 PanResponder + Reanimated）。
 *
 * Android 原生 ScrollView 不会给出负 scrollY，因此不再依赖 iOS 的 overscroll；
 * 统一由顶部 PanResponder 把下拉距离写进 pullDistance，标题与整页内容同步联动。
 */
describe('S8 首页下拉拉伸（三端统一 PanResponder）', () => {
  const page = read('app/(tabs)/index.tsx');

  it('用 pullDistance 驱动标题缩放与整页位移，不再依赖 scrollY', () => {
    expect(page).toContain('const pullDistance = useSharedValue(0);');
    expect(page).toContain('const titleAnimatedStyle = useAnimatedStyle');
    expect(page).toContain('pullDistance.value');
    expect(page).toContain('interpolate(');
    expect(page).toContain('[0, 100]');
    expect(page).toContain('[1, 1.18]');
    expect(page).toContain('const contentAnimatedStyle = useAnimatedStyle');
    expect(page).toContain('style={contentAnimatedStyle}');
    expect(page).not.toContain('iosTitleScale');
    expect(page).not.toContain('scrollY.interpolate');
  });

  it('只在列表顶部向下拉时接管，避免抢走 Tasks 的滚动', () => {
    expect(page).toContain('const atTopRef = useRef(true);');
    expect(page).toContain('atTopRef.current = offsetY <= 0;');
    expect(page).toContain('gesture.dy > 6 &&');
    expect(page).toContain('Math.abs(gesture.dy) > Math.abs(gesture.dx)');
    expect(page).toContain('onMoveShouldSetPanResponderCapture');
  });

  it('没有系统转圈；超过阈值刷新，刷新完成后弹簧回弹', () => {
    expect(page).not.toContain('RefreshControl');
    expect(page).not.toContain('refreshControl=');
    expect(page).toContain('Math.min(Math.max(gesture.dy * 0.5, 0), 120)');
    expect(page).toContain('if (pullDistance.value > 60)');
    expect(page).toContain('withSpring(0, { damping: 18, stiffness: 180 })');
    expect(page).toContain('.finally(settle)');
    expect(page).toContain('bounces={false}');
    expect(page).toContain('alwaysBounceVertical={false}');
    expect(page).toContain('overScrollMode="never"');
  });
});