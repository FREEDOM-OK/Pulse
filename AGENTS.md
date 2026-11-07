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

## 已知坑（本项目实践，改动前先读）

### 1. 行内左滑被父级横滑手势抢走

游戏页列表外层有「空白区左右滑切页签」的 PanResponder，会吃掉行内 SwipeRow 的水平位移（早期还有整卡 Pressable 一起抢）。

约定（`src/lib/gesture.ts`）：

- 外层容器在**捕获阶段**清标记：`onStartShouldSetPanResponderCapture={() => { clearRowGesture(); return false; }}`
- 行在自己的 start 阶段 `markRowGesture()` 并**返回 false**（不改父级夺取逻辑，与 RN 遍历方向无关）
- 行的 `onMoveShouldSetPanResponderCapture` 用 `|dx| > 8 && |dx| > |dy| * 1.2`
- 外层 move 判定必须是 `!isRowGestureActive() && isTabSwipe(...)`
- 卡片上的「编辑」不要用整卡 Pressable，改放 SwipeRow 的动作按钮

### 2. 跑 E2E 前必须重启 Metro

Expo 在 `CI=1` 下不监听文件变化，8090 上可能是上一次甚至上个会话的包 —— 症状是断言刚写的代码却整片失败。

规则：先 `Stop-Process` 掉旧进程，再 `npx expo start --web --port 8090 --clear`，然后才 `node tests/e2e/run.mjs`。

### 3. E2E 的两个细节

- Web 端 SwipeRow 用 CDP 鼠标拖拽无效（鼠标 drag 会变成选中文字）。必须用 `Input.dispatchTouchEvent`，即 `tests/e2e/browser.mjs` 的 `touchSwipeLeft` / `swipeLeft`，并断言行真的左移 ≥40px。
- 场景之间会串数据：假设空库的场景开头先 `page.evaluate('localStorage.clear()')` 再 goto。

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
