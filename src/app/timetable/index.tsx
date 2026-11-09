import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { WheelPicker } from '@/components/ui/wheel-picker';
import { WeekGrid } from '@/components/timetable/week-grid';
import { WeekHeader } from '@/components/timetable/week-header';
import { OverflowSheet } from '@/components/timetable/overflow-sheet';
import { CourseDetailSheet, type DeleteScope } from '@/components/timetable/course-detail-sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PeriodTime } from '@/db/types';
import {
  type CourseException,
  addCourseException,
  createCourse,
  deleteCourse,
  getCourse,
  listCourseExceptions,
  listCourses,
  removeCourseException,
  updateCourse,
} from '@/db/repositories/courses';
import {
  getPeriodCount,
  getPeriodTimes,
  getRowHeight,
  getShowWeekend,
  getTermConfig,
  type TermConfig,
} from '@/db/repositories/settings';
import { bumpDataVersion, useDataVersion } from '@/lib/data-version';
import { todayStr } from '@/lib/date';
import { copyCourseName } from '@/lib/course-copy';
import { weekOfTerm } from '@/lib/timetable';
import { compactDate, weekStartDate, weekDates } from '@/lib/timetable-week';

export default function TimetableScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dataVersion = useDataVersion();

  const [courses, setCourses] = useState<Awaited<ReturnType<typeof listCourses>>>([]);
  const [term, setTerm] = useState<TermConfig>({ startDate: null, totalWeeks: 18 });
  const [periods, setPeriods] = useState<PeriodTime[]>([]);
  const [periodCount, setPeriodCount] = useState(11);
  const [showWeekend, setShowWeekend] = useState(true);
  const [rowHeight, setRowHeight] = useState(64);
  const [exceptions, setExceptions] = useState<CourseException[]>([]);
  const [week, setWeek] = useState(() => weekOfTerm(todayStr(), null));
  const [weekDraft, setWeekDraft] = useState('1');
  const [weekSheet, setWeekSheet] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const load = useCallback(async () => {
    const [list, termConfig, times, count, weekend, height, exceptionList] = await Promise.all([
      listCourses(),
      getTermConfig(),
      getPeriodTimes(),
      getPeriodCount(),
      getShowWeekend(),
      getRowHeight(),
      listCourseExceptions(),
    ]);
    setCourses(list);
    setTerm(termConfig);
    setPeriods(times);
    setPeriodCount(count);
    setShowWeekend(weekend);
    setRowHeight(height);
    setExceptions(exceptionList);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load, dataVersion]);

  const currentWeek = weekOfTerm(todayStr(), term.startDate);

  useFocusEffect(
    useCallback(() => {
      setWeek((previous) => (previous === currentWeek ? previous : currentWeek));
      load().catch(() => undefined);
    }, [currentWeek, load])
  );

  const today = todayStr();
  const monday = weekStartDate(term.startDate, week);
  const dates = weekDates(term.startDate, week, showWeekend);
  const times = periods.slice(0, periodCount);
  const hasTerm = Boolean(term.startDate);
  const detailCourse = detailId === null ? null : (courses.find((item) => item.id === detailId) ?? null);
  const skippedThisWeek =
    detailId !== null && exceptions.some((item) => item.courseId === detailId && item.week === week);

  async function refresh() {
    await load();
    bumpDataVersion();
  }

  async function handleNoteSave(note: string) {
    if (!detailCourse) return;
    await updateCourse(detailCourse.id, {
      name: detailCourse.name,
      teacher: detailCourse.teacher ?? undefined,
      room: detailCourse.room ?? undefined,
      color: detailCourse.color ?? undefined,
      background: detailCourse.background as 'plain' | 'grid' | 'stripe',
      note,
      slots: detailCourse.slots.map((slot) => ({
        weekday: slot.weekday,
        startPeriod: slot.startPeriod,
        endPeriod: slot.endPeriod,
        weeks: slot.weeks,
      })),
    });
    await refresh();
  }

  async function handleCopy() {
    if (!detailCourse) return;
    const source = await getCourse(detailCourse.id);
    if (!source) return;
    const copyId = await createCourse({
      name: copyCourseName(source.name),
      teacher: source.teacher ?? undefined,
      room: source.room ?? undefined,
      color: source.color ?? undefined,
      background: source.background as 'plain' | 'grid' | 'stripe',
      note: source.note ?? undefined,
      slots: source.slots.map((slot) => ({
        weekday: slot.weekday,
        startPeriod: slot.startPeriod,
        endPeriod: slot.endPeriod,
        weeks: slot.weeks,
      })),
    });
    setDetailId(null);
    await refresh();
    router.push({ pathname: '/timetable/course', params: { id: String(copyId) } });
  }

  async function handleDelete(scope: DeleteScope) {
    if (!detailCourse) return;
    if (scope === 'week') {
      await addCourseException(detailCourse.id, week);
      setDetailId(null);
      await refresh();
      return;
    }
    setConfirmDeleteAll(true);
  }

  async function handleRestoreWeek() {
    if (!detailCourse) return;
    await removeCourseException(detailCourse.id, week);
    await refresh();
  }

  const openWeekPicker = () => {
    setWeekDraft(String(week));
    setWeekSheet(true);
  };

  const weekOptions = Array.from({ length: Math.max(1, term.totalWeeks) }, (_, index) => ({
    value: String(index + 1),
    label: `第 ${index + 1} 周`,
  }));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
      <WeekHeader
        week={week}
        mondayDate={monday}
        isCurrentWeek={week === currentWeek}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
        onWeekPress={openWeekPicker}
        onBackToCurrent={() => setWeek(currentWeek)}
        onAdd={() => router.push('/timetable/course')}
        onImport={() => router.push('/timetable/settings?focus=import')}
        onMore={() => setOverflowOpen(true)}
      />

      {hasTerm ? (
        <View style={styles.gridWrap}>
          <WeekGrid
            dates={dates}
            periodTimes={times}
            rowHeight={rowHeight}
            today={today}
            week={week}
            courses={courses}
            exceptions={exceptions}
            onPressCourse={(courseId) => setDetailId(courseId)}
            onPressEmpty={(weekday, period) =>
              router.push({
                pathname: '/timetable/course',
                params: { weekday: String(weekday), period: String(period) },
              })
            }
          />
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyCard, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              先设置学期开始日和节数
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
              设置后就能按周查看课程，今天的课也会出现在今日计划里。
            </ThemedText>
            <AppButton label="去设置" onPress={() => router.push('/timetable/settings')} />
          </View>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="管理已填课程"
        onPress={() => router.push('/timetable/courses')}
        style={({ pressed }) => [styles.footer, pressed && styles.pressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          共 {courses.length} 门课 · 管理 ›
        </ThemedText>
      </Pressable>

      <BottomSheet
        visible={weekSheet}
        heightRatio={0.45}
        onClose={() => setWeekSheet(false)}
        footer={
          <View style={styles.sheetActions}>
            <View style={styles.sheetAction}>
              <AppButton label="取消" variant="secondary" onPress={() => setWeekSheet(false)} />
            </View>
            <View style={styles.sheetAction}>
              <AppButton
                label="保存"
                onPress={() => {
                  setWeek(Math.max(1, Number(weekDraft)));
                  setWeekSheet(false);
                }}
              />
            </View>
          </View>
        }>
        <ThemedText type="small" themeColor="textSecondary" style={styles.sheetTitle}>
          选择周次 · 第 1 周从 {term.startDate ? compactDate(term.startDate) : '学期开始日'} 算起
        </ThemedText>
        <WheelPicker
          columns={[{ key: 'week', options: weekOptions }]}
          value={{ week: weekDraft }}
          onChange={(next) => setWeekDraft(next.week)}
        />
      </BottomSheet>

      <OverflowSheet
        visible={overflowOpen}
        courseCount={courses.length}
        onClose={() => setOverflowOpen(false)}
        onPeriods={() => {
          setOverflowOpen(false);
          router.push('/timetable/periods');
        }}
        onSettings={() => {
          setOverflowOpen(false);
          router.push('/timetable/settings');
        }}
        onCourses={() => {
          setOverflowOpen(false);
          router.push('/timetable/courses');
        }}
      />

      <CourseDetailSheet
        visible={detailCourse !== null}
        course={detailCourse}
        totalWeeks={term.totalWeeks}
        week={week}
        skippedThisWeek={skippedThisWeek}
        onClose={() => setDetailId(null)}
        onEdit={() => {
          if (!detailCourse) return;
          const id = String(detailCourse.id);
          setDetailId(null);
          router.push({ pathname: '/timetable/course', params: { id } });
        }}
        onCopy={() => {
          handleCopy().catch(() => undefined);
        }}
        onNoteSave={(note) => {
          handleNoteSave(note).catch(() => undefined);
        }}
        onDelete={(scope) => {
          handleDelete(scope).catch(() => undefined);
        }}
        onRestoreWeek={() => {
          handleRestoreWeek().catch(() => undefined);
        }}
      />

      <ConfirmDialog
        visible={confirmDeleteAll}
        title="删除课程"
        message={detailCourse ? `会删除「${detailCourse.name}」及其所有时段，无法恢复。` : ''}
        confirmLabel="删除"
        danger
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={() => {
          const id = detailCourse?.id;
          setConfirmDeleteAll(false);
          setDetailId(null);
          if (id === undefined) return;
          deleteCourse(id)
            .then(refresh)
            .catch(() => undefined);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gridWrap: {
    flex: 1,
    marginTop: 4,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  emptyTitle: {
    fontSize: 18,
  },
  emptyHint: {
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  sheetTitle: {
    marginBottom: 8,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sheetAction: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});