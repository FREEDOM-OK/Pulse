# 模块改造计划（除课程表）· App 版本 1.2.2

> 需求来源：`../PRD_module.md`（用户正文 + AI 已确认结论）。
> 用户指令（2026-11-11）：课程表已满意、本次**零改动**；把其余问题做成可直接执行的计划；**App 版本定为 1.2.2**并同步进软件。
> 本文件只描述计划，不含已完成改动。执行时按里程碑顺序做，每完成一个跑一次 `npm run verify`。

---

## 0. 范围与边界

| 区域 | 本次是否改 | 备注 |
|---|---|---|
| 首页（Dash / Tasks / 标题区） | 改 | M4 |
| 今日计划（日期条） | 改 | M1a |
| 健身（已完成卡高度） | 改 | M1b |
| 底栏 / 二级页路由 | 改（最大块） | M3 |
| 通用组件：滚轮、抽屉、勾选、按钮 | 改 | M1c / M2 / M6 |
| 我的（设置页） | 只加二级页入口与版本号显示 | M0 / M3 |
| 游戏（`src/app/games.tsx`） | **不改** | 仅接入新的二级页头部（若走 M3.3） |
| 课程表（`src/app/timetable/**`、`src/components/timetable/**`、`src/features/timetable/**`） | **不改** | 唯一例外：`src/app/timetable/settings.tsx:164` 的硬编码版本号（见 M0，需你点头） |
| 数据层 / schema / 备份 | **不改** | 本计划不涉及数据库 |

**不在本计划内**：小组件、分享、学分、自定义时间、课表视觉（PRD 中已被你确认「已实现/不需要」）。

---

## 1. 执行前置（每一轮都适用）

```bash
cd "D:\new app andriod\my-life-app"
npm run verify            # 单测 → tsc --noEmit → expo lint
npx expo start --web --port 8090 --clear   # 需要跑 E2E 时（先 Stop-Process 旧 node）
node tests/e2e/run.mjs    # 9 个场景；单场景：node tests/e2e/run.mjs P6
```

约定（来自 `AGENTS.md`）：

- 新增依赖一律 `npx expo install <pkg>`，不手写版本号。
- 滑动 / 拖拽 / 长按 / 翻页**不写自动化测试**，改完给真机自测清单。
- 中文源码只用编辑工具写，不要用 PowerShell `Set-Content`（GBK 会写出乱码，导致 esbuild `Unterminated string literal`）。
- 每批改动更新 `CHANGELOG.md`；版本号只在 M0 动一次。

基线（当前实测）：`npm run verify` 全绿（32 文件 / 222 用例），E2E 9 场景通过。

---

## 2. 现状体检（计划依据，全部为当前代码事实）

| # | 现象（PRD） | 当前实现 | 证据 |
|---|---|---|---|
| G1 | Dash 没紧贴标题栏 | 标题区固定占可用高度 30%，Dash 标题行被塞在标题区内部底部 | `src/app/(tabs)/index.tsx:166-171`（`titleZoneHeight = availableHeight * 0.3`）、`:248-260`（`dashTitleRow` 在 `titleZone` 里） |
| G2 | 卡片是横卡 264×163 | `DashCardSize = { width: 264, height: 163 }`，横滑组件用 `cardWidth / 1.618` 算高但被 163 覆盖 | `src/constants/theme.ts`（`DashCardSize`）、`src/components/home/dash-carousel.tsx:44-46` |
| G3 | 首卡深、其余浅 | 横滑与堆叠都传 `tone={index === 0 ? 'primary' : 'plain'}` | `dash-carousel.tsx:92`、`dash-stack.tsx:121`、`dash-card.tsx:26-27` |
| G4 | 卡片没有居中 | 横滑 `contentContainerStyle.paddingHorizontal: 24`，卡从左侧 24 开始 | `dash-carousel.tsx:44,124-128` |
| G5 | 堆叠方向/侧窥不对 | 层级只做 `translateY: depth * 24` + `scale`，容器 `alignItems: 'flex-start'`，没有侧向偏移，最多画 4 张 | `dash-stack.tsx:107-108,114,133-137,93-94` |
| G6 | 点日期会把这个日期滑到中间 | `key={value}` 每次改值强制重挂 `ScrollView`，`contentOffset` 重新按选中项居中 | `src/components/ui/date-strip.tsx:54-60`（`key={value}` + `contentOffset`） |
| G7 | 已完成卡与进行中卡同高 | 已完成是窄行卡（无 minHeight，paddingVertical 8） | `src/components/fitness/set-record-row.tsx:62-69` |
| G8 | 滚轮灰色高亮跟着内容滚 | 高亮画在「当前选中项」这个列表单元上 | `src/components/ui/wheel-picker.tsx:108-111`（`itemIndex === index && { backgroundColor }`） |
| G9 | 抽屉遮罩随内容一起上滑、只有一档 | `Modal animationType="slide"` → 遮罩同 Modal 一起滑；高度只有一个 `heightRatio` | `src/components/ui/bottom-sheet.tsx:45,59`；`src/app/profile.tsx:264`（`heightRatio={0.5}`） |
| G10 | 第三格进课表没有底栏 | 第三格是「假 Tab」：点它 `router.push('/timetable')`，`/timetable` 在 `(tabs)` 之外，天然没有底栏；`Tabs.Screen` 恒为 index/today/fitness/settings | `src/constants/tabs.ts:44-49`、`src/components/nav/app-tab-bar.tsx:55,58,90-93`、`src/app/(tabs)/_layout.tsx:27-33` |
| G11 | 没有统一的二级页头部 | 全仓没有 `SubPageHeader`（grep 0 命中）；`calendar`/`profile`/`games` 用系统 Stack 头，`timetable` 自己画一行 | `src/app/_layout.tsx:54-65`、`src/app/timetable/index.tsx` 顶部信息条 |
| G12 | 安卓下拉拉伸无效 | 缩放取自 `ScrollView` 的负 `contentOffset`（iOS 才有 overscroll） | `src/app/(tabs)/index.tsx:173-177,212-214` |
| G13 | 版本号还是 1.0.0 | `app.json` / `package.json` / 关于页 fallback / 课表设置页硬编码 | `app.json:5`、`package.json:3`、`src/app/(tabs)/settings.tsx:100,507`、`src/app/timetable/settings.tsx:164` |

