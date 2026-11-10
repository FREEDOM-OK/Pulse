import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CourseOnDate } from '@/features/timetable/bridge';

interface CourseRowItemProps {
  course: CourseOnDate;
  onPress: () => void;
}

/** 课程派生行：只读，点击跳到课表定位这节课。 */
export function CourseRowItem({ course, onPress }: CourseRowItemProps) {
  const periodLabel =
    course.endPeriod > course.startPeriod
      ? `第 ${course.startPeriod}-${course.endPeriod} 节`
      : `第 ${course.startPeriod} 节`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`课程 ${course.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.dot, { backgroundColor: course.color }]} />

      <View style={styles.body}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {course.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {periodLabel}
          {course.time ? ` · ${course.time}` : ''}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        ›
      </ThemedText>
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
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