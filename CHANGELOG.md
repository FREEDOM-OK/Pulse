# 版本日志（文本记录）

> 规则（用户约定）：
> - 小改动只升补丁版本，**只写在这个文件里**，不改 App 内显示的版本号、不弹任何更新日志。
> - 只有用户明确说「进入下一个大版本」时才动 App 内的版本号/日志。当前 App 内版本为 1.2.2（用户在 2026-11-11 明确要求定为 1.2.2）。

## v1.2.11 — 2026-11-12

### 自然周日期条 / 课程地点 / 统一下拉 / 课程颜色

- `DateStrip` 改为自然周整页翻动：固定显示周一到周日 7 天，横向 3 页（上周 / 本周 / 下周），`pagingEnabled` + `onMomentumScrollEnd` 一次翻一周；Web 端补充 `onScroll` 140ms 防抖兜底并由 `handledPage` 去重；翻页后保持当前星期几，选中态、今天描边、记录圆点与日历入口均保留。
- 首页与计划页的课程行统一追加地点：`meta = [periodLabel, course.time, course.room].filter(Boolean).join(' · ')`，例如 `第 2-3 节 · 08:55 - 10:45 · w201`；`TodayItemCourse` 与 `courseToTodayItem` 同步补 `room`。
- 首页移除原生 `RefreshControl`，iOS/Android 统一用 `PanResponder`：顶部向下拉动整页 `translateY`（0..120），标题仅左侧文字列按 `1 → 1.2` 放大并轻微上提，右侧头像不缩放；松手未过阈值立即 spring 回位，过 64 则刷新，数据加载完再弹回，全程无转圈。Web 端 `pullWrap` 加 `userSelect: 'none'`，避免选中文字抢走手势。
- 课程圆点改为读取课表数据库 `course.color`，并通过 `getTimetableSettings().saturation` + `softenColor` 与课表卡片使用同一饱和度；首页 8dp、计划页 10dp，课程行不再硬编码 `#4CD964`。
- 文件：`src/components/ui/date-strip.tsx`、`src/components/today/course-row.tsx`、`src/components/today/today-list.tsx`、`src/app/(tabs)/index.tsx`、`src/lib/today-sort.ts`、`src/lib/today-items.ts`。

### 测试

- 更新 `tests/p5-home.test.ts`（无 `RefreshControl`、`userSelect`、标题 `transformOrigin`、课程地点/颜色、下拉 `.finally`）、`tests/s5-module-m1.test.ts`（自然周三页、`onScroll` 兜底、`handledPage`）、`tests/s8-module-m5.test.ts`（两端统一下拉）、`tests/p3-today-items.test.ts`（`room`）。
- `npm run verify` 通过：37 个测试文件 / 253 条用例、`tsc --noEmit`、`expo lint`。
- E2E 9 个 UI 场景全部通过。Web 390×844 实测：日期条 7 天不溢出，左滑后从 11-09…11-15 翻到 11-16…11-22，标题变为 `11月19日 周四`；下拉整页下移、标题放大且不被裁切，无转圈。

App 内显示版本仍为 1.2.2，不弹更新日志。

## v1.2.10 — 2026-11-11

### 首页数据镜像 / 完成项沉底 / 下拉刷新 / 沉浸搜索

- 首页 Tasks 不再过滤备忘：移除 `onlyTasksAndCourses` 过滤，直接使用 `buildTodayItems` 的课程 + 任务 + 备忘。课程保持 8dp `#4CD964` 圆点、无复选框；任务使用 20×20 / 圆角 6 / `#8E8E93` 边框；备忘保持灰色圆点、无复选框。`MemoRowItem` 新增 `titleColor` / `metaColor` / `dotColor`，首页固定黑/灰配色，深色模式下也不会白字白底。
- 删除“已完成 N 项”折叠：`flatItems = [...sorted.active, ...sorted.completed]` 后平铺渲染，完成项保留划线/变灰并自动沉到列表末尾；不再有折叠分组和 `completedOpen` 状态。设置里的“隐藏已完成”仍然生效。
- 恢复下拉刷新与标题放大：`Animated.ScrollView` 在 iOS/Android 都挂 `RefreshControl`；iOS 用 `scrollY` 的 `[-180, 0] → [1.2, 1]` 驱动标题，Android 用 `pull` 的 `0..120 → 1..1.2` 驱动标题，同时把整页内容包在 `contentTransform` 里一起下移；松手 spring 归位，标题只额外放大，不会再压住 Search / Dash / Tasks。Android 在顶部捕获向下垂直手势，避免 TextInput 截断下拉。
- 搜索栏改为完整沉浸式动画：聚焦时搜索条 250ms `Easing.bezier(0.25, 0.1, 0.25, 1)` 上移到 `insets.top + 8`，全屏 `#F7F7FA` 面板淡入，标题与 Dash/Tasks 整体淡出并禁用触摸；筛选按钮变成 34×34 圆形 X（`关闭搜索`），失焦后反向淡入归位、恢复滚动。搜索框保持白底、16 圆角和原阴影，不随背景一起淡出。
- 文件：`src/app/(tabs)/index.tsx`、`src/components/today/today-list.tsx`、`src/components/today/memo-row.tsx`、`src/lib/today-sort.ts`。

