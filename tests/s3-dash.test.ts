import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function readComponent(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', 'components', relative), 'utf8');
}

function readApp(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', 'app', relative), 'utf8');
}



describe('S3 Dash 卡片（PRDv1.2.2 第 3 节）', () => {
  it('轮播卡片用 150×190 竖卡、10 间距，且没有边框/渐变/纹理', () => {
    const carousel = readComponent('home/dash-carousel.tsx');
    expect(carousel).toContain('export const DASH_CARD_WIDTH = 150');
    expect(carousel).toContain('export const DASH_CARD_HEIGHT = 190');
    expect(carousel).toContain('const SPACING = 10');
    expect(carousel).toContain('const IDLE_SCALE = 0.9');
    const card = readComponent('home/dash-card.tsx');
    expect(card).toContain('borderRadius: 22');
    expect(card).toContain('fontSize: 18');
    expect(card).toContain('fontSize: 11');
    expect(card).not.toContain('LinearGradient');
    expect(card).not.toContain('ImageBackground');
    expect(card).not.toContain('borderStyle');
    // v1.2.2：所有卡片同色（不再有首卡深色），底色跟主题走。
    expect(card).not.toContain('tone');
    expect(card).not.toContain('PRIMARY_BG');
    expect(card).toContain('theme.backgroundElement');
    expect(card).toContain('CartoonArt');
  });

  it('横滑用 FlatList 左侧吸附，按 scrollX 做 0.9 视差缩放', () => {
    const carousel = readComponent('home/dash-carousel.tsx');
    expect(carousel).toContain('Animated.FlatList');
    expect(carousel).toContain('snapToInterval={SNAP_INTERVAL}');
    expect(carousel).toContain('snapToAlignment="start"');
    expect(carousel).toContain('decelerationRate="fast"');
    expect(carousel).toContain('(index - 1) * SNAP_INTERVAL');
    expect(carousel).toContain('index * SNAP_INTERVAL');
    expect(carousel).toContain('(index + 1) * SNAP_INTERVAL');
    expect(carousel).toContain('outputRange: [IDLE_SCALE, 1, IDLE_SCALE]');
    expect(carousel).toContain('transform: [{ scale }]');
    expect(carousel).toContain('paddingHorizontal: SIDE_PADDING');
    expect(carousel).toContain('Dash 卡片都关掉了');
    expect(carousel).not.toContain('添加卡片');
  });

  it('堆叠模式划走卡片后追加到队尾，向下且右侧窥视', () => {
    const stack = readComponent('home/dash-stack.tsx');
    expect(stack).toContain('PanResponder');
    expect(stack).toContain('width / 3');
    expect(stack).toContain('sendToBack');
    expect(stack).toContain('const VISIBLE = 3');
    expect(stack).toContain('translateY: depth * OFFSET_Y');
    expect(stack).toContain('translateX: depth * OFFSET_X');
    expect(stack).not.toContain("tone={index === 0 ? 'primary' : 'plain'}");
  });

  it('卡通图案只用 View 描边、四个品类齐全', () => {
    const art = readComponent('home/cartoon-art.tsx');
    expect(art).toContain("kind === 'games'");
    expect(art).toContain("kind === 'fitness'");
    expect(art).toContain("kind === 'calendar'");
    expect(art).toContain('borderWidth: 2');
    expect(art).not.toContain('Svg');
  });

  it('首页 Dash 紧贴标题栏、用竖卡，不再是 3:7 撑高', () => {
    const page = readApp('(tabs)/index.tsx');
    expect(page).toContain('Dash');
    expect(page).toContain('const stackWidth = DASH_CARD_WIDTH;');
    expect(page).toContain('const stackHeight = DASH_CARD_HEIGHT;');
    // 标题区不再按可用高度 30% 撑开，Dash 标题行移出标题区紧贴卡片。
    expect(page).not.toContain('availableHeight');
    expect(page).not.toContain('titleZoneHeight');
    expect(page).not.toContain('TAB_BAR_HEIGHT');
    expect(page.indexOf('styles.dashTitleRow')).toBeLessThan(page.indexOf('styles.dashBlock'));
    expect(page).toContain('getDashMode');
    expect(page).toContain('<DashStack');
    expect(page).toContain('<DashCarousel');
    expect(page).not.toContain('WonderCarousel');
    expect(page).not.toContain('万事卡');
  });

  it('勾选先原地停留 300ms，可隐藏已完成', () => {
    const list = readComponent('today/today-list.tsx');
    expect(list).toContain('justChecked');
    expect(list).toContain('getHideCompleted');
    expect(list).toContain('}, 300)');
    expect(list).toContain('StaggeredAppear');
    const row = readComponent('today/task-row.tsx');
    expect(row).toContain('CheckMark');
    expect(row).not.toContain('✓');
  });
});