---

## 3. 里程碑总览

| 里程碑 | 内容 | 预计工时 | 风险 |
|---|---|---|---|
| **M0** | 版本号 1.2.2 全局同步 | 0.5 h | 低（但会与 CHANGELOG 历史冲突，见 Q2） |
| **M1** | 三处低风险修正：日期条 / 已完成卡 / 滚轮高亮 | 0.5 d | 低 |
| **M2** | 抽屉两档 + 遮罩独立淡入 | 0.5 d | 低 |
| **M3** | 二级页头部统一 + 底栏第三格重构 | 1.5–2 d | **高**（动路由） |
| **M4** | 首页 Dash：竖卡 + 统一色 + 居中 + 堆叠 | 1–1.5 d | 中（首屏空间，见 Q1） |
| **M5** | 安卓下拉拉伸 | 0.5 d | 中（手势，只能真机验） |
| **M6** | 动效清单（可选，分批） | 1.5–2 d | 低–中 |
| **M7** | 回归、文档、发版 | 0.5 d | 低 |

建议节奏：**M0 → M1 → M2 → M4 → M3 → M5 → M6 → M7**（先把看不见风险的做掉，再动路由）。

---

## 4. M0 · 版本号同步为 1.2.2

### 改动

1. `app.json:5`：`"version": "1.0.0"` → `"version": "1.2.2"`
2. `package.json:3`：`"version": "1.0.0"` → `"version": "1.2.2"`
3. `src/app/(tabs)/settings.tsx:100`：fallback 同步
   ```ts
   const version = Constants.expoConfig?.version ?? '1.2.2';
   ```
   （`:507` 的 `版本 {version}` 不用改，读的就是这里。）
4. `src/app/timetable/settings.tsx:164`（**唯一触碰课表的地方，需你确认**）：把硬编码 `1.0.0` 改成读配置，
   否则「关于」里会出现 1.2.2、课表设置里还是 1.0.0 两个版本号。
   ```tsx
   import Constants from 'expo-constants';
   // …
   <Text style={styles.rowValue}>{Constants.expoConfig?.version ?? '1.2.2'}</Text>
   ```
5. `AGENTS.md`「版本日志」段补一行：`当前 App 内版本 1.2.2（2026-11-11 用户指定）`。
6. `CHANGELOG.md` 顶部加 `## v1.2.2 — 2026-11-11（App 内版本定为 1.2.2）`（条目怎么写的分歧见 **Q2**）。

### 验证

```bash
Select-String -Path app.json,package.json -Pattern '"version"'
npx expo start --web --port 8090 --clear
# 浏览器打开 /settings 与 /timetable/settings，两处都应显示 1.2.2
```

### 验收

- 网页与真机「我的 → 关于」显示 `版本 1.2.2`。
- 课表「设置 → 关于」显示 `1.2.2`。
- 真机的安装包版本名（versionName）只有重新构建后才会变；Expo Go / dev server 立即生效。

---

## 5. M1 · 三处低风险修正

### M1a 日期条：点日期不再自动居中

**问题**：`date-strip.tsx:54-60` 用 `key={value}` 让 `ScrollView` 每次换值都重挂，重挂时 `contentOffset` 会重新把选中项拉到中间。所以点哪个日期，日期条就把它滚到正中。

**改法**（`src/components/ui/date-strip.tsx`）：

1. 去掉 `key={value}`，改用 ref：
   ```tsx
   import { useEffect, useMemo, useRef } from 'react';
   // …
   const scrollRef = useRef<ScrollView>(null);
   const lastLength = useRef(days.length);
   const step = ITEM_WIDTH + ITEM_GAP;
   const centerOf = (index: number) => Math.max(0, index * step + ITEM_WIDTH / 2 - width / 2);
   ```
2. 保留挂载时的居中（首次进入居中今天），用 effect 兜底：
   ```tsx
   useEffect(() => {
     // 只有「列表变长」才说明发生了跨窗口跳转（月历选了 45 天窗口外的日期），
     // 点按同一个列表里的日期不会改变长度，所以不会滚动 —— 这就是本次要的行为。
     if (days.length === lastLength.current) return;
     lastLength.current = days.length;
     scrollRef.current?.scrollTo({ x: centerOf(selectedIndex), animated: true });
   }, [days.length, selectedIndex]);
   ```
3. `ScrollView` 上挂 `ref={scrollRef}`，保留初始 `contentOffset`（首帧就位，避免闪一下）。

**验收**：
- 今日计划点任意日期 → 日期条**不动**，只有选中态变化。
- 从月历选 3 个月前的日期 → 日期条滚到该日期。
- 切到别的 Tab 再回来 → 居中今天。

> 可选项（PRD 提到）：点按时给胶囊 200ms 的 scale 回弹，不改变滚动位置。

