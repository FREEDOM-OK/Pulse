import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

// TimetableProvider 已上移到 src/app/_layout.tsx：课表数据在应用启动时预热，
// 进入课表页面不再触发一次数据库加载（这是「点进课表卡一下」的主因）。
export default function TimetableLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // 与根 Stack 保持一致：紧凑的 iOS 视差退场，且退场期间冻结页面防止白板。
        animation: 'ios_from_right',
        animationDuration: 180,
        freezeOnBlur: true,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}