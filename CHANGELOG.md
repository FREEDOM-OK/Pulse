# 版本日志（文本记录）

> 规则（用户约定）：
> - 小改动只升补丁版本，**只写在这个文件里**，不改 App 内显示的版本号、不弹任何更新日志。
> - 只有用户明确说「进入下一个大版本」时才动 App 内的版本号/日志。当前 App 内版本为 1.2.2（用户在 2026-11-11 明确要求定为 1.2.2）。

## v1.2.30 — 2026-11-14

### 毛玻璃皮肤 Android 渲染修复：去除套娃灰框 / 硬边光饼 / 底栏透字

- `src/constants/theme.ts`：`GlassMaterial.light` 改为 `canvas #EEF2F9`、`card rgba(255,255,255,0.78)`、`cardBorder rgba(255,255,255,0.96)`、`cardShadow transparent`、`cardShadowOpacity 0`、`cardElevation 0`；`dark` 改为 `canvas #0B0E17`、`card rgba(30,34,46,0.75)`、`cardBorder rgba(255,255,255,0.14)`、`cardShadow transparent`、`cardShadowOpacity 0`、`cardElevation 0`。底栏 `bar` 提高到浅色 `rgba(255,255,255,0.90)` / 深色 `rgba(24,26,34,0.90)`，`barBorder` 浅色 `rgba(255,255,255,0.98)`、深色 `rgba(255,255,255,0.16)`，`barIndicator` 浅色 `rgba(15,23,42,0.06)`。
- 根因说明：Android 上「半透明 backgroundColor + elevation > 0」会把硬件阴影投射块透出来，形成外圈灰框 + 内圈白块的套娃；因此所有玻璃卡片/搜索栏/底栏/弹窗在 glass 下显式 `elevation: 0`、`shadowOpacity: 0`。
- `src/lib/glass.ts`：`glassCardStyle` 描边由 0.8 提升到 1.2 并显式 `elevation: 0`；`glassSheetStyle` 阴影透明度归零、`elevation: 0`（弹窗同样避免灰框）。
- `src/components/themed-view.tsx`：`type="backgroundElement"` 走玻璃卡片时底色改为 `transparent`，只保留材质层这一份半透明底，避免两层半透明叠加成「死白方块」。
- `src/components/ui/glass-glow.tsx` 重写：不再画单层 300/340 实心圆，改为每团光晕 10 层从大到小叠加的同心羽化圆（半径按 8% 递减，单层浅色 `opacity 0.012`、深色 `0.008`，颜色 `#93C5FD` 冰蓝与 `#DDD6FE` 微紫），中心柔和、边缘自然衰减，消除「圆饼贴纸」硬边。
- `src/components/nav/app-tab-bar.tsx`：glass 下底栏胶囊内联覆盖 `elevation: 0 / shadowOpacity: 0`，去掉内部灰圈；配合更高不透明度的 `bar` 底色，滚动内容不再穿透成重影。
- `src/app/(tabs)/index.tsx`：glass 搜索栏改 1.2px 白描边并显式 `elevation: 0 / shadowOpacity: 0`（覆盖 `styles.searchBar` 的 `elevation: 4`），消除双层内框；Tasks 玻璃大卡片不再叠 `marginHorizontal/paddingHorizontal` 内缩，只保留 `borderRadius: 24 + 上下内边距`，列表行保持透明。
- `src/app/(tabs)/settings.tsx`：页头去掉 `backgroundColor: theme.background` 实心底，玻璃卡片内 10 处分隔线改用 `GlassMaterial[scheme].hairline`，不再出现横向割裂色块。
- 皮肤文案统一为「毛玻璃」：`APP_SKIN_LABELS.glass`、个性化页副标题、相关注释均去掉「苹果」字样。
- 验证：44 个测试文件 / 297 条用例、`tsc --noEmit`、`expo lint` 全部通过；真机 Android 渲染与滚动穿透需真人复核。

## v1.2.29 — 2026-11-14

### 新增「苹果毛玻璃」全局皮肤与首页背景定制（调色盘 / 自定义壁纸）

- 新增 4 个 `settings` 键（不新增表、`SCHEMA_VERSION` 仍为 9）：`app.skin`（`default` 经典极简 / `glass` 苹果毛玻璃，默认 `default`）、`home.bgMode`（`default` / `color` / `image`）、`home.bgColor`（默认 `#EEF2F9`，读回小写、非法值回落）、`home.bgImage`（默认 `null`，传 `null` 删除键）。对应 `src/db/repositories/settings.ts` 的 getter / setter，并全部接入 `src/theme/theme-context.tsx` 实时广播，切换即时生效、无需重启。
- 新增 `src/constants/theme.ts` 的 `GlassColors`、`GlassMaterial`（浅/深两套玻璃配方：云母画布、磨砂卡片、高光描边、悬浮阴影、底栏胶囊、弹窗浓度、弥散光晕、壁纸蒙版等）与 `ThemePalette` 类型；`src/hooks/use-theme.ts` 在 `glass` 皮肤下自动返回玻璃色板，并新增 `useSkin/useGlass/useGlassMaterial`。
- 新增 `src/lib/glass.ts`（`glassCardStyle` / `glassBarStyle` / `glassSheetStyle` / `glassBlockStyle`）、`src/lib/color.ts`（Hex/RGB/HSL 互转、亮度、可读文字色）、`src/lib/home-bg-path.ts`、`src/lib/home-bg-image.ts`（复用头像那套 `expo-image-picker` + `expo-file-system`，壁纸复制到 App 私有目录）。
- `src/components/themed-view.tsx` 升级：`glass` 皮肤下 `type="backgroundElement"` 自动获得半透明磨砂底 + `0.8px` 镜面高光白边 + 柔和弥散底光（设置 / 健身 / 日历 / 游戏 / 个性化等页的分组卡片自动生效）；新增 `glow` 属性用于页面根容器。新增 `src/components/ui/glass-glow.tsx` 在根容器四角渲染两团极柔和的弥散光晕（`pointerEvents` 穿透）。
- 底栏 `src/components/nav/app-tab-bar.tsx`：`glass` 下胶囊变高透灵动岛毛玻璃（浅 `rgba(255,255,255,0.72)` / 深 `rgba(28,30,36,0.72)`，1px 高光描边），内部指示器变晶莹半透明胶囊。
- 首页 `src/app/(tabs)/index.tsx`：玻璃搜索框 + 高光描边、筛选按钮半透明化；`glass` 或自定义壁纸下 Tasks 列表包进 24dp 圆角半透明毛玻璃大容器（`padding: 16`），保证任何壁纸下任务文字清晰；Dash 卡片（`dash-card.tsx`）在默认样式下变为通透磨砂玻璃，图标圈/箭头圈变冰晶质感。
- 计划页 `date-strip.tsx` 选中胶囊加微光描边；`today` 与 `day/[date]` 的任务/备忘/课程列表在玻璃皮肤下统一承托进 24dp 圆角玻璃大卡片；课表 `timetable-screen.tsx` 表头/时间列用半透明磨砂底、`week-grid.tsx` 课程色块加 0.8px 透明白边；游戏页分段切换器叠加玻璃与细高光边；健身动作卡片的次数/重量输入框改为半透明冰晶底 + 细高光边；`ModalSheet` / `ActionMenu` / `ConfirmDialog` / `DialogHost` 面板变高浓度磨砂 + 顶部亮白高光边；`_layout.tsx` 根与导航主题随玻璃画布切换。
- 首页背景：`home.bgMode === 'color'` 时根容器直接用 `home.bgColor`，并按亮度自动调整问候语/日期文字颜色；`=== 'image'` 且有 `home.bgImage` 时底层铺满 `resizeMode="cover"` 的壁纸 + 自适应柔光蒙版（浅 `rgba(255,255,255,0.18)` / 深 `rgba(0,0,0,0.35)`）。
- 「我的 → 个性化」新增「个性皮肤」分组（两种皮肤带预览块，点击立即 `setAppSkin`）与「首页背景」分组（默认底色 / 纯色调色盘 / 自定义图片三选一）：调色盘含实时色块 + Hex 输入、色相（360° 彩虹）/ 饱和度 / 明度三条可拖动滑条、8 个快捷莫兰迪色点；图片面板含缩略图预览、虚线占位、从相册选择与清除。
- 清空数据时同步复位皮肤与首页背景（默认底色、删除壁纸文件）；新增 `tests/s10-appearance.test.ts`（6 条）锁定默认值、校验回落与持久化。
- 验证：44 个测试文件 / 297 条用例、`tsc --noEmit`、`expo lint` 全部通过；调色盘拖动手势与真机玻璃观感需真人确认。