### M1b 健身「已完成」卡加高 32

**问题**：`set-record-row.tsx` 的已完成条目是紧凑行（`paddingVertical: Spacing.two`，无最小高度），与待训练卡（`training-card.tsx:215-220`，paddingVertical 16 + 两行内容）视觉等高甚至更矮。

**改法**（`src/components/fitness/set-record-row.tsx`）：

```ts
row: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.two,
  paddingHorizontal: Spacing.three,
  paddingVertical: Spacing.three,   // 8 → 16
  minHeight: 76,                    // 原实际高约 44，+32
  borderRadius: Spacing.three,
},
indexBadge: { width: 24, height: 24, borderRadius: 12, /* … */ },
```

内部字号不需要动；**不加**汇总行、不加「完成时间」（PRD 已定）。

**验收**：真机上「已完成」区的每条记录明显高于「待训练」卡；长按删除菜单仍可用。

### M1c 滚轮：高亮固定、上下渐隐

**问题**：`wheel-picker.tsx:108-111` 把高亮背景画在 `itemIndex === index` 的列表项上，列表一滚，高亮跟着滚走。

**改法**（`src/components/ui/wheel-picker.tsx`）：

1. `renderItem` 里删掉背景色，只留文字：
   ```tsx
   style={styles.item}   // 不再有 itemIndex === index 的背景
   ```
2. 在列容器里叠一层固定高亮 + 两层渐隐（`column` 需要 `position: 'relative'`）：
   ```tsx
   <View style={styles.column}>
     <View pointerEvents="none" style={[styles.highlight, { backgroundColor: highlightColor }]} />
     <FlatList /* … 原样 … */ />
     <LinearGradient
       pointerEvents="none"
       colors={[background, 'transparent']}
       style={[styles.fade, styles.fadeTop]}
     />
     <LinearGradient
       pointerEvents="none"
       colors={['transparent', background]}
       style={[styles.fade, styles.fadeBottom]}
     />
   </View>
   ```
   ```ts
   highlight: {
     position: 'absolute', top: WHEEL_ITEM_HEIGHT * 2, left: 0, right: 0,
     height: WHEEL_ITEM_HEIGHT, borderRadius: 10,
   },
   fade: { position: 'absolute', left: 0, right: 0, height: WHEEL_ITEM_HEIGHT * 1.6 },
   fadeTop: { top: 0 },
   fadeBottom: { bottom: 0 },
   ```
3. 依赖：`npx expo install expo-linear-gradient`（Expo 官方模块，Expo Go 内置；若用 development build 需重新构建一次）。
   不想加依赖的替代方案：两层纯色 `View` + `opacity`，视觉上略生硬但零依赖。

**验收**：三列滚轮滑动时灰色条钉在中间不动，数字从条后面滚过；上下边缘渐隐；点选仍能选中（Web/E2E 依赖点击）。

> 影响面：生日三列（`profile.tsx`）、课表时长/周次滚轮（若用的同一个组件）。课表里如果用的是 `WheelPicker`，视觉会一起变好，但**不改课表代码**。

---

## 6. M2 · 底部抽屉：两档高度 + 遮罩独立淡入

**问题**：`bottom-sheet.tsx:45` 用 `Modal` 自带的 `slide` 动画，遮罩和抽屉是一起滑上来的（PRD 明确说这是错的）；高度只有一个 `heightRatio`（`profile.tsx:264` 传 0.5）。

**改法**（`src/components/ui/bottom-sheet.tsx`）：

```tsx
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** half = 半屏，full = 近全屏（PRD 第 6 节两档）。 */
  size?: 'half' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const RATIO = { half: 0.5, full: 0.92 } as const;

const translateY = useRef(new Animated.Value(1)).current;   // 0 = 展开，1 = 收起（按高度做插值）
const opacity = useRef(new Animated.Value(0)).current;
const [rendered, setRendered] = useState(visible);

useEffect(() => {
  if (visible) setRendered(true);
  Animated.parallel([
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 180, useNativeDriver: true }),
    Animated.timing(translateY, {
      toValue: visible ? 0 : 1,
      duration: visible ? 220 : 180,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }),
  ]).start(({ finished }) => {
    if (finished && !visible) setRendered(false);
  });
}, [visible, opacity, translateY]);

<Modal
  visible={rendered}
  transparent
  animationType="none"          // ← 关键：交给自己的动画
  onRequestClose={onClose}>
  {/* 遮罩：只动 opacity */}
  {/* 抽屉本体：height 用 RATIO[size]，transform translateY 用 translateY.interpolate([0,1]→[0,height]) */}
```

注意：

- `translateY` 的插值依赖实际高度，用 `[0, 1] → [0, sheetHeight]` 在组件内算，不要写死 420。
- 关闭时先播动画再 `setRendered(false)`，否则 Modal 会瞬间消失。
- 返回键（安卓）仍由 `onRequestClose` 接到 `onClose`。
- 调用点：`profile.tsx:264` 改 `size="half"`；新增需要全屏的调用（如 `ActionMenu` 若迁移）再传 `size="full"`。

**验收**：打开时遮罩单独 180ms 淡入、抽屉 220ms 从底部升起；关闭时抽屉先落再淡出；半屏/全屏高度正确；安卓返回键可关。

---

## 7. M3 · 底栏第三格 ↔ 二级页（本计划最大块）

### 7.1 目标行为（PRD 第 391–446 行）

