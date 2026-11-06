import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ModuleColors, Spacing } from '@/constants/theme';
import type { DayFlags } from '@/db/repositories/calendar';
import { useTheme } from '@/hooks/use-theme';
import { formatMonth, monthGrid, parseDate, todayStr } from '@/lib/date';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

interface MiniCalendarProps {
  year: number;
  month: number;
  activity: Record<string, DayFlags>;
  onChangeMonth: (delta: number) => void;
  onSelectDate: (date: string) => void;
}

/** 首页用的小月历：显示每天有哪些模块的数据（四色点）。 */
export function MiniCalendar({
  year,
  month,
  activity,
  onChangeMonth,
  onSelectDate,
}: MiniCalendarProps) {
  const theme = useTheme();
  const weeks = monthGrid(year, month);
  const today = todayStr();

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => onChangeMonth(-1)} style={styles.navButton}>
          <ThemedText type="small">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{formatMonth(year, month)}</ThemedText>
        <Pressable onPress={() => onChangeMonth(1)} style={styles.navButton}>
          <ThemedText type="small">›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday) => (
          <ThemedText
            key={weekday}
            type="small"
            themeColor="textSecondary"
            style={styles.weekdayLabel}>
            {weekday}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={`week-${weekIndex}`} style={styles.weekRow}>
          {week.map((date, cellIndex) => {
            if (!date) {
              return <View key={`empty-${cellIndex}`} style={styles.cell} />;
            }
            const flags = activity[date];
            const isToday = date === today;
            return (
              <Pressable
                key={date}
                accessibilityLabel={`首页日历 ${date}`}
                onPress={() => onSelectDate(date)}
                style={({ pressed }) => [
                  styles.cell,
                  isToday && { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="small"
                  style={{
                    fontSize: 11,
                    color: isToday ? theme.text : theme.textSecondary,
                    fontWeight: isToday ? '700' : '400',
                  }}>
                  {parseDate(date).getDate()}
                </ThemedText>
                <View style={styles.dots}>
                  {flags?.tasks ? <View style={[styles.dot, { backgroundColor: ModuleColors.tasks }]} /> : null}
                  {flags?.fitness ? (
                    <View style={[styles.dot, { backgroundColor: ModuleColors.fitness }]} />
                  ) : null}
                  {flags?.diet ? <View style={[styles.dot, { backgroundColor: ModuleColors.diet }]} /> : null}
                  {flags?.games ? (
                    <View style={[styles.dot, { backgroundColor: ModuleColors.games }]} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  navButton: {
    width: 36,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    paddingVertical: 2,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
    borderRadius: Spacing.one,
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    height: 4,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