### 测试

- 更新 `tests/p5-home.test.ts` 与 `tests/e2e/home.e2e.mjs`、`tests/e2e/today.e2e.mjs`：覆盖备忘镜像、完成项平铺沉底、无“已完成”分组、搜索吸顶/背景淡出/关闭复位、首页↔计划页双向同步。
- `npm run verify` 通过：37 个测试文件 / 253 条用例、`tsc --noEmit`、`expo lint`。
- E2E 9 个 UI 场景全部通过。Web 500×1000 实测：搜索框 y=100 → 8 → 100；首页同时显示任务 A、任务 B、备忘 C，勾选任务 A 后顺序为备忘 C → 任务 B → 任务 A，且无“已完成”分组。

App 内显示版本仍为 1.2.2，不弹更新日志。

## v1.2.9 — 2026-11-11

### 首页紧急修复（任务同步 / 菜单排版 / 搜索吸顶）

- 首页与计划页共用同一份任务数据：`TodayList.handleToggleTask` 在 `toggleTask` 落库后调用 `bumpDataVersion()`，两个 Tab 的列表都会重新读取 SQLite；首页勾选后计划页立即显示完成态，计划页取消后首页也同步恢复。
- 新建菜单项固定 `height: 56`、左对齐、禁止 flex 拉伸；取消项固定 `height: 52`。菜单卡片增加 `maxHeight: 80%` 与 `flexGrow: 0`，不会再被内容撑成异常比例。
- `AppButton` 改为固定 `height: 38` + `paddingHorizontal: 16` / `paddingVertical: 8`，取消 `minHeight` 的弹性空间；任务表单的 `actionsRow` 保持横向、右对齐、`nowrap`，取消/保存不再被纵向拉长。
- 首页搜索框改为真实 `TextInput`，聚焦时用 250ms `Easing.bezier(0.25, 0.1, 0.25, 1)` 平滑上移到安全区下方（`insets.top + 8`），标题淡出；失焦弹回原位并恢复标题。聚焦期间禁用页面滚动，Web 端隐藏默认焦点描边。
- 文件：`src/app/(tabs)/index.tsx`、`src/components/today/today-list.tsx`、`src/components/ui/action-menu.tsx`、`src/components/ui/app-button.tsx`、`src/components/ui/modal-sheet.tsx`。

### 测试

- 更新 `tests/p5-home.test.ts`（任务版本广播、菜单/按钮固定高度、搜索聚焦动画）与 `tests/e2e/home.e2e.mjs`（搜索吸顶/复位、首页↔计划页双向同步）。
- `npm run verify` 通过：37 个测试文件 / 253 条用例、`tsc --noEmit`、`expo lint`。
- E2E 9 个 UI 场景全部通过；Web 500×1000 实测搜索框 y=100→8→100，菜单项 56、取消 52，表单按钮恢复 38 高。

## v1.2.8 — 2026-11-11

### 首页下拉刷新 / 竖版卡片 / 课程+待办数据打通

- 首页保持单一 `Animated.ScrollView`：iOS 使用原生 `RefreshControl`，Android 下拉时把整页内容一起 `translateY`，标题仅额外放大到 1.2；松手 spring 归位，标题不再单独位移压住卡片。
- Dash 改为 150×190 竖卡、圆角 22；分类图标在左上、圆形箭头在右上，标题 18 / 副标题 11。卡片间距收到 10，390 宽屏幕下第二张完整候场、第三张右侧露出约 42dp；`snapToInterval` 左对齐，未激活卡片缩到 0.9。
- 首页 Tasks 改为读取计划页同一份 SQLite 数据，只过滤备忘、保留课程+待办：课程显示 8dp `#4CD964` 圆点、无复选框；待办使用 20×20 / 圆角 6 / 1.5 边框 `#8E8E93` 的方形勾选，完成后黑底白勾。行距 16。
- 添加任务弹窗补 `KeyboardAvoidingView` 与可收缩滚动区：卡片 `maxHeight: 100%`、正文 `flexShrink: 1`、头尾固定，矮屏/键盘弹出时不再裁掉“取消 / 保存”。390×844 与 390×500 实测完整显示。
- 文件：`src/app/(tabs)/index.tsx`、`src/components/home/dash-card.tsx`、`src/components/home/dash-carousel.tsx`、`src/components/today/today-list.tsx`、`src/components/today/task-row.tsx`、`src/components/today/course-row.tsx`、`src/components/ui/check-mark.tsx`、`src/components/ui/modal-sheet.tsx`。