## v1.2.28 — 2026-11-14

### 深色模式全链路适配；二级页返回白屏修复、转场提速

- `src/app/_layout.tsx`：根容器改为铺主题底色；新增 `<StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />`；Navigation Theme 的 `background` / `card` / `text` / `border` 全部取主题色；根 Stack 转场改为 `ios_from_right` + `animationDuration: 180` + `freezeOnBlur: true`，返回时不再先闪白。
- `src/app/timetable/_layout.tsx`：内层 Stack 同步转场参数与主题底色。
- `src/app/(tabs)/_layout.tsx`：`Tabs` 增加 `sceneStyle.backgroundColor = theme.background`，底栏淡入淡出期间不露白底。
- `src/app/(tabs)/settings.tsx`：页头与「设置」标题显式使用主题色，深色下标题清晰可见。
- `src/app/(tabs)/index.tsx`、`src/components/home/search-overlay.tsx`：容器、问候、日期、头像、搜索框、筛选按钮、标题、搜索覆盖层、chips、关闭按钮等全部接入 `useTheme` / `useThemePreference`；深色下描边改为低透明白、阴影关闭。
- `src/components/home/search-results.tsx`：搜索结果卡片、标题、副标题、日期与空状态接入主题色，深色下不再出现白卡。
- `src/components/nav/app-tab-bar.tsx`：底座浅色 `#FFFFFF` / 深色 `#1C1C1E` 并加深色 hairline 描边；指示器、选中/未选中文字、中间加号圆与涟漪色全部随主题切换。
- 课表：`src/components/timetable/timetable-screen.tsx` 在深色且网格背景为默认 `#F5F5F7` / `#FFFFFF` 时，页面用 `theme.background`、格子用 `theme.backgroundElement`；`week-header.tsx`、`week-grid.tsx`、`course-detail-drawer.tsx`、`timetable-more-sheet.tsx`、`wheel-sheet.tsx` 与 `src/app/timetable/{appearance,course,courses,import,periods,schedules,settings}.tsx` 全部接入主题色，深色分隔线统一 `rgba(255,255,255,0.08)`，强调色与课程色板保持不变。
- `tests/s2-tab-bar.test.ts`：断言同步为新的 `*_LIGHT` 常量名，并补充深色常量检查。
- 验证：43 个测试文件 / 291 条用例、`tsc --noEmit`、`expo lint` 全部通过；深色视觉与返回转场需真机确认。

## v1.2.27 — 2026-11-14

### 全 App 页面隐藏纵向滚动条、关闭安卓越界拉伸；「记消费」图标换成美元符号

- `src/app/(tabs)/settings.tsx` 主 `ScrollView` 增加 `showsVerticalScrollIndicator={false}` 与 `overScrollMode="never"`，返回「我的」时右侧不再露出系统粗灰滚动条，也不会出现安卓边缘拉伸阴影。
- 同步补齐其余页面的纵向滚动容器：`src/app/personalize/index.tsx`、`src/app/personalize/cards.tsx`、`src/app/cards.tsx`、`src/app/profile.tsx`、`src/app/games.tsx`（两个分页）、`src/components/fitness/fitness-screen.tsx`、`src/components/calendar/calendar-panel.tsx`、`src/app/timetable/{appearance,courses,import,schedules,settings,periods}.tsx`，以及 `src/components/ui/modal-sheet.tsx` 与课表「午休位置」抽屉，统一 `showsVerticalScrollIndicator={false}`（页面级同时 `overScrollMode="never"`）。
- `src/components/home/event-form.tsx`：「记消费」圆钮图标从钞票图标改为美元线条图标 `{ ios: 'dollarsign', android: 'attach_money', web: 'attach_money' }`（已确认 expo-symbols 的 Android 符号表含 `attach_money`），尺寸与选中/未选中配色保持不变。
- 验证：43 个测试文件 / 291 条用例、`tsc --noEmit`、`expo lint` 全部通过；滚动条与转场残影需真机滑动确认。

## v1.2.26 — 2026-11-14

### 二级页面统一右滑推入转场；「记事件」换成 ModalSheet 黑白风格并支持选日期；课表空白格预览固定单节

