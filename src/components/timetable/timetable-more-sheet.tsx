import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { TabIcon } from '@/constants/tabs';
import { useTimetable } from '@/features/timetable/TimetableContext';
import { currentWeekNumber } from '@/lib/timetable-core';
import { showNotice } from '@/lib/dialogs';

const TRACK_HEIGHT = 28;
const TRACK_RADIUS = 14;
const THUMB_WIDTH = 4;
const THUMB_HEIGHT = 18;

const ICONS: Record<'periods' | 'settings' | 'courses' | 'reminder', TabIcon> = {
  periods: { ios: 'clock', android: 'schedule', web: 'schedule' },
  settings: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  courses: { ios: 'archivebox', android: 'inventory_2', web: 'inventory_2' },
  reminder: { ios: 'bell', android: 'notifications', web: 'notifications' },
};

interface TimetableMoreSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 显式跳周：屏幕层同时更新 viewingWeek 与横向偏移；滑条拖动传 animated=false。 */
  onJumpToWeek: (week: number, animated: boolean) => void;
}

/**
 * 顶栏「⋯」打开的底部抽屉。
 *
 * 层级：必须走全屏 Modal（BottomSheet 内部已开 statusBarTranslucent），
 * 这样 Tab 模式下才能压住悬浮的 AppTabBar；两种模式下底部位置也完全一致，
 * 只避让系统手势条，不为底栏额外留白。
 */