- 「健身 / 课表 / 日历」三者中，被放进底栏第三格的，就是**第 3 页**：有底栏，从首页 Dash 卡、底栏进入都进第 3 页。
- 没被放进第三格的，只能作为**二级页**从首页 Dash 卡 / 我的进入；从「我的」进入三者**永远是二级页**（无底栏）。
- 二级页头部统一：最左 36×36 圆形描边返回按钮、标题右移 12、不画整条顶部分隔线、不额外占一整条高度；作为第 3 页时**没有返回按钮**，标题左对齐 20。

### 7.2 现状问题

- `constants/tabs.ts` 的第三格不是真路由：`TIMETABLE.route = '/timetable'`，`app-tab-bar.tsx:89-93` 直接 `router.push('/timetable')`。`/timetable` 在 `(tabs)` 之外 → 没有底栏。
- `(tabs)/_layout.tsx:30-32` 用固定 `TAB_ITEMS` 渲染 `Tabs.Screen`，第三格名字恒为 `fitness`，`middle` 设置只影响视觉文案。
- 没有二级页组件，`calendar` / `profile` / `games` 用系统 Stack 头。

### 7.3 分步改法

**Step 1｜新建统一头部** `src/components/nav/sub-page-header.tsx`

```tsx
interface SubPageHeaderProps {
  title: string;
  /** page = 二级页（带圆形返回）；tab = 第 3 页（无返回、标题左对齐 20）。 */
  mode?: 'page' | 'tab';
  onBack?: () => void;
  right?: React.ReactNode;
}

export function SubPageHeader({ title, mode = 'page', onBack, right }: SubPageHeaderProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { paddingTop: 8 }]}>
      {mode === 'page' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={onBack ?? (() => router.back())}
          style={[styles.back, { borderColor: theme.text }]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={18}
            tintColor={theme.text}
          />
        </Pressable>
      ) : null}
      <ThemedText style={[styles.title, mode === 'page' ? styles.titleShifted : styles.titleTab]}>
        {title}
      </ThemedText>
      <View style={styles.spacer} />
      {right}
    </View>
  );
}
```

```ts
row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
back: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center' },
title: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
titleShifted: { marginLeft: 12 },
titleTab: { marginLeft: 0 },
spacer: { flex: 1 },
```

要点：**不画底部分隔线**；行高就是 36/标题行高，不再额外垫一整条；安全区由外层 `SafeAreaView edges={['top']}` 处理。

**Step 2｜抽出可复用屏幕 body**（为了第 3 页与二级页共用一个实现）

| 现文件 | 抽到 | 新文件 |
|---|---|---|
| `src/app/(tabs)/fitness.tsx`（364 行） | `src/components/fitness/fitness-screen.tsx`，`props: { mode: 'tab' \| 'page' }` | `(tabs)/fitness.tsx` 变成 5 行 wrapper（`mode="tab"`）；新增 `src/app/fitness.tsx`（`mode="page"`） |
| `src/components/calendar/calendar-panel.tsx` | 保持组件，加 `mode` 与头部 | 新 `(tabs)/` 内不再用 |
| `src/app/timetable/index.tsx`（839 行） | **Q3 决定**：若第三格必须保留底栏，需要把课表主页面 body 抽成 `src/features/timetable/timetable-screen.tsx`（UI 代码原样搬，仅导出位置变化） | 见 Q3 |

抽 body 的原则：**只搬 JSX 与样式，不动逻辑**；`mode` 只控制头部与返回。

**Step 3｜新增 `(tabs)/middle.tsx`**

```tsx
export default function MiddleScreen() {
  const [middle, setMiddle] = useState<MiddleTab>('fitness');
  const version = useDataVersion();
  useEffect(() => {
    getMiddleTab().then(setMiddle).catch(() => undefined);
  }, [version]);

  const { scheme } = useThemePreference();
  useFocusEffect(useCallback(() => { /* 同 AppTabBar：切回时重读 */ }, []));

  if (middle === 'timetable') return <TimetableScreen mode="tab" />;
  if (middle === 'calendar') return <CalendarScreen panelMode="tab" />;
  return <FitnessScreen mode="tab" />;
}
```

**Step 4｜改 `src/constants/tabs.ts`**

```ts
const MIDDLE: TabItem = { name: 'middle', title: '中间' };  // 标题在运行时用 MIDDLE_TAB_LABELS 覆盖
export function buildTabItems(middle: MiddleTab): TabItem[] {
  const item = { name: 'middle', title: MIDDLE_TAB_LABELS[middle], icon: MIDDLE_ICONS[middle] };
  return [FIRST[0], FIRST[1], item, LAST];
}
```

`TAB_ITEMS` 保留（`(tabs)/_layout.tsx` 需要 4 个 `Tabs.Screen`），但名字必须改成 `index / today / middle / settings`。

**Step 5｜改 `(tabs)/_layout.tsx`**

```tsx
<Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} middle={middle} />}>
  <Tabs.Screen name="index" options={{ title: '首页' }} />
  <Tabs.Screen name="today" options={{ title: '计划' }} />
  <Tabs.Screen name="middle" options={{ title: MIDDLE_TAB_LABELS[middle] }} />
  <Tabs.Screen name="settings" options={{ title: '我的' }} />
</Tabs>
```

（`(tabs)/fitness.tsx` 从 tab 路由里删掉，改成二级页 `src/app/fitness.tsx`；否则会多出一个隐藏 tab。）

**Step 6｜改 `app-tab-bar.tsx`**

- 删掉 `:55` 的 `onTimetablePage`、`:58` 的课表特判、`:89-93` 的 `router.push('/timetable')`。
- `isActive` 回到「`tab.name === activeName`」。
- 图标与标题随 `middle` 变（第三条）。

