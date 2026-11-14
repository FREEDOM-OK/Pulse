# App 架构与路由状态流转说明

> 状态：架构审核稿（2026-11-12）。本轮只提交文档，不修改业务代码。
> 工程：`Pulse`（工程目录 `my-life-app`；Expo SDK 58、expo-router ~58.0.30、react-native 0.88.1、react-native-reanimated 4.7.1）。
> 目标：先对齐“路由层级、数据来源、搜索层归属、Dash 视口几何”，确认后再按此文档改代码。

## 0. 结论先行

1. **路由是两层结构**：`(tabs)` 是带底栏的 Tab 根路由；`fitness / calendar / day/[date] / timetable / games / profile / cards / personalize` 是 Root Stack 下的二级页。二级页没有底栏，用返回键退出。
2. **搜索是 Overlay，不是独立路由页**：结果列表覆盖在首页之上；当前不新增 `/search` 路由。点击结果后必须先收起 Overlay，再用 `router.push()` 进入真正的二级页，并携带记录所属的 `date`。
3. **首页数据不是静态常量**：唯一事实来源是本地 SQLite。`useDataVersion()` 是全局数据版本事件（`useSyncExternalStore`），写库后 `bumpDataVersion()` 触发首页、计划页、底栏第三格等重新读取。没有 Redux，也没有一个叫 `PlanData` 的全局 Context；`PlanData` 是 `tasks + memos + courses` 的**逻辑读模型**。
4. **Dash 当前不是被 flex 挤压**：卡片宽度已经是硬编码 `175`。真正影响“第二张露出多少”的是 FlatList 的横向 padding 与 `SNAP_INTERVAL = CARD_WIDTH + GAP`。目标会移除 width 上的 flex，改为固定卡片尺寸 + 固定间距 + `snapToInterval`；但“露出半张卡”和“175 宽 + 16 间距”在数学上不能同时成立，需要确认口径（见第 3 节末尾）。

---

## 1. 全局路由拓扑（Routing Topology）

### 1.1 路由树

```text
Root Stack  (src/app/_layout.tsx，headerShown:false)
├── (tabs)                         Tab 根路由，带自定义悬浮底栏
│   ├── index                      首页 / Home
│   ├── today                      计划 / Plan
│   ├── middle                     中间动态位（健身 / 日历 / 课表重定向）
│   └── settings                   我的 / Profile（Tab 名是 settings）
│
├── calendar                       日历回顾（二级页）
├── day/[date]                     某一天的计划详情（搜索计划/备忘的承载页）
├── fitness?date=YYYY-MM-DD        健身（二级页，可带日期）
├── timetable                     课表根（嵌套 Stack）
│   ├── index
│   ├── course
│   ├── courses
│   ├── periods
│   ├── schedules
│   ├── settings
│   ├── appearance
│   └── import
├── games                          游戏（二级页）
├── profile                        个人资料（二级页）
├── cards                          首页卡片管理（二级页）
├── personalize                    个性化入口（二级页）
└── personalize/cards              个性化卡片（二级页）
```

### 1.2 Tab 根路由（底栏所在页面）

| Tab 路由名 | 路径 | 用户看到的标签 | 实际页面 | 说明 |
|---|---|---|---|---|
| `index` | `/` | 首页 | `src/app/(tabs)/index.tsx` | 问候、Search、Dash、Tasks |
| `today` | `/today` | 计划 | `src/app/(tabs)/today.tsx` | DateStrip + TodayList |
| `middle` | `/middle` | 动态：健身 / 日历 / 课表 | `src/app/(tabs)/middle.tsx` | 第三格由设置决定 |
| `settings` | `/settings` | 我的 | `src/app/(tabs)/settings.tsx` | 用户口中的 Profile Tab；`/profile` 是另一个二级资料页 |

补充说明：

