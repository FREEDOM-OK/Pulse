import { useEffect, useMemo, useRef } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDay, parseDate, todayStr } from '@/lib/date';

const ITEM_WIDTH = 44;
const ITEM_GAP = 8;
const CAPSULE_HEIGHT = 62;
const RANGE_DAYS = 45;

interface DateStripProps {
  value: string;
  onChange: (date: string) => void;
  /** 传入则日期条尾部显示日历入口；今日计划把入口放在页头，不传。 */
  onOpenCalendar?: () => void;
  /** 有记录的日子：下面显示一个小圆点。 */
  marked?: Record<string, boolean>;
}

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 日期条：数字在上、星期在下，选中项是黑色胶囊。
 * 45 天窗口以「今天」为中心；点选只换选中态，**不滚动**（用户要求：滑动位置保持不动）。
 * 只有窗口本身变化（从日历跳到 45 天以外的日期）才把选中项滚到中间。
 * 日历入口放在页面右上角，不在这里。
 */
export function DateStrip({ value, onChange, onOpenCalendar, marked }: DateStripProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const today = todayStr();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const days = useMemo(() => {
    const list: string[] = [];
    for (let offset = -RANGE_DAYS; offset <= RANGE_DAYS; offset += 1) {
      list.push(addDays(today, offset));
    }
    if (!list.includes(value)) {
      list.push(value);
      list.sort();
    }
    return list;
  }, [today, value]);

  const centerOffsetOf = (index: number) =>
    Math.max(0, index * (ITEM_WIDTH + ITEM_GAP) + ITEM_WIDTH / 2 - width / 2);

  const selectedIndex = Math.max(0, days.indexOf(value));

  // 首帧定位：挂载时直接把选中项放在中间，避免先渲染第一格再跳（会闪一下）。
  // 用 ref 存住，之后 `value` 变了也不重算，这样 ScrollView 不会因为 prop 变化被拉回去。
  const initialOffset = useRef({ x: centerOffsetOf(selectedIndex), y: 0 });
  const centeredLength = useRef(days.length);

  useEffect(() => {
    // 成员没变 = 用户点的是同一个 45 天窗口里的日期 → 什么都不做。
    if (days.length === centeredLength.current) return;
    centeredLength.current = days.length;
    const index = days.indexOf(value);
    if (index < 0) return;
    scrollRef.current?.scrollTo({
      x: Math.max(0, index * (ITEM_WIDTH + ITEM_GAP) + ITEM_WIDTH / 2 - width / 2),
      animated: true,
    });
  }, [days, value, width]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        style={styles.scroll}
        showsHorizontalScrollIndicator={false}
        contentOffset={initialOffset.current}
        contentContainerStyle={styles.scrollContent}>
        {days.map((date) => {
          const selected = date === value;
          const isToday = date === todayStr();
          const weekday = WEEKDAY_SHORT[parseDate(date).getDay()];
          const hasRecord = Boolean(marked?.[date]);
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={`日期 ${date}${hasRecord ? ' 有记录' : ''}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(date)}
              style={({ pressed }) => [
                styles.item,
                selected && { backgroundColor: theme.text },
                // 今天用 1.5pt 描边标出（选中时不描边，避免双重边框）。
                isToday && !selected && { borderWidth: 1.5, borderColor: theme.text },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                style={[
                  styles.day,
                  { color: selected ? theme.background : theme.text },
                ]}>
                {parseDate(date).getDate()}
              </ThemedText>
              <ThemedText
                style={[
                  styles.weekday,
                  { color: selected ? theme.background : theme.textSecondary },
                ]}>
                {weekday}
              </ThemedText>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: selected
                      ? theme.background
                      : hasRecord
                        ? theme.textSecondary
                        : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {onOpenCalendar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="打开日历"
          onPress={onOpenCalendar}
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
      ) : null}
    </View>
  );
}

/** 供页面标题使用：11月6日 周五 */
export function dateLabel(date: string): string {
  return date === todayStr() ? `今天 · ${formatDay(date)}` : formatDay(date);
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  scroll: {
    flex: 1,
  },
  calendarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  scrollContent: {
    gap: ITEM_GAP,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  item: {
    width: ITEM_WIDTH,
    height: CAPSULE_HEIGHT,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  day: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  weekday: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.7,
  },
});