export function TimetableMoreSheet({ visible, onClose, onJumpToWeek }: TimetableMoreSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    schedules,
    activeSchedule,
    settings,
    viewingWeek,
    switchSchedule,
    updateSetting,
  } = useTimetable();

  const totalWeeks = Math.max(1, activeSchedule.totalWeeks);
  const thisWeek = Math.min(
    totalWeeks,
    Math.max(1, currentWeekNumber(activeSchedule.startDate, new Date())),
  );
  const isThisWeek = viewingWeek === thisWeek;

  const [trackWidth, setTrackWidth] = useState(0);
  const [reminderPanelOpen, setReminderPanelOpen] = useState(false);

  // PanResponder 只创建一次，靠 ref 读取最新的周数与回调，避免拖动中途重建响应者。
  const trackWidthRef = useRef(0);
  const totalWeeksRef = useRef(totalWeeks);
  const setWeekRef = useRef(onJumpToWeek);

  useEffect(() => {
    totalWeeksRef.current = totalWeeks;
  }, [totalWeeks]);
  useEffect(() => {
    setWeekRef.current = onJumpToWeek;
  }, [onJumpToWeek]);

  const applyWeekFromX = useMemo(
    () => (x: number) => {
      const width = trackWidthRef.current;
      const maxWeek = totalWeeksRef.current;
      if (width <= 0 || maxWeek <= 1) return;
      const clampedX = Math.max(0, Math.min(width, x));
      const week = 1 + Math.round((clampedX / width) * (maxWeek - 1));
      // 拖动必须实时跟手，不能播滚动动画
      setWeekRef.current(week, false);
    },
    [],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event: GestureResponderEvent) =>
          applyWeekFromX(event.nativeEvent.locationX),
        onPanResponderMove: (event: GestureResponderEvent) =>
          applyWeekFromX(event.nativeEvent.locationX),
      }),
    [applyWeekFromX],
  );

  const fraction = totalWeeks > 1 ? (viewingWeek - 1) / (totalWeeks - 1) : 0;
  const fillWidth = trackWidth * fraction;
  const thumbLeft = Math.max(
    0,
    Math.min(trackWidth - THUMB_WIDTH, trackWidth * fraction - THUMB_WIDTH / 2),
  );

  const goToThisWeek = () => {
    onJumpToWeek(thisWeek, false);
    onClose();
  };

  const openRoute = (pathname: '/timetable/periods' | '/timetable/settings' | '/timetable/courses') => {
    onClose();
    router.push(pathname);
  };

  const openSchedules = (create: boolean) => {
    onClose();
    router.push(create ? '/timetable/schedules?create=1' : '/timetable/schedules');
  };

  const handleReminderToggle = (enabled: boolean) => {
    void updateSetting('reminderEnabled', enabled).catch((err: unknown) => {
      showNotice(`保存提醒设置失败：${err instanceof Error ? err.message : '未知错误'}`);
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      autoHeight
      showHandle={false}
      sheetStyle={styles.sheet}
      bodyStyle={styles.sheetBody}>
      <View style={[styles.sheetInner, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.grabber} />

        {/* 上半部：周数滑动条 + 多课表切换 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>周数</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="回到本周"
              accessibilityState={{ disabled: isThisWeek }}
              disabled={isThisWeek}
              hitSlop={8}
              onPress={goToThisWeek}>
              <Text style={[styles.linkText, isThisWeek && styles.linkTextDisabled]}>
                回到本周
              </Text>
            </Pressable>
          </View>

          <View
            style={styles.trackHitArea}
            accessibilityRole="adjustable"
            accessibilityLabel="周数滑动条"
            accessibilityValue={{ min: 1, max: totalWeeks, now: viewingWeek }}
            onLayout={(event) => {
              const width = Math.round(event.nativeEvent.layout.width);
              trackWidthRef.current = width;
              setTrackWidth(width);
            }}
            {...panResponder.panHandlers}>
            <View pointerEvents="none" style={styles.track}>
              <View style={[styles.trackFill, { width: fillWidth }]} />
              <View style={[styles.thumb, { left: thumbLeft }]} />
            </View>
          </View>

          <View style={styles.weekCaptionRow}>
            <Text style={styles.weekCaption}>第 {viewingWeek} 周</Text>
            <Text style={styles.weekCaption}>共 {totalWeeks} 周</Text>
          </View>

          <View style={styles.scheduleHeader}>
            <Text style={styles.cardTitle}>课表</Text>
            <View style={styles.linkRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="新建课表"
                hitSlop={8}
                onPress={() => openSchedules(true)}>
                <Text style={styles.linkText}>新建课表</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="管理课表"
                hitSlop={8}
                onPress={() => openSchedules(false)}>
                <Text style={styles.linkText}>管理</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scheduleList}>
            {schedules.map((schedule) => {
              const active = schedule.id === activeSchedule.id;
              return (
                <Pressable
                  key={schedule.id}
                  accessibilityRole="button"
                  accessibilityLabel={`切换课表 ${schedule.name}`}
                  onPress={() => {
                    void switchSchedule(schedule.id).catch((err: unknown) => {
                      showNotice(`切换失败：${err instanceof Error ? err.message : '未知错误'}`);
                    });
                  }}
                  style={({ pressed }) => [styles.scheduleItem, pressed && styles.pressed]}>
                  <View style={[styles.scheduleTile, active && styles.scheduleTileActive]}>
                    {active ? <Text style={styles.scheduleCheck}>✓</Text> : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.scheduleName, active && styles.scheduleNameActive]}>
                    {schedule.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 下半部：4 个核心入口 */}
        <View style={[styles.card, styles.actionsCard]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="上课时间"
            onPress={() => openRoute('/timetable/periods')}
            style={({ pressed }) => [styles.actionItem, pressed && styles.pressed]}>
            <View style={styles.actionIconWrap}>
              <SymbolView name={ICONS.periods} size={22} tintColor="#1C1C1E" />
            </View>
            <Text style={styles.actionLabel}>上课时间</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="课程设置"
            onPress={() => openRoute('/timetable/settings')}
            style={({ pressed }) => [styles.actionItem, pressed && styles.pressed]}>
            <View style={styles.actionIconWrap}>
              <SymbolView name={ICONS.settings} size={22} tintColor="#1C1C1E" />
            </View>
            <Text style={styles.actionLabel}>课程设置</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="已添课程"
            onPress={() => openRoute('/timetable/courses')}
            style={({ pressed }) => [styles.actionItem, pressed && styles.pressed]}>
            <View style={styles.actionIconWrap}>
              <SymbolView name={ICONS.courses} size={22} tintColor="#1C1C1E" />
            </View>
            <Text style={styles.actionLabel}>已添课程</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="上课提醒"
            onPress={() => setReminderPanelOpen((open) => !open)}
            style={({ pressed }) => [styles.actionItem, pressed && styles.pressed]}>
            <View style={[styles.actionIconWrap, settings.reminderEnabled && styles.actionIconActive]}>
              <SymbolView
                name={ICONS.reminder}
                size={22}
                tintColor={settings.reminderEnabled ? '#4A5588' : '#1C1C1E'}
              />
            </View>
            <Text style={styles.actionLabel}>上课提醒</Text>
          </Pressable>
        </View>

        {reminderPanelOpen ? (
          <View style={styles.reminderPanel}>
            <View style={styles.reminderTextBlock}>
              <Text style={styles.reminderTitle}>上课提醒</Text>
              <Text style={styles.reminderSub}>
                {settings.reminderEnabled ? '已开启，课前提醒我' : '关闭状态，点击右侧开关开启'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="上课提醒开关"
              value={settings.reminderEnabled}
              onValueChange={handleReminderToggle}
              trackColor={{ false: '#E5E7EB', true: '#4A5588' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: 'transparent',
    paddingTop: 0,
  },
  sheetBody: {
    paddingHorizontal: 0,
  },
  sheetInner: {
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C7C7CC',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  actionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  linkText: { fontSize: 12, fontWeight: '600', color: '#4A5588' },
  linkTextDisabled: { color: '#C7C7CC' },
  trackHitArea: {
    marginTop: 12,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    backgroundColor: '#E8EAF6',
    overflow: 'visible',
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_RADIUS,
    backgroundColor: '#4A5588',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.12)',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  weekCaptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  weekCaption: { fontSize: 11, color: '#8E8E93' },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scheduleList: { gap: 14, paddingVertical: 2, paddingRight: 4 },
  scheduleItem: { width: 64, alignItems: 'center' },
  scheduleTile: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTileActive: { backgroundColor: '#1C1C1E' },
  scheduleCheck: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  scheduleName: {
    width: 64,
    marginTop: 6,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  scheduleNameActive: { color: '#1C1C1E', fontWeight: '600' },
  actionItem: { alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconActive: { backgroundColor: 'rgba(74, 85, 136, 0.12)' },
  actionLabel: { fontSize: 12, color: '#1C1C1E', marginTop: 8 },
  pressed: { opacity: 0.55 },
  reminderPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginTop: 12,
  },
  reminderTextBlock: { flex: 1, paddingRight: 12 },
  reminderTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  reminderSub: { fontSize: 11, color: '#8E8E93', marginTop: 3 },
});