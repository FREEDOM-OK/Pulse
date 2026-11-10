/**
 * 全局提示 / 确认 / 操作菜单。
 *
 * 为什么不用 `Alert.alert`：react-native-web 上 Alert 是空实现，网页预览与 E2E
 * 里点「保存」「删除」完全没有反应。这里用一份极小的全局状态 + `<DialogHost />`
 * 渲染，三端行为一致。
 */

export interface DialogOption {
  label: string;
  danger?: boolean;
  onPress?: () => void | Promise<void>;
}

export interface DialogState {
  id: number;
  kind: 'notice' | 'confirm' | 'actions';
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  options?: DialogOption[];
  resolve?: (ok: boolean) => void;
}

let nextId = 1;
let current: DialogState | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeDialog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDialogSnapshot(): DialogState | null {
  return current;
}

/** 提示一条信息，只有一个「知道了」按钮。 */
export function showNotice(message: string, title = '提示') {
  current = { id: nextId++, kind: 'notice', title, message, confirmLabel: '知道了' };
  emit();
}

/** 二次确认，返回是否点了确认。 */
export function askConfirm(options: {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    current = {
      id: nextId++,
      kind: 'confirm',
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? '确定',
      danger: options.danger ?? false,
      resolve,
    };
    emit();
  });
}

/** 操作菜单（替代长按后的系统 ActionSheet）。 */
export function showActions(options: {
  title: string;
  message?: string;
  options: DialogOption[];
}) {
  current = {
    id: nextId++,
    kind: 'actions',
    title: options.title,
    message: options.message,
    options: options.options,
  };
  emit();
}

/** 关闭当前弹层，`ok` 用于 confirm 的返回值。 */
export function closeDialog(ok = false) {
  const dialog = current;
  current = null;
  emit();
  dialog?.resolve?.(ok);
}

export async function runDialogOption(option: DialogOption) {
  closeDialog(true);
  await option.onPress?.();
}