- 底栏不是 5 个独立路由 Tab。它是 **4 个真实 Tab + 中间“+”动作按钮**；`+` 打开新建菜单，不占一个路由。
- `middle` 的三种状态：
  - `fitness`：渲染 `<FitnessScreen mode="tab" />`，仍在 Tab 容器内，有底栏。
  - `calendar`：渲染 `<CalendarScreen mode="tab" />`，仍在 Tab 容器内，有底栏。
  - `timetable`：`<Redirect href="/timetable" />`，跳到 Root Stack 的全屏课表；底栏第三个按钮本身也直接 `router.push('/timetable')`。
- 底栏组件是 `src/components/nav/app-tab-bar.tsx`，根据 `middle` 重新 `buildTabItems(middle)`，所以第三格的图标和文字会变。

### 1.3 二级独立页面（无底栏，带返回）

| 路径 | 入口 | 返回方式 | 说明 |
|---|---|---|---|
| `/fitness?date=...` | 首页健身卡、我的快捷入口、搜索结果 | `SubPageHeader` 圆形返回 | `FitnessScreen mode="page"`，可带目标日期 |
| `/calendar` | 首页日历卡、我的快捷入口 | 页面返回 | 日历回顾 |
| `/day/[date]` | 搜索结果中的计划/备忘 | `SubPageHeader` 圆形返回 | 直接渲染该日 `TodayList` |
| `/timetable` | 底栏第三格（课表模式）、首页课表卡 | 课表自己的返回 | 独立全屏，嵌套 Stack |
| `/games` | 首页游戏卡 | 原生 Stack header 返回 | 游戏模块 |
| `/profile` | 首页头像 | 原生 Stack header 返回 | 个人资料 |
| `/cards` | 首页“管理” | 原生 Stack header 返回 | 首页卡片管理 |
| `/personalize`、`/personalize/cards` | 设置/个性化入口 | 页面返回 | 个性化配置 |

这些页面全部注册在 Root Stack 的 `src/app/_layout.tsx` 中，不在 `(tabs)` 内，所以不会显示底栏。

### 1.4 搜索结果承载层：Overlay，不是路由

**明确结论：沉浸式搜索的结果列表是覆盖在首页之上的绝对定位层（Overlay），不是独立路由页面。当前没有、也不计划新增 `/search` 路由。**

当前实现位置：

- `src/app/(tabs)/index.tsx` 的 `styles.searchPanel`：
  - `position: 'absolute'`
  - `top / left / right / bottom` 全为 0
  - 背景 `#F7F7FA`
  - 作为首页 `ScrollView` 的兄弟节点渲染
- 打开时：
  - `searchProgress` 从 0 → 1
  - 搜索栏 `searchTranslateY` 上移
  - 标题、Dash、Tasks 通过 `searchBackgroundOpacity` 向下淡出
  - 搜索面板淡入，`SearchResults` 用 `FlatList` 渲染结果
- 关闭时：
  - 反向 timing 回 0
  - `Keyboard.dismiss()`，搜索栏归位，首页内容恢复

当前实现有一个**需要修正的架构细节**：Overlay 挂在首页 Screen 内部，因此它只覆盖首页内容区，底栏仍然在 Overlay 之外。若“沉浸式全屏”要求连底栏一起盖住，目标应改为 Root 级 portal/透明 `Modal`，或在搜索聚焦时隐藏自定义 TabBar。这个选择需要确认，见第 5 节。

#### 搜索状态机（目标契约）

```text
CLOSED
  └─ onFocus
       ↓
  FOCUSED_EMPTY（只显示搜索历史，不查业务表）
       ├─ 用户输入 → TYPING（只更新输入，不查库）
       │     └─ onSubmitEditing → SUBMITTED_LOADING
       │            ├─ 有结果 → RESULTS
       │            └─ 无结果 → EMPTY_RESULT
       └─ onBlur / X → CLOSING → CLOSED
  RESULTS
       └─ onPress(result) → CLOSING(250ms) → router.push(detail)
```

关键行为：

