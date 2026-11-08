import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TodayList } from '@/components/today/today-list';
import { DateStrip, dateLabel } from '@/components/ui/date-strip';
import { MonthPicker } from '@/components/ui/month-picker';
import { Spacing } from '@/constants/theme';
import { getMonthActivity } from '@/db/repositories/calendar';
import { useTheme } from '@/hooks/use-theme';
import { addDays, todayStr } from '@/lib/date';

export default function TodayScreen() {
  const theme = useTheme();
  const [date, setDate] = useState(todayStr());
  const [stats, setStats] = useState({ total: 0, done: 0 });
  const [markedDays, setMarkedDays] = useState<Record<string, boolean>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);

  const loadMarks = useCallback(async (day: string) => {
    const activity = await getMonthActivity(addDays(day, -400), addDays(day, 400));
    const marks: Record<string, boolean> = {};
    for (const [key, flags] of Object.entries(activity)) {
      if (flags.tasks || flags.events) marks[key] = true;
    }
    setMarkedDays(marks);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // 每次进入今日计划都回到今天，避免停留在上次翻到的日期。
      // 注意不要把 date 放进依赖：否则用户点日期条切走时会被立刻重置回今天。
      setDate(todayStr());
      loadMarks(todayStr()).catch(() => undefined);
    }, [loadMarks])
  );

  useEffect(() => {
    loadMarks(date).catch(() => undefined);
  }, [date, loadMarks]);

  // 进入动画：日期行从左滑入，Today 稍后淡入并上移。
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerShift = useRef(new Animated.Value(-24)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleShift = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerShift, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    Animated.sequence([
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleShift, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [headerOpacity, headerShift, titleOpacity, titleShift]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.View
          style={[
            styles.dateRow,
            { opacity: headerOpacity, transform: [{ translateX: headerShift }] },
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            {dateLabel(date)}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="打开日历"
            onPress={() => setCalendarOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.calendarButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
              size={18}
              tintColor={theme.text}
            />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.titleRow,
            { opacity: titleOpacity, transform: [{ translateY: titleShift }] },
          ]}>
          <ThemedText style={styles.today}>Today</ThemedText>
          {stats.total > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              完成 {stats.done}/{stats.total}
            </ThemedText>
          ) : null}
        </Animated.View>

        <DateStrip value={date} onChange={setDate} marked={markedDays} />

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          <TodayList date={date} onStats={setStats} />
        </ScrollView>
      </SafeAreaView>

      <MonthPicker
        visible={calendarOpen}
        value={date}
        marked={markedDays}
        onClose={() => setCalendarOpen(false)}
        onSelect={(selected) => {
          setDate(selected);
          setCalendarOpen(false);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  calendarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  today: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
    flexGrow: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});