/**
 * 自定义底部导航条：4 个 Tab + 中间凸起的「+」。
 * 「+」打开全局新建菜单，任务/备忘/三类事件都从这里进，日期固定今天。
 */

import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { EventForm } from '@/components/home/event-form';
import { ThemedText } from '@/components/themed-text';
import { MemoForm } from '@/components/today/memo-form';
import { TaskForm } from '@/components/today/task-form';
import { ActionMenu } from '@/components/ui/action-menu';
import { TAB_ITEMS, TAB_LEFT, TAB_RIGHT, type TabItem } from '@/constants/tabs';
import { Spacing } from '@/constants/theme';
import type { EventType } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { bumpDataVersion } from '@/lib/data-version';
import { todayStr } from '@/lib/date';

const BAR_HEIGHT = 58;
const PLUS_SIZE = 52;

export function AppTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [today] = useState(() => todayStr());

  const activeName = state.routes[state.index]?.name;

  const handleTabPress = (name: string) => {
    const route = state.routes.find((item) => item.name === name);
    if (!route) return;
    const event = emitter.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (name !== activeName && !event.defaultPrevented) {
      navigateToTab(route.key);
    }
  };

  const renderTab = (tab: TabItem) => {
    const active = tab.name === activeName;
    const color = active ? theme.text : theme.textSecondary;
    return (
      <Pressable
        key={tab.name}
        accessibilityRole="tab"
        accessibilityLabel={tab.title}
        accessibilityState={{ selected: active }}
        onPress={() => handleTabPress(tab.name)}
        style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
        <SymbolView name={tab.icon} tintColor={color} size={22} />
        <ThemedText type="small" style={[styles.label, { color }]} numberOfLines={1}>
          {tab.title}
        </ThemedText>
        <View style={[styles.dot, { backgroundColor: active ? color : 'transparent' }]} />
      </Pressable>
    );
  };

  const menuItems = [
    {
      key: 'task',
      label: '新建任务',
      onPress: () => {
        setMenuOpen(false);
        setTaskOpen(true);
      },
    },
    {
      key: 'memo',
      label: '新建备忘',
      onPress: () => {
        setMenuOpen(false);
        setMemoOpen(true);
      },
    },
    {
      key: 'expense',
      label: '记重大消费',
      onPress: () => {
        setMenuOpen(false);
        setEventType('expense');
      },
    },
    {
      key: 'shopping',
      label: '记重大购物',
      onPress: () => {
        setMenuOpen(false);
        setEventType('shopping');
      },
    },
    {
      key: 'meal',
      label: '记今日好饭',
      onPress: () => {
        setMenuOpen(false);
        setEventType('meal');
      },
    },
  ];

  return (
    <>
      <View
        style={[
          styles.bar,
          {
            height: BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: theme.background,
            borderTopColor: theme.backgroundElement,
          },
        ]}>
        {TAB_LEFT.map(renderTab)}

        <View style={styles.plusSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="新建"
            onPress={() => setMenuOpen(true)}
            style={({ pressed }) => [
              styles.plus,
              {
                backgroundColor: theme.text,
                borderColor: theme.background,
              },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              tintColor={theme.background}
              size={24}
            />
          </Pressable>
        </View>

        {TAB_RIGHT.map(renderTab)}
      </View>

      <ActionMenu
        visible={menuOpen}
        title="新建"
        items={menuItems}
        onClose={() => setMenuOpen(false)}
      />

      <TaskForm
        visible={taskOpen}
        date={today}
        task={null}
        onClose={() => setTaskOpen(false)}
        onSaved={() => {
          setTaskOpen(false);
          bumpDataVersion();
        }}
      />

      <MemoForm
        visible={memoOpen}
        date={today}
        memo={null}
        onClose={() => setMemoOpen(false)}
        onSaved={() => {
          setMemoOpen(false);
          bumpDataVersion();
        }}
      />

      <EventForm
        visible={eventType != null}
        type={eventType}
        onClose={() => setEventType(null)}
        onSaved={() => {
          setEventType(null);
          bumpDataVersion();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Spacing.two,
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginTop: 1,
  },
  plusSlot: {
    flex: 1,
    alignItems: 'center',
  },
  plus: {
    width: PLUS_SIZE,
    height: PLUS_SIZE,
    borderRadius: PLUS_SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  pressed: {
    opacity: 0.7,
  },
});

/** 供其他页面估算内容底部留白时使用。 */
export const TAB_BAR_HEIGHT = BAR_HEIGHT;
export const TAB_BAR_TABS = TAB_ITEMS;