1. **聚焦时**展示 Overlay 和搜索历史；不启动业务数据查询。
2. **输入时**只更新 `query`，不渲染业务结果。
3. **按回车（`returnKeyType="search"` + `onSubmitEditing`）后**才调用 `searchRecords(query)`。
4. **空关键词**只显示搜索历史/空态，绝不调用 `searchRecords('')` 把全部业务数据铺开。
5. **点击结果**先执行收起动画，再 `router.push()`；不使用“原地假动画”代替导航。

#### 结果点击后的真实路由

```text
SearchResult.kind === 'fitness'
  → router.push({ pathname: '/fitness', params: { date: result.date } })

SearchResult.kind === 'task' | 'memo'
  → router.push(`/day/${result.date}`)
```

- `/day/[date]` 是动态路由，`date` 是路径参数；页面内 `useLocalSearchParams<{ date?: string }>()` 读取并校验。
- `/fitness?date=...` 是查询参数；`FitnessScreen initialDate` 用它初始化日期，且 `useFocusEffect` 不会把从搜索进入的日期重置回今天。
- 详情页都在 Root Stack，无底栏；返回后回到首页，且搜索层已经关闭，不会出现“返回后 Overlay 还开着”的状态。

当前代码已经使用 `router.push`，但触发方式是“输入 120ms 后自动查询”，不是“回车提交”；空关键词还会返回最近记录。这两点会在按本文档改代码时修正。

---

## 2. 组件与状态依赖关系（Component & State Dependencies）

### 2.1 应用启动与 Provider

```text
RootLayout
├─ initDatabase()
│   ├─ openDatabaseAsync('life-app.db')
│   ├─ migrate()
│   ├─ migrateLegacyQuickMemo()
│   ├─ migratePeriodTimesV5()
│   ├─ seedExercises()
│   └─ ensureTimetableSeed()
├─ ThemePreferenceProvider
├─ TimetableProvider（课表编辑器的 Context，不是首页数据总线）
├─ AppStack（Root Stack）
└─ DialogHost
```

`initDatabase()` 是幂等的，数据库初始化完成后才渲染路由；初始化失败时显示错误页。

### 2.2 全局数据版本：SQLite 的“订阅/通知”机制

`src/lib/data-version.ts`：

```text
version: number
listeners: Set<() => void>

bumpDataVersion()  → version++ → 通知所有 listener
useDataVersion()   → useSyncExternalStore(subscribe, getDataVersion)
```

这不是 Redux，也不是 Context；它是模块级外部 store。优点：

- 写库的模块不需要认识页面组件；
- 首页、计划页、底栏第三格、TodayList 等可以各自订阅；
- 读仍然是 SQLite 查询，页面刷新后拿到的是数据库最新状态，不会出现两套内存副本。

当前会触发 `bumpDataVersion()` 的典型路径：

- `TodayList.handleToggleTask()`：勾选/取消勾选后；
- `TodayList.refresh()`：表单保存/删除后；
- 设置页修改“第三个标签”、排序、隐藏已完成等；
- 课表编辑 Provider 保存课程/设置后。

首页订阅：

```text
HomeScreen
  const dataVersion = useDataVersion()
  useEffect(load, [dataVersion])
  useFocusEffect(load)
```

计划页的 `TodayList` 也订阅同一个版本，因此首页勾选任务后，计划页会重新查库，反之亦然。

### 2.3 首页数据来源（不是静态变量）

首页 `load()` 通过 `Promise.all` 读取 12 个来源：

| 数据 | 仓库/函数 | 用途 |
|---|---|---|
| 用户资料 | `getProfile()` | 问候语姓名、头像 |
| 首页卡片 ID | `getHomeCards()` | Dash 卡片顺序与开关 |
| Dash 模式 | `getDashMode()` | `carousel` / `stack` |
| 卡片样式/颜色 | `getCardStyle()` / `getCardColor()` | DashCard 外观 |
| 今日训练摘要 | `getTrainingSummary(today)` | 健身卡副标题 |
| 想玩清单 | `listWishlist()` | 游戏卡副标题 |
| 最近在玩游戏 | `getLatestPlayed()` | 游戏卡副标题 |
| 本月/今天记录数 | `countRecordsInRange()` | 日历卡副标题 |
| 今天课程 | `listCoursesForDate(today)` | 课表卡副标题、下一节课 |
| 底栏第三格 | `getMiddleTab()` | 健身/日历卡跳 Tab 还是二级页 |

