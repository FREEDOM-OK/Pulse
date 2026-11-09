import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { compactDate } from '@/lib/timetable-week';
import { parseDate, weekdayLabel } from '@/lib/date';

const ICON_SIZE = 22;
const BUTTON = 34;
const PLUS_ICON = {
  ios: 'plus',
  android: 'add',
  web: 'add',
} as const;
const IMPORT_ICON = {
  ios: 'square.and.arrow.down',
  android: 'file_download',
  web: 'file_download',
} as const;
const MORE_ICON = {
  ios: 'ellipsis',
  android: 'more_horiz',
  web: 'more_horiz',
} as const;

interface WeekHeaderProps {
  week: number;
  /** 该周周一的日期。 */
  mondayDate: string;
  isCurrentWeek: boolean;
  onBack: () => void;
  onWeekPress: () => void;
  onBackToCurrent: () => void;
  onAdd: () => void;
  onImport: () => void;
  onMore: () => void;
}

/** 课表页自定义头部：返回 + 第 N 周 周一 / 日期 + ＋ / 导入 / …，没有下边线。 */
export function WeekHeader({
  week,
  mondayDate,
  isCurrentWeek,
  onBack,
  onWeekPress,
  onBackToCurrent,
  onAdd,
  onImport,
  onMore,
}: WeekHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="返回"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          size={ICON_SIZE}
          tintColor={theme.text}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`切换周次，当前第 ${week} 周`}
        onPress={onWeekPress}
        style={({ pressed }) => [styles.titleBlock, pressed && styles.pressed]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>
          第 {week} 周 {weekdayLabel(parseDate(mondayDate))}
        </ThemedText>
        <View style={styles.dateRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
            {compactDate(mondayDate)}
          </ThemedText>
          {isCurrentWeek ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="回到本周"
              onPress={onBackToCurrent}
              style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" style={styles.chipText}>
                本周
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="添加课程"
          hitSlop={6}
          onPress={onAdd}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={PLUS_ICON} size={ICON_SIZE} tintColor={theme.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="导入课表"
          hitSlop={6}
          onPress={onImport}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={IMPORT_ICON} size={ICON_SIZE} tintColor={theme.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="更多"
          hitSlop={6}
          onPress={onMore}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SymbolView name={MORE_ICON} size={ICON_SIZE} tintColor={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  iconButton: {
    width: BUTTON,
    height: BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    paddingVertical: 2,
    gap: 2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
});