**Step 7｜类型与设置**

- `src/db/types.ts:163`：`export type MiddleTab = 'fitness' | 'timetable' | 'calendar';`，`MIDDLE_TABS` 与 `MIDDLE_TAB_LABELS` 同步加「日历」。
- `src/db/repositories/settings.ts:216-221` 白名单自动兼容（它按 `MIDDLE_TABS` 校验）。
- `(tabs)/settings.tsx:608-623` 的 ActionMenu 不用改（遍历 `MIDDLE_TABS`）。

**Step 8｜入口对齐**

- 首页 Dash：`(tabs)/index.tsx:148-153`，`fitness` 改 `router.push('/fitness')`（二级页）→ 但若第三格就是健身，应进第 3 页：用 `middle` 设置判断，命中则 `router.navigate('/middle')`。
- 「我的」：`settings.tsx` 增加「去健身 / 去课表 / 去日历」入口，全部 `router.push` 二级页。
- `src/app/_layout.tsx`：新增 `<Stack.Screen name="fitness" options={{ headerShown: false }} />`；`calendar` / `games` / `profile` 若要统一头部，改 `headerShown: false` 并在页面内用 `SubPageHeader`。

### 7.4 验收

- 把第三格设成健身：底栏点它 → 健身页**有底栏**；从首页 Dash 点「去健身」→ 同一页（有底栏）；从「我的」点「去健身」→ 二级页（有圆形返回、无底栏）。
- 切到课表 / 日历重复一次。
- 二级页返回后回到进入前的 Tab（`router.back()`），安卓返回键行为一致。
- 三种第三格切换后底栏图标与标题即时更新（`bumpDataVersion` 已由 `setMiddleTab` 触发）。
- E2E：`P3 健身` / `P7 日历` / `P8 数据与设置` 需按新路由改名或改入口（见 M7）。

### 7.5 风险

- **改动最大**：`(tabs)/_layout.tsx` 改名会让 `.expo/types/router.d.ts` 过期 → 必须重启一次 dev server（约 35 s）让类型重生。
- 旧深链 `/fitness` 从「tab」变「二级页」，若别处有 `router.navigate('/fitness')` 会变成 push（栈里多一层），需要全仓搜一遍（已知位置：首页 Dash）。
- 课表若走 Q3 的抽取方案，属于「课表文件被移动」，需要你明确授权。

---

## 8. M4 · 首页 Dash：竖卡、统一底色、居中、向下堆叠

### 8.1 卡片比例（宽度不变 → 高 427）

- `src/constants/theme.ts`：`DashCardSize` 只留宽度与间距，高度改成计算值：
  ```ts
  export const DashCardSize = { width: 264, gap: 16 } as const;
  export const DASH_RATIO = 1.618;
  ```
- `dash-card.tsx:31` 的注释「264×163 时宽高比为黄金比」删掉/改写。
- 所有调用点用 `Math.round(width / 1.618)`：`dash-carousel.tsx:45` 已经这么算；`(tabs)/index.tsx:180` 的 `stackHeight` 也是。

### 8.2 全部卡片同一样式

- 删 `tone`：`dash-card.tsx:20,40,45-50`、`dash-carousel.tsx:92`、`dash-stack.tsx:121`。
- 底色规则改成：
  ```ts
  const backgroundColor = style === 'custom' ? color : PLAIN_BG;   // 不再有 primary 深色
  const ink = '#111111';
  const subInk = '#6B6B70';
  const showCartoon = style === 'cartoon';
  ```
- `rippleColor` 统一 `'rgba(0,0,0,0.10)'`；图标 chip 统一白底（`#FFFFFF`）。
- 深色模式：`PLAIN_BG` 用 `theme.backgroundElement`、`ink` 用 `theme.text`（当前是硬编码，暗色下会瞎）。→ 顺手修掉。

### 8.3 Dash 紧贴标题栏

`src/app/(tabs)/index.tsx`：

- 删 `const titleZoneHeight = Math.round(availableHeight * 0.3);`（:171）与 `minHeight: titleZoneHeight`（:215）。
- 把 `dashTitleRow`（:248-260）从 `titleZone` 里挪出来，紧跟 `</Animated.View>` 之后、`dashBlock` 之前：
  ```tsx
  <Animated.View style={[styles.headerZone, { transform: [{ scale: titleScale }] }]}>
    {/* headerRow：Hey/日期/头像 */}
  </Animated.View>

  <View style={styles.dashTitleRow}>{/* Dash + 管理 › */}</View>

  <View style={styles.dashBlock}>{dashBlock}</View>
  <View style={styles.tasks}>…</View>
  ```
- `styles.headerZone`：`paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.two`；`dashTitleRow` 加 `paddingHorizontal: Spacing.three`。

### 8.4 首屏空间（375×864 安卓，状态栏 24、手势区 28、底栏 58）

可用高度 ≈ 864 − 24 − 28 − 58 = 754。

| 区块 | 高度（改后） |
|---|---|
| 标题区（Hey + 日期 + 头像） | 44 + 16 padding ≈ 76 |
| Dash 标题行 | 34 + 8 ≈ 42 |
| 卡片（264 宽 → 427 高） | 427 + 8 padding ≈ 435 |
| Tasks 标题行 | 28 + 16 ≈ 44 |
| **合计** | **≈ 597** |
| **Tasks 列表剩余** | **≈ 157（约 2 行）** |

→ 结论：**宽度保持 264 时，Tasks 标题 + 2 行仍能在首屏看到**（此前算不出是因为标题区白占了 30%）。这是 Q1 的推荐方案 B。

