# 课表功能移植 · 收尾计划（现状 → 可交付）

> 目标：把 `timetable_react_native` 的课程表能力完整落进 `my-life-app`，**只做课表**，不碰首页/健身/游戏/我的；纯本地 SQLite，无任何后端接口。
> 本文档基于 2026-11-10 对工作区的实测（tsc / npm test / expo lint / 真机 Web E2E），每一处都给了文件路径、行号、可粘贴代码和验证命令。

---

## 0. 结论速览

| 项 | 状态 | 证据 |
|---|---|---|
| 页面落位与路由（A0/A1） | ✅ 完成 | `src/app/timetable/{_layout,index,course,courses,periods,settings,appearance,import,schedules}.tsx` 全部存在；`src/app/_layout.tsx:63` 注册 `timetable` |
| 数据模型 v7（三表 + 唯一索引） | ✅ 完成 | `src/db/schema.ts` MIGRATION_V7，`SCHEMA_VERSION = MIGRATIONS.length = 7` |
| 播种 / 设置 / 课表切换 | ✅ 完成 | `src/features/timetable/repository.ts` `ensureTimetableSeed()` |
| 今日课程桥接（课表 → 今日计划） | ✅ 完成 | `src/features/timetable/bridge.ts`，`src/components/today/today-list.tsx` |
| 备份导出/导入 v7 | ✅ 完成 | `src/db/repositories/backup.ts` `BACKUP_VERSION = SCHEMA_VERSION` |
| 系统 Alert 清零 | ✅ 完成 | timetable 目录 0 处 `Alert.`，改用 `@/lib/dialogs` |
| 单测 | ✅ 221 用例全绿 | `npm test` |
| 类型检查 | ✅ 0 错误 | `npx tsc --noEmit`（退出码 0） |
| Lint | ⚠️ 0 error / 8 warning | `npx expo lint` |
| 今日课程 → 课表定位（深链） | ❌ 未实现 | 见 G1 |
| 课表改动 → 首页刷新 | ❌ 未实现 | 见 G2 |
| 数据层收口（事务/去 `any`） | ❌ 未做 | 见 G3 |
| 会话唯一性（同课同日同起始节被覆盖） | ❌ 有 bug | 见 G4 |
| 课表 E2E 场景 | ❌ 红 | `node tests/e2e/run.mjs P4` 报「等待文本「课表设置」超时」 |
| 暗色模式 | ❌ 未适配 | 见 G6 |
| 文档/版本号 | ❌ 滞后 | 见 G7 |

**剩余工作量：约 4.5–5 小时**（含可选的暗色适配则 6–7 小时）。阻塞交付的只有 **B1、B2、B5**。

---

## 1. 范围与非目标

**做**：课表网格、课程增删改查、节次设置、外观设置、多课表、导入、今日课程联动、备份、E2E 与文档。

**不做**（明确排除，用户已确认）：
- 不接任何后端 API / 不做账号同步；
- 不改首页「今日计划」以外的模块（健身、游戏、我的、日历、卡片）；
- 不改动 `app.json` 的 `version`（项目约定：小改动只改 `CHANGELOG.md`）。

---

## 2. 已完成部分（不要再改）

| 文件 | 职责 | 行数 |
|---|---|---|
| `src/app/timetable/index.tsx` | 周视图网格、课程色块、课表切换菜单、详情抽屉 | 702 |
| `src/app/timetable/course.tsx` | 课程表单（名称/时段/周次/冲突校验） | 931 |
| `src/app/timetable/courses.tsx` | 全部课程列表 | — |
| `src/app/timetable/periods.tsx` | 节次时间设置 | — |
| `src/app/timetable/settings.tsx` | 设置入口（节次/导入/课表管理/全部课程/外观/关于） | 351 |
| `src/app/timetable/schedules.tsx` | 课表管理（开关学日期、总周数） | — |
| `src/app/timetable/import.tsx` | 文本导入（`expo-file-system/legacy`） | — |
| `src/features/timetable/TimetableContext.tsx` | 课表状态与写库（**待收口**） | 450 |
| `src/features/timetable/repository.ts` | 驱动复用 + 播种 + 读取 | — |
| `src/features/timetable/bridge.ts` | `listCoursesForDate(date)` / `getTodayCourses()` | — |
| `src/lib/timetable-core.ts` | 纯函数（周次、块切分、颜色） | 197+ |
| `src/components/timetable/course-detail-drawer.tsx` | 详情抽屉 | — |
| `src/components/timetable/settings-row.tsx` | 设置行（唯一带 `accessibilityLabel` 的组件） | — |
| `tests/a1-timetable-v7.test.ts` | 6 个数据层用例 | — |
| `tests/timetable-core.test.ts` | 13 个纯函数用例 | — |

