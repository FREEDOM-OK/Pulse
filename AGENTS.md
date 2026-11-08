This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

```bash
npm run verify   # 一次跑完 单测 → tsc --noEmit → expo lint，失败即非零退出
node tests/e2e/run.mjs   # 端到端（无头 Chrome，需先启动 Web dev server，见下方「已知坑」）
```

## 版本日志

- 小改动只在 `CHANGELOG.md` 里升补丁版本（v1.0.1、v1.0.2…），**不改 `app.json` 的 version，也不在 App 内加更新日志/提示**。
- 只有用户明确说「进入下一个大版本」时，才动 App 内显示的版本号与日志；版本节奏由用户决定。

## 数据模型（v1.1）

- 5 个 Tab：`index`（首页两页）/ `today` / `fitness` / `games` / `settings`；二级页 `calendar`、`profile`。
- `SCHEMA_VERSION = 3`：`events(date, type, title, amount, note, created_at)` 替代已删除的 `diet_records` / `memos`；资料存在 `settings` 的 `profile.name|gender|birthday|avatar`。
- 备份 `BACKUP_VERSION = 3`：导入 v1/v2 时 `dietRecords` 自动转成 `type='meal'` 事件、`memos` 忽略；导出不含预置动作与头像文件；清空数据保留 44 个预置动作并重置资料。

## 已知坑（本项目实践，改动前先读）

### 1. 行操作统一用长按菜单，不要再加左滑

行内左滑（旧 `SwipeRow`）会被父级横滑 PanResponder 抢走手势，父子级判定很脆弱，已整体废弃（`swipe-row.tsx` 与 `lib/gesture.ts` 已删除）。

约定：

- 「删除 / 编辑」入口一律用 `Pressable` 的 `delayLongPress={400}` + `onLongPress`，弹出统一的 `src/components/ui/action-menu.tsx`（屏幕正中的操作卡，条目 `{ key, label, danger?, onPress }`）。
- 行不要再包可横向拖动的容器；游戏页整块列表的 `PanResponder` 只在 `onMoveShouldSetPanResponderCapture` 用 `isTabSwipe(dx, dy, 10)` 接横向拖动 —— 长按没有位移，不会被抢。
- 危险操作仍要 `ConfirmDialog` 二次确认。

### 2. 跑 E2E 前必须重启 Metro

Expo 在 `CI=1` 下不监听文件变化，8090 上可能是上一次甚至上个会话的包 —— 症状是断言刚写的代码却整片失败。

规则：先 `Stop-Process` 掉旧进程，再 `npx expo start --web --port 8090 --clear`，然后才 `node tests/e2e/run.mjs`。

### 3. 手势类改动交给真人验证，别硬写 E2E

「手势 + Web 模拟」两个变量相乘，自动化验证成本极高且结论不可信：

- CDP 注入的 `touch` 事件驱动不了 react-native-web 的 PanResponder（逻辑没错也测不出位移）；鼠标拖拽又会在拖动时选中文字，`selectionchange` 会把响应者抢走。
- 因此**滑动 / 拖拽 / 翻页 / 长按这类交互不要写自动化测试**，改完说明改动点，交给用户在自己手机上验证（用户 m01612 明确要求）。
- 必须用 E2E 兜底拖拽时：`mouseDrag` 小步移动 8–10 步（大跨度两次移动不触发），拖动容器加 `userSelect: 'none'`，断言里先打印实际位移再比较。
- 长按用 `longPress(text)`（touchStart → 等约 700ms → touchEnd）；长按松手后浏览器会补发 click，菜单遮罩必须用响应者手势关闭，不能用 `Pressable`（见 `action-menu.tsx` 注释）。
- 场景之间会串数据：假设空库的场景开头先 `page.evaluate('localStorage.clear()')` 再 goto。

**测试上限**：任何测试连续两轮仍失败或没有结果，直接跳过当前测试，并在汇报里写明跳过了什么、卡在哪（用户要求）。

### 4. Web 端数据层

Web 用 sql.js + localStorage 模拟 SQLite（原生端是 expo-sqlite）。单测走 `tests/helpers/node-driver.ts` 的 node:sqlite 驱动，可直接在 Node 里跑 repository 层。

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