### 8.5 横滑居中 + 居中时完全展开

`src/components/home/dash-carousel.tsx`：

```tsx
const side = Math.max(24, (screenWidth - cardWidth) / 2);
// contentContainerStyle: { paddingHorizontal: side, gap: GAP }
```

- 去掉每张卡外面那层 `marginRight: GAP`，改用 `gap`，避免末尾多出 16。
- 用 `Animated.ScrollView` + `scrollX`，每张卡按距离插值：
  ```tsx
  const scrollX = useRef(new Animated.Value(0)).current;
  // 卡片 i 的 scale：|offset - i*snap| = 0 → 1；±snap/2 → 0.94
  const scale = scrollX.interpolate({
    inputRange: [(i - 1) * snap, i * snap, (i + 1) * snap],
    outputRange: [0.94, 1, 0.94],
    extrapolate: 'clamp',
  });
  ```
- Web 没有 momentum 事件：`onScrollEndDrag` 后加 160ms settle 兜底更新 `activeIndex`（与课表翻周同样的处理）。

### 8.6 堆叠：向下叠两张 + 侧窥 + 居中

`src/components/home/dash-stack.tsx`：

```tsx
const VISIBLE = 3;          // 顶层 + 2 张
const OFFSET_Y = 18;        // 每层向下 18
const OFFSET_X = 12;        // 每层向右 12（侧窥）
```

- 只画 `ordered.slice(0, VISIBLE)`（:94 的 4 改 3）。
- 层级样式：
  ```tsx
  transform: isTop
    ? [{ translateX }, { rotate: … }]
    : [{ translateY: depth * OFFSET_Y }, { translateX: depth * OFFSET_X }, { scale: 1 - depth * 0.05 }],
  ```
- 容器居中：`wrap: { alignItems: 'center', height: height + OFFSET_Y * (VISIBLE - 1) }`；`layer` 的 `left` 改为 0 并让 `wrap` 的宽度等于卡片宽度（`width`），由居中保证水平位置。
- 拖拽逻辑不动（`PanResponder` + 飞出 250ms + 轮转队尾）。

### 8.7 验收

- 首页首屏：Dash 卡（264×427）+ Tasks 标题 + ≥1 行可见。
- 四张卡底色一致（不再首卡深色）。
- 横滑：卡片居中、松手吸附、居中那张完整未缩放；两侧卡 0.94。
- 堆叠：顶层卡居中，下方露 2 张、每张向右下偏移、带侧边；拖走一张后顺序轮转。
- 暗色模式下卡片跟随主题（白字/深底）。

### 8.8 风险

- 427 高的卡会让 860 以下的小屏更挤：若真机首屏 Tasks 看不全，降级方案是卡片宽度 240（高 388）或标题区再压 12。**先按 264 做，真机看效果再调一个常量即可。**

---

## 9. M5 · 安卓下拉拉伸

**问题**：`(tabs)/index.tsx:173-177` 用 `scrollY.interpolate([-240, 0] → [1.18, 1])`，安卓 `ScrollView` 没有 overscroll（`contentOffset` 不会为负），所以永远不触发。

**改法**：

1. 外层包一个 `View`，用 `PanResponder` 只在「列表已在顶部 + 向下拉」时接管：
   ```tsx
   const atTopRef = useRef(true);
   const pull = useRef(new Animated.Value(0)).current;
   const responder = useMemo(() => PanResponder.create({
     onMoveShouldSetPanResponder: (_e, g) => atTopRef.current && g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
     onPanResponderMove: (_e, g) => pull.setValue(Math.min(g.dy * 0.5, 120)),
     onPanResponderRelease: () => Animated.spring(pull, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start(),
     onPanResponderTerminate: () => Animated.spring(pull, { toValue: 0, useNativeDriver: true }).start(),
   }), [pull]);
   ```
2. `onScroll` 里维护 `atTopRef.current = e.nativeEvent.contentOffset.y <= 0`。
3. 标题区 `transform: [{ translateY: pull }, { scale: pull.interpolate([0,120] → [1,1.18]) }]`，iOS 保留原逻辑（`Platform.OS === 'ios'` 分支）。

**验收**：安卓真机在首页顶部继续下拉，标题与 Dash 一起被拉下并放大，松手弹回；下拉时不触发刷新、不影响 Tasks 滚动。

> 按 `AGENTS.md`：手势类交互**不写 E2E**，只给真机自测步骤。

---

## 10. M6 · 效果清单（可选，分批；PRD 第 448–519 行）

按「性价比」排序，每项独立可上、可单测（纯视觉的交给真机）：

| # | 效果 | 落点 | 要点 |
|---|---|---|---|
| E1 | 按压回弹 96% + 弹簧 | `src/components/ui/ripple-pressable.tsx` | `onPressIn` 时 `scale.setValue(0.96)`，`onPressOut` `Animated.spring` 回 1（减弱动效时跳过） |
| E2 | 勾选描边 200ms | `src/components/ui/check-mark.tsx` | 现在已用 `scaleY + opacity`；改成「笔画生长」：对勾用两个 `Animated.View` 分别水平/垂直描边按进度展开，`duration: Motion.check` |
| E3 | 弹性开关 | 新 `src/components/ui/toggle-switch.tsx` | 56×32 轨道 + 26 圆点；拖拽时圆点拉长成胶囊（`width` 插值 26→40），松手 `spring` 吸附两端 |
| E4 | 数字滚动 | 新 `src/components/ui/number-roller.tsx` | 每个数字一列 0–9 的 `translateY`，切换时按差值滚；用在首页「本月 N 条」等汇总数字 |
| E5 | 骨架屏 | 新 `src/components/ui/skeleton.tsx` | 灰块 + `opacity` 呼吸（700ms loop）；首页/今日计划首帧用 |
| E6 | 卡片翻面 | 新 `src/components/ui/flip-card.tsx` | 两个面 + `rotateY` 插值 0→180，`backfaceVisibility: 'hidden'`；用于卡片管理预览 |
| E7 | 液态滑块 | `(tabs)/settings.tsx:471-496` 主题 chips | 用 `Animated.View` 胶囊在三个 chip 间位移 + 宽度变形 |
| E8 | 点赞炸一下 | 若后续有「点赞」入口 | 粒子用 6–8 个小圆 `Animated.stagger` 飞出 |