- `src/app/_layout.tsx`：根 `<Stack>` 的 `screenOptions` 统一为 `animation: 'slide_from_right'`、`animationDuration: 240`、`gestureEnabled: true`、`gestureDirection: 'horizontal'`、`fullScreenGestureEnabled: true`，并用当前主题色设置 `contentStyle.backgroundColor`，转场期间不再闪白底/黑底；`(tabs)` 单独 `animation: 'fade'`，底栏切换不左右乱滑。
- `src/app/timetable/_layout.tsx`：从只有 `animation: 'slide_from_right'` 补齐同一套时长、手势与主题底色配置，课表内二级页与全 App 手感一致。
- `src/components/home/event-form.tsx` 整体重构：删除自写 `<Modal>` / `<KeyboardAvoidingView>` / 绿色保存按钮，改用 `ModalSheet` + `modalStyles.actionsRow`（浅灰「取消」+ 黑色胶囊「保存」）；类型行三个 68×68 圆形按钮改用 `SymbolView` 黑白线条图标（`yensign.circle` / `bag` / `fork.knife`，Android 对应 `payments` / `shopping_bag` / `restaurant`，size 22），选中态 `theme.text` 底 + `theme.background` 图标文字，未选中态 `theme.backgroundElement` 底 + `theme.text`，彻底移除 #E15241 / #F59E0B / #10B981 彩色与 🛍 / 🍚 Emoji。
- EventForm 新增 `formDate` 与 `MonthPicker`：日期行显示 `formatDay(formDate)` 与「修改 ›」，`createEvent({ ..., date: formDate })` 写入所选日期，事件会出现在对应日期的日历里；内容（必填、maxLength 120）、金额（选填、decimal-pad）、备注（选填、maxLength 200）统一改用 `TextField`，props 增加可选 `date`。
- `src/components/ui/app-button.tsx`：`AppButton` 新增可选 `accessibilityLabel`（默认回落到 `label`），EventForm 保存按钮保留「保存事件」无障碍名，E2E 无需改选择器。
- `src/components/timetable/week-grid.tsx`：空白格预览块不再按 `defaultSpan` 取 2 节，固定 `const startP = pendingSlot.period; const endP = startP;`，高度严格 `rowH - 2`，删除「下一节有课 / 跨午休」两处收缩逻辑；点击预览跳转时传 `onAddCourse(day, startP, startP)`，新建页默认只填这一节（`defaultSpan` 仅保留为建课页默认跨度）。
- 验证：43 个测试文件 / 291 条用例、`tsc --noEmit`、`expo lint` 全部通过；转场手感、圆钮视觉与日期弹层按 AGENTS 约定交真人确认，E2E 未跑（需先重启 Metro）。

## v1.2.25 — 2026-11-13

### 底栏「＋」合并为两个入口：新建任务/备忘 与 记事件；任务自动延期、连续多天备忘、日历事件徽章

- `src/components/nav/app-tab-bar.tsx`：底部「＋」菜单从 5 项压成 2 项（`新建任务/备忘`、`记事件`），菜单标题仍为「新建」；删除 `MemoForm` 的引入、状态与渲染，`TaskForm` 以 `initialKind="task"` 打开，`EventForm` 以 `visible + initialType="expense"` 打开；`SLOT_COUNT = 5` 布局与 `accessibilityLabel="新建"` 保持不变。
- `src/components/today/today-list.tsx`：计划页底部「＋ 新建」不再弹只有两项的 ActionMenu，直接打开综合 `TaskForm`（`accessibilityLabel="新建任务或备忘"`），与底栏体验一致；`MemoForm` 仅保留给长按编辑备忘。
- `src/components/today/task-form.tsx` 重写为综合弹窗：新建时标题「新建任务/备忘」，首行「类型」两胶囊（任务 / 备忘，默认任务）；字段顺序为 内容（必填，placeholder 随类型切换「例如：写周报」/「例如：周五前交房租」）→ 选择日期（MonthPicker）→ 时间（选填）→ 任务专属备注与「今日未完成自动延期到下一天」开关 / 备忘专属「置顶备忘」→ 仅新建时显示「仅今日 / 今日起3天 / 今日起7天」三胶囊；编辑已有任务时固定任务模式，日期变化走 `moveTaskToDate`。
- `src/components/home/event-form.tsx` 重写为「记事件」综合弹窗：props 改为 `initialType?: EventType | null`，只要 `visible` 就渲染，不再因类型为空返回 null；标题下三个 68×68 圆形按钮（记消费 `¥` / #E15241、记购物 `🛍` / #F59E0B、记好饭 `🍚` / #10B981），选中实心主题色 + 白字 + 微阴影，未选中浅底 + 半透明描边；内容必填、金额与备注选填（空值由 events 仓库归一为 null）。
- `src/db/repositories/tasks.ts`：`CreateTaskInput` 新增 `autoPostpone?: boolean`，新任务 ID 记进 `settings` 表 `tasks.autoPostponeIds`（JSON 数组，零表结构改动）；新增 `getAutoPostponeIds` / `isTaskAutoPostpone` / `setTaskAutoPostpone` / `rolloverAutoPostponeTasks(today)`；删除任务或整组时同步移出集合。
- 自动顺延：`today-list.tsx` 的 `load()` 在查看今天时先 `await rolloverAutoPostponeTasks(date)`，把「开启开关、`done = 0`、`date < 今天`」的任务逐条 `moveTaskToDate` 到今天末尾，再拉取列表；已完成、未开启开关、未来日期的任务不受影响。
- `src/db/repositories/memos.ts` 新增 `createMemoSeries(input, days)`：事务内按 `addDays` 从起始日连续插入，任务与备忘都能用 3 天 / 7 天连续创建。
- `src/db/types.ts` 新增 `EventBadgeStyle` 与 `EVENT_BADGE_STYLES`（记消费 / 记购物 / 记好饭，含背景与文字色），保留原 `EVENT_TYPE_LABELS`。
- `src/components/calendar/calendar-panel.tsx`：事件卡片头部显示「N 条 · 消费 · 好饭」式类型小结；每行左侧原纯文本类型升级为圆角彩色徽章（`paddingHorizontal 8 / paddingVertical 3 / borderRadius 6`），`accessibilityLabel` 仍用原 `EVENT_TYPE_LABELS`，右侧金额不变。
- 新增 `tests/p2-entry-series.test.ts` 3 条：只顺延开启开关的过期未完成任务、重复执行返回 false、删除/开关同步清理集合；备忘连续 3 天的内容/时间/置顶一致。
- E2E 文案同步（`today.e2e.mjs` / `home.e2e.mjs` / `screenshots.mjs`）：改点「新建任务或备忘」「记事件」「类型 备忘」「今天起3天」等新标签；按 AGENTS 约定未在本次跑 E2E（需先重启 Metro，且弹窗视觉与手势交真人确认）。
- 验证：43 个测试文件 / 291 条用例、`tsc --noEmit`、`expo lint` 全部通过；`SCHEMA_VERSION` 保持 9，无新增迁移。

## v1.2.24 — 2026-11-13

### 课表：复制后抽屉保持展开、Toast 挪进 Modal 顶层；课程表单换线性图标