### 测试

- 更新 `tests/p5-home.test.ts`、`tests/s1-tokens.test.ts`、`tests/s3-dash.test.ts`、`tests/s8-module-m5.test.ts`。
- `npm run verify` 通过：37 个测试文件 / 251 条用例、`tsc --noEmit`、`expo lint`。
- E2E 9 个 UI 场景全部通过（含 P6 首页、P6b 卡片管理）。Web 390×844 实测：首卡 150×190，第二张 135×171，第三张从 x=348 开始、右侧可见 42dp。

## v1.2.7 — 2026-11-11

### 首页重构（头部 / Search / Dash 吸附轮播 / Tasks）

- 首页改为纯白 `Animated.ScrollView`，`contentContainerStyle` 固定 `paddingBottom: 120`；顶部用 `insets.top + 20`，左右 20。头部左侧问候 + 日期，右侧 44×44 圆头像。
- 新增 50dp 高 Search 条：白底、16 圆角、`shadowOffset(0,4)` / 0.06 / 12 / `elevation: 4`；左侧搜索图标与占位文字，右侧 34×34 浅色筛选按钮。
- Dash 改为 `Animated.FlatList` 横滑：卡片宽 72% 屏宽、高 200、间距 16、圆角 24；`snapToInterval` + `snapToAlignment="start"` + `decelerationRate="fast"`；`scrollX` 驱动 `[0.85, 1, 0.85]` 视差缩放。
- Tasks 复用 `TodayList`，新增 `onlyTasks` / `rowSpacing` / `showSeparators` / `showAddRow` / `checkShape` / `checkBorderColor`；首页只列任务，22dp 圆形未选框（#CCCCCC），行距 16。
- `CheckMark` 支持 `shape="circle"`，计划页默认方形不变；保留 DashStack 管理开关、安卓下拉拉伸、卡片跳转与个人资料入口。
- 首页固定浅色体系：`TodayList` / `TaskRow` / `EmptyState` 新增可选显式文字色，深色模式下任务标题、备注、时间与空态仍为黑/灰，不会出现白字白底。
- 文件：`src/app/(tabs)/index.tsx`、`src/components/home/dash-carousel.tsx`、`src/components/today/today-list.tsx`、`src/components/today/task-row.tsx`、`src/components/ui/check-mark.tsx`、`src/components/ui/empty-state.tsx`。

### 测试

- 更新 `tests/p5-home.test.ts`、`tests/s3-dash.test.ts`、`tests/s1-tokens.test.ts`、`tests/s2-tab-bar.test.ts` 与 `tests/e2e/home.e2e.mjs`（问候语、完成分组、首页 120dp 留白）。
- `npm run verify` 通过：37 个测试文件 / 250 条用例、`tsc --noEmit`、`expo lint`。
- Web 实测（500×1000）：头部 x=20、Search 460×50、Dash 卡 360×200、第二张从 x=396 露出；9 个 E2E 场景全部通过。

## v1.2.6 — 2026-11-11

### 底栏修正（遮挡 / 杂色 / 尺寸 / 动画）

- 胶囊改为绝对定位贴底（`zIndex: 999`），最外层 `backgroundColor: 'transparent'` + `pointerEvents="box-none"`，只让胶囊本身接收点击，左右透明区不再拦截背后列表；触发区域固定 `bottom: 0`，底部留白 `20 + insets.bottom`。
- 胶囊高度收到 66、圆角 33；5 个入口全部 56×56 且在同一水平线，中间加号改为 42×42 / 圆角 21 的黑底白 +，不再有任何元素冲出胶囊。
- 选中指示器改为 52×46 / 圆角 23 的 `#F2F2F7` 块，在 56 槽内水平居中，留出更紧的图标文字包裹感。
- 动画由约 500ms 拖尾的 Spring 改为 `withTiming` 250ms + `Easing.bezier(0.25, 0.1, 0.25, 1)`；Web 实测首次落位 263ms、热切换 275ms，无过冲、无反复回弹。
- 滚动页统一补 `TAB_BAR_CLEARANCE + insets.bottom`（约 100 + 安全区）的底部留白：首页、计划、我的、健身第三格、日历第三格。`src/components/nav/app-tab-bar.tsx` 及各页。

