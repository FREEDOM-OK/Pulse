import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CourseOnDate } from '@/features/timetable/bridge';

interface CourseRowItemProps {
  course: CourseOnDate;
  onPress: () => void;
  /** 首页用 home：绿色 8dp 圆点、固定文字色、不显示右侧箭头。 */
  variant?: 'default' | 'home';
  titleColor?: string;
  metaColor?: string;
  dotColor?: string;
}

/** 课程派生行：只读，点击跳到课表定位这节课。 */
export function CourseRowItem({
  course,
  onPress,
  variant = 'default',
  titleColor,
  metaColor,
  dotColor,
}: CourseRowItemProps) {
  const periodLabel =
    course.endPeriod > course.startPeriod
      ? `第 ${course.startPeriod}-${course.endPeriod} 节`
      : `第 ${course.startPeriod} 节`;
  const home = variant === 'home';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`课程 ${course.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.lead, home && styles.leadHome]}>
        <View
          style={[
            styles.dot,
            home && styles.dotHome,
            { backgroundColor: dotColor ?? (home ? '#4CD964' : course.color) },
          ]}
        />
      </View>

      <View style={styles.body}>
        <ThemedText
          style={[styles.title, titleColor ? { color: titleColor } : undefined]}
          numberOfLines={1}>
          {course.name}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={metaColor ? { color: metaColor } : undefined}
          numberOfLines={1}>
          {periodLabel}
          {course.time ? ` · ${course.time}` : ''}
        </ThemedText>
      </View>

      {!home ? (
        <ThemedText type="small" themeColor="textSecondary">
          ›
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 14,
  },
  lead: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadHome: {
    width: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotHome: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});