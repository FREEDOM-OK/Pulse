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

function readSource(relative: string) {
  return fs.readFileSync(path.join(ROOT, 'src', relative), 'utf8');
}

describe('S3 Dash 卡片（PRDv1.2.2 第 3 节）', () => {
  it('卡片尺寸用黄金比令牌，且没有边框/渐变/纹理', () => {
    expect(readSource('constants/theme.ts')).toContain('DashCardSize');
    const carousel = readComponent('home/dash-carousel.tsx');
    expect(carousel).toContain('DashCardSize');
    const card = readComponent('home/dash-card.tsx');
    expect(card).not.toContain('LinearGradient');
    expect(card).not.toContain('ImageBackground');
    expect(card).not.toContain('borderStyle');
    expect(card).toContain("tone = 'plain'");
    expect(card).toContain('CartoonArt');
  });

  it('横滑一次只走一张，带吸附与幽灵卡', () => {
    const carousel = readComponent('home/dash-carousel.tsx');
    expect(carousel).toContain('snapToInterval={snap}');
    expect(carousel).toContain('disableIntervalMomentum');
    expect(carousel).toContain('添加卡片');
    expect(carousel).toContain('Dash 卡片都关掉了');
    expect(carousel).toContain('onMomentumScrollEnd');
  });

  it('堆叠模式划走卡片后追加到队尾', () => {
    const stack = readComponent('home/dash-stack.tsx');
    expect(stack).toContain('PanResponder');
    expect(stack).toContain('width / 3');
    expect(stack).toContain('sendToBack');
    expect(stack).toContain('translateY: depth * 24');
  });

  it('卡通图案只用 View 描边、四个品类齐全', () => {
    const art = readComponent('home/cartoon-art.tsx');
    expect(art).toContain("kind === 'games'");
    expect(art).toContain("kind === 'fitness'");
    expect(art).toContain("kind === 'calendar'");
    expect(art).toContain('borderWidth: 2');
    expect(art).not.toContain('Svg');
  });

  it('首页是 3:7 结构，Dash 标题更大且可切模式', () => {
    const page = readApp('(tabs)/index.tsx');
    expect(page).toContain('Dash');
    expect(page).toContain('availableHeight * 0.3');
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