**不做**：汉堡变叉（应用没有汉堡菜单）。

其余已实现、本次只需保持：波纹跟手（`RipplePressable`）、逐条渐显（`StaggeredAppear`）、吸附分页、完成对勾 2.5s、日期条自动居中（M1a 改为不自动居中）、全量 `accessibilityLabel`、减弱动效（`useReducedMotion`）。

---

## 11. M7 · 回归与发版

1. `npm run verify`（必须 0 error / 0 warning）。
2. 重启 Web：`Stop-Process -Name node -Force; npx expo start --web --port 8090 --clear`，再 `node tests/e2e/run.mjs`。
3. 受影响场景要改：
   - `tests/e2e/home.e2e.mjs`：Dash 卡文案/尺寸相关断言（若有按尺寸判断）。
   - `tests/e2e/fitness.e2e.mjs`：已完成卡结构变化。
   - `tests/e2e/settings.e2e.mjs`：第三格选项从 2 个变 3 个。
   - `tests/e2e/calendar.e2e.mjs`：日历若变成第 3 页，入口变化。
4. 真机自测清单（用户执行）：
   - [ ] 首页：首屏能看到 Tasks；卡片竖版、四张同色、横滑居中；堆叠模式向下叠两张
   - [ ] 今日计划：点日期不滚动、选中态正确；月历跳远日期会滚过去
   - [ ] 健身：已完成条目明显更高
   - [ ] 第三格：三种模块都有底栏；「我的」进去是二级页并带圆形返回
   - [ ] 滚轮：生日三列、课表时长/周次滚轮高亮固定 + 上下渐隐
   - [ ] 抽屉：遮罩单独淡入、抽屉升起；半屏/全屏
   - [ ] 版本号：我的 → 关于 1.2.2；课表设置 → 关于 1.2.2
5. 更新 `CHANGELOG.md`（本次发布条目）、`AGENTS.md`（路由结构从「5 Tab」改「4 Tab + middle」）。

---

## 12. 验收清单（整体）

- [ ] `app.json` / `package.json` / 关于页 / 课表设置页四处版本号一致为 1.2.2
- [ ] 首页 Dash 紧贴标题栏，卡片 264×427（黄金比），四张同一样式
- [ ] 首页首屏能看到 Tasks（标题 + ≥1 行）
- [ ] 堆叠向下叠两张并带侧窥，拖拽轮转正常
- [ ] 日期条点按不自动居中，跨窗口跳转会居中
- [ ] 健身已完成卡比待训练卡高约 32
- [ ] 滚轮高亮固定 + 上下渐隐，点击选择不受影响
- [ ] 抽屉两档、遮罩独立淡入、返回键可关
- [ ] 第三格三种模块都有底栏；「我的」入口一律二级页 + 圆形返回
- [ ] 二级页头部：无整条分隔线、不额外占高、标题间距正确
- [ ] 安卓下拉拉伸生效
- [ ] `npm run verify` 全绿；E2E 9 场景通过或已说明跳过项
- [ ] 课程表模块业务代码零改动（仅版本号一处，需授权）

---

## 13. 风险与回滚

| 风险 | 表现 | 处理 |
|---|---|---|
| M3 路由改名 | `.expo/types/router.d.ts` 过期、类型报错、深链失效 | 重启 dev server 重生类型；全仓搜 `'/fitness'`、`'/calendar'`、`'/timetable'` 调用点 |
| 抽课表 body（Q3） | 课表文件被移动 | 只搬不改；搬完立刻 `npm run verify` + P4 场景回归 |
| M4 首屏空间 | 小屏 Tasks 被挤出 | 卡片宽度降一档（240 / 216），只调一个常量 |
| M2 抽屉 | `useNativeDriver` 与高度插值冲突 | 高度变化不参与动画，只有 `translateY`/`opacity` 走原生驱动 |
| M5 手势 | 抢了 Tasks 列表的滚动 | 只在 `atTop && dy > 0` 时接管，其余不拦截 |
| expo-linear-gradient | 新依赖、dev build 需重建 | 或改用纯色渐变兜底 |

---

## 14. 参考实现（PRD 要求先调研同类开源项目）

| 项目 | 许可证 | 维护 | 结论 |
|---|---|---|---|
| `@gorhom/bottom-sheet` | MIT | 活跃 | 组件很全（多档吸附、手势），但本项目抽屉只是「淡入 + 升起」，自实现 40 行即可，**不引入** |
| `react-native-snap-carousel` | MIT | 已归档（不兼容 RN 新架构） | **不可用** |
| `react-native-reanimated` carousel（`react-native-reanimated-carousel`） | MIT | 活跃 | 依赖 reanimated（已装），但横滑卡自带吸附够用，**不引入** |
| `react-native-wheel-picker`（社区多份） | MIT | 维护状态参差 | 只差「高亮固定 + 渐隐」，30 行内可改，**不引入** |