### 测试

- `tests/s2-tab-bar.test.ts` 更新为 66/33、42 加号、52×46/23、绝对定位 + `zIndex: 999` + 透明 + `box-none`、100dp 留白、250ms 贝塞尔等断言。
- Web 实测（500×1000）：胶囊 460×66、5 槽均 y=919、42 黑圆 y=926、指示器 52×46；真实鼠标点击可切到第三格，点击胶囊外透明区不导航。
- `npm run verify` 通过：37 个测试文件 / 250 条用例、`tsc --noEmit`、`expo lint`。

## v1.2.5 — 2026-11-11

### 底栏改版（悬浮胶囊）

- 底栏改为悬浮纯白胶囊：左右各留 20、固定高 68、圆角 34；底部留白 `20 + insets.bottom`。保留原阴影参数并加 Android `elevation: 8`。
- 4 个真实 Tab 与中间「新建」共 5 个平级槽位，`space-evenly` 排布，点击区统一 56×56，全部位于底座内部；中间加号改为 44×44 黑底白 + 实心圆，不再用负 `marginTop` 凸出。
- 选中态改为底座内绝对定位的 56×48、圆角 24 的 `#F2F2F7` 指示器，监听 activeIndex 用 Reanimated Spring（`damping: 16, stiffness: 120`）横滑；图标/文字以 180ms 淡入从 `#8E8E93` 过渡到 `#000000`，字号 10。
- 第三格选课表仍直接 `router.push('/timetable')`；新建菜单、任务/备忘/事件表单及「新建」无障碍标签保持不变。`src/components/nav/app-tab-bar.tsx`。

### 测试

- `tests/s2-tab-bar.test.ts` 更新为新规格断言（68/34、56、44、5 槽、Spring 参数、安全区、`#F2F2F7`、180ms 淡入）。
- Web 实测：底座 460×68（500 宽视口）、5 槽均在 y=918、加号不越界；切到「计划」后指示器落到 x=136。
- `npm run verify` 通过：37 个测试文件 / 248 条用例、`tsc --noEmit`、`expo lint`。

## v1.2.2 — 2026-11-11（App 内版本定为 1.2.2）

> 说明：本文件此前已有 v1.2.2 / v1.2.3 / v1.2.4 三条记录（历史内容保留在下方不动）。用户本次要求「App 内版本定为 1.2.2」，
> 因此 `app.json` / `package.json` / 我的-关于 / 课表设置-关于 统一改为读取 1.2.2，App 内不再出现 1.0.0。
> 除课表「设置 → 关于」那一行外，本次不修改课表任何功能（用户明确说课程表已满意）。

### 版本

- `app.json`、`package.json` 的 `version` 改为 `1.2.2`。
- 「我的 → 关于」的兜底版本号同步为 1.2.2（`src/app/(tabs)/settings.tsx`）。
- 课表「设置 → 关于」由硬编码 `1.0.0` 改为读 `Constants.expoConfig?.version`（`src/app/timetable/settings.tsx`，本次唯一触碰课表的改动）。

### 日期条（M1）

- 点日期不再把选中的那天滑到屏幕中间：去掉「换值就重挂 ScrollView 并居中」的实现（`key={value}`），只在首次进入、以及从日历跳到远处日期时居中一次。`src/components/ui/date-strip.tsx`。

### 健身（M1）

- 已完成的训练卡比进行中的更高（`set-record-row.tsx` 行高 `minHeight: 70`、序号圆点 24，与原卡片留白呼应）。

### 滚轮选择器（M1）

- 灰色高亮条固定钉在中间行，数字从后面滚过；上下行文字按距离淡出，不再出现「高亮跟着内容跑」。`src/components/ui/wheel-picker.tsx`。

### 底部抽屉（M2）

- 抽屉支持半屏 / 全屏两档（`size="half" | "full"`），遮罩独立淡入，不再跟着抽屉一起从屏幕底下滑上来（`animationType="none"` + 两段式动画）。`src/components/ui/bottom-sheet.tsx`。

### 底栏第三格 ↔ 二级页（M3）

