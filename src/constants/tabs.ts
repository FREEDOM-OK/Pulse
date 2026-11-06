/**
 * 底部导航的 6 个 Tab 配置。
 *
 * 顺序必须与 PRD 第 2 章一致：首页 · 今日计划 · 健身 · 饮食 · 游戏 · 设置。
 * 图标同时给出 iOS（SF Symbols）、Android（Material Symbols）和 Web（Material Symbols）名称。
 */
export const TAB_ITEMS = [
  { name: 'index', title: '首页', icon: { ios: 'house', android: 'home', web: 'home' } },
  {
    name: 'today',
    title: '今日计划',
    icon: { ios: 'checklist', android: 'checklist', web: 'checklist' },
  },
  {
    name: 'fitness',
    title: '健身',
    icon: {
      ios: 'figure.strengthtraining.traditional',
      android: 'fitness_center',
      web: 'fitness_center',
    },
  },
  {
    name: 'diet',
    title: '饮食',
    icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  },
  {
    name: 'games',
    title: '游戏',
    icon: { ios: 'gamecontroller', android: 'sports_esports', web: 'sports_esports' },
  },
  {
    name: 'settings',
    title: '设置',
    icon: { ios: 'gearshape', android: 'settings', web: 'settings' },
  },
] as const;

export type TabItem = (typeof TAB_ITEMS)[number];