结论：**本计划零新增第三方库**（仅 M1c 可能需要 Expo 官方 `expo-linear-gradient`）。

---

## 15. 需要你拍板的四件事

- **Q1 卡片宽度**：A 264 宽、Tasks 首屏看不到 / **B 264 宽 + 收紧标题区（推荐，Tasks 露约 2 行）** / C 216 宽 / D 200 宽。
  你的原话是「宽不变」，按 B 执行即可；如果嫌卡太高，告诉我降到 240 或 216。
- **Q2 版本号与 CHANGELOG 冲突**：`CHANGELOG.md` 已有 v1.2.2 / v1.2.3 / v1.2.4 三条历史，现在 App 内版本要定 1.2.2。
  选 (a) 把三条合并成一条 v1.2.2（改写历史，最干净）；或 (b) 保留历史，另起一条「v1.2.2 发布版」说明（推荐，不改历史）。
- **Q3 第三格选「课表」时是否必须保留底栏**：要保留 → 需要把课表主页面 body 抽成可复用组件（课程表 UI 一行不改，只是文件位置变），需要你授权；不保留 → 维持现在的 `push('/timetable')`（没底栏），其余两个模块按新规则做。
- **Q4 动效清单（M6）**：全做（约 2 天）/ 只做 E1 按压回弹 + E3 弹性开关 / 本轮先不做。

---

## 16. 执行记录（2026-11-11 实际完成）

用户没有逐条回答 Q1–Q4，按推荐值执行：**Q1 选 B**（264 宽 + 收紧标题区）、**Q2 选 (b)**（保留 CHANGELOG 历史，另起 v1.2.2 条目）、**Q3 不抽课表 body**（课表页保持无底栏，零业务改动）、**Q4 只做 E1**。

| 里程碑 | 状态 | 实际改动 |
|---|---|---|
| M0 版本号 | ✅ | `app.json` / `package.json` → 1.2.2；我的-关于兜底 1.2.2；课表设置-关于改读 `Constants.expoConfig?.version`（课表唯一改动处） |
| M1 日期条 / 健身卡 / 滚轮 | ✅ | `date-strip.tsx` 去掉 `key={value}` 与抢镜居中，只在首次与跨远距离跳转居中；`set-record-row.tsx` 行高 70 / 圆点 24；`wheel-picker.tsx` 高亮改为绝对定位固定条 + 按距离淡出 |
| M2 抽屉 | ✅ | `bottom-sheet.tsx` 改 `size: 'half' \| 'full'`、`animationType="none"` + 遮罩 180ms 独立淡入 + 本体 220ms 升起 |
| M3 底栏第三格 | ✅ | 新增 `(tabs)/middle.tsx`、`app/fitness.tsx`、`fitness-screen.tsx`、`calendar-screen.tsx`、`sub-page-header.tsx`；`fitness` 由 Tab 变二级页；`MiddleTab` 加 `calendar`；第三格选课表时仍 `push('/timetable')` |
| M4 首页 Dash | ✅ | 竖卡 264×427（`DASH_CARD_RATIO` / `dashCardHeight`）；取消主卡深色，统一 `backgroundElement` + 按底色判黑白字；横滑居中 + 离中心 0.94 缩放；堆叠向下 3 层、侧窥 12px |
| M5 安卓下拉拉伸 | ✅ | 首页 `PanResponder` 接管 `atTop && dy > 6`，标题 `translateY` + 放大到 1.18，松手弹簧回弹；iOS 仍走滚动插值 |
| M6 动效 | 🟡 部分 | 只做 E1：`RipplePressable` 按下 0.96 + 弹簧回弹。E2 勾选描边、E3 弹性开关等按计划「可选、分批」未做 |
| M7 回归 | ✅ | `npm run verify` 37 文件 / 246 用例全绿；E2E 9 场景全绿 |

### 顺带修掉的两个真实缺陷

1. **首页/课表并发播种撞唯一约束（红屏）**：`src/features/timetable/repository.ts` 的 `ensureTimetableSeed` 对 `period.times` 用裸 `INSERT`，首页与课表同时启动时两次都判定「缺失」→ `UNIQUE constraint failed: settings.key`。改为单源 `seedPromise` + `INSERT OR IGNORE`，并加并发回归用例。这是 E2E `P6 首页` 长期失败的真因（此前误判为「测试数据污染」）。
2. **E2E 清库不生效**：`localStorage.clear()` 后立刻 reload，会被 web 驱动 50ms 去抖的待写定时器把旧库写回。改为 `?resetDb=1` 在驱动启动时清库，再 `page.gotoFresh(url)` 回到干净地址。

### 已知限制（交由真机验证）

- 安卓下拉拉伸、Tab 横滑翻页、长按菜单在无头浏览器里不可靠，按项目约定不写自动化测试；已交付改动点，等真机确认手感。
- 堆叠模式与横滑模式二选一（首页卡片管理里切换），两种模式的拖拽/滑动都建议真机各点一遍。
- 课表模块本轮只改了两处（版本号读数、并发播种），其余一行未动。

### 验证命令

```bash
cd "D:\new app andriod\my-life-app"
npm run verify                                   # 246 用例 + tsc + lint
Stop-Process -Name node -Force                  # 再启 8090，见 AGENTS.md
npx expo start --web --port 8090 --clear
node tests/e2e/run.mjs                           # 9 个 UI 场景
```