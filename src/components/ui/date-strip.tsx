import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { StatusDot } from '@/components/ui/status-dot';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDay, parseDate, todayStr } from '@/lib/date';

const ITEM_WIDTH = 54;
const ITEM_GAP = Spacing.one;
const RANGE_DAYS = 45;

interface DateStripProps {
  value: string;
  onChange: (date: string) => void;
  onOpenCalendar: () => void;
  /** 有记录的日子：下面对应显示一个小圆点。 */
  marked?: Record<string, boolean>;
}

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

/** 顶部日期条：左右滑动选日期，点日历图标打开月历。 */
export function DateStrip({ value, onChange, onOpenCalendar, marked }: DateStripProps) {
  const theme = useTheme();
  const today = todayStr();

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

  const selectedIndex = days.indexOf(value);
  const contentOffset = { x: Math.max(0, selectedIndex * (ITEM_WIDTH + ITEM_GAP) - 120), y: 0 };

  const step = (delta: number) => {
    const index = Math.min(days.length - 1, Math.max(0, selectedIndex + delta));
    onChange(days[index]);
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="前一天"
        onPress={() => step(-1)}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
        <ThemedText type="subtitle" style={styles.arrowText}>
          ‹
        </ThemedText>
      </Pressable>

      <ScrollView
        key={value}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={contentOffset}
        contentContainerStyle={styles.scrollContent}>
        {days.map((date) => {
          const selected = date === value;
          const isToday = date === today;
          const weekday = WEEKDAY_SHORT[parseDate(date).getDay()];
          const hasRecord = Boolean(marked?.[date]);
          return (
            <Pressable
              key={date}
              accessibilityLabel={`日期 ${date}${hasRecord ? ' 有记录' : ''}`}
              onPress={() => onChange(date)}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: selected ? theme.backgroundSelected : 'transparent',
                  borderColor: isToday ? theme.textSecondary : 'transparent',
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="small"
                themeColor={selected ? 'text' : 'textSecondary'}
                style={styles.weekday}>
                {weekday}
              </ThemedText>
              <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
                {parseDate(date).getDate()}
              </ThemedText>
              <StatusDot color={hasRecord ? theme.text : undefined} />
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        accessibilityLabel="后一天"
        onPress={() => step(1)}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
        <ThemedText type="subtitle" style={styles.arrowText}>
          ›
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityLabel="打开日历"
        onPress={onOpenCalendar}
        style={({ pressed }) => [
          styles.arrow,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
          size={18}
          tintColor={theme.text}
        />
      </Pressable>
    </View>
  );
}

/** 供页面标题使用：11月6日 周五 / 今天 */
export function dateLabel(date: string): string {
  return date === todayStr() ? `今天 · ${formatDay(date)}` : formatDay(date);
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  scrollContent: {
    gap: ITEM_GAP,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
  },
  item: {
    width: ITEM_WIDTH,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 2,
  },
  weekday: {
    fontSize: 11,
  },
  arrow: {
    width: 34,
    height: 38,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 22,
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.6,
  },
});
