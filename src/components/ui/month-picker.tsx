import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMonth, monthGrid, parseDate, todayStr } from '@/lib/date';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

interface MonthPickerProps {
  visible: boolean;
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

/** 月历选日期弹窗（任务改日期、日期条跳转共用）。 */
export function MonthPicker({ visible, value, onSelect, onClose }: MonthPickerProps) {
  const theme = useTheme();
  const parsed = parseDate(value);
  const [cursor, setCursor] = useState({ year: parsed.getFullYear(), month: parsed.getMonth() });

  useEffect(() => {
    if (visible) {
      const current = parseDate(value);
      setCursor({ year: current.getFullYear(), month: current.getMonth() });
    }
  }, [visible, value]);

  const weeks = monthGrid(cursor.year, cursor.month);

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <ModalSheet visible={visible} title="选择日期" onClose={onClose}>
      <View style={styles.header}>
        <Pressable onPress={() => shiftMonth(-1)} style={styles.navButton}>
          <ThemedText type="subtitle">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{formatMonth(cursor.year, cursor.month)}</ThemedText>
        <Pressable onPress={() => shiftMonth(1)} style={styles.navButton}>
          <ThemedText type="subtitle">›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday) => (
          <ThemedText key={weekday} type="small" themeColor="textSecondary" style={styles.weekday}>
            {weekday}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, index) => (
        <View key={`week-${index}`} style={styles.weekRow}>
          {week.map((date, cellIndex) => {
            if (!date) {
              return <View key={`empty-${cellIndex}`} style={styles.cell} />;
            }
            const selected = date === value;
            const isToday = date === todayStr();
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`选择日期 ${date}`}
                onPress={() => onSelect(date)}
                style={({ pressed }) => [
                  styles.cell,
                  styles.dayCell,
                  selected && { backgroundColor: theme.text },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="small"
                  style={{
                    color: selected ? theme.background : isToday ? theme.text : theme.textSecondary,
                    fontWeight: isToday || selected ? '700' : '400',
                  }}>
                  {parseDate(date).getDate()}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  navButton: {
    width: 40,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    paddingVertical: Spacing.one,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    maxHeight: 44,
  },
  dayCell: {
    margin: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
