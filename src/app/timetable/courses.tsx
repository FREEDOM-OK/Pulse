import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { SubPageHeader } from '@/components/timetable/sub-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listCourses, type CourseWithSlots } from '@/db/repositories/courses';
import { getTermConfig } from '@/db/repositories/settings';
import { useDataVersion } from '@/lib/data-version';
import { formatWeeksRange } from '@/lib/timetable';
import { WEEKDAY_LABELS } from '@/lib/timetable-grid';

/** 已填课程：列出所有课程与其时段，点进去查看 / 编辑。 */
export default function TimetableCoursesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dataVersion = useDataVersion();
  const [courses, setCourses] = useState<CourseWithSlots[]>([]);
  const [totalWeeks, setTotalWeeks] = useState(18);

  const load = useCallback(async () => {
    const [list, term] = await Promise.all([listCourses(), getTermConfig()]);
    setCourses(list);
    setTotalWeeks(term.totalWeeks);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load, dataVersion]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
      <SubPageHeader
        title="已填课程"
        onBack={() => router.back()}
        actionLabel="添加"
        onAction={() => router.push('/timetable/course')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {courses.length === 0 ? (
          <View style={[styles.empty, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              还没有课程
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              点右上角「添加」，或者直接在课表空格子里点 ＋。
            </ThemedText>
          </View>
        ) : (
          courses.map((course) => {
            const weeks = course.slots.flatMap((slot) => slot.weeks);
            const slotsText = course.slots
              .map(
                (slot) =>
                  `周${WEEKDAY_LABELS[slot.weekday - 1]} 第 ${slot.startPeriod}-${slot.endPeriod} 节`
              )
              .join(' · ');
            return (
              <Pressable
                key={course.id}
                accessibilityRole="button"
                accessibilityLabel={`${course.name} ${slotsText}`}
                onPress={() =>
                  router.push({ pathname: '/timetable/course', params: { id: String(course.id) } })
                }
                style={({ pressed }) => [
                  styles.card,
                  { borderColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.titleRow}>
                  <View style={[styles.dot, { backgroundColor: course.color ?? '#4C8DF6' }]} />
                  <ThemedText style={styles.name} numberOfLines={1}>
                    {course.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    ›
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {slotsText || '还没有时段'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatWeeksRange(weeks, totalWeeks)}
                  {course.room ? ` · ${course.room}` : ''}
                  {course.teacher ? ` · ${course.teacher}` : ''}
                </ThemedText>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  empty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: Spacing.three,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
});