- `src/components/ui/bottom-sheet.tsx` 新增可选属性 `overlay?: React.ReactNode`，渲染在 `<Modal>` 内 `styles.root` 下、与 `backdrop` / `sheet` 同级 —— 页面级绝对定位元素会被 Modal 的独立窗口层级压住，Toast 必须挂在这里才看得见。
- `course-detail-drawer.tsx`：复制不再关闭抽屉（父组件已删掉 `onCopy` 回调与 `setSelectedCourse(null)`，也不再 `duplicateCourse`）；抽屉内部维护 `copyToast` 状态 + `useRef` 定时器（1800ms 自动清除、卸载时清理），点复制后 `writeClipboard(copyText)` 成功弹「复制成功」、失败弹「复制失败，请重试」。
- Toast 样式：`position: absolute`、`alignSelf: center`、`top: (insets.top || 24) + 16`、白底、`paddingHorizontal 18 / paddingVertical 10 / borderRadius 999`、`shadowOpacity 0.12 / shadowRadius 12 / shadowOffset {0,4}`、`elevation 10`、`zIndex 9999`，文字 `#111113 / 13 / 600`。
- `timetable-screen.tsx`：删掉上一轮页面级的 Toast 状态与样式（现在由抽屉自己接管），`CourseDetailDrawer` 不再传 `onCopy`。
- `src/app/timetable/course.tsx`：8 个 `styles.rowEmoji` 彩色 Emoji（🎨 ⭐ 📅 ⏰ 📝 📍 👤 📋）全部换成 `SymbolView` 单色线性图标（`size 20` / `tintColor "#111113"`，iOS 与 Android/Web 名称分开配置）；`styles.rowEmoji` 删除，`styles.rowLeft` 的 `gap` 从 10 调到 12，图标与文字垂直居中。
- 新增 `tests/a5-timetable-icons.test.ts` 4 条：课程表单与详情抽屉均无彩色 Emoji 且都用了 `SymbolView`、`BottomSheet` 提供 `overlay` 且抽屉把 Toast 挂在 `overlay` 上、页面侧不再有 `duplicateCourse` / `onCopy`。
- 验证：42 个测试文件 / 288 条用例、`tsc --noEmit`、`expo lint` 全部通过；复制手感与图标视觉需真机确认。

## v1.2.23 — 2026-11-13

### 课表：显示周六/周日开关失效修复 + 课程详情抽屉线性图标与复制 Toast

- 新增 `src/lib/settings-codec.ts`：`serializeSettingValue(value)` 把布尔统一落成 `'1'` / `'0'`（对象走 JSON、其余 `String`），`parseBoolSetting(raw, fallback)` 同时兼容 `'1'/'0'` 与历史遗留的 `'true'/'false'`，坏值回落默认。
- `TimetableContext.updateSetting` 改用 `serializeSettingValue`：此前 `String(false)` 会写成 `'false'`，而 `reloadAll` 用 `map[...] !== '0'` 判断，`'false' !== '0'` 恒为 true，所以「显示周六 / 显示周日」点一下关掉、刷新又弹回开启。
- `TimetableContext.reloadAll` 的 `showSaturday` / `showSunday` / `reminderEnabled` 改用 `parseBoolSetting`（历史数据里的 `'false'` 现在也能正确读成关闭）。
- `settings.tsx` 的「显示周六 / 显示周日」两行不带任何 `disabled` / 置灰逻辑，未开「当前课表」条件下也能随时开关；确认两行只受 `updateSetting` 驱动。
- `course-detail-drawer.tsx`：彩色 Emoji 全部换成 `expo-symbols` 的 `SymbolView` 单色线性图标（日历 / 时钟 / 定位 / 人像 / 便签，`size={18}`、`tintColor="#94A3B8"`；底部复制 `doc.on.doc`、删除 `trash`，`size={20}`、`tintColor="#111113"`，按钮 `48×48 / borderRadius 16 / #F4F4F5`）；标题行下方新增贯穿细分割线（`hairlineWidth`、`#E2E8F0`、`paddingBottom 14`、`marginBottom 16`）。
- 复制行为改为「复制文本」：抽屉拼出 `课程名 · 第 X 周 · 第 A - B 节 HH:MM - HH:MM · 教室：… · 教师：… · 备注：…`，交给 `src/lib/clipboard.ts` 的 `writeClipboard`（Web 走 `navigator.clipboard.writeText`，原生走 `expo-clipboard` 的 `setStringAsync`，任何失败只返回 false、绝不抛错），不再调用 `duplicateCourse` 生成「XX副本」。
- `timetable-screen.tsx` 新增非阻塞顶部 Toast：`position: absolute`、`top: (insets.top || 24) + 12`、居中的 `#1C1C1E` 胶囊（`paddingHorizontal 18 / paddingVertical 10 / borderRadius 999`），白字 13/600，显示 1800ms 自动消失；点复制后先 `setSelectedCourse(null)` 再弹「复制成功」（写剪贴板失败时提示「复制失败，请重试」），全程不走系统 `Alert`。
- 新增依赖 `expo-clipboard@~58.0.4`（`npx expo install expo-clipboard`）。
- 新增 `tests/a4-settings-codec.test.ts` 5 条：布尔落库 `'1'/'0'`、对象/数字/字符串序列化、`parseBoolSetting` 六种输入、关闭后写库读回仍为关闭、历史 `'false'` 读回按关闭处理。
- 验证：41 个测试文件 / 284 条用例、`tsc --noEmit`、`expo lint` 全部通过。新增原生模块后需重新构建 dev client（Expo Go 自带 `expo-clipboard`，无需重建）。

## v1.2.22 — 2026-11-13

### 课表：课程数据/课表外观两组升级 + 背景色与网格实时联动

- `repository.ts` 的 `TimetableSettings` 新增 6 个字段（全部落在 `settings` 表 `timetable.*` 键下，零 Schema 迁移）：`weekStartDay: 1 | 6 | 7`（默认 1）、`showSaturday` / `showSunday`（默认 true，存 '1' / '0'）、`cellHeight`（默认 64，44~90）、`cellRadius`（默认 6，0~18）、`gridBackgroundColor`（默认 `#F5F5F7`）；`timetable-core.ts` 同步新增默认值 / 区间常量、`clampNumber`、`visibleWeekDays(weekStartDay, showSaturday, showSunday)`。
- `TimetableContext.reloadAll` 兜底解析 6 个键（`showSaturday !== '0'`、`parseInt(... || '64')` 后 `clampNumber`、`parseWeekStartDay` 只接受 1 / 6 / 7）；`resetAppearanceDefaults` 改为一次性把 10 个外观键写回默认值（不再分散成 4 段 SQL）。
- `settings.tsx` 两组重排：`课程数据`（上课时间 / 开学时间 / 每周起始日 / 当前周 / 学期周数 / 导入课表）与 `课表外观`（显示周六 / 显示周日 圆角复选框、课程格子高度、格子圆角半径、午休位置、更多外观设置双行入口）；新增居中日历弹窗（`monthGrid` 渲染、选中日 `#4A5588` 描边圆）、三个底部滚轮（沿用 `WheelSheet` + `WheelPicker`）、两个居中数字输入弹窗（当前周 / 学期周数）；「色彩饱和度 / 默认连堂节数 / 外观浏览」三行移出本页。
- 当前周反推：`mondayOf(new Date())` 往前推 `(target - 1) * 7` 天写回 `startDate` 后 `setViewingWeek(target)`；改开学时间同样重算并同步 `viewingWeek`；学期周数校验 1~60 并把超界的 `viewingWeek` 夹回。
- `appearance.tsx` 重写：顶栏 `更多外观设置` + 右侧 `恢复默认`；顶部实时预览（背景 `gridBackgroundColor`、格子 `cellHeight` / `cellRadius` / 饱和度同框联动）；8 个护眼底色色板 + 40×40 选中描边与 ✓（点击即 `updateSetting('gridBackgroundColor', hex)`）、饱和度 5 档内嵌切换；新增「高级外观定制」4 行占位（右侧 `暂未开放`，点击 `showNotice('该功能暂未开放，敬请期待')`）。
- `week-grid.tsx` 行高改由 `cellHeight` 驱动（`rowH` 替换全部 `ROW_H` 用法），课程块 / 预览块圆角取 `cellRadius`，表头 / 时间列 / 网格底色取 `gridBackgroundColor`；表头与行内空白格只遍历 `visibleDays`，课程块按 `visibleDays.indexOf(dayOfWeek)` 定位（`-1` 直接不渲染），列宽按可见天数摊平。
- `timetable-screen.tsx` 用 `useMemo` 计算 `visibleDays`、`dayColWidth = (pageWidth - TIME_COL) / visibleDays.length`，根容器背景色取 `settings.gridBackgroundColor`。
- 新增 `tests/a3-appearance-settings.test.ts` 8 条（默认值 / 区间、`clampNumber` 越界与 NaN、6 种 `visibleWeekDays` 排列）；`tests/e2e/timetable.e2e.mjs` 同步改为从「更多外观设置」页切饱和度并校验新增行。
- 验证：40 个测试文件 / 279 条用例、`tsc --noEmit`、`expo lint` 全部通过；滚轮与日历属手势/触摸交互，按约定交真机确认。