Dash 的 `cardModels` 是**派生视图模型**，不是静态数组：

```text
getHomeCards() → HomeCardId[]
  + 今日训练/想玩/记录数/课程摘要
  + getDashMode / getCardStyle / getCardColor
  → cardDescriptions
  → cardModels: DashCardModel[]
  → DashCarousel / DashStack
```

卡片点击也不是写死的：

| 卡片 | 目标 |
|---|---|
| `fitness` | 第三格是健身 → `router.navigate('/middle')`；否则 `router.push('/fitness')` |
| `calendar` | 第三格是日历 → `router.navigate('/middle')`；否则 `router.push('/calendar')` |
| `timetable` | 始终 `router.push('/timetable')` |
| `games` | `router.push('/games')` |

### 2.4 首页 Tasks 与计划页共享的 `PlanData` 读模型

这里没有“首页一份数据、计划页另一份数据”。两者共用 `TodayList`，只是传入的 props 不同。

```text
SQLite
├─ tasks        → listTasksByDate(date)
├─ memos        → listMemosByDate(date)
└─ sched_*      → listCoursesForDate(date)  [features/timetable/bridge.ts]
                      ↓
              buildTodayItems(date, tasks, memos, courses)
                      ↓
              TodayItem[]（task / memo / course 联合类型）
                      ↓
              sortTodayItems(items, sortMode)
                      ↓
              { active, completed }
                      ↓
       flatItems = [...active, ...completed]
                      ↓
       hideCompleted 过滤 → TodayList 单层平铺渲染
```

关键点：

- Home 的 Tasks 没有 `onlyTasks` 过滤，也没有把课程/备忘排除；课程、任务、备忘都会渲染。
- 任务行与计划页共享同一个 `handleToggleTask`：
  - 本地先翻转，保证点击反馈；
  - `await toggleTask(id)` 写 SQLite；
  - `bumpDataVersion()` 通知另一个 Tab 的 TodayList 重新查库；
  - 300ms 后清 `justChecked`，完成项按排序规则下沉。
- 课程行数据走 `CourseOnDate`，包含 `color`、`room`、`time`；课程颜色再用 `getTimetableSettings().saturation` + `softenColor()` 与课表卡片统一。
- `PlanData` 可以理解为 `TodayItem[]` 这个读模型，而不是一个需要全局同步的 React state tree。

### 2.5 搜索数据流

当前搜索仓库 `src/db/repositories/search.ts`：

```text
searchRecords(rawQuery)
  ├─ tasks:        title LIKE ? OR COALESCE(note,'') LIKE ?
  ├─ memos:        content LIKE ?
  └─ set_records:  exercise_name LIKE ?，按 date + exercise_name 聚合组数
        ↓
  SearchResult { key, kind, title, subtitle, date }
        ↓
  SearchResults（FlatList，72 高卡片）
```

覆盖范围：

- `task` → 计划；`memo` → 备忘；`fitness` → 健身训练记录。
- 课程不是搜索结果类型；课程通过首页/计划页的 `PlanData` 展示，不进入全局搜索结果。
- 结果按日期倒序，每源最多 24 条，总计最多 30 条。
- 点击结果用 `result.date` 作为详情页日期参数。

**当前偏差**：`searchRecords('')` 使用 `LIKE '%%'` 返回最近记录，所以搜索面板一打开就会平铺业务数据。目标修正为：

1. 空关键词不查 `tasks/memos/set_records`；
2. 单独读取 `search_history`（见 2.6）；
3. 只有在用户按回车提交后才查业务表；
4. 结果为空时显示“没有找到相关内容”，不显示最近记录。

### 2.6 搜索历史（目标新增）

当前工程没有 AsyncStorage 依赖，SQLite 已经是全局可用的事实来源。建议新增一张轻量历史表，避免引入第二套持久化：

