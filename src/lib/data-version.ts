/**
 * 全局数据版本号：任何模块保存数据后调用 bumpDataVersion()，
 * 首页/今日计划等页面通过 useDataVersion() 订阅并按需重新加载。
 */

import { useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set<() => void>();

export function getDataVersion(): number {
  return version;
}

export function bumpDataVersion(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, getDataVersion, getDataVersion);
}