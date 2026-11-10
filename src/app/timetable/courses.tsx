import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askConfirm, showActions } from '@/lib/dialogs';
import { useTimetable } from '@/features/timetable/TimetableContext';
import {
  SAFE_TOP_DP,
  SAFE_BOTTOM_DP,
  softenColor,
} from '@/lib/timetable-core';

export default function AllCoursesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { courses, settings, deleteCourse } = useTimetable();

  const sortedCourses = [...courses].sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-Hans-CN')
  );
  const totalPeriods = settings.periodTimes.length;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top || SAFE_TOP_DP,
          paddingBottom: insets.bottom || SAFE_BOTTOM_DP,
        },
      ]}
    >
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtnCircle} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>全部课程</Text>
        <View style={{ width: 36 }} />
      </View>

      {sortedCourses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>还没有课程</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/timetable/course')}
          >
            <Text style={styles.addBtnText}>添加课程</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody}>
          {sortedCourses.map((c) => {
            const dotColor = softenColor(c.color, settings.saturation);
            const outOfRangeCount = c.sessions.filter(
              (s) => s.startPeriod > totalPeriods || s.endPeriod > totalPeriods
            ).length;

            return (
              <TouchableOpacity
                key={c.id}
                style={styles.courseCard}
                onPress={() =>
                  router.push({ pathname: '/timetable/course', params: { id: c.id } })
                }
                delayLongPress={400}
                onLongPress={() => {
                  showActions({
                    title: c.name,
                    message: '选择操作',
                    options: [
                      {
                        label: '编辑',
                        onPress: () =>
                          router.push({ pathname: '/timetable/course', params: { id: c.id } }),
                      },
                      {
                        label: '删除',
                        danger: true,
                        onPress: () => {
                          void askConfirm({
                            title: '确认删除',
                            message: `确定删除「${c.name}」吗？`,
                            confirmLabel: '删除',
                            danger: true,
                          }).then((ok) => {
                            if (ok) deleteCourse(c.id);
                          });
                        },
                      },
                    ],
                  });
                }}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
                  <View>
                    <Text style={styles.courseName}>{c.name}</Text>
                    <Text style={styles.sessionCount}>{c.sessions.length} 个时段</Text>
                    {outOfRangeCount > 0 && (
                      <Text style={styles.outOfRangeText}>
                        有 {outOfRangeCount} 个时段超出当前节次范围
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  headerBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: '#111113', lineHeight: 24 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111113' },
  scrollBody: { padding: 16, gap: 10 },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  courseName: { fontSize: 16, fontWeight: '600', color: '#111113' },
  sessionCount: { fontSize: 12, color: 'rgba(0,0,0,0.6)', marginTop: 2 },
  outOfRangeText: { fontSize: 11, color: '#D97706', marginTop: 2 },
  chevron: { fontSize: 18, color: 'rgba(0,0,0,0.3)' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: 'rgba(0,0,0,0.6)' },
  addBtn: {
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