```sql
CREATE TABLE IF NOT EXISTS search_history (
  query       TEXT PRIMARY KEY,
  searched_at TEXT NOT NULL,
  hit_count   INTEGER NOT NULL DEFAULT 1
);
```

行为：

- 提交搜索时 `UPSERT`：`hit_count += 1`、更新 `searched_at`；
- 空关键词聚焦时只查 `search_history ORDER BY searched_at DESC LIMIT 10`；
- 历史项是“关键词 chip”，不是业务记录卡片；
- 用户点击历史项时，把关键词填回输入框，仍需按回车才查询；
- 可选提供“清空历史”，但不把业务数据混进历史区。

这样能严格满足“空面板是搜索历史，不是所有数据”的要求，同时保持 SQLite 单事实来源。

---

## 3. UI 布局物理约束（Layout Constraints）

### 3.1 先纠正一个判断

当前 `DashCard` **没有用 flex 挤压宽度**。`DashCarousel` 已经把卡片宽度硬编码为：

```text
DASH_CARD_WIDTH  = 175
DASH_CARD_HEIGHT = 235
SPACING          = 16
SIDE_PADDING     = 20
IDLE_SCALE       = 0.9
SNAP_INTERVAL    = 175 + 16 = 191
```

卡片外层传入固定 `width/height`，`DashCard` 内部没有 `flex: 1` 或百分比宽度。真正让“第一张完整、第二张比例不对”的原因是：

1. `contentContainerStyle` 还有 `paddingHorizontal: 20`；
2. 视口宽度减去左 padding、卡片宽、间距后，第二张的可见宽度不是设计想要的；
3. 当前 390 宽度下第二张会大幅露出，不是 30–40dp 细边。

所以修正方向不是“把 flex 改成硬编码”，而是：**保留硬编码卡片尺寸，移除宽度上的弹性/内边距干扰，改用固定 SLOT + snapToInterval 计算视口。**

### 3.2 FlatList 视口公式

设：

```text
W          = 屏幕宽度
LEADING    = 列表首卡左侧留白（目标先按 0）
CARD_W     = 175
GAP        = 16
SLOT       = CARD_W + GAP = 191
```

则：

```text
第 1 张卡：x = LEADING
第 2 张卡：x = LEADING + SLOT = LEADING + 191
第 2 张可见宽度 visibleNext = W - (LEADING + CARD_W + GAP)
```

### 3.3 两组物理参数

#### A. 目标参数（按你给的 375dp 例子 + 容器无 padding）

```text
W=375
LEADING=0
CARD_W=175
CARD_H=235
GAP=16
SLOT=191
visibleNext = 375 - 191 = 184dp
```

也就是说，在这个口径下，第二张露出 **184dp，约等于半个屏幕**；不是“半张卡”的 87.5dp。

#### B. 如果你的“第二张露出一半”指露出半张卡

```text
visibleNext = 87.5
GAP = 375 - 175 - 87.5 = 112.5
SLOT = 287.5
```

这时卡片间距会是 112.5dp，不再是常规的 16dp。

#### C. 如果保留 20dp 左边距

```text
visibleNext = 375 - 20 - 175 - 16 = 164dp
```

这会比“无 padding”方案少 20dp，且首卡视觉上与页头对齐。

> 结论：**“175 宽 + 16 间距 + 第二张露出半张卡（87.5）”三者不能同时成立。** 需要你确认“露出一半”是“半个屏幕（184）”还是“半张卡（87.5）”。我建议按半个屏幕理解，这样与 175/16/no-padding 的 375 例子完全一致；若你坚持半张卡，我会把 GAP 改为 112.5，视觉上会变成明显的单卡 + 大片留白。

### 3.4 目标布局契约（确认后按此实现）