## v1.2.21 — 2026-11-13

### 我的（设置）：五个分组重排，健身默认值改成点击弹窗输入

- `settings.tsx` 的 ScrollView 重排为「快捷入口 / 界面与外观 / 功能偏好 / 数据与安全 / 关于」五组：快捷入口新增「游戏」入口（`/games`）；原「首页」卡片设置与首尾两个「外观」合并为「界面与外观」（首页卡片、第三个标签、个性化、主题四行），消除重复的「外观」标题；列表排序与健身默认值合并进「功能偏好」；`message` / `error` 提示框移到个人资料行正下方。
- 「默认次数 / 默认重量」从外置 `TextInput` + 独立「保存」按钮改为点击行打开 `ModalSheet` 输入（reps 最多 3 位、weight 最多 4 位、`number-pad`）：校验 `Number.isInteger` 且 reps ≥ 1 / weight ≥ 0 后自动 `setFitnessDefaults` + `bumpDataVersion()`，提示「健身默认值已保存。」；删除 `numberInput` / `defaultsRow` 样式与第三行按钮，新增 `dialogInput`（高 46、圆角 12）与 `dialogError`。
- 行级视觉（`styles.group` / `styles.row` / `styles.divider`）、卡片圆角与分隔线保持不变；清空数据后同步刷新本地默认值显示。
- `tests/e2e/settings.e2e.mjs` 改为「点行 → 等弹窗标题 → 填输入框 → 点保存」；验证：39 个测试文件 / 272 条用例、`tsc --noEmit`、`expo lint`、E2E P8 场景全部通过。

## v1.2.20 — 2026-11-13

### 课表：预览框两态交互、自定义时间按真实比例定位、周数滑条跟手

- `week-grid.tsx` 的 `＋` 预览块改为严格两态：已有预览框时点任何空白格只收起预览、不瞬移；点表头行或左侧时间列同样收起；点粉块本身才清空预览并跳新建页；点已有课程块先收起预览再开详情。
- `timetable-core.ts` 新增 `timeToMinutes` / `timeToGridY` / `periodsForTimeRange`：把真实时间映射到网格像素 y（节内按比例插值、午休按 `lunchH` 插值、普通课间贴分界线、早于首节归 0、晚于末节贴底）。
- `week-grid.tsx` 课程块渲染抽出 `renderBlock`：`customTime.enabled` 的时段不再按 `startPeriod/endPeriod` 整格切块，而是用真实起止时间算 `top/height`（最小 24），跨课间/午休也画一整块。
- `course.tsx` 保存自定义时间时用 `periodsForTimeRange` 反推相交节次并同步 `startPeriod` / `endPeriod`，详情里的「第 X - Y 节」与实际跨度一致。
- `timetable-more-sheet.tsx` 周数滑条：新增本地 `dragWeek` 驱动滑块与「第 N 周」文案，只有跨过一周刻度才 `setDragWeek` + 下一帧 `onJumpToWeek(week, false)`；`onPanResponderMove` 改用 `startXRef + gestureState.dx`，不再读会跳变的 `locationX`；松手/取消时落最终周次并清空 `dragWeek`，背后课表用 `animated: false` 瞬移。
- 新增 `tests/timetable-core.test.ts` 5 条：`timeToMinutes` 宽容解析、节内插值、边界归零/贴底、午休插值、`periodsForTimeRange` 反推。
- 验证：39 个测试文件 / 272 条用例、`tsc --noEmit`、`expo lint` 全部通过；滑条手感与预览块交互属手势行为，按约定交真机确认。

## v1.2.19 — 2026-11-13

### 课表：两段式添加课程 + 节次/时间三列与双列滚轮

- `week-grid.tsx` 空白格改为两段式：第一次点只放一个粉色 `＋` 预览块（`#F472B6`、圆角 6、白字 26/300），点预览块才跳新建页；跨度默认取 `settings.defaultSpan`，若下一节当天已有课或会跨过午休分割线则收缩为单节。换周、课程数据变化、点已有课程块都会清空预览，再点同一格取消。**没有 ↑↓ 胶囊按钮**。
- `week-grid.tsx` 新增 `defaultSpan` 入参与 `onAddCourse(day, period, endPeriod?)`；`timetable-screen.tsx` 的 `openAddCourse` 按需带上 `endPeriod` 路由参数。
- `course.tsx` 读取 `endPeriod` 初始化结束节（夹在 `[startPeriod, totalPeriods]`），所以「预览 2 节」打开后就是 2 节。
- `course.tsx` 的节次弹窗由胶囊列表换成 `WheelSheet` + 三列滚轮（星期 / 第 N 节 / `—` / 第 N 节，行高 44、可见 5 行、三列共用贯穿细线）：草稿态 `draftDay` / `draftStart` / `draftEnd`，开始节超过结束节时结束节跟随、反之开始节回退，点「保存」才写回时段并刷新未开启自定义时间时的时间备份。
- `course.tsx` 自定义时间页的上/下课时间由 `TextInput` 改成可点胶囊，点开复用双列时间滚轮抽屉（`src/components/timetable/wheel-sheet.tsx`，标题随目标显示「上课时间 / 下课时间」）；保存时若下课 ≤ 上课则自动顺延 45 分钟并夹在当天 23:59 内。
- `wheel-picker.tsx` 新增可选 `itemHeight`（默认 40，不传时行为与旧版完全一致），课表三列滚轮传 44；行高同时作用于吸附间隔、高亮块与每项高度。

