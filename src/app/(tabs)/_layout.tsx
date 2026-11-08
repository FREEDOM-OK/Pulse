import { Tabs } from 'expo-router/js-tabs';
import { AppTabBar } from '@/components/nav/app-tab-bar';
import { TAB_ITEMS } from '@/constants/tabs';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}