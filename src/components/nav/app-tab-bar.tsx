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
import { TaskForm } from '@/components/today/task-form';
import { ActionMenu } from '@/components/ui/action-menu';
import { RipplePressable } from '@/components/ui/ripple-pressable';
import { buildTabItems, type TabItem } from '@/constants/tabs';
import type { MiddleTab } from '@/db/types';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useGlass, useGlassMaterial, useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';
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

const NAV_BACKGROUND_LIGHT = '#FFFFFF';
const NAV_BACKGROUND_DARK = '#1C1C1E';
const INDICATOR_COLOR_LIGHT = '#F2F2F7';
const ACTIVE_COLOR_LIGHT = '#000000';
const INACTIVE_COLOR_LIGHT = '#8E8E93';
const PLUS_BACKGROUND_LIGHT = '#000000';
const PLUS_FOREGROUND_LIGHT = '#FFFFFF';

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
  const reduced = useReducedMotion();
  const theme = useTheme();
  const { scheme } = useThemePreference();
  const glass = useGlass();
  const material = useGlassMaterial();
  const isDark = scheme === 'dark';
  // 毛玻璃皮肤：高透悬浮灵动岛胶囊；经典皮肤保持原来的纯色底栏。
  const navBackground = glass
    ? material.bar
    : isDark
      ? NAV_BACKGROUND_DARK
      : NAV_BACKGROUND_LIGHT;
  const barBorderWidth = glass ? 1 : isDark ? StyleSheet.hairlineWidth : 0;
  const barBorderColor = glass ? material.barBorder : 'rgba(255,255,255,0.12)';
  const indicatorColor = glass
    ? material.barIndicator
    : isDark
      ? theme.backgroundSelected
      : INDICATOR_COLOR_LIGHT;
  // 深色下反色：白底加号 + 黑加号，和浅色模式的黑底白加号保持同样的对比度。
  const plusBackground = isDark ? theme.text : PLUS_BACKGROUND_LIGHT;
  const plusForeground = isDark ? theme.background : PLUS_FOREGROUND_LIGHT;
  const [menuOpen, setMenuOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [today] = useState(() => todayStr());
  const [barWidth, setBarWidth] = useState(0);

  const tabs = buildTabItems(middle);
  const activeName = state.routes[state.index]?.name;

  const isActive = (tab: TabItem) => tab.name === activeName;

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
      key: 'entry',
      label: '新建任务/备忘',
      onPress: () => {
        setMenuOpen(false);
        setTaskOpen(true);
      },
    },
    {
      key: 'event',
      label: '记事件',
      onPress: () => {
        setMenuOpen(false);
        setEventOpen(true);
      },
    },
  ];

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.dock, { paddingBottom: BOTTOM_GAP + insets.bottom }]}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: navBackground,
              borderWidth: barBorderWidth,
              borderColor: barBorderColor,
              // Android 上半透明胶囊叠加 elevation 会透出灰色硬件阴影块，
              // 毛玻璃皮肤下显式压平，只保留描边与高不透明底。
              ...(glass ? { elevation: 0, shadowOpacity: 0 } : null),
            },
          ]}
          onLayout={handleBarLayout}>
          {barWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.indicator, indicatorStyle, { backgroundColor: indicatorColor }]}
            />
          ) : null}

          {renderTab(0)}
          {renderTab(1)}

          <RipplePressable
            accessibilityRole="button"
            accessibilityLabel="新建"
            onPress={() => setMenuOpen(true)}
            rippleColor={isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)'}
            rippleRadius={PLUS_CIRCLE_SIZE / 2}
            style={styles.plusHit}
            contentStyle={styles.plusContent}>
            <View style={[styles.plusCircle, { backgroundColor: plusBackground }]}>
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                tintColor={plusForeground}
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
        initialKind="task"
        onClose={() => setTaskOpen(false)}
        onSaved={() => {
          setTaskOpen(false);
          bumpDataVersion();
        }}
      />

      <EventForm
        visible={eventOpen}
        initialType="expense"
        onClose={() => setEventOpen(false)}
        onSaved={() => {
          setEventOpen(false);
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
  const theme = useTheme();
  const { scheme } = useThemePreference();
  const isDark = scheme === 'dark';
  const activeColor = isDark ? theme.text : ACTIVE_COLOR_LIGHT;
  const inactiveColor = isDark ? theme.textSecondary : INACTIVE_COLOR_LIGHT;

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
      rippleColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
      rippleRadius={INDICATOR_RADIUS}
      style={styles.tab}
      contentStyle={styles.tabContent}>
      <View style={styles.iconBox}>
        <SymbolView name={tab.icon} tintColor={inactiveColor} size={ICON_SIZE} />
        <Animated.View
          pointerEvents="none"
          style={[styles.iconOverlay, activeFadeStyle]}>
          <SymbolView name={tab.icon} tintColor={activeColor} size={ICON_SIZE} />
        </Animated.View>
      </View>

      <View style={styles.labelBox}>
        <Text numberOfLines={1} style={[styles.label, { color: inactiveColor }]}>
          {tab.title}
        </Text>
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, styles.labelActive, { color: activeColor }, activeFadeStyle]}>
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
    textAlign: 'center',
  },
  labelActive: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    fontWeight: '700',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** 底栏几何信息，供可滚动页面的 contentContainerStyle 预留底部空间。 */
export const TAB_BAR_HEIGHT = BAR_HEIGHT;
/** 100 = 66 底座 + 20 底部间距 + 14 视觉呼吸位，再叠加设备安全区。 */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BOTTOM_GAP + 14;