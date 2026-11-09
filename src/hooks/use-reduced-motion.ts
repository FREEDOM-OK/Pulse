import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * 是否开启「减弱动效」。
 *
 * iOS / Android 读系统无障碍设置，Web 读 `prefers-reduced-motion`。
 * 组件在有动效时都应该先问这个 hook，开启时直接跳过动画。
 */

let reduced = false;
const listeners = new Set<() => void>();

function emit(next: boolean) {
  if (next === reduced) return;
  reduced = next;
  for (const listener of listeners) listener();
}

function subscribeWeb(): (() => void) | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) {
    return undefined;
  }
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  emit(query.matches);
  const handler = (event: MediaQueryListEvent) => emit(event.matches);
  query.addEventListener?.('change', handler);
  return () => query.removeEventListener?.('change', handler);
}

let started = false;

function ensureSubscribed() {
  if (started) return;
  started = true;
  const offWeb = subscribeWeb();
  if (!offWeb) {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => emit(value))
      .catch(() => undefined);
  }
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value: boolean) => emit(value));
}

function subscribe(listener: () => void): () => void {
  ensureSubscribed();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return reduced;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}