- 底栏第三格现在可以放健身、课表、日历三者之一：放进第三格的那个模块带着底栏作为「第 3 页」打开，其余的两个从首页 Dash / 我的进入时是二级页（无底栏）。
- 二级页统一用新的 `SubPageHeader`：最左 36×36 圆形描边返回按钮，标题右移，不再占用一整条系统导航栏高度。
- 课表按用户要求保持原样：第三格选中课表时仍直接进入课表页（课表页没有底栏），第三方页面逻辑不抽到课表上。
- `src/app/(tabs)/middle.tsx`、`src/app/fitness.tsx`、`src/components/fitness/fitness-screen.tsx`、`src/components/calendar/calendar-screen.tsx`、`src/components/nav/sub-page-header.tsx`。

### 首页 Dash（M4）

- 卡片改为竖版（宽 264、高 = 宽 × 1.618 ≈ 427），标题区不再固定占 30% 屏高，Dash 行紧贴标题栏。
- 所有卡片统一样式：取消「第一张深色主卡」的 `tone` 区分，文字颜色按卡片底色自动判深浅。
- 堆叠模式改为向下堆叠、下方露出 2 张、侧边微错位；横滑模式一次一张居中，离开中心的卡片轻微缩小。
- `src/components/home/dash-card.tsx`、`dash-carousel.tsx`、`dash-stack.tsx`、`src/constants/theme.ts`（`DashCardSize` / `DASH_CARD_RATIO` / `dashCardHeight`）。

### 安卓下拉拉伸（M5）

- Android 没有 iOS 的橡皮筋效果，改为在首页顶部用 `PanResponder` 接管下拉：标题随手指下移并轻微放大，松手回弹。iOS 仍用原来的滚动插值。

### 动效（M6，仅做按压回弹）

- `RipplePressable` 按下缩到 96% 并保留波纹，松开用弹簧回到 100%（`bounciness: 6`）。
- 勾选描边、弹性开关、数字滚动等纯视觉项按计划列为可选，未在本轮改动，留待单独排期。

### 测试

- 新增 `tests/s5-module-m1.test.ts`、`tests/s6-module-m2.test.ts`、`tests/s7-module-m3.test.ts`、`tests/s8-module-m5.test.ts`、`tests/s9-module-m6.test.ts`，并同步 `p0-navigation` / `p2-tabs` / `s1-tokens` / `s2-tab-bar` / `s3-dash` / `s4-polish` / `p5-home` 的旧断言。
- E2E 基础设施：`page.gotoFresh(url)` 用 `?resetDb=1` 清库再回到干净地址（此前清库后下一次刷新会把旧库写回）；课表场景用它从「只有播种课表」的状态开始。

## v1.2.4 — 2026-11-11

修复用户反馈的 4 个课表问题（只改课表相关文件）。

### 课表

- 修 `UNIQUE constraint failed: sched_courses.id`：保存课程改为单条 upsert（`ON CONFLICT(id) DO UPDATE`），不再靠「列表里有没有这门课」猜 INSERT/UPDATE；双击保存、状态未刷新时重复保存都不会再撞主键。
- 修「添加完课程会闪退回首页」：`course.tsx` 的保存回调加单飞锁 + try/catch，失败就地弹「保存失败：…」，成功才返回；抽屉的复制/删除、课表切换、导入、删课表也全部兜住写库异常，未捕获的 Promise 拒绝不会再崩页面。
- 修「点进课表卡一下」：`TimetableProvider` 从课表子路由上移到 `src/app/_layout.tsx`，课表数据在启动时就热好；横向列表只渲染可视页（`initialNumToRender` / `maxToRenderPerBatch` 为 1，`windowSize` 3）。
- 修「左右滑动翻周抽搐、自动来回滚」：分页宽度改用容器 `onLayout` 实测值（窗口宽度与实际容器宽度不一致时每次翻页都差几像素，Android 上会自己弹）；程序化翻周期间屏蔽 `onMomentumScrollEnd` 回写并加半屏容差，消除「滚动 → 回写周次 → 再滚」的回环；新增 `disableIntervalMomentum` 保证一次只翻一页。
- 网页端补回写：RN-web 不派发 momentum 事件，改为滚动停止 160ms 后按最终位置更新周次（Android 仍走 momentum 事件）。

### 测试

- `tests/a1-timetable-v7.test.ts`：同一 id 重复保存断言走 upsert 且只留 1 行。
- `tests/e2e/timetable.e2e.mjs`：保存当天课程后若弹出「冲突确认」自动点「仍然保存」。

