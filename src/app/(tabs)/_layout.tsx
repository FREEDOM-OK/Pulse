import { Tabs } from 'expo-router/js-tabs';
import { SymbolView } from 'expo-symbols';
import { TAB_ITEMS } from '@/constants/tabs';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundElement,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}>
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <SymbolView name={tab.icon} tintColor={color} size={size ?? 22} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
