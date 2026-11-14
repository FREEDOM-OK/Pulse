import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';

import { AppTabBar } from '@/components/nav/app-tab-bar';
import { TAB_ITEMS } from '@/constants/tabs';
import { getMiddleTab } from '@/db/repositories/settings';
import type { MiddleTab } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { useDataVersion } from '@/lib/data-version';

export default function TabsLayout() {
  const version = useDataVersion();
  const theme = useTheme();
  const [middle, setMiddle] = useState<MiddleTab>('fitness');

  useEffect(() => {
    let alive = true;
    getMiddleTab()
      .then((value) => {
        if (alive) setMiddle(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [version]);

  return (
    <Tabs
      // 底栏切换只做淡入淡出；二级页面的水平推入由外层根 Stack 接管。
      screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: theme.background } }}
      tabBar={(props) => <AppTabBar {...props} middle={middle} />}>
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}