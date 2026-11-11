/**
 * 悬浮胶囊底部导航：4 个真实 Tab + 中间「新建」按钮，共 5 个平级槽位。
 *
 * 视觉规格（用户 2026-11-11 指定）：
 * - 底座 66dp 高、33dp 圆角、纯白 #FFFFFF，左右各留 20dp；
 * - 绝对悬浮在屏幕底部，距底 20dp，并叠加 useSafeAreaInsets().bottom；
 * - 每个入口点击区 56×56，全部包在底座内，任何按钮都不凸出；
 * - 中间加号是 42dp 黑底白 + 的实心圆，放在自己的 56dp 槽位里；
 * - 选中态是 52×46、圆角 23 的 #F2F2F7 背景块，用 250ms 贝塞尔时序横滑。
 */

import { SymbolView } from 'expo-symbols';
import { usePathname, useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventForm } from '@/components/home/event-form';
import { MemoForm } from '@/components/today/memo-form';
import { TaskForm } from '@/components/today/task-form';
import { ActionMenu } from '@/components/ui/action-menu';
import { RipplePressable } from '@/components/ui/ripple-pressable';
import { buildTabItems, type TabItem } from '@/constants/tabs';
import type { EventType, MiddleTab } from '@/db/types';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { bumpDataVersion } from '@/lib/data-version';
import { todayStr } from '@/lib/date';

const BAR_HEIGHT = 66;
const BAR_RADIUS = 33;
const BOTTOM_GAP = 20;
const TAB_SIZE = 56;
const SLOT_COUNT = 5;
const INDICATOR_WIDTH = 52;
const INDICATOR_HEIGHT = 46;
const INDICATOR_RADIUS = 23;
const PLUS_CIRCLE_SIZE = 42;
const ICON_SIZE = 22;

const NAV_BACKGROUND = '#FFFFFF';
const ACTIVE_COLOR = '#000000';
const INACTIVE_COLOR = '#8E8E93';
const INDICATOR_COLOR = '#F2F2F7';
const PLUS_BACKGROUND = '#000000';
const PLUS_FOREGROUND = '#FFFFFF';

/** 5 个视觉槽位里，真实路由 Tab 占 0/1/3/4，槽位 2 留给加号。 */
const SLOT_INDEX = [0, 1, 3, 4] as const;

/**
 * 首版弹簧在阻尼较高时仍有约 500ms 的拖尾，因此按用户给的备选方案
 * 改用 Apple 风格的 250ms 贝塞尔时序：指哪打哪、不过冲、停得干净。
 */