## v1.2.18 — 2026-11-13

### 课表：多时间表 + 底部时间滚轮（零 Schema 迁移）

- 新增 `TimeTablePreset`（id / name / fixedDuration / durationMinutes / periods）与纯函数 `addMinutes` / `relayoutPeriods` / `applyFixedDuration` / `appendPeriod` / `validatePeriods`，落在 `src/lib/timetable-core.ts`。
- 时间表只借用 `settings` 键值：`timetable.timeTables`（JSON 数组）与 `timetable.scheduleTimeTableMap`（`scheduleId -> timeTableId`）；首次播种用现有 `period.times` + `timetable.periodDuration` 生成一套「默认」并把已有课表全部绑上，不建表、不改 `SCHEMA_VERSION`。
- `TimetableContext` 新增 `timeTables` / `scheduleTimeTableMap` / `activeTimeTable` / `timeTableIdForSchedule` / `selectTimeTable` / `saveTimeTable` / `createTimeTable` / `deleteTimeTable`；`reloadAll` 以「当前课表绑定的那套时间表」为唯一来源回灌 `period.times` 与 `timetable.periodDuration`（仅在不等时才写库）。切时间表、保存时间表、`switchSchedule` 之后都走 `reloadAll()` + `bumpDataVersion()`，首页 Tasks / 计划页 TodayList / 课表网格读到的仍是同一份 `period.times`。
- `/timetable/periods` 重写为两视图同路由：列表视图（新建胶囊、名称+✎、`共 N 节课 · X分钟/节`、`当前课表在用` / `N个课表在用`、右侧单选圈）；编辑视图（名称输入、固定上课时长开关 + 副标题联动文案、30–90 步进 5 的时长滚轮、`⊞ 添加`、长按删除、24 小时制提示）。开启固定时长后结束时间置灰不可点，改开始时间用 `relayoutPeriods` 按原课间整体顺延。
- 时间选择统一改成底部 `BottomSheet` + 双列 `WheelPicker`（00–23 / 00–59、中间粗冒号、选中行上下 0.5 细线、全宽圆角保存按钮），不再用 `TextInput` 手敲；非唯一时间表可在编辑页底部删除，绑定它的课表自动改绑到剩余第一套。
- `wheel-picker.tsx` 修掉松手闪动：`reportedRef` 标记手势回写的下标，`useEffect` 只在外来改值时 `scrollToOffset`；新增 `onScroll`（`scrollEventThrottle={16}`）实时刷新居中索引，中线 18/700、远处 14 渐隐，并加 `nestedScrollEnabled` 防止安卓抽屉吞掉纵向手势。
- `timetable/settings.tsx` 删除「单节时长」行与其抽屉、「关于 / 版本」分组及 `expo-constants` 引用（功能并入编辑时间表页）。
- 新增 `tests/a2-timetable-presets.test.ts`（7 条）：播种两键、损坏 JSON 回退、写回激活时间表同步 `period.times`、绑定表读回、`listCoursesForDate` 时段文案随切换变化、顺延算法与固定时长对齐。
- 验证：`npm run verify` 通过，39 个测试文件 / 265 条用例、`tsc --noEmit`、`expo lint` 均无错误；滚轮与长按属于手势交互，按约定交真机验证。

App 内显示版本仍为 1.2.2，不弹更新日志。

## v1.2.17 — 2026-11-13

### 课表：抽屉挂载时序、autoHeight 高度坍缩与翻周互相覆盖

- `BottomSheet` 把 `visible` 与 `rendered` 拆成三段 effect：`visible` 变 true 时只复位 `progress` / 遮罩并清空 `openStartedRef`，下一段只负责 `setRendered(true)`，只有 `visible && rendered` 同时成立才通过 `requestAnimationFrame`、100ms 定时器与 `Modal.onShow` 幂等启动打开动画。修复 Modal 尚未挂载时动画空跑并锁死 `openStartedRef`、导致 Android 上「只变暗、抽屉不上来」的问题。
- `BottomSheet` 的 `autoHeight` 与固定高度样式彻底隔离：固定高度用 `bodyFlex`（`flex: 1`），autoHeight 用 `bodyAutoHeight`（`width: '100%'`，不再挂任何 `flex: 1`），避免原生 Yoga 在未定高父级里把内容/底部按钮压成 0 高。
- `TimetableScreen` 删除监听 `viewingWeek` 的滚动 effect，改为显式 `jumpToWeek(week, animated)`；抽屉滑条拖动调用 `jumpToWeek(week, false)` 实时跟手，不再由 state effect 反向滚回旧周。`onLayout` 通过 `viewingWeekRef` 读取最新周次，避免宽度测量与聚焦归位同轮提交时用旧闭包把周次冲掉；移除 `FlatList` 的 `initialScrollIndex`，偏移统一由聚焦重置与 `onLayout` 强制对齐。
- 详情抽屉与 ⋯ 抽屉继续走原生 `Modal`，autoHeight 内容完整撑开，底部编辑/复制/删除与四个入口在 tab 模式下完整显示并被手势条避让。
- 验证：`npx tsc --noEmit`、`npx expo lint` 通过；全量单测 38 文件 / 259 用例通过。

App 内显示版本仍为 1.2.2，不弹更新日志。

## v1.2.16 — 2026-11-13

### 课表：底栏第三格抽屉层级、当前周归位与顶栏事件

- 课程详情抽屉改用 `BottomSheet`（原生 `<Modal statusBarTranslucent transparent>`）：删除 Reanimated 共享值、`mounted`、页面内 `position:absolute` 遮罩与 zIndex 90/100，tab 模式可完整压暗并盖住 `AppTabBar`；底部按钮区按 `Math.max(insets.bottom, 20)` 避让系统手势条，退场期间用 `displayCourse` 缓存最后内容。
- `BottomSheet` 打开动画改为挂载后启动：`requestAnimationFrame` + `Modal.onShow` + 160ms 定时兜底三路幂等触发，位移距离 `Math.max(600, 屏幕高)`，避免 Android 首帧只看到遮罩、抽屉本体不动；新增 `closeLabel` 供不同抽屉自定义遮罩无障碍标签。
- 顶栏 ＋ 改为直接 `router.push('/timetable/course')`，不再带日期/节次参数、不弹任何遮罩；`course.tsx` 在无参数时默认今天，保持添加体验。导入仍直达 `/timetable/import`，⋯ 打开底部抽屉。
- `TimetableScreen` 新增 `useFocusEffect`：每次进入（含底栏第 3 格切回、从二级页返回）都按真实日期重算当前周并夹到 `[1, totalWeeks]`，`setViewingWeek` 后立即 `scrollToOffset({ animated: false })`，标题、网格与横向分页同步归位。
- 验证：`npx tsc --noEmit`、`npx expo lint` 通过；全量单测 38 文件 / 259 用例通过；`node tests/e2e/run.mjs P4` 课表场景通过。

