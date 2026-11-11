/**
 * 极简 CDP 浏览器驱动：用系统 Chrome 的 headless 模式做 UI 测试。
 * 不引入 puppeteer，只依赖 Node 内置的 fetch / WebSocket。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('没有找到 Chrome / Edge 可执行文件');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForHttp(url, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // 还没起来
    }
    await sleep(500);
  }
  throw new Error(`等待 ${url} 超时`);
}

class Page {
  constructor(ws, targetId) {
    this.ws = ws;
    this.targetId = targetId;
    this.nextId = 1;
    this.pending = new Map();
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP 超时: ${method}`));
        }
      }, 30000);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`页面脚本异常: ${result.exceptionDetails.text}`);
    }
    return result.result.value;
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    await this.waitForApp();
  }

  async waitForApp(timeoutMs = 90000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ready = await this.evaluate(
        `(() => {
           const text = document.body ? document.body.innerText : '';
           return text.length > 20 && !text.includes('数据库初始化失败');
         })()`
      );
      if (ready) return;
      await sleep(400);
    }
    const body = await this.evaluate('document.body.innerText.slice(0, 500)');
    throw new Error(`页面未就绪，当前内容：${body}`);
  }

  async text() {
    return this.evaluate('document.body.innerText');
  }

  async has(text) {
    return (await this.text()).includes(text);
  }

  async waitForText(text, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.has(text)) return;
      await sleep(250);
    }
    throw new Error(`等待文本「${text}」超时；当前内容：\n${await this.text()}`);
  }

  async waitForNoText(text, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (!(await this.has(text))) return;
      await sleep(250);
    }
    throw new Error(`文本「${text}」仍然存在`);
  }

  /** 点击包含指定文本的最内层元素。 */
  async clickText(text, index = 0) {
    const clicked = await this.evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,a,p'));
      const target = nodes
        .filter((el) => el.textContent.trim() === ${JSON.stringify(text)})
        .filter((el) => el.children.length === 0)[${index}];
      if (!target) return false;
      target.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`找不到可点击文本「${text}」`);
    await sleep(350);
  }

  /** 点击 aria-label 匹配的元素；index 为 -1 时取最后一个（弹窗里的按钮通常在后）。 */
  async clickLabel(label, index = 0) {
    await this.waitForLabel(label);
    const clicked = await this.evaluate(`(() => {
      const all = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((node) => node.getAttribute('aria-label') === ${JSON.stringify(label)});
      // 栈里上一页往往还挂在 DOM 上（尺寸 0 或被隐藏），先排掉，避免点到看不见的那一个。
      const visible = all.filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && node.checkVisibility?.() !== false;
      });
      const pool = visible.length > 0 ? visible : all;
      const target = ${index} < 0 ? pool[pool.length + ${index}] : pool[${index}];
      if (!target) return false;
      target.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`找不到 aria-label「${label}」(index=${index})`);
    await sleep(350);
  }

  /** 往 placeholder 匹配的输入框写内容（同名的第 index 个）。 */
  async fill(placeholder, value, index = 0) {
    const filled = await this.evaluate(`(() => {
      const el = Array.from(document.querySelectorAll('input, textarea'))
        .filter((node) => node.placeholder === ${JSON.stringify(placeholder)})[${index}];
      if (!el) return false;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      el.focus();
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!filled) throw new Error(`找不到输入框「${placeholder}」`);
    await sleep(200);
  }

  /** 往 aria-label 匹配的输入框写内容。 */
  async fillByLabel(label, value) {
    const filled = await this.evaluate(`(() => {
      const el = document.querySelector('[aria-label="${label}"]');
      if (!el) return false;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      el.focus();
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!filled) throw new Error(`找不到 aria-label 输入框「${label}」`);
    await sleep(200);
  }

  async blur() {
    await this.evaluate('document.activeElement && document.activeElement.blur()');
    await sleep(200);
  }

  async waitForLabel(label, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await this.evaluate(
        `!!document.querySelector('[aria-label="${label}"]')`
      );
      if (found) return;
      await sleep(250);
    }
    throw new Error(`等待 aria-label「${label}」超时`);
  }

  /** 点击 aria-label 包含指定文本的元素；index 为 -1 时取最后一个。 */
  async clickLabelContaining(text, index = 0) {
    const clicked = await this.evaluate(`(() => {
      const list = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((el) => (el.getAttribute('aria-label') || '').includes(${JSON.stringify(text)}));
      const el = ${index} < 0 ? list[list.length + ${index}] : list[${index}];
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`找不到包含「${text}」的 aria-label 元素`);
    await sleep(350);
  }

  async reload() {
    await this.send('Page.reload', { ignoreCache: false });
    await sleep(800);
    await this.waitForApp();
  }

  /**
   * 以空库打开某个地址：带 `?resetDb=1`，由 Web 驱动在读数前把上一次的库删掉。
   *
   * 不要用「localStorage.clear() 再 reload」：Web 驱动落盘有 50ms 去抖，
   * 上一场景挂起的定时器会在两步之间把旧库写回来，P6 首页因此拿到健身记录而超时。
   */
  async gotoFresh(url) {
    const target = new URL(url);
    target.searchParams.set('resetDb', '1');
    await this.goto(target.toString());
    await this.waitForApp();
    // 再走一遍干净地址：清库参数留在地址栏时，之后每次 reload 都会再清一次库。
    await this.goto(url);
    await this.waitForApp();
  }

  async screenshot(filePath) {
    const result = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
  }

  /** 从 (x,y) 拖到 (x2,y2)，用于触发左滑/右滑。 */
  async drag(x, y, x2, y2) {
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
    const steps = 12;
    for (let step = 1; step <= steps; step += 1) {
      await this.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: x + ((x2 - x) * step) / steps,
        y: y + ((y2 - y) * step) / steps,
        button: 'left',
      });
      await sleep(16);
    }
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: x2,
      y: y2,
      button: 'left',
      clickCount: 1,
    });
    await sleep(400);
  }

  /**
   * 鼠标按下/移动/松开三件套：可以在拖动中途取值（例如断言页签框跟着手走）。
   * Web 上 PanResponder 只认鼠标拖动，CDP 的触摸拖动不会触发响应者协商，别用 touch 测这类手势。
   */
  async mouseDown(x, y) {
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
  }

  async mouseMove(x, y) {
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
      button: 'left',
      buttons: 1,
    });
  }

  async mouseUp(x, y) {
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
    await sleep(350);
  }

  /** 用鼠标把 (x,y) 拖到 (x2,y2)，中途不留手。 */
  async mouseDrag(x, y, x2, y2, steps = 10) {
    await this.mouseDown(x, y);
    for (let step = 1; step <= steps; step += 1) {
      await this.mouseMove(x + ((x2 - x) * step) / steps, y + ((y2 - y) * step) / steps);
      await sleep(16);
    }
    await this.mouseUp(x2, y2);
  }

  /** 触摸拖拽三件套：可以在拖动中途取值（例如断言页签指示器跟着手指走）。 */
  async touchStart(x, y) {
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await this.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  }

  async touchMove(x, y) {
    await this.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }

  async touchEnd() {
    await this.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  }

  /** 从 (x,y) 触摸拖到 (x2,y2)：比鼠标拖拽更接近真机，也不会触发 Web 的文字选择。 */
  async touchDrag(x, y, x2, y2, steps = 12) {
    await this.touchStart(x, y);
    try {
      for (let step = 1; step <= steps; step += 1) {
        await this.touchMove(x + ((x2 - x) * step) / steps, y + ((y2 - y) * step) / steps);
        await sleep(16);
      }
      await this.touchEnd();
    } finally {
      await sleep(500);
    }
  }

  async touchSwipeLeft(x, y, distance = 140) {
    await this.touchDrag(x, y, x - distance, y);
  }

  /** 长按坐标；行内的长按阈值是 delayLongPress=400。用鼠标事件触发 RNW 的 Pressable。 */
  async longPress(x, y, holdMs = 700) {
    await this.mouseDown(x, y);
    try {
      await sleep(holdMs);
      await this.mouseUp(x, y);
    } finally {
      await sleep(400);
    }
  }

  /** 长按包含指定文本的元素，用于弹出「编辑 / 删除」菜单。 */
  async longPressText(text, holdMs = 700) {
    const rect = await this.rectOf(text);
    if (!rect) throw new Error(`找不到要长按的文本「${text}」`);
    await this.longPress(rect.x, rect.y, holdMs);
  }

  async longPressLabel(label, holdMs = 700) {
    const rect = await this.rectOfLabel(label);
    if (!rect) throw new Error(`找不到要长按的 aria-label「${label}」`);
    await this.longPress(rect.x + rect.width / 2, rect.y + rect.height / 2, holdMs);
  }

  /** 取 aria-label 匹配元素的矩形区域（视口坐标）。 */
  async rectOfLabel(label) {
    return this.evaluate(`(() => {
      const el = document.querySelector('[aria-label="${label}"]');
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    })()`);
  }

  async rectOf(text) {
    return this.evaluate(`(() => {
      const el = Array.from(document.querySelectorAll('div,span'))
        .filter((node) => node.textContent.trim() === ${JSON.stringify(text)})
        .filter((node) => node.children.length === 0)[0];
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const rect = el.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
  }
}

export async function launchBrowser() {
  const chrome = findChrome();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeapp-e2e-'));
  const port = 9300 + Math.floor(Math.random() * 500);

  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${port}`,
      '--window-size=500,1000',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  await waitForHttp(`http://127.0.0.1:${port}/json/version`, 30000);

  const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: 'PUT',
  });
  const target = await targetResponse.json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  const page = new Page(ws, target.id);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 500,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  return {
    page,
    async close() {
      try {
        ws.close();
      } catch {
        // ignore
      }
      child.kill();
      await sleep(300);
      try {
        fs.rmSync(profileDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    },
  };
}

export { sleep };
