import React from 'react';
import { Stack } from 'expo-router';

// TimetableProvider 已上移到 src/app/_layout.tsx：课表数据在应用启动时预热，
// 进入课表页面不再触发一次数据库加载（这是「点进课表卡一下」的主因）。
export default function TimetableLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}