---

## 3. 缺口清单

| 编号 | 现象 | 证据（文件:行） | 影响 | 工作包 |
|---|---|---|---|---|
| G1 | 点今日课程进课表后**不定位、不开抽屉** | 跳转写死了参数：`src/components/today/today-list.tsx:172` `router.push({ pathname: '/timetable', params: { courseId: String(course.courseId) } })`；但 `src/app/timetable/index.tsx` 全文无 `useLocalSearchParams` | 用户点了没反应，等于死链 | B1 |
| G2 | 课表增删改后，首页/今日计划**仍是旧数据** | 课表模块全目录 0 处 `bumpDataVersion()`；而 `src/components/today/today-list.tsx:62` 与 `src/app/(tabs)/index.tsx:29` 用 `useDataVersion()` 订阅 | 用户改完课回首页看不到变化，误以为没保存 | B2 |
| G3 | 写库逻辑散在 Context 里、用 `any`、**无事务** | `src/features/timetable/TimetableContext.tsx:244-302`；驱动的 `withTransactionAsync` 已具备（`src/db/driver.ts:20`）却在课表侧未使用 | 中途失败会留下「有课程无时段」的脏数据 | B3 |
| G4 | 同一课程、同一天、**同起始节的两个时段会被静默覆盖** | `TimetableContext.tsx:272` `INSERT OR REPLACE INTO sched_sessions` + `src/db/schema.ts:258-259` `UNIQUE (course_id, day_of_week, start_period)` | 用户排「实验课 1-2 节 + 1-4 节」这类组合时数据丢失 | B3 |
| G5 | 课表 E2E 场景**红** | `node tests/e2e/run.mjs P4` → `等待文本「课表设置」超时`；`tests/e2e/timetable.e2e.mjs` 仍在点「学期开始日」「保存」（新 UI 标题是「设置」，开学日期已移到 `schedules.tsx`，label 为 `开学日期 (YYYY-MM-DD)`） | 课表无自动化回归保护 | B5 |
| G6 | 暗色模式下课表**不跟随** | timetable 目录 7 个页面全部硬编码 `#F5F5F7` / `#FFFFFF` / `#111113`（如 `settings.tsx:258,278,302`）；仅 `settings-row.tsx:5` 用了 `useTheme` | 夜间使用刺眼 | B4 |
| G7 | 文档/版本滞后 | `CHANGELOG.md` 最新条目 v1.2.2，无课表条目；`settings.tsx:143` 硬编码 `1.0.0`；`AGENTS.md`「数据模型（v1.1）」仍写 `SCHEMA_VERSION=3` | 下一个人接手会照旧文档改错 | B6 |
| G8 | 死代码/临时文件 | `src/lib/course-form.ts`、`src/lib/course-copy.ts` 全仓 0 引用；`tests/e2e/_check_timetable.mjs`；`tests/e2e/failure-*.png`（8 张旧失败截图） | 噪音，易误改 | B0 |
| G9 | 课表 UI **没有 aria-label**（整个模块仅 1 个） | 全模块仅 `settings-row.tsx:69` 有 `accessibilityLabel`；E2E 帮助器的 `clickLabel/clickLabelContaining/waitForLabel/fillByLabel` 全部依赖 `[aria-label]`（`tests/e2e/browser.mjs:145-221`） | 这就是 G5 的**根因**：不补 label，E2E 无法驱动课表 | B5 |

---

## 4. 工作包（按顺序执行）

### B0 · 收尾清理（约 10 分钟，先做）