## v1.2.3 — 2026-11-10

课表功能移植收尾（只改课表相关文件，首页 / 健身 / 游戏 / 我的未动）。

### 课表

- 今日计划里点课程进课表时，自动切到本周并打开该课程的详情抽屉（此前传了参数但页面没接收，点了没反应）。
- 课表增删改、切换课表、改外观设置后，首页与今日计划立即刷新，不再需要手动切页。
- 保存课程改为事务写入：失败不会留下「有课程没时段」的半门课。
- 同一课程同一天的两个不同时段不再互相覆盖（v8 迁移放宽了唯一约束）。
- 课表所有可点区域补齐无障碍标签，UI 自动化可稳定定位。

### 数据

- schema v8：删除 `idx_sched_sessions_conflict`（`UNIQUE(course_id, day_of_week, start_period)` 会静默吞掉同起始节的第二段），改为非唯一索引 `idx_sched_sessions_course`；`BACKUP_VERSION` 随之为 8。

### 测试

- 重写 `tests/e2e/timetable.e2e.mjs`：设置页、课表管理、饱和度跨刷新持久化、多时段表单、详情抽屉、翻周与回到本周、今日计划深链、文本导入。
- 新增回归用例：同一课程同一天保存两个同起始节的时段。

### 清理

- 删除无引用的 `src/lib/course-form.ts`、`src/lib/course-copy.ts` 与旧的失败截图。

## v1.2.2 — 2026-11-09

按 `PRDv1.2.2.md` / `IMPLEMENTATION_PLAN_v1.2.2.md` 完成的体验改版（MVP 范围）。

### 数据

- schema v6：课程新增底色样式（纯色 / 网格 / 斑马纹），备份随版本升级。
- 新增设置项：第三个标签（健身 / 课表）、Dash 模式（滑动 / 堆叠）、卡片样式（默认 / 自定义色 / 卡通）、卡片主色、隐藏已完成。

### 底栏

- 当前页改为跟随滑动的胶囊高亮，去掉原来的小圆点；整条底栏上移 8pt，凸起 `+` 位置不变。
- 第三个标签可在「健身」与「课表」之间切换；「我的」页常驻健身 / 课表 / 日历三个快捷入口。

### 首页

- 「万事卡」改名为 `Dash`，标题区与卡片区按 3:7 划分，标题区下拉有回弹放大。
- 卡片改为 264×163 黄金比矩形，去掉纹理、边框与渐变；每次滑动只走一张并带回弹吸附。
- 支持卡片堆叠模式：划走顶层卡片后追加到队尾。
- 支持卡通样式：四个图案全部用线性描边绘制，不引入新依赖。

### 今日 / 健身 / 我的

- 日期条给今天加 1.5pt 描边；勾选后对勾停留 200ms 再移入已完成；可在个性化里隐藏已完成。
- 任务列表逐条淡入上移（只播一次，尊重「减弱动效」）。
- 健身页顶部显示当日「N 组」，日历入口移到添加按钮左侧并同高；完成一组后对勾 2.5 秒消失。
- 个人资料生日改为滚轮选择；设置里新增「个性化」与卡片样式子页。

### 课表

- 课程改为整页表单：名称、老师、地点、颜色、底色样式、周次、节次、备注，右上角保存。
- 点课程块打开详情抽屉：备注可直接写，编辑按钮大于删除，支持复制课程、仅本周 / 所有周删除与恢复本周。
- 课程块支持纯色 / 网格 / 斑马纹三种底色。

## v1.2.0 — 2026-11-09

按 `PRDv1.2.md` / `IMPLEMENTATION_PLAN_v1.2.md` 完成的界面与数据改版。

### 导航

- 底部改为 4 个 Tab（首页 / 计划 / 健身 / 我的），中间新增凸起 `+` 按钮。
- `+` 打开新建操作卡：新建任务、新建备忘、记重大消费、记重大购物、记今日好饭。
- 游戏从 Tab 移到二级页 `/games`，功能与数据不变；`设置` 改名为 `我的`。

### 今日计划

- 头部日期行 + `Today` 大字 + 黑色胶囊日期条（去掉左右箭头，选中项自动居中）。
- 混合列表：计划条（方形勾选）、备忘条（圆点，长按置顶/编辑/删除）、课程派生行（点击跳课表）。
- 已完成任务沉底折叠为「已完成 N 项 ›」；列表尾部「＋ 新建」可建任务或备忘。
- 进入与切换日期有轻量转场动画。

