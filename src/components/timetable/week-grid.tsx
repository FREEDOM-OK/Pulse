import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CourseLike } from '@/lib/timetable';
import {
  blockRect,
  coursesForWeekday,
  visibleWeekdays,
  WEEKDAY_LABELS,
  withAlpha,
} from '@/lib/timetable-grid';

const PERIOD_HEIGHT = 68;
const TIME_COLUMN = 44;
const MIN_DAY_WIDTH = 56;

interface WeekGridProps {
  courses: CourseLike[];
  week: number;
  periodTimes: string[];
  includeWeekend: boolean;
  /** 从今日计划点进来的课程：块加描边高亮。 */
  highlightCourseId?: number | null;
  /** 周日 = 7，用来给今天的列加淡底色。 */
  todayWeekday?: number | null;
  onPressCourse: (courseId: number) => void;
  /** 点空白格子：带着星期与节次打开新建课程。 */
  onPressEmpty: (weekday: number, period: number) => void;
}

/** 周网格：左侧节次时间，右侧按星期分列，课程用绝对定位的色块呈现。 */
export function WeekGrid({
  courses,
  week,
  periodTimes,
  includeWeekend,
  highlightCourseId,
  todayWeekday,
  onPressCourse,
  onPressEmpty,
}: WeekGridProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const days = visibleWeekdays(includeWeekend);
  const periodCount = Math.max(1, periodTimes.length);

  const dayWidth = includeWeekend
    ? MIN_DAY_WIDTH
    : Math.max(MIN_DAY_WIDTH, (width - Spacing.four - TIME_COLUMN) / days.length);
  const gridWidth = TIME_COLUMN + dayWidth * days.length;

  const body = (
    <View style={{ width: gridWidth }}>
      <View style={styles.headerRow}>
        <View style={{ width: TIME_COLUMN }} />
        {days.map((day) => (
          <View key={day} style={[styles.dayHeader, { width: dayWidth }]}>
            <ThemedText
              type="small"
              themeColor={day === todayWeekday ? 'text' : 'textSecondary'}
              style={day === todayWeekday ? styles.todayLabel : undefined}>
              {WEEKDAY_LABELS[day - 1]}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.bodyRow}>
        <View style={{ width: TIME_COLUMN }}>
          {periodTimes.map((time, index) => (
            <View key={`${time}-${index}`} style={[styles.timeCell, { height: PERIOD_HEIGHT }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.timeText}>
                {time}
              </ThemedText>
              <ThemedText style={[styles.periodNo, { color: theme.textSecondary }]}>
                {index + 1}
              </ThemedText>
            </View>
          ))}
        </View>

        {days.map((day) => {
          const blocks = coursesForWeekday(day, courses, week, periodTimes);
          return (
            <View
              key={day}
              style={[
                styles.dayColumn,
                {
                  width: dayWidth,
                  height: periodCount * PERIOD_HEIGHT,
                  borderLeftColor: theme.backgroundElement,
                  backgroundColor:
                    day === todayWeekday ? theme.backgroundElement : 'transparent',
                },
              ]}>
              {Array.from({ length: periodCount }, (_, index) => (
                <Pressable
                  key={index}
                  accessibilityLabel={`周${WEEKDAY_LABELS[day - 1]}第 ${index + 1} 节 添加课程`}
                  onPress={() => onPressEmpty(day, index + 1)}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      top: index * PERIOD_HEIGHT,
                      height: PERIOD_HEIGHT,
                      borderTopColor: theme.backgroundElement,
                    },
                    pressed && styles.pressed,
                  ]}
                />
              ))}

              {blocks.map((block) => {
                const rect = blockRect(block.startPeriod, block.endPeriod, PERIOD_HEIGHT);
                const highlighted = highlightCourseId === block.courseId;
                return (
                  <Pressable
                    key={block.slotId}
                    accessibilityRole="button"
                    accessibilityLabel={`${block.name} 第 ${block.startPeriod}-${block.endPeriod} 节`}
                    onPress={() => onPressCourse(block.courseId)}
                    style={({ pressed }) => [
                      styles.block,
                      {
                        top: rect.top,
                        height: rect.height,
                        backgroundColor: withAlpha(block.color, 0.12),
                        borderLeftColor: block.color,
                      },
                      highlighted && { borderWidth: 1.5, borderColor: block.color },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText style={styles.blockTitle} numberOfLines={2}>
                      {block.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {block.startPeriod}-{block.endPeriod} 节
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );

  if (includeWeekend) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {body}
      </ScrollView>
    );
  }

  return <View style={styles.container}>{body}</View>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.two,
  },
  scroll: {
    paddingHorizontal: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: Spacing.one,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  todayLabel: {
    fontWeight: '800',
  },
  bodyRow: {
    flexDirection: 'row',
  },
  timeCell: {
    justifyContent: 'flex-start',
    paddingTop: 2,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  periodNo: {
    fontSize: 10,
    lineHeight: 12,
  },
  dayColumn: {
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  block: {
    position: 'absolute',
    left: 2,
    right: 3,
    borderRadius: 10,
    borderLeftWidth: 3,
    paddingVertical: 5,
    paddingHorizontal: 5,
    gap: 2,
    overflow: 'hidden',
  },
  blockTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});