```text
FlatList:
  horizontal
  showsHorizontalScrollIndicator={false}
  snapToInterval={191}
  snapToAlignment="start"
  decelerationRate="fast"
  contentContainerStyle={{ paddingHorizontal: 0 }}
  ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
  style={{ width: '100%', height: 235 }}
  onScroll={Animated.event(..., { useNativeDriver: Platform.OS !== 'web' })}
  scrollEventThrottle={16}

卡片:
  width: 175
  height: 235
  flexGrow: 0
  flexShrink: 0
  borderRadius: 22
  不使用 width: '46%'
  不使用 flex: 1
  不使用 alignSelf: 'stretch'
```

视差：

```text
inputRange  = [(i-1)*191, i*191, (i+1)*191]
outputRange = [0.9, 1, 0.9]
extrapolate = 'clamp'
transform   = [{ scale }]
```

说明：

- scale 只改变视觉大小，不改布局宽度；第 2 张的 184dp 可见宽度由**未缩放的 175 + 16 布局**决定。
- `snapToInterval` 必须等于 `SLOT`，不能再用百分比宽度或动态 `flex` 计算，否则滚动吸附点会漂移。
- `Tasks` 标题在首屏可见的约束：卡片区总高 235，Dash 标题在上方，实测 390×844 下 Tasks 标题 y≈504；保留 `contentContainerStyle.paddingBottom: 120` 给底栏留白。

### 3.5 当前实现与目标的差异

| 项目 | 当前 | 目标 |
|---|---|---|
| 卡片尺寸 | 175×235 | 175×235（不变） |
| 卡片宽度来源 | 固定常量 | 固定常量 + wrapper 固定 width |
| 列表横向 padding | `20` | `0`（按“容器不设 padding”） |
| `SNAP_INTERVAL` | 191 | 191 |
| 第二张在 375 的可见宽度 | 164（有 20 padding） | 184（无 padding） |
| 视差缩放 | 0.9 / 1 / 0.9 | 保持不变 |
| 宽度 flex | 无 | 明确禁止 |
| 首卡左边距 | 20 | 0（待确认是否要 20） |

---

## 4. 按文档修改时的范围（不在本轮执行）

1. **搜索状态机**：把“输入即查”改为“回车提交”；新增 `search_history` 读取/写入；空态只显示历史；结果仍在 Overlay。
2. **全屏层级**：确认是否需要 Root portal/透明 Modal 覆盖底栏；如果需要，搜索状态从 Home 上移到 Root 级 Provider，但**仍然不是路由**。
3. **Dash 几何**：移除 `contentContainerStyle.paddingHorizontal:20` 和 `SIDE_PADDING` 对视口的干扰，按 3.4 的固定参数实现；确认“半屏”还是“半卡”。
4. **测试**：更新 `tests/p5-home.test.ts`、`tests/s3-dash.test.ts`、`tests/s5-module-m1.test.ts`、`tests/s8-module-m5.test.ts`，新增搜索历史用例；更新 E2E 的搜索提交/结果点击。
5. **不改**：SQLite 作为唯一事实来源；`useDataVersion` 事件机制；`day/[date]`、`fitness?date` 的二级页承载方式。

## 5. 审核问题（请你拍板）

1. **搜索 Overlay 是否需要覆盖底栏**？
   - 需要：改为 Root portal/Modal，真正全屏；
   - 不需要：保留当前 Home 内绝对定位层。

2. **“第二张露出一半”指什么**？
   - A. 半个屏幕（375 下约 184dp）：采用 `CARD=175, GAP=16, LEADING=0, SNAP=191`；
   - B. 半张卡（约 87.5dp）：采用 `CARD=175, GAP=112.5, SNAP=287.5`。

3. **首卡是否需要 20dp 左边距**？
   - 你要求“容器不设 padding”，则首卡贴左、第二张可见 184dp；
   - 若要和页头 20dp 对齐，则 `LEADING=20`，第二张可见 164dp，需要重新约定“露出一半”的口径。

4. **搜索历史是否持久化到 SQLite**？
   - 建议是：新增 `search_history` 表，按关键词去重、按最近时间排序、最多 10 条；
   - 若只要本次会话历史，可改为内存，但重启会丢失。

> 以上确认后，我再按第 3.4 节和搜索状态机改代码；在确认前不改动实现。