/**
 * 自定义底部导航条：4 个 Tab + 中间凸起的「+」。
 * v1.2.2：激活态改为「跟着滑动的胶囊底」，第三条 Tab 可在健身与课表之间切换。
 * 「+」打开全局新建菜单，任务/备忘/三类事件都从这里进，日期固定今天。
 */

import { SymbolView } from 'expo-symbols';
import { usePathname, useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventForm } from '@/components/home/event-form';
import { ThemedText } from '@/components/themed-text';
import { MemoForm } from '@/components/today/memo-form';
import { TaskForm } from '@/components/today/task-form';
import { ActionMenu } from '@/components/ui/action-menu';
import { RipplePressable } from '@/components/ui/ripple-pressable';
import { buildTabItems, type TabItem } from '@/constants/tabs';
import { Motion, Spacing } from '@/constants/theme';
import type { EventType, MiddleTab } from '@/db/types';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { bumpDataVersion } from '@/lib/data-version';
import { todayStr } from '@/lib/date';

const BAR_HEIGHT = 58;
const PLUS_SIZE = 52;
const CAPSULE_WIDTH = 64;
const CAPSULE_HEIGHT = 36;

/** 4 个 Tab 的视觉槽位：凸起按钮占中间，所以第 3、4 个 Tab 的槽位号是 3、4。 */
const SLOT_INDEX = [0, 1, 3, 4];

interface AppTabBarProps extends BottomTabBarProps {
  middle: MiddleTab;
}

export function AppTabBar({ state, emitter, navigateToTab, middle }: AppTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [today] = useState(() => todayStr());
  const [barWidth, setBarWidth] = useState(0);

  const tabs = buildTabItems(middle);
  const activeName = state.routes[state.index]?.name;
  const onTimetablePage = pathname.startsWith('/timetable');

  const isActive = (tab: TabItem) => {
    if (tab.name === 'timetable') return onTimetablePage;
    return tab.name === activeName;
  };

  const activeSlot = Math.max(
    0,
    tabs.findIndex((tab) => isActive(tab)),
  );

  const slotWidth = barWidth > 0 ? barWidth / 5 : 0;
  const capsuleLeft = slotWidth
    ? SLOT_INDEX[activeSlot] * slotWidth + (slotWidth - CAPSULE_WIDTH) / 2
    : 0;

  const capsuleX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      capsuleX.setValue(capsuleLeft);
      return;
    }
    const animation = Animated.timing(capsuleX, {
      toValue: capsuleLeft,
      duration: Motion.move,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [capsuleLeft, capsuleX, reduced]);

  const handleTabPress = (tab: TabItem) => {
    if (tab.name === 'timetable') {
      router.push('/timetable');
      return;
    }
    const route = state.routes.find((item) => item.name === tab.name);
    if (!route) return;
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (tab.name !== activeName && !event.defaultPrevented) {
      navigateToTab(route.key);
    }
  };

  const renderTab = (tab: TabItem) => {
    const active = isActive(tab);
    const color = active ? theme.text : theme.textSecondary;
    return (
      <RipplePressable
        key={`${tab.name}-${middle}`}
        accessibilityRole="tab"
        accessibilityLabel={tab.title}
        accessibilityState={{ selected: active }}
        onPress={() => handleTabPress(tab)}
        rippleColor="rgba(0,0,0,0.08)"
        rippleRadius={26}
        style={styles.tab}>
        <SymbolView name={tab.icon} tintColor={color} size={22} />
        <ThemedText
          type="small"
          style={[styles.label, { color, fontWeight: active ? '700' : '500' }]}
          numberOfLines={1}>
          {tab.title}
        </ThemedText>
      </RipplePressable>
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
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[
          styles.bar,
          {
            height: BAR_HEIGHT + insets.bottom,
            marginBottom: Spacing.one,
            paddingBottom: insets.bottom,
            backgroundColor: theme.background,
            borderTopColor: 'transparent',
          },
        ]}>
        {barWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.capsule,
              { backgroundColor: theme.backgroundElement, transform: [{ translateX: capsuleX }] },
            ]}
          />
        ) : null}

        {renderTab(tabs[0])}
        {renderTab(tabs[1])}

        <View style={styles.plusSlot}>
          <RipplePressable
            accessibilityRole="button"
            accessibilityLabel="新建"
            onPress={() => setMenuOpen(true)}
            rippleColor="rgba(255,255,255,0.32)"
            rippleRadius={26}
            style={[styles.plus, { backgroundColor: theme.text, borderColor: theme.background }]}>
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              tintColor={theme.background}
              size={24}
            />
          </RipplePressable>
        </View>

        {renderTab(tabs[2])}
        {renderTab(tabs[3])}
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
    paddingTop: Spacing.one,
    position: 'relative',
  },
  capsule: {
    position: 'absolute',
    top: 2,
    left: 0,
    width: CAPSULE_WIDTH,
    height: CAPSULE_HEIGHT,
    borderRadius: CAPSULE_HEIGHT / 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Spacing.two,
    gap: 3,
    zIndex: 1,
  },
  label: {
    fontSize: 10,
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
    marginTop: -16,
  },
  pressed: {
    opacity: 0.7,
  },
});

/** 供其他页面估算内容底部留白时使用。 */
export const TAB_BAR_HEIGHT = BAR_HEIGHT;