```powershell
cd 'D:\new app andriod\my-life-app'

# 1) 确认两个「疑似死代码」确实没被引用，期望输出为空
Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "course-form|course-copy"

# 2) 删除死代码与临时产物
Remove-Item src\lib\course-form.ts, src\lib\course-copy.ts -Force
Remove-Item tests\e2e\_check_timetable.mjs -Force
Remove-Item tests\e2e\failure-*.png -Force
Remove-Item e2e-p4.log, e2e-p6.log -Force -ErrorAction SilentlyContinue

# 3) 验证没删坏
npx tsc --noEmit; npm test
```

> 若第 1 步有输出，说明还有引用，**先别删**，把引用改掉再删。

---

### B1 · 今日课程 → 课表深链定位（约 30 分钟，必做）

**目标**：在首页/今日计划点「高等数学」，跳到课表并**自动切到本周、打开该课程抽屉**。

**改动 1**：`src/app/timetable/index.tsx`

第 11 行的 `expo-router` import 里加上 `useLocalSearchParams`：

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
```

在 `const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);`（`index.tsx:65`）之后插入：

```tsx
  // 从首页「今日课程」带 courseId 进来：定位到本周并直接打开详情抽屉
  const { courseId: deepLinkCourseId } = useLocalSearchParams<{ courseId?: string }>();
  const handledDeepLink = useRef<string | null>(null);
```

在 `const weeksArray = ...`（`index.tsx:72`）之后插入：

```tsx
  useEffect(() => {
    if (!deepLinkCourseId || handledDeepLink.current === deepLinkCourseId) return;
    const target = courses.find((c) => c.id === deepLinkCourseId);
    if (!target) return; // 课程还没加载出来或不属于当前课表，等下一次渲染
    handledDeepLink.current = deepLinkCourseId;
    setViewingWeek(currentWeek);
    const sIdx = target.sessions.findIndex((s) => s.dayOfWeek === todayDayOfWeek);
    setSelectedSessionIdx(sIdx >= 0 ? sIdx : 0);
    setSelectedCourse(target);
  }, [deepLinkCourseId, courses, currentWeek, todayDayOfWeek, setViewingWeek]);
```

**验收**：`npm test` 不回归；Web 上手点验证（见第 5 节 E2E-3）。

**回滚**：删掉上述 3 段即可，无副作用。

---

### B2 · 课表改动 → 首页/今日计划立即刷新（约 20 分钟，必做）

**目标**：课表里加/删/改课程、切课表、改节次时间后，首页与今日计划无需重启即刷新（`today-list.tsx` 已订阅 `useDataVersion()`，只差有人 bump）。

**改动**：`src/features/timetable/TimetableContext.tsx`

1. 顶部加 import：

```tsx
import { bumpDataVersion } from '@/lib/data-version';
```

2. 在 `saveCourse` 末尾（`await reloadAll();` 之后，`TimetableContext.tsx:294`）：

```tsx
    await reloadAll();
    bumpDataVersion();
```

3. 在 `deleteCourse` 末尾（`:301`）、`deleteSchedule` 末尾（`:240`）、`importCoursesToActiveSchedule` 末尾、`switchSchedule` 末尾、`updateSetting` 末尾、`resetAppearanceDefaults` 末尾，同样各加一行：

```tsx
    bumpDataVersion();
```

> 快捷做法：把 `reloadAll()` 的定义保持不动，只在这 7 处写库成功之后加 `bumpDataVersion();`——**不要**塞进 `reloadAll()` 里，否则挂载时会自激多刷一轮。

**验收**：Web 上在课表加一门今天的课 → 返回首页，今日计划**立刻**出现该课程行（不刷新页面）。

---

### B3 · 数据层收口 + 事务 + 修 G4 覆盖 bug（约 2 小时，必做）

#### B3.1 迁移 v8：放宽会话唯一约束

`src/db/schema.ts` 的 `MIGRATIONS` 数组末尾追加一项：

```ts
  // v8: 同一课程同一天允许两段相同起始节（如 1-2 节实验课 + 1-4 节理论课共存）
  `DROP INDEX IF EXISTS idx_sched_sessions_conflict;
   CREATE INDEX IF NOT EXISTS idx_sched_sessions_course ON sched_sessions(course_id, day_of_week);`,