App 内显示版本仍为 1.2.2，不弹更新日志。

## v1.2.15 — 2026-11-13

### 课表：顶栏精简、网格修复与 ⋯ 抽屉

- 顶栏拆出 `week-header.tsx`：左上只读展示「第 N 周 周X」+ 日期（20/700、12/#8E8E93），删除「我的课表 ▾」点击切换；右侧只保留 ＋（`/timetable/course`）、导入（`/timetable/import`）、⋯ 三个 36×36 按钮。删除 ‹ › 翻周胶囊、齿轮按钮、两个右上角 Popup Modal 及 `showScheduleMenu` / `showMoreMenu` 等 state 与旧样式。
- 网格拆出 `week-grid.tsx`：左列每节三行垂直居中——序号 13/700/#1C1C1E、开始与结束时间 9.5/#8E8E93/lineHeight 11/tabular-nums；行高 58、午休 20。
- 水平线统一按 `top(k) = (k-1)*ROW_H + (k > lunchAfter ? LUNCH_H : 0)` 绝对定位，第 k 节底线严格落在 `top(k)+ROW_H`；删除旧顺序流里 `hideBottomBorder` 的临时补丁，修复第 6 节（14:55）与第 7 节（16:00）之间缺线，午休条自身补下边界线。
- 根容器固定 `#F5F5F7` 并铺到屏幕底部；网格 ScrollView `flex: 1`，避让留白移入 `contentContainerStyle`（tab 100 / page 32），去掉外层 `paddingBottom`，消除第三格底栏下方的白色断层。
- 新增 `timetable-more-sheet.tsx`：全屏 `Modal`（`statusBarTranslucent`）上的双白卡抽屉。上卡为周数胶囊滑条（实时联动当前周）+「回到本周」+ 横向课表切换（新建课表 / 管理）；下卡为上课时间、课程设置、已添课程、上课提醒四个等分入口。tab / page 两种模式底部统一 `Math.max(insets.bottom, 16)`，不再为底栏额外留白。
- 上课提醒落库：`TimetableSettings` 新增 `reminderEnabled`，播种 `timetable.reminderEnabled='0'`，抽屉内开关即时持久化。
- 外观入口从主页迁入「课程设置」：新增「外观浏览」行 → `/timetable/appearance`；`schedules.tsx` 支持 `?create=1` 直达新建表单。
- E2E 课表场景改为打开 ⋯ 抽屉，校验周数/课表/四个入口与「回到本周」。

### 测试

- 新增 `rowBottom(k) === rowTop(k)+ROW_H` 回归用例（覆盖午休 0/4/5 节后）。
- `npm run verify`：38 个测试文件 / 259 条用例通过，`tsc --noEmit`、`expo lint` 零错误零警告。
- `node tests/e2e/run.mjs P4`：课表场景通过（添加课程、详情抽屉、⋯ 抽屉与回到本周、深链、文本导入）。

App 内显示版本仍为 1.2.2，不弹更新日志。

## v1.2.14 — 2026-11-12

### 搜索：根级全屏 Overlay + 历史表

- 新增 SQLite V9 `search_history(query, searched_at, hit_count)` 与索引；搜索历史最多显示 10 条，支持“清空历史”，重复关键词会更新时间与命中次数。
- 首页搜索改为 Root 级 `Modal` 全屏层，`statusBarTranslucent` / `navigationBarTranslucent`，打开 220ms、关闭 200ms；Overlay 完全盖住底部悬浮 TabBar。
- 聚焦且输入为空时只读取 `search_history` 并渲染历史 Chip / “暂无搜索历史”，不再调用 `searchRecords('')` 查业务表。
- 只有 `onSubmitEditing` 且 `query.trim().length > 0` 时才写入历史并查询 tasks / memos / set_records；结果卡固定 72 高、圆角 16，左侧彩色标签，右侧日期。
- 结果点击先 `Keyboard.dismiss()` 并执行 200ms 收起，再 `router.push`：fitness 带 `date` 进 `/fitness`；计划/备忘进带 `DateStrip` 的 `/day/[date]` 并高亮该日期。

### Dash：220×280 竖卡

- `DASH_CARD_WIDTH=220`、`DASH_CARD_HEIGHT=280`、`SPACING=16`、`SNAP_INTERVAL=236`、左侧 20、右侧留白 135、圆角 26；`contentContainerStyle` 为 `paddingLeft: 20, paddingRight: 135`。
- 视差缩放 `0.88/1/0.88`，并叠加 `translateY: 14/0/14`；375 宽实测首卡右侧第二张可见约 105.8dp，Tasks 标题在首屏 y≈536 可见。
- 卡片左上图标改为 48×48 纯白圆底、24dp 图标；右上箭头移到右下 `right:16/bottom:16` 的 36×36 白圆；文字块右下留出 44dp 避让。

### 日期条 / 课表 / 下拉

- DateStrip 删除内部“本周”按钮与 `handleGoToday`，页面恢复 `paddingHorizontal:16`；选中态只保留 38×56、radius 19 的纯黑胶囊，今天未选中不再有任何边框/描边，仅通过数字加粗与底部小圆点标识。
- 计划页与健身页在日期副标题右侧新增“回今天”胶囊（`#F2F2F7`、12sp/600、`#1C1C1E`、radius 11），仅当 `date !== today` 时显示，点击复位日期；右上角日历图标保持原位。
- 课表拆出 `TimetableScreen({ mode })`：`(tabs)/middle` 在第三格为课表时直接渲染 `mode="tab"`，保留底栏、无返回按钮；只有非 Tab 场景才走 `/timetable` 二级页并显示 36×36 圆形返回。
- 首页移除 `RefreshControl`，所有平台统一 PanResponder + Reanimated `pullDistance`：位移 `Math.min(Math.max(dy * 0.5, 0), 120)`，标题 `[0,100]→[1,1.18]`，松手 `>60` 刷新，完成后 `withSpring(0,{damping:18,stiffness:180})`；内容整体 `translateY` 与标题联动，无转圈图标。
- 课程行地点继续按 `periodLabel · time · room` 拼接；`listCoursesForDate` 已从 `sched_courses.location` 映射 `room`，空地点自动省略最后一段。

### 测试

- 更新 `tests/p5-home.test.ts`、`tests/s0-settings-v6.test.ts`、`tests/a1-timetable-v7.test.ts`、`tests/s2-tab-bar.test.ts`、`tests/s3-dash.test.ts`、`tests/s5-module-m1.test.ts`、`tests/s7-module-m3.test.ts`、`tests/s8-module-m5.test.ts`；新增 `tests/p9-search.test.ts`。
- `npm run verify` 通过：38 个测试文件 / 258 条用例、`tsc --noEmit`、`expo lint`；E2E 9 个场景全部通过。
- 375×812 Web 实测：搜索覆盖底栏、空态只显示历史、回车出结果、结果带日期跳转；Dash 220×280；计划/健身“回今天”；middle 课表无返回；下拉内容 `translateY=45`、标题 `scale=1.081` 后回弹。