### 课表

- 新增 `/timetable`：周网格、`‹ 第 N 周 ›` 与「回到本周」、只工作日 / 含周末切换。
- 课程支持多时段、单双周、颜色与冲突检测；首次进入有三步引导。

### 首页

- 改为单页纵向滚动：问候 + 日期 + 头像 → 万事卡 → Tasks，去掉上下翻页与内嵌日历。
- 万事卡横滑，第一张是深色主卡，尾部虚线「添加卡片」；下方页码点。

### 卡片管理 / 我的

- 新增 `/cards`：长按拖动排序、开关卡片、恢复默认，至少保留一张。
- `我的` 页新增「首页卡片」「列表排序」；账号区域改为点击进入个人资料。

### 数据

- schema 升到 v4：任务增加置顶；新增备忘、课程、课程时段三张表。
- 备份升到 v4，含备忘与课表；继续兼容 v1/v2/v3 备份导入。
- 旧的「快速备忘」转为今天一条置顶备忘后移除。

## v1.0.1 — 2026-11-08

从最初基线到现在的全部改动汇总（此前没有文本版日志，这里一次性补齐）。

### 游戏

- 「玩了」的游玩时长改为滚轮选择，默认 0，往下滑依次是 1、2、3…（`play-form.tsx` + `duration-wheel.ts`）。
- 新增游玩日期，默认当天日期、只选日期不选时间（`played-date.ts`）。
- 想玩清单 ↔ 已玩记录支持左右滑动切换（`games-tab.ts` 的 `isTabSwipe` / `tabAfterSwipe`）。
- 升级为带跟随动画的翻页：两页内容跟着手指平移，顶部页签指示框按同一进度移动，松手吸附到最近页；拖动时禁止选中文字（`userSelect: 'none'`）。
- 想玩行、已玩卡片改为长按弹出菜单（编辑 / 删除），不再用左滑。

### 健身

- 设置页可配置健身默认次数 / 默认重量，新增动作时自动套用，仍可手动改。
- 已完成的每一组支持删除（先左滑，后统一改成长按菜单），删除前二次确认。
- 动作库新增「自定义类」，自定义动作可设置「按组计 / 按时间计」，有氧类按运动时间记录。
- 内置 44 个基础必备动作（胸 7、背 7、腿 7、肩 5、手臂 5、核心 6、有氧 7），清空全部数据也不会删掉这些预置动作。
- 待训练动作跨日期常驻：不再只属于某一天，哪一天都能练；组号按天重新从 1 开始。
- 日期条和月历在「有记录」的日子下面显示彩色小圆点（健身 / 计划 / 饮食 / 游戏各一种颜色）。
- 待训练卡片右下角显示练的部位（练胸 / 练背 / 练有氧…，自定义动作显示「自定义」）。
- 去掉右下角悬浮「＋」，改为右上角「添加」按钮；标题只在当天显示「今日」。
- 修复 `getDayExercises` 漏取 driver 导致的崩溃（日历回顾 / 首页当天明细会报 ReferenceError）。

### 今日计划 / 首页

- 今日计划、日历里有点的日子与健身一致显示小圆点。
- 计划条目改为长按菜单（编辑 / 删除）；**点击条目本体直接标记完成 / 取消**，不再进入编辑。
- 首页去掉「今天」大字，改为日期大字（如「11月7日」）+ 下面一行星期小字。

### 设置 / 备份

- 修复导入备份时安卓只显示 md/txt、看不到 .json 的问题：安卓文件选择器放开为 `*/*`，读入时去掉 BOM，导入只校验内容是不是合法 JSON（不认扩展名，改名成 .md 也能导入）。
- 导出仍是 JSON（`生活App备份-YYYY-MM-DD.json`），导入导出格式统一。

### 界面

- 删除全部左滑操作，统一改为长按 0.4 秒弹出居中的操作卡（`action-menu.tsx`），卡片宽度统一、不再随内容长短变化。
- 长按菜单的遮罩改成响应者手势关闭，修掉 Web 上「松手后浏览器补发 click 导致菜单立刻消失」的问题。

### 工程 / 测试

- 新增 `npm run verify`：一次跑完 单测 → tsc → lint（`scripts/verify.mjs`）。
- 单测从 91 项增加到 111 项；E2E 7 个场景（无头 Chrome，`tests/e2e/run.mjs`，可加参数只跑某个场景）。
- 约定并写入 `AGENTS.md`：「手势 + Web 模拟」类交互（滑动 / 拖拽 / 长按 / 翻页）不做自动化测试，交给真机手动验证；任何测试连续两轮失败或无结果就跳过并说明原因。
- 文档 `docs/screenshots` 按新界面重新生成；README 功能表同步更新。