```

`SCHEMA_VERSION = MIGRATIONS.length` 会自动变成 8；`backup.ts` 的 `BACKUP_VERSION = SCHEMA_VERSION` 自动跟随。
注意：`tests/a1-timetable-v7.test.ts` 里断言 schema 版本为 7 的用例要改成 8（同时把文件名/用例名里的 v7 保留，只改断言值）。

#### B3.2 把写库收进 repository

`src/features/timetable/repository.ts` 新增：

```ts
/** 事务内保存课程及其全部时段：先改课程行，再整体替换时段。 */
export async function saveCourseWithSessions(
  course: CourseEntity,
  isUpdate: boolean
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    if (isUpdate) {
      await db.runAsync(
        'UPDATE sched_courses SET name = ?, color = ?, credits = ?, updated_at = ? WHERE id = ?;',
        [course.name, course.color, course.credits || '选填', now, course.id]
      );
      await db.runAsync('DELETE FROM sched_sessions WHERE course_id = ?;', [course.id]);
    } else {
      await db.runAsync(
        'INSERT INTO sched_courses (id, schedule_id, name, color, credits, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [course.id, course.scheduleId, course.name, course.color, course.credits || '选填', now, now]
      );
    }
    for (const s of course.sessions) {
      await db.runAsync(
        `INSERT INTO sched_sessions
           (id, course_id, teacher, location, day_of_week, start_period, end_period, weeks, remark, custom_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          s.id, course.id, s.teacher || '', s.location || '',
          s.dayOfWeek, s.startPeriod, s.endPeriod,
          JSON.stringify(s.weeks), s.remark || '',
          s.customTime ? JSON.stringify(s.customTime) : '',
        ]
      );
    }
  });
}

/** 事务内删除课程及其时段。 */
export async function deleteCourseWithSessions(courseId: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sched_sessions WHERE course_id = ?;', [courseId]);
    await db.runAsync('DELETE FROM sched_courses WHERE id = ?;', [courseId]);
  });
}
```

#### B3.3 Context 改为调用（去掉内联 SQL 与 `any`）

`TimetableContext.tsx:244-302` 整段替换为：

```tsx
  const saveCourse = async (course: Omit<CourseEntity, 'createdAt' | 'updatedAt'>) => {
    const exists = courses.some((c) => c.id === course.id);
    await saveCourseWithSessions(course as CourseEntity, exists);
    const firstWeek = course.sessions[0]?.weeks[0];
    if (firstWeek) setViewingWeek(firstWeek);
    await reloadAll();
    bumpDataVersion();
  };

  const deleteCourse = async (courseId: string) => {
    await deleteCourseWithSessions(courseId);
    await reloadAll();
    bumpDataVersion();
  };
```

`importCoursesToActiveSchedule` 里的「先删旧课程再逐条插」同样包进 `db.withTransactionAsync(...)`。

#### B3.4 补一条回归用例

`tests/a1-timetable-v7.test.ts` 新增：

```ts
it('同一课程同一天可保存两个同起始节的时段（v8 放宽唯一约束）', async () => {
  const id = 'c_dup';
  await saveCourseWithSessions({
    id, scheduleId: activeScheduleId, name: '实验课', color: '#3B82F6', credits: '选填',
    createdAt: '', updatedAt: '',
    sessions: [
      { id: 's1', courseId: id, teacher: '', location: '', dayOfWeek: 1,
        startPeriod: 1, endPeriod: 2, weeks: [1], remark: '', customTime: null } as never,
      { id: 's2', courseId: id, teacher: '', location: '', dayOfWeek: 1,
        startPeriod: 1, endPeriod: 4, weeks: [1], remark: '', customTime: null } as never,
    ],
  }, false);
  const rows = await db.getAllAsync('SELECT id FROM sched_sessions WHERE course_id = ?;', [id]);
  expect(rows).toHaveLength(2);
});
```

#### B3.5 清 lint（8 个 warning）

```powershell
npx expo lint --fix   # 先自动修 6 个 array-type
```

剩下 2 个手工：
- `TimetableContext.tsx:11`：删掉未使用的 `PeriodTime` 导入；
- `course-detail-drawer.tsx:64`：`useEffect` 依赖数组改为 `[mounted, backdropOpacity, translateY]`，或在该行上方加 `// eslint-disable-next-line react-hooks/exhaustive-deps`（动画自有驱动，不重跑是对的）。

**验收**：`npx tsc --noEmit` 退出码 0；`npm test` 全绿且新增用例通过；`npx expo lint` → `0 problems`。

---

### B4 · 暗色模式适配（约 1.5 小时，**可延后**）

有两种做法，建议选 B（改动小、色块设计不变形）：

- **方案 A（全跟随）**：每个课表页面 `const t = useTheme();`（`@/hooks/use-theme`），把 `#F5F5F7`→`t.background`、`#FFFFFF`→`t.backgroundElement`、`#111113`→`t.text`、`rgba(0,0,0,0.6)`→`t.textSecondary`。代价：`StyleSheet.create` 里的静态颜色要挪进行内样式，7 个文件都要动。
- **方案 B（纸张保持浅色，外壳跟随，推荐）**：只把页面容器、导航条、设置列表、抽屉的底色/文字换成主题色，**课表网格纸张仍然白**（色块的浅色底纹与深色底不协调）。改动面缩到 4 个文件。

**验收**：系统切深色后，课表页顶部栏/设置页/抽屉变深色，网格可读。

---

### B5 · 课表 E2E：补 aria-label + 重写场景（约 2 小时，必做）

#### B5.1 补 `accessibilityLabel`（Web 端会渲染为 `aria-label`）

React Native 的 `TouchableOpacity` / `Pressable` / `TextInput` 都支持 `accessibilityLabel`。按下表加：

| 文件:行 | 元素 | 建议 label |
|---|---|---|
| `src/app/timetable/index.tsx:301` | 课表名区域 | `` `切换课表，当前 ${activeSchedule.name}` `` |
| `index.tsx:328` / `:335` | ‹ / › 翻页 | `上一周` / `下一周` |
| `index.tsx:344` | ＋ 按钮 | `添加课程` |
| `index.tsx:357` | ··· 按钮 | `更多操作` |
| `index.tsx:371` | 设置键 | `课表设置` |
| `index.tsx:317` | 回到本周 | `回到本周` |
| `index.tsx:244` | 课程色块 | `` `${course.name} 第 ${session.startPeriod}-${session.endPeriod} 节` `` |
| `src/app/timetable/course.tsx` 保存按钮（`Text:233` 外层 TouchableOpacity） | 保存 | `保存` |
| `course.tsx` 名称/地点/教师/备注 的 `TextInput` | 输入框 | `课程名称` / `地点` / `教师` / `备注` |
| `course.tsx:434` | ＋ 添加时段 | `添加时段` |
| `course.tsx:682` | 时段弹窗确定 | `确定时段` |
| `src/components/timetable/course-detail-drawer.tsx` | 抽屉按钮 | `关闭抽屉` / `编辑课程` / `复制课程` / `删除课程` |
| `src/app/timetable/settings.tsx:45` | 返回 | `返回` |
| `settings.tsx:56/63/75/85` | 四行入口 | `节次设置` / `导入课表` / `课表管理` / `全部课程` |
| `src/app/timetable/schedules.tsx` | 表单 | `新建课表` / `课表名称` / `开学日期` / `总周数` / `保存` |

> 加完先跑 `node tests/e2e/run.mjs P4` 之前的旧脚本会更容易断言；但旧脚本整体作废，直接换成 B5.2。

#### B5.2 重写 `tests/e2e/timetable.e2e.mjs`

```js
/**
 * P4 课表：进入课表 → 新建课程 → 色块出现 → 打开详情抽屉 → 翻周并回到本周
 * → 回首页验证今日课程联动 → 点今日课程回到课表并自动开抽屉（深链）。
 *
 * Web 端数据库存在 localStorage，场景先清库；课程名带时间戳避免重名。
 */
export async function run(page, baseUrl) {
  const courseName = `高等数学${String(Date.now()).slice(-4)}`;

  await page.goto(`${baseUrl}/timetable`);
  await page.evaluate('localStorage.clear()');
  await page.reload();

  await page.waitForText('还没有课程', 20000); // 空课表状态

  // 1. ＋ 新建课程（默认落在「今天 / 第 1 节」）
  await page.clickLabel('添加课程');
  await page.fillByLabel('课程名称', courseName);
  await page.fillByLabel('地点', 'A101');
  await page.clickLabel('添加时段');
  await page.waitForText('选择星期与节次');
  await page.clickLabel('确定时段');
  await page.clickLabel('保存');
  await new Promise((r) => setTimeout(r, 800));

  // 2. 冲突时仍然保存
  if (await page.has('时间冲突')) {
    await page.clickText('仍然保存');
    await new Promise((r) => setTimeout(r, 800));
  }

  await page.waitForText(courseName);

  // 3. 点色块 → 详情抽屉
  await page.clickLabelContaining(courseName);
  await page.waitForText('备注');
  await page.waitForLabel('编辑课程');
  await page.clickLabel('关闭抽屉');

  // 4. 翻到下一周再回来
  const weekText = await page.evaluate(
    '(document.body.innerText.match(/第 \\d+ 周/) || ["第 1 周"])[0]'
  );
  await page.clickLabel('下一周');
  await page.waitForNoText(weekText);
  await page.clickLabel('回到本周');
  await page.waitForText(weekText);
  await page.waitForText(courseName);
}
```

**验收**：`node tests/e2e/run.mjs P4` 输出 `✓ P4 课表`；截图 `tests/e2e/failure-P4 课表.png` 不再生成。

#### B5.3 深链场景（依赖 B1）

在 `tests/e2e/timetable.e2e.mjs` 末尾追加：

```js
  // 5. 深链：首页点今日课程 → 课表自动打开该课抽屉
  await page.goto(`${baseUrl}/`);
  await page.waitForText(courseName, 20000);
  await page.clickText(courseName);
  await page.waitForLabel('编辑课程');
  await page.waitForText('备注');
```

---

### B6 · 文档与版本对齐（约 20 分钟）

1. `CHANGELOG.md` 顶部加 `## 1.2.3`：课表功能移植（新增周视图网格、课程表单、节次/外观设置、多课表、文本导入、今日课程联动、备份 v8）。
2. `AGENTS.md`「数据模型」段：`SCHEMA_VERSION=3` → `8`，并补三张表 `schedules / sched_courses / sched_sessions` 与 `src/features/timetable/` 目录说明。
3. `src/app/timetable/settings.tsx:143` 的硬编码 `1.0.0` 改为：

```tsx
import Constants from 'expo-constants';
...
<Text style={styles.rowValue}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
```

4. 确认 `PLAN_timetable_apply.md` 在 A0–A6 全部落地后标注「已完成」，避免下一个人重复执行。

---

## 5. 执行顺序与批次验证

| 批次 | 内容 | 验证命令 | 期望 |
|---|---|---|---|
| 1 | B0 清理 | `npx tsc --noEmit; npm test` | 退出码 0 / 全绿 |
| 2 | B1 深链 + B2 刷新 | `npm test` + Web 手点 | 点今日课程开抽屉；回首页即刷新 |
| 3 | B3 数据层 + 迁移 v8 | `npx tsc --noEmit; npm test; npx expo lint` | 0 错 / 全绿（含新用例）/ 0 problems |
| 4 | B5.1 补 label + B5.2/B5.3 重写 E2E | 见下方 E2E 命令 | `✓ P4 课表` |
| 5 | B6 文档 + （可选 B4 暗色） | `npm run verify` | 全绿 |
| 6 | 全量回归 | `npm run verify` + `npm run test:e2e` | 全部场景通过 |

**E2E 固定流程**（`AGENTS.md` 要求，改完代码必须重启 dev server）：

```powershell
cd 'D:\new app andriod\my-life-app'
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
npx expo start --web --port 8090 --clear     # 后台跑，等 "Waiting on http://localhost:8090"
node tests/e2e/run.mjs P4                    # 课表场景
node tests/e2e/run.mjs P2                    # 今日计划（回归桥接）
```

---

## 6. 验收清单

- [ ] 1. 首页底部第三格可切到「课表」，点击进入 `第 1 周` 网格
- [ ] 2. 空白格点击进入课程表单，预设该天该节次
- [ ] 3. 课程表单：名称必填、≤30 字；可加多个时段；保存后色块出现在对应周对应天
- [ ] 4. 时间冲突弹「冲突确认」，选「仍然保存」可存
- [ ] 5. 点色块打开抽屉：教师/地点/备注可写，可编辑、复制、删除
- [ ] 6. ‹ › 翻周，跨周课程只在所属周显示；「回到本周」可回
- [ ] 7. 午休位置设置在跨午休的课上切块显示（1-4 节 + 午休在第 4 节后 → 两块）
- [ ] 8. 设置页：节次时间可改；改完时间轴与课程时间同步
- [ ] 9. 课表管理：可新建/切换/删除课表；删到只剩一张时提示「至少保留一张」
- [ ] 10. 导入：粘贴文本可批量建课；备份导出/导入往返后课表完整（v8）
- [ ] 11. 今日计划出现今日课程行；**点击即跳课表并打开该课抽屉**（B1）
- [ ] 12. 课表增删改后**返回首页立即刷新**，无需重启 App（B2）
- [ ] 13. `npx tsc --noEmit` = 0；`npm test` 全绿；`npx expo lint` = 0 problems
- [ ] 14. `node tests/e2e/run.mjs P4` 通过

---

## 7. 风险与回滚

| 风险 | 说明 | 处置 |
|---|---|---|
| 迁移 v8 影响老备份 | v7 备份里同一课同日同起始节的会话本来就已被覆盖，导入不会解锁丢失数据 | 只放宽约束，不改表结构；`BACKUP_VERSION` 自动跟随，无需改备份格式 |
| 深链在课程不属于当前课表时无反应 | 设计如此（找不到就等下一次渲染） | 后续可加「已切到其他课表」提示，非本期 |
| 补 aria-label 影响样式 | 纯属性，不参与布局 | 无需回滚 |
| E2E 依赖空库 | 脚本先 `localStorage.clear()` | 与 `today.e2e.mjs` 同样的既有做法 |
| 首页 E2E（P6）当前红 | **与课表无关**：前一个场景把 Dash 卡片全关，首页显示「Dash 卡片都关掉了 / 去开启」，脚本等「去健身」超时 | 属既有测试状态污染；若要修，在 `home.e2e.mjs` 开头恢复卡片配置，不在本计划范围 |

---

## 8. 附：本次实测记录

| 命令 | 结果 |
|---|---|
| `npx tsc --noEmit` | 退出码 0 |
| `npm test` | 32 文件 / 221 用例全绿 |
| `npx expo lint` | 0 error / 8 warning |
| `node tests/e2e/run.mjs P2` | ✓ 今日计划 (15760ms) |
| `node tests/e2e/run.mjs P4` | ✗ `等待文本「课表设置」超时` |
| `node tests/e2e/run.mjs P6` | ✗ 首页（Dash 卡片被关，测试污染，与课表无关）；P6b 卡片管理 ✓ |
---

## 9. 执行记录（2026-11-10 实际完成）

| 步骤 | 状态 | 实际改动 |
|---|---|---|
| B0 清理 | 完成 | 删除 `src/lib/course-form.ts`、`src/lib/course-copy.ts`（全仓无引用）与 `tests/e2e/failure-*.png` 旧失败截图；`_check_timetable.mjs` 实际不存在 |
| B1 深链 | 完成 | `src/app/timetable/index.tsx` 接 `useLocalSearchParams<{ courseId?: string }>()`，用 `handledDeepLink` ref 防重入，命中课程后 `setViewingWeek(currentWeek)` + 打开详情抽屉（按今天星期选 sessionIndex） |
| B2 刷新 | 完成 | `src/features/timetable/TimetableContext.tsx` 在 8 个写操作 `await reloadAll()` 后调用 `bumpDataVersion()` |
| B3 数据层 | 完成 | `src/db/schema.ts` 新增 `MIGRATION_V8`（删唯一索引 `idx_sched_sessions_conflict`、建非唯一索引 `idx_sched_sessions_course`）→ SCHEMA_VERSION=8；`src/features/timetable/repository.ts` 新增 `saveCourseWithSessions` / `deleteCourseWithSessions`（事务内写入）；导入课程整体包进事务 |
| B4 暗色 | 未做 | 计划中标为可选：8 个页面约 200 处硬编码浅色，全量主题化回归风险高，建议单独排期 |
| B5 标签 + E2E | 完成 | 课表目录补 87 处 `accessibilityLabel`；重写 `tests/e2e/timetable.e2e.mjs`（设置 / 课表管理 / 饱和度持久化 / 多时段表单 / 抽屉 / 翻周与回到本周 / 今日计划深链 / 文本导入） |
| B6 文档 | 完成 | `CHANGELOG.md` 新增 v1.2.3；`AGENTS.md` 数据模型段 SCHEMA_VERSION / BACKUP_VERSION 由 3 改为 8，并补课表三表说明 |

### 最终验证（本轮实跑）

| 命令 | 结果 |
|---|---|
| `npm run verify` | ✓ 单测 32 文件 / 222 用例、`tsc --noEmit`、`expo lint`（0 error 0 warning），9.3s |
| `node tests/e2e/run.mjs P4` | ✓ 课表 (19757ms)，连续两轮通过 |
| `node tests/e2e/run.mjs P2` | ✓ 今日计划 (15721ms) |

> P6 首页失败为既有测试状态污染（前序场景把 Dash 卡片全关），不在本计划范围。

### 已知限制（未处理，按范围约定不动）

- 深链目标课程不属于当前课表时无提示，需要用户手动切换课表。
- 课程冲突只做保存前二次确认，没有自动排课/避让。
- 暗色模式下课表仍显示浅色配色。

## 10. 2026-11-11 用户反馈修复（v1.2.4）

用户报告：`UNIQUE constraint failed: sched_courses.id`；进入课表卡顿；保存课程后闪退回首页；左右滑动翻周抽搐、自动来回滚动。

| 问题 | 根因 | 修法 |
|---|---|---|
| UNIQUE 冲突 | `saveCourseWithSessions` 用「列表里有没有这门课」判断 INSERT/UPDATE，双击或状态未刷新时两次都 INSERT | 改单条 `INSERT … ON CONFLICT(id) DO UPDATE`；播种/新建/复制/导入的 id 统一走 `createLocalId()` |
| 闪退回首页 | 保存/复制/删除/导入/切课表的 Promise 拒绝无人接管，原生端崩页面 | `course.tsx` 加 `savingRef` 单飞锁 + try/catch；抽屉复制删除、`import.tsx`、`schedules.tsx`、`index.tsx` 切课表全部兜住并就地 `showNotice` |
| 进课表卡一下 | `TimetableProvider` 挂在 `timetable/_layout`，每次进页面都重新播种 + 全量查询；FlatList 默认一次渲染 10 个周页面 | Provider 上移到 `src/app/_layout.tsx` 预热；`initialNumToRender/maxToRenderPerBatch = 1`、`windowSize = 3` |
| 翻周抽搐 | 分页宽度用窗口宽度、与实际容器宽度可能差几像素；`viewingWeek` 与 `onMomentumScrollEnd` 互相回写 | 页面宽度改容器 `onLayout` 实测值并用于 `getItemLayout`；程序化翻周期间用 `programmaticScrollRef` 屏蔽回写 + 半屏容差；`disableIntervalMomentum` 限制一次一页；网页端用滚动停止 160ms 兜底回写（RN-web 无 momentum 事件） |

验证：`tsc --noEmit` 0、`expo lint` 0 error 0 warning、`npm test` 32 文件 / 222 用例、`node tests/e2e/run.mjs P4` ✓ 课表（连续两轮 20s 左右通过）。

> 网页探针（`tests/e2e/_paging_check.mjs`）与 web E2E 只用于验证逻辑；项目实际只在 Android 真机使用，最终判断以真机为准。探针已删除。
