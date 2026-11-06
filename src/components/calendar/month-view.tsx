import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ModuleColors, Spacing } from '@/constants/theme';
import type { DayFlags } from '@/db/repositories/calendar';
import { useTheme } from '@/hooks/use-theme';
import { formatMonth, monthGrid, parseDate, todayStr } from '@/lib/date';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const MODULE_LABELS: { key: keyof DayFlags; label: string }[] = [
  { key: 'tasks', label: '计划' },
  { key: 'fitness', label: '健身' },
  { key: 'diet', label: '饮食' },
  { key: 'games', label: '游戏' },
];

interface MonthViewProps {
  year: number;
  month: number;
  activity: Record<string, DayFlags>;
  selected: string;
  onChangeMonth: (delta: number) => void;
  onSelect: (date: string) => void;
}

/** 日历回顾页的大月历：四色点 + 选中态 + 无障碍描述。 */
export function MonthView({
  year,
  month,
  activity,
  selected,
  onChangeMonth,
  onSelect,
}: MonthViewProps) {
  const theme = useTheme();
  const weeks = monthGrid(year, month);
  const today = todayStr();

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="上个月"
          onPress={() => onChangeMonth(-1)}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}>
          <ThemedText type="subtitle">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.monthLabel}>
          {formatMonth(year, month)}
        </ThemedText>
        <Pressable
          accessibilityLabel="下个月"
          onPress={() => onChangeMonth(1)}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}>
          <ThemedText type="subtitle">›</ThemedText>
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
            const active = date === selected;
            const isToday = date === today;
            const moduleNames = MODULE_LABELS.filter((item) => flags?.[item.key]).map(
              (item) => item.label
            );
            const label = `日历 ${date}${moduleNames.length > 0 ? ` ${moduleNames.join(' ')}` : ''}`;

            return (
              <Pressable
                key={date}
                accessibilityLabel={label}
                onPress={() => onSelect(date)}
                style={({ pressed }) => [
                  styles.cell,
                  styles.dayCell,
                  active && { backgroundColor: theme.text },
                  !active && isToday && { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="small"
                  style={{
                    fontSize: 13,
                    fontWeight: active || isToday ? '700' : '400',
                    color: active ? theme.background : isToday ? theme.text : theme.textSecondary,
                  }}>
                  {parseDate(date).getDate()}
                </ThemedText>
                <View style={styles.dots}>
                  {flags?.tasks ? (
                    <View style={[styles.dot, { backgroundColor: active ? theme.background : ModuleColors.tasks }]} />
                  ) : null}
                  {flags?.fitness ? (
                    <View style={[styles.dot, { backgroundColor: active ? theme.background : ModuleColors.fitness }]} />
                  ) : null}
                  {flags?.diet ? (
                    <View style={[styles.dot, { backgroundColor: active ? theme.background : ModuleColors.diet }]} />
                  ) : null}
                  {flags?.games ? (
                    <View style={[styles.dot, { backgroundColor: active ? theme.background : ModuleColors.games }]} />
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
    marginBottom: Spacing.two,
  },
  monthLabel: {
    fontSize: 15,
  },
  navButton: {
    width: 44,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    paddingVertical: Spacing.one,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: Spacing.two,
  },
  dayCell: {
    margin: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    height: 5,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