## v1.1.0（版本号待你确认）— 2026-11-08

按 `PRDv1.1.md` 完成的页面与数据改版。

### 导航

- 删除「饮食」Tab，底部改为 5 个：首页 / 今日计划 / 健身 / 游戏 / 设置。
- 新增二级页 `/profile`（个人资料）。

### 首页

- 改为上下两页、跟手翻页：第二页随手指实时上移，松手按「拖过 18% 或快速甩动」翻页，否则回弹（`src/lib/home-pager.ts` 的 `resolvePagerTarget`）。
- 第一页：`Hi，用户名` + `今日是 M 月 D 日`（星期几略小）；今日计划框（内部滚动、点条目标记完成、右上「完成 X/Y ›」）占两格，左右并排「添加事件」「去健身」，通栏「游戏」，四框铺满一屏、无外层滚动。
- 第二页：完整日历回顾（与 `/calendar` 共用 `calendar-panel.tsx`），顶部「⌃」整行点击或下拉回第一页；安卓返回键在第一页时先回第一页。
- 今日计划框滚动到顶 / 底后，继续上下拖才交给翻页；内容不足一屏时直接翻页。

### 事件

- 首页「添加事件」→ 屏幕正中选卡（重大消费 / 重大购物 / 今日好饭 / 取消）→ 居中表单。
- 只有名称必填；金额可空、可小数（`parseAmount` / `formatAmount`，空值不显示 ¥、显示时去掉多余 0）；备注可选；日期固定为当天。
- 第一版只支持添加与查看，在首页第二页 / 日历里按天展示。

### 个人资料

- 设置页顶部账号区：圆形头像 + 用户名，无任何提示文字；长按进入 `/profile`。
- 资料页可改头像（相册选图，复制到 App 私有目录）、用户名（1–16 字，默认「用户」）、性别（男 / 女 / 保密）、生日（年 / 月 / 日三框，三项可全空，只存不显示）。
- 保存后设置头部和首页问候立即更新；新增依赖 `expo-image-picker`。

### 数据与备份

- schema v3：新增 `events(date,type,title,amount,note,created_at)`；`diet_records` 每行转成 `type='meal'` 事件后删除；`memos` 表删除；新增 `profile.name/gender/birthday/avatar` 设置。
- 备份 v3：含 `events` 与设置（含资料，不含头像文件）；兼容导入 v1/v2（`dietRecords` 转事件、`memos` 忽略）。
- 导出只含自定义动作；预置 44 个动作导入后自动补种。
- 清空数据会连个人资料一起重置并删除头像文件，仍保留 44 个预置动作。

### 删除

- 饮食整套：页面、表单、行组件、`repositories/diet.ts`、类型、测试。
- 备忘整套：首页卡片、表单、`repositories/memos.ts`、校验函数。
- 首页「查看完整日历回顾」入口（改为第二页内嵌）。

### 测试

- 单测 127 项（新增 events / profile / format / avatar / 翻页判定，迁移用例覆盖 v2→v3）。
- E2E 仍为 7 个场景（新增个人资料）；长按改用鼠标事件、坐标助手先 `scrollIntoView`；场景顺序改为 P2 → P3 → P5 → P7 → P6 → P8 → P8b。

## v1.1.1 — 2026-11-08

### 首页

- 问候语「Hi，用户名」和日期一行字号加大。
- 「添加事件」「去健身」两个方框里的文字改为水平 + 垂直居中。
- 今日计划框内文字加大（任务标题 16px，勾选框与时间 15px）。
- 今日计划框下面新增「备忘录」框：点开居中卡片编辑，保存在 settings 的 `memo.quick`，会跟着备份导出/导入；留空保存等于清空。
- 游戏框缩小，内容改成想玩清单（「想玩 N 款」+ 前三个游戏名），不再显示最近游玩。
- 每次回到首页自动回到第一页（第二页只用于临时看日历）。

### 导航

- 进入「今日计划」和「健身」时自动回到当天，不再停留在上次翻到的日期。

### 设置

- 点用户名直接进入个人资料页，不再需要长按。

### 测试

- 新增 `tests/p6-memo.test.ts`（5 项：默认空、去空白、覆盖、留空清空、超长截断）。
- E2E 首页场景补充备忘录保存/刷新后仍在、游戏框显示想玩清单、点账号进入资料页。