const INDICATOR_TIMING = {
  duration: 250,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

/** 等距布局下，某个槽位的左边缘（Tab 点击区宽 56）。 */
function slotLeft(slot: number, barWidth: number): number {
  const gap = Math.max(0, (barWidth - TAB_SIZE * SLOT_COUNT) / (SLOT_COUNT + 1));
  return gap + slot * (TAB_SIZE + gap);
}

/** 指示器比点击区窄 4dp，平移时要在槽内水平居中。 */
function indicatorLeft(slot: number, barWidth: number): number {
  return slotLeft(slot, barWidth) + (TAB_SIZE - INDICATOR_WIDTH) / 2;
}

interface AppTabBarProps extends BottomTabBarProps {
  middle: MiddleTab;
}

export function AppTabBar({ state, emitter, navigateToTab, middle }: AppTabBarProps) {
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

  /** 第三格是课表时，`/timetable` 也算它「选中」；其他情况按路由名判断。 */
  const isActive = (tab: TabItem) => {
    if (tab.name === 'middle' && middle === 'timetable') return onTimetablePage;
    return tab.name === activeName;
  };

  const activeTabIndex = Math.max(
    0,
    tabs.findIndex((tab) => isActive(tab)),
  );
  const activeSlot = SLOT_INDEX[activeTabIndex] ?? 0;

  const indicatorX = useSharedValue(0);
  const previousSlot = useRef<number | null>(null);

  /** 初始布局与横竖屏切换直接落位，只有 activeSlot 变化才播放滑动动画。 */
  const handleBarLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width <= 0 || Math.abs(width - barWidth) < 0.5) return;
    indicatorX.value = indicatorLeft(activeSlot, width);
    previousSlot.current = activeSlot;
    setBarWidth(width);
  };

  useEffect(() => {
    if (barWidth <= 0) return;

    const target = indicatorLeft(activeSlot, barWidth);
    const slotChanged = previousSlot.current !== activeSlot;
    previousSlot.current = activeSlot;

    if (!slotChanged || reduced) {
      indicatorX.value = target;
      return;
    }

    indicatorX.value = withTiming(target, INDICATOR_TIMING);
  }, [activeSlot, barWidth, indicatorX, reduced]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleTabPress = (tab: TabItem) => {
    // 课表保持独立全屏页（用户要求课程表零改动），第三格选它时点底栏直接 push 进去。
    if (tab.name === 'middle' && middle === 'timetable') {
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

  const renderTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return null;
    return (
      <TabButton
        key={`${tab.name}-${middle}`}
        tab={tab}
        active={isActive(tab)}
        reduced={reduced}
        onPress={() => handleTabPress(tab)}
      />
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
        pointerEvents="box-none"
        style={[styles.dock, { paddingBottom: BOTTOM_GAP + insets.bottom }]}>
        <View style={styles.bar} onLayout={handleBarLayout}>
          {barWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.indicator, indicatorStyle]}
            />
          ) : null}

          {renderTab(0)}
          {renderTab(1)}

          <RipplePressable
            accessibilityRole="button"
            accessibilityLabel="新建"
            onPress={() => setMenuOpen(true)}
            rippleColor="rgba(255,255,255,0.3)"
            rippleRadius={PLUS_CIRCLE_SIZE / 2}
            style={styles.plusHit}
            contentStyle={styles.plusContent}>
            <View style={styles.plusCircle}>
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                tintColor={PLUS_FOREGROUND}
                size={24}
              />
            </View>
          </RipplePressable>

          {renderTab(2)}
          {renderTab(3)}
        </View>
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

interface TabButtonProps {
  tab: TabItem;
  active: boolean;
  reduced: boolean;
  onPress: () => void;
}

/** 图标与文字用双层淡入淡出，选中时平滑过渡到纯黑，而不是直接跳色。 */
function TabButton({ tab, active, reduced, onPress }: TabButtonProps) {
  const selection = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    selection.value = reduced ? (active ? 1 : 0) : withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, reduced, selection]);

  const activeFadeStyle = useAnimatedStyle(() => ({
    opacity: selection.value,
  }));

  return (
    <RipplePressable
      accessibilityRole="tab"
      accessibilityLabel={tab.title}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      rippleColor="rgba(0,0,0,0.08)"
      rippleRadius={INDICATOR_RADIUS}
      style={styles.tab}
      contentStyle={styles.tabContent}>
      <View style={styles.iconBox}>
        <SymbolView name={tab.icon} tintColor={INACTIVE_COLOR} size={ICON_SIZE} />
        <Animated.View
          pointerEvents="none"
          style={[styles.iconOverlay, activeFadeStyle]}>
          <SymbolView name={tab.icon} tintColor={ACTIVE_COLOR} size={ICON_SIZE} />
        </Animated.View>
      </View>

      <View style={styles.labelBox}>
        <Text numberOfLines={1} style={styles.label}>
          {tab.title}
        </Text>
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, styles.labelActive, activeFadeStyle]}>
          {tab.title}
        </Animated.Text>
      </View>
    </RipplePressable>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  bar: {
    height: BAR_HEIGHT,
    width: '100%',
    borderRadius: BAR_RADIUS,
    backgroundColor: NAV_BACKGROUND,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: (BAR_HEIGHT - INDICATOR_HEIGHT) / 2,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_RADIUS,
    backgroundColor: INDICATOR_COLOR,
  },
  tab: {
    width: TAB_SIZE,
    height: TAB_SIZE,
    borderRadius: INDICATOR_RADIUS,
    zIndex: 1,
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBox: {
    width: TAB_SIZE,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    color: INACTIVE_COLOR,
    textAlign: 'center',
  },
  labelActive: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    fontWeight: '700',
    color: ACTIVE_COLOR,
  },
  plusHit: {
    width: TAB_SIZE,
    height: TAB_SIZE,
    borderRadius: TAB_SIZE / 2,
    zIndex: 1,
  },
  plusContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusCircle: {
    width: PLUS_CIRCLE_SIZE,
    height: PLUS_CIRCLE_SIZE,
    borderRadius: PLUS_CIRCLE_SIZE / 2,
    backgroundColor: PLUS_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** 底栏几何信息，供可滚动页面的 contentContainerStyle 预留底部空间。 */
export const TAB_BAR_HEIGHT = BAR_HEIGHT;
/** 100 = 66 底座 + 20 底部间距 + 14 视觉呼吸位，再叠加设备安全区。 */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BOTTOM_GAP + 14;