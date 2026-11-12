import { useEffect, useMemo, useRef } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDay, parseDate, todayStr } from '@/lib/date';

const CAPSULE_HEIGHT = 62;
const CALENDAR_BUTTON_SPACE = 48;

interface DateStripProps {
  value: string;
  onChange: (date: string) => void;
  /** 传入则日期条尾部显示日历入口；今日计划把入口放在页头，不传。 */
  onOpenCalendar?: () => void;
  /** 有记录的日子：下面显示一个小圆点。 */
  marked?: Record<string, boolean>;
}

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

/** 某天所在的自然周周一。 */
function mondayOf(date: string): string {
  const day = parseDate(date).getDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/**
 * 日期条：固定一整个自然周（周一 → 周日），而不是一条可以无限滚动的日期流。
 * 左右滑动按整页吸附，一次翻一周；翻页后保持当前选中的星期几，
 * 因此「周三」滑到下一周仍然是「周三」。
 */
export function DateStrip({ value, onChange, onOpenCalendar, marked }: DateStripProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledPage = useRef<number | null>(null);
  const pageWidth = Math.max(1, width - (onOpenCalendar ? CALENDAR_BUTTON_SPACE : 0));
  const weekStart = mondayOf(value);

  const pages = useMemo(
    () => [addDays(weekStart, -7), weekStart, addDays(weekStart, 7)],
    [weekStart]
  );

  const clearSettleTimer = () => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  };

  // Web 的 ScrollView 不会派发 onMomentumScrollEnd，所以额外用 onScroll + 短延迟兜底；
  // handledPage 防止原生端 onScroll 与 onMomentumScrollEnd 对同一次翻页重复触发。
  const commitPage = (offsetX: number) => {
    const page = Math.round(offsetX / pageWidth);
    if (page === 1 || page === handledPage.current) return;
    handledPage.current = page;
    clearSettleTimer();
    const delta = page === 0 ? -7 : 7;
    onChange(addDays(value, delta));
  };

  // 本周始终放在中间页。用户翻到前后页后，onChange 会换周，
  // 随后这里把内容无动画地放回中间页；因为新一周的内容和刚才停留的页完全一致。
  useEffect(() => {
    handledPage.current = null;
    clearSettleTimer();
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: pageWidth, animated: false });
    });
    return () => {
      cancelAnimationFrame(frame);
      clearSettleTimer();
    };
  }, [weekStart, pageWidth]);

  const handleScroll = (offsetX: number) => {
    clearSettleTimer();
    settleTimer.current = setTimeout(() => commitPage(offsetX), 140);
  };

  const handlePageEnd = (offsetX: number) => {
    clearSettleTimer();
    commitPage(offsetX);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        style={styles.scroll}
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: pageWidth, y: 0 }}
        scrollEventThrottle={16}
        onScroll={(event) => handleScroll(event.nativeEvent.contentOffset.x)}
        onScrollBeginDrag={clearSettleTimer}
        onMomentumScrollEnd={(event) => handlePageEnd(event.nativeEvent.contentOffset.x)}
        contentContainerStyle={styles.scrollContent}>
        {pages.map((monday) => (
          <View key={monday} style={[styles.page, { width: pageWidth }]}>
            {weekDates(monday).map((date) => {
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
                    style={[styles.day, { color: selected ? theme.background : theme.text }]}>
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
          </View>
        ))}
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
    flexDirection: 'row',
  },
  page: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: Spacing.three,
  },
  item: {
    flex: 1,
    maxWidth: 44,
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