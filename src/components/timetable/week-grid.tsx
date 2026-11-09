import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { PeriodTime } from '@/db/types';
import type { CourseExceptionLike, CourseLike } from '@/lib/timetable';
import { blockRect, coursesForWeekday, WEEKDAY_LABELS, withAlpha } from '@/lib/timetable-grid';

const TIME_COLUMN = 48;
const H_PADDING = 12;
const GAP = 4;

interface WeekGridProps {
  /** 该周要显示的日期，从周一开始；长度即列数（5 或 7）。 */
  dates: string[];
  periodTimes: PeriodTime[];
  rowHeight: number;
  today: string;
  week: number;
  courses: CourseLike[];
  exceptions?: CourseExceptionLike[];
  highlightCourseId?: number | null;
  onPressCourse: (courseId: number) => void;
  onPressEmpty: (weekday: number, period: number) => void;
}

/** 周网格：吸顶日期行 + 左侧节次时间 + 按星期分列，可上下滚动。 */
export function WeekGrid({
  dates,
  periodTimes,
  rowHeight,
  today,
  week,
  courses,
  exceptions = [],
  highlightCourseId,
  onPressCourse,
  onPressEmpty,
}: WeekGridProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const periodCount = Math.max(1, periodTimes.length);
  const dayCount = Math.max(1, dates.length);
  const dayWidth = Math.max(30, (width - H_PADDING * 2 - TIME_COLUMN) / dayCount);
  const gridWidth = TIME_COLUMN + dayWidth * dayCount;

  const header = (
    <View
      style={[
        styles.headerRow,
        { width: gridWidth, backgroundColor: theme.background },
      ]}>
      <View style={{ width: TIME_COLUMN }} />
      {dates.map((date, index) => {
        const isToday = date === today;
        return (
          <View key={date} style={[styles.dayHeader, { width: dayWidth }]}>
            <ThemedText
              type="small"
              themeColor={isToday ? 'text' : 'textSecondary'}
              style={[styles.weekday, isToday && styles.weekdayToday]}>
              {WEEKDAY_LABELS[index]}
            </ThemedText>
            <View
              style={[
                styles.dayNumber,
                isToday && { backgroundColor: theme.text },
              ]}>
              <ThemedText
                type="small"
                style={[
                  styles.dayNumberText,
                  { color: isToday ? theme.background : theme.text },
                ]}>
                {Number(date.slice(8))}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[0]}
      contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 24 }}>
      {header}

      <View style={[styles.bodyRow, { width: gridWidth }]}>
        <View style={{ width: TIME_COLUMN }}>
          {periodTimes.map((time, index) => (
            <View key={`${time.start}-${index}`} style={[styles.timeCell, { height: rowHeight }]}>
              <ThemedText style={[styles.periodNo, { color: theme.text }]}>{index + 1}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.timeText}>
                {time.start}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.timeText}>
                {time.end}
              </ThemedText>
            </View>
          ))}
        </View>

        {dates.map((date, index) => {
          const weekday = index + 1;
          const blocks = coursesForWeekday(weekday, courses, week, periodTimes, exceptions);
          const covered = new Set<number>();
          for (const block of blocks) {
            for (let period = block.startPeriod; period <= block.endPeriod; period += 1) {
              covered.add(period);
            }
          }
          const isToday = date === today;

          return (
            <View
              key={date}
              style={[
                styles.dayColumn,
                {
                  width: dayWidth,
                  height: periodCount * rowHeight,
                  borderLeftColor: theme.backgroundElement,
                  backgroundColor: isToday ? theme.backgroundElement : 'transparent',
                },
              ]}>
              {Array.from({ length: periodCount }, (_, cellIndex) => {
                const period = cellIndex + 1;
                return (
                  <Pressable
                    key={period}
                    accessibilityLabel={`周${WEEKDAY_LABELS[index]}第 ${period} 节 添加课程`}
                    onPress={() => onPressEmpty(weekday, period)}
                    style={({ pressed }) => [
                      styles.cell,
                      {
                        top: cellIndex * rowHeight,
                        height: rowHeight,
                        borderTopColor: theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}>
                    {isToday && !covered.has(period) ? (
                      <ThemedText
                        accessibilityElementsHidden
                        style={[styles.cellPlus, { color: theme.textSecondary }]}>
                        ＋
                      </ThemedText>
                    ) : null}
                  </Pressable>
                );
              })}

              {blocks.map((block) => {
                const rect = blockRect(block.startPeriod, block.endPeriod, rowHeight, GAP);
                const highlighted = highlightCourseId === block.courseId;
                const meta = block.room ? `@${block.room}` : block.teacher ? block.teacher : '';
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
                    <CourseBlockPattern background={block.background} color={block.color} />
                    <ThemedText style={[styles.blockTitle, { color: theme.text }]} numberOfLines={2}>
                      {block.name}
                    </ThemedText>
                    {meta ? (
                      <ThemedText
                        style={[styles.blockMeta, { color: theme.textSecondary }]}
                        numberOfLines={1}>
                        {meta}
                      </ThemedText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/** 课程块底色：纯色 / 网格 / 斑马纹，全用 View 绘制，无图片依赖。 */
function CourseBlockPattern({ background, color }: { background?: string; color: string }) {
  if (!background || background === 'plain') return null;

  if (background === 'grid') {
    return (
      <View style={styles.patternLayer} pointerEvents="none">
        {[0, 1, 2, 3].map((row) => (
          <View
            key={`h-${row}`}
            style={[
              styles.gridLineH,
              { top: `${(row + 1) * 20}%`, backgroundColor: withAlpha(color, 0.18) },
            ]}
          />
        ))}
        {[0, 1].map((column) => (
          <View
            key={`v-${column}`}
            style={[
              styles.gridLineV,
              { left: `${(column + 1) * 33.33}%`, backgroundColor: withAlpha(color, 0.18) },
            ]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.patternLayer} pointerEvents="none">
      {[0, 1, 2, 3, 4, 5].map((index) =>
        index % 2 === 0 ? (
          <View
            key={`stripe-${index}`}
            style={[styles.stripe, { top: `${index * 16.66}%`, backgroundColor: withAlpha(color, 0.1) }]}
          />
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 4,
    zIndex: 2,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  weekday: {
    fontSize: 11,
  },
  weekdayToday: {
    fontWeight: '700',
  },
  dayNumber: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bodyRow: {
    flexDirection: 'row',
  },
  timeCell: {
    paddingTop: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  periodNo: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 9.5,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cellPlus: {
    fontSize: 13,
    opacity: 0.45,
  },
  block: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 10,
    borderLeftWidth: 3,
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 1,
    overflow: 'hidden',
  },
  blockTitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  blockMeta: {
    fontSize: 9,
    lineHeight: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  patternLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '16.66%',
  },
});