App 内显示版本仍为 1.2.2，不弹更新日志。

## v1.2.13 — 2026-11-12

### 日期条快捷回到今天 / 去残留描边

- `DateStrip` 保留 101 周 `FlatList` 分页与 40×60 日期格；清除 Web 端日期格点击后的 `outline` 焦点外框（`borderWidth: 0`、`outlineWidth: 0`、透明 outline），选中态只剩 38×56 / 圆角 19 的黑色胶囊，不再叠加任何“今天”描边。
- 日期条右侧新增轻量“本周”按钮：`#F2F2F7` 胶囊、12sp 文字、36×28、右侧 16、垂直居中，`accessibilityLabel="回到今天"`。日期页 `paddingRight: 58` 给按钮留位，7 天仍保持 `space-between`。
- 点击“本周”会立即把 `selectedDate` 重置为今天；若今天在当前 101 周窗口内，直接 `scrollToOffset` 到对应周页，否则以今天重建窗口。计划页和健身页共用同一组件，按钮同时生效，右上角日历图标保持不变。

### Dash 卡片放大

- `DASH_CARD_WIDTH` 150 → 175，`DASH_CARD_HEIGHT` 190 → 235，圆角保持 22；卡片改为更明显的竖长方形，`SPACING=16`、左侧 20、右侧候场第二张继续按 0.9 视差缩放并在屏幕右侧露出。
- 首页 `contentContainerStyle` 仍为 `paddingBottom: 120`；390×844 实测 Tasks 标题在首屏 y≈504 可见。

### 沉浸搜索与结果跳转

- 新增 `src/db/repositories/search.ts`：统一搜索计划任务（标题/备注）、备忘正文、健身记录（按日期 + 动作聚合组数）；空关键词返回最近记录，每源 24 条、总 30 条。
- 新增 `SearchResults`：全屏搜索面板内 `FlatList`，每条固定 72 高、圆角 16 白卡；左侧计划/备忘/健身彩色标签，中间标题与副标题，右侧所属日期；空结果显示“没有找到相关内容”。
- 首页搜索聚焦后输入 120ms 防抖调用 `searchRecords`，结果面板渐显；点击结果先执行收起动画，再按类型跳转：计划/备忘 → `/day/[date]`，健身 → `/fitness?date=YYYY-MM-DD`。
- 新增 `src/app/day/[date].tsx` 二级详情页（`SubPageHeader` + 该日 `TodayList`）；`fitness.tsx` 接收 `date` 并传给 `FitnessScreen initialDate`，从搜索进入时不会被聚焦逻辑拉回今天。
- `src/app/_layout.tsx` 注册 `day/[date]` 路由。

### 下拉标题放大

- iOS 恢复原生负 overscroll：`scrollY` 经 `[-100, 0] → [1.2, 1]` 驱动标题 `scale`，整页由 ScrollView 原生位移；`onScrollEndDrag` 越过 `-64` 触发 `handleRefresh()`，无 `RefreshControl` 转圈。
- Android/Web 保留 `PanResponder`：顶部向下拉时 `pull` 0..120，整块内容 `translateY`，标题 `1 → 1.2`；未过 64 立即 spring 回位，过阈值等 `handleRefresh().finally()` 后再回弹。
- 标题 transform 只作用于左侧文字列（`transformOrigin: 'left center'`），右侧头像不被裁切；`pullWrap` 设置 `userSelect: 'none'`，避免 Web 选中文字抢走手势。

### 测试

- 更新 `tests/p5-home.test.ts`、`tests/s3-dash.test.ts`、`tests/s4-polish.test.ts`、`tests/s5-module-m1.test.ts`、`tests/s7-module-m3.test.ts`、`tests/s8-module-m5.test.ts`；新增 `tests/p9-search.test.ts`。
- `npm run verify` 通过：38 个测试文件 / 258 条用例、`tsc --noEmit`、`expo lint`。
- E2E 9 个 UI 场景全部通过。Web 390×844 实测：日期条 7 天不溢出、左滑翻周后保持星期几、“本周”回到今天；Dash 175×235、Tasks 标题首屏可见；下拉整页联动、标题放大不裁切；搜索聚焦、结果卡片与 `/day/2026-11-12` 跳转均正常。

App 内显示版本仍为 1.2.2，不弹更新日志。

## v1.2.12 — 2026-11-12

### DateStrip 按周分页重构

- `DateStrip` 从「3 页 ScrollView + 翻周后强制回中间页」改为 `FlatList` 的 101 个自然周分页（当前周前后各 50 周），每页一整屏宽，一次滑动只翻一周；不再回写滚动位置，消除翻周黑框跳动。
- 每页固定 7 天，`paddingHorizontal: 16`、`justifyContent: 'space-between'`，容器高 80；DayCell 固定 40×60，数字 16sp 粗体、星期 12sp，未选中 `#8E8E93`，选中白色。选中态为 38×56 / 圆角 19 的纯黑胶囊，150ms `Easing.out(Easing.cubic)` 淡入缩放，不做跨格平滑滑动。
- DayCell 用 `React.memo` 包裹，只比较选中态、记录点、是否今天和主题文字色；翻周时未选中的格子不再重渲染。`FlatList` 使用 `windowSize=5`、`initialNumToRender=3`、`getItemLayout`，Web 实测常驻约 6 周（42 个格子），不是 101 周全量挂载。
- `onMomentumScrollEnd` 用 `Math.round(offsetX / pageWidth)` 计算当前周：当前周自动选中今天；其他周保持原来的星期几（如周三 → 下周三）；立即 `onChange(newDate)` 驱动 Today/Fitness 重新查询，不需要再点一次日期。Web 端保留 140ms 滚动停止兜底，并用页面/日期去重避免兜底与吸附互相触发。
- 日历跳到预加载窗口外时，围绕新日期重建 101 周窗口；窗口内跳转只滚动到对应页，不重建列表。
- 文件：`src/components/ui/date-strip.tsx`、`tests/s5-module-m1.test.ts`、`tests/s4-polish.test.ts`。

### 测试

- 源码约束更新为 101 周、`pagingEnabled`、`onMomentumScrollEnd`、40×60 日期格、38×56 黑色胶囊、150ms 淡入、`React.memo`；移除旧的“今天 1.5pt 描边”和 3 页 ScrollView 断言。
- `npm run verify` 通过：37 个测试文件 / 254 条用例、`tsc --noEmit`、`expo lint`。
- E2E 9 个 UI 场景全部通过。Web 390×844 实测：7 个日期格 x=16…374、每格 40×60、胶囊 38×56/radius19；左滑从 11-09…11-15 到 11-16…11-22，标题立即变为 `11月19日 周四`；从周二 11-10 出发翻到下周会保持周二（11-17）。跨周建任务后翻回本周消失、再翻到下周重新出现。

App 内显示版本仍为 1.2.2，不弹更新日志。

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