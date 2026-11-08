import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { CourseForm } from '@/components/timetable/course-form';
import { WeekGrid } from '@/components/timetable/week-grid';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { listCourses, type CourseWithSlots } from '@/db/repositories/courses';
import {
  getPeriodTimes,
  getTermConfig,
  setPeriodTimes,
  setTermConfig,
  type TermConfig,
} from '@/db/repositories/settings';
import { useTheme } from '@/hooks/use-theme';
import { parseDate, todayStr, weekdayLabel } from '@/lib/date';
import { bumpDataVersion, useDataVersion } from '@/lib/data-version';
import { weekdayOf, weekOfTerm } from '@/lib/timetable';
import { WEEKDAY_LABELS } from '@/lib/timetable-grid';

const PERIOD_COUNT = 8;

type CourseFormState = {
  visible: boolean;
  course: CourseWithSlots | null;
  preset: { weekday: number; startPeriod: number } | null;
};

const EMPTY_FORM: CourseFormState = { visible: false, course: null, preset: null };

export default function TimetableScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const highlightCourseId = params.courseId ? Number(params.courseId) : null;
  const dataVersion = useDataVersion();

  const [courses, setCourses] = useState<CourseWithSlots[]>([]);
  const [term, setTerm] = useState<TermConfig>({ startDate: null, totalWeeks: 18 });
  const [periodTimes, setPeriods] = useState<string[]>([]);
  const [week, setWeek] = useState(1);
  const [includeWeekend, setIncludeWeekend] = useState(false);

  const [form, setForm] = useState<CourseFormState>(EMPTY_FORM);
  const [termSheet, setTermSheet] = useState(false);
  const [periodSheet, setPeriodSheet] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [nextCourses, nextTerm, nextPeriods] = await Promise.all([
      listCourses(),
      getTermConfig(),
      getPeriodTimes(),
    ]);
    setCourses(nextCourses);
    setTerm(nextTerm);
    setPeriods(nextPeriods);
    setWeek(weekOfTerm(todayStr(), nextTerm.startDate));
    setLoaded(true);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load, dataVersion]);

  const currentWeek = useMemo(() => weekOfTerm(todayStr(), term.startDate), [term.startDate]);

  useEffect(() => {
    if (!loaded) return;
    if (!term.startDate) setOnboardingStep(0);
  }, [loaded, term.startDate]);

  const todayWeekday = weekdayOf(todayStr());

  const openCreate = (preset: { weekday: number; startPeriod: number } | null = null) => {
    setForm({ visible: true, course: null, preset });
  };

  const finishOnboarding = () => {
    setOnboardingStep(null);
    openCreate();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.weekBar}>
          <Pressable
            accessibilityLabel="上一周"
            onPress={() => setWeek((value) => Math.max(1, value - 1))}
            hitSlop={10}
            style={[styles.arrow, { borderColor: theme.backgroundElement }]}
            disabled={week <= 1}>
            <ThemedText themeColor={week <= 1 ? 'textSecondary' : 'text'}>‹</ThemedText>
          </Pressable>

          <View style={styles.weekLabel}>
            <ThemedText type="subtitle">第 {week} 周</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              共 {term.totalWeeks} 周 · 今天周{weekdayLabel(parseDate(todayStr()))}
            </ThemedText>
          </View>

          <Pressable
            accessibilityLabel="下一周"
            onPress={() => setWeek((value) => Math.min(term.totalWeeks, value + 1))}
            hitSlop={10}
            style={[styles.arrow, { borderColor: theme.backgroundElement }]}
            disabled={week >= term.totalWeeks}>
            <ThemedText themeColor={week >= term.totalWeeks ? 'textSecondary' : 'text'}>›</ThemedText>
          </Pressable>
        </View>

        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: includeWeekend }}
            onPress={() => setIncludeWeekend((value) => !value)}
            style={[
              styles.toggle,
              { borderColor: theme.backgroundElement },
              includeWeekend && { backgroundColor: theme.text, borderColor: theme.text },
            ]}>
            <ThemedText
              type="small"
              style={{ color: includeWeekend ? theme.background : theme.text }}>
              {includeWeekend ? '含周末' : '只工作日'}
            </ThemedText>
          </Pressable>

          {week !== currentWeek ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setWeek(currentWeek)}
              style={[styles.toggle, { borderColor: theme.backgroundElement }]}>
              <ThemedText type="small">回到本周</ThemedText>
            </Pressable>
          ) : null}

          <View style={styles.toolbarSpacer} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="学期设置"
            onPress={() => setTermSheet(true)}
            style={[styles.toggle, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="small">学期</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="节次时间"
            onPress={() => setPeriodSheet(true)}
            style={[styles.toggle, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="small">节次</ThemedText>
          </Pressable>
        </View>

        {term.startDate ? (
          <WeekGrid
            courses={courses}
            week={week}
            periodTimes={periodTimes}
            includeWeekend={includeWeekend}
            highlightCourseId={highlightCourseId}
            todayWeekday={todayWeekday}
            onPressCourse={(courseId) => {
              const target = courses.find((item) => item.id === courseId) ?? null;
              setForm({ visible: true, course: target, preset: null });
            }}
            onPressEmpty={(weekday, startPeriod) => openCreate({ weekday, startPeriod })}
          />
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">先设置学期开始日</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              设置后就能按周查看课程，今天的课也会出现在今日计划里。
            </ThemedText>
            <AppButton label="开始设置" onPress={() => setOnboardingStep(0)} />
          </View>
        )}

        <View style={styles.courseSection}>
          <ThemedText type="smallBold">课程 {courses.length} 门</ThemedText>
          {courses.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              还没有课程，点下面的按钮或空白格子添加。
            </ThemedText>
          ) : (
            courses.map((course) => (
              <Pressable
                key={course.id}
                accessibilityRole="button"
                accessibilityLabel={`编辑课程 ${course.name}`}
                onPress={() => setForm({ visible: true, course, preset: null })}
                style={[styles.courseRow, { borderBottomColor: theme.backgroundElement }]}>
                <View style={[styles.colorDot, { backgroundColor: course.color ?? '#4C8DF6' }]} />
                <View style={styles.courseMeta}>
                  <ThemedText type="smallBold">{course.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[
                      course.teacher,
                      course.room,
                      course.slots
                        .map(
                          (slot) =>
                            `周${WEEKDAY_LABELS[slot.weekday - 1]} ${slot.startPeriod}-${slot.endPeriod}`
                        )
                        .join(' / '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  ›
                </ThemedText>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <AppButton
            label="＋ 新建课程"
            onPress={() => openCreate({ weekday: todayWeekday, startPeriod: 1 })}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/today')}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerLink}>
              回到今日计划
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <CourseForm
        visible={form.visible}
        course={form.course}
        totalWeeks={term.totalWeeks}
        preset={form.preset}
        onClose={() => setForm(EMPTY_FORM)}
        onSaved={() => {
          setForm(EMPTY_FORM);
          load().catch(() => undefined);
        }}
      />

      <TermSetupSheet
        visible={termSheet}
        initial={term}
        onClose={() => setTermSheet(false)}
        onSaved={async (next) => {
          await setTermConfig(next);
          bumpDataVersion();
          setTermSheet(false);
          await load();
        }}
      />

      <PeriodSheet
        visible={periodSheet}
        initial={periodTimes}
        onClose={() => setPeriodSheet(false)}
        onSaved={async (next) => {
          await setPeriodTimes(next);
          bumpDataVersion();
          setPeriodSheet(false);
          await load();
        }}
      />

      <OnboardingSheet
        step={onboardingStep}
        term={term}
        periodTimes={periodTimes}
        onStep={(step) => setOnboardingStep(step)}
        onClose={() => setOnboardingStep(null)}
        onFinish={finishOnboarding}
      />
    </SafeAreaView>
  );
}

interface TermSetupSheetProps {
  visible: boolean;
  initial: TermConfig;
  onClose: () => void;
  onSaved: (next: TermConfig) => void;
}

function isDateStr(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 学期开始日 + 总周数。日期用文本输入，格式 YYYY-MM-DD。 */
export function TermFields({
  startDate,
  totalWeeks,
  onChangeStart,
  onChangeWeeks,
  error,
}: {
  startDate: string;
  totalWeeks: number;
  onChangeStart: (value: string) => void;
  onChangeWeeks: (value: number) => void;
  error?: string | null;
}) {
  const theme = useTheme();
  return (
    <>
      <View style={modalStyles.field}>
        <TextField
          label="学期开始日（周一）"
          placeholder="2026-09-07"
          value={startDate}
          onChangeText={onChangeStart}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          error={error ?? undefined}
        />
        <ThemedText type="small" themeColor="textSecondary">
          格式 YYYY-MM-DD，填那一周的周一；第 1 周从这天算起。
        </ThemedText>
      </View>
      <View style={modalStyles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          总周数
        </ThemedText>
        <View style={styles.weeksRow}>
          <Pressable
            accessibilityLabel="减少总周数"
            onPress={() => onChangeWeeks(Math.max(1, totalWeeks - 1))}
            style={[styles.square, { borderColor: theme.backgroundElement }]}>
            <ThemedText>－</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.weeksValue}>
            {totalWeeks}
          </ThemedText>
          <Pressable
            accessibilityLabel="增加总周数"
            onPress={() => onChangeWeeks(Math.min(30, totalWeeks + 1))}
            style={[styles.square, { borderColor: theme.backgroundElement }]}>
            <ThemedText>＋</ThemedText>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function TermSetupSheet({ visible, initial, onClose, onSaved }: TermSetupSheetProps) {
  const [startDate, setStartDate] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(18);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStartDate(initial.startDate ?? '');
    setTotalWeeks(initial.totalWeeks);
    setError(null);
  }, [visible, initial.startDate, initial.totalWeeks]);

  return (
    <ModalSheet
      visible={visible}
      title="学期设置"
      onClose={onClose}
      footer={
        <View style={modalStyles.actionsRow}>
          <AppButton label="取消" variant="secondary" onPress={onClose} />
          <AppButton
            label="保存"
            onPress={() => {
              if (!isDateStr(startDate)) {
                setError('日期格式应为 YYYY-MM-DD');
                return;
              }
              onSaved({ startDate, totalWeeks });
            }}
          />
        </View>
      }>
      <TermFields
        startDate={startDate}
        totalWeeks={totalWeeks}
        onChangeStart={setStartDate}
        onChangeWeeks={setTotalWeeks}
        error={error}
      />
    </ModalSheet>
  );
}

function PeriodSheet({
  visible,
  initial,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initial: string[];
  onClose: () => void;
  onSaved: (next: string[]) => void;
}) {
  const [times, setTimes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const padded = [...initial];
    while (padded.length < PERIOD_COUNT) padded.push('');
    setTimes(padded.slice(0, PERIOD_COUNT));
    setError(null);
  }, [visible, initial]);

  const update = (index: number, value: string) => {
    setTimes((current) => current.map((item, i) => (i === index ? value : item)));
  };

  return (
    <ModalSheet
      visible={visible}
      title="节次时间"
      onClose={onClose}
      footer={
        <View style={modalStyles.actionsRow}>
          <AppButton label="取消" variant="secondary" onPress={onClose} />
          <AppButton
            label="保存"
            onPress={() => {
              if (times.some((time) => !/^\d{1,2}:\d{2}$/.test(time.trim()))) {
                setError('每节都要填 HH:MM');
                return;
              }
              onSaved(times.map((time) => time.trim()));
            }}
          />
        </View>
      }>
      {times.map((time, index) => (
        <View key={index} style={modalStyles.field}>
          <TextField
            label={`第 ${index + 1} 节`}
            placeholder="08:00"
            value={time}
            onChangeText={(value) => update(index, value)}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      ))}
      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </ModalSheet>
  );
}

interface OnboardingProps {
  step: number | null;
  term: TermConfig;
  periodTimes: string[];
  onStep: (step: number | null) => void;
  onClose: () => void;
  onFinish: () => void;
}

const STEPS = ['学期开始日', '节次时间', '第一节课'];

/** 首次进入课表的三步引导：学期开始日 → 节次时间 → 添加第一节课。 */
function OnboardingSheet({ step, term, periodTimes, onStep, onClose, onFinish }: OnboardingProps) {
  const [startDate, setStartDate] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(18);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 0) return;
    setStartDate(term.startDate ?? '');
    setTotalWeeks(term.totalWeeks);
    setError(null);
  }, [step, term.startDate, term.totalWeeks]);

  const top = Math.max(0, Math.min(STEPS.length - 1, step ?? 0));

  return (
    <ModalSheet
      visible={step !== null}
      title="先花一分钟设置课表"
      onClose={onClose}
      footer={
        <View style={modalStyles.actionsRow}>
          <AppButton label="跳过" variant="secondary" onPress={onClose} />
          <AppButton
            label={top === STEPS.length - 1 ? '添加第一节课' : '下一步'}
            onPress={() => {
              if (top === 0) {
                if (!isDateStr(startDate)) {
                  setError('日期格式应为 YYYY-MM-DD');
                  return;
                }
                setTermConfig({ startDate, totalWeeks })
                  .then(() => bumpDataVersion())
                  .catch(() => undefined);
                onStep(1);
                return;
              }
              if (top === 1) {
                onStep(2);
                return;
              }
              onFinish();
            }}
          />
        </View>
      }>
      <View style={styles.stepRow}>
        {STEPS.map((label, index) => (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                index <= top
                  ? { backgroundColor: '#26262A' }
                  : { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth },
              ]}
            />
            <ThemedText type="small" themeColor={index === top ? 'text' : 'textSecondary'}>
              {index + 1}. {label}
            </ThemedText>
          </View>
        ))}
      </View>

      {top === 0 ? (
        <TermFields
          startDate={startDate}
          totalWeeks={totalWeeks}
          onChangeStart={setStartDate}
          onChangeWeeks={setTotalWeeks}
          error={error}
        />
      ) : null}

      {top === 1 ? (
        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            默认 8 节：{periodTimes.slice(0, 4).join(' / ')} … 可以在「节次」里改。
          </ThemedText>
        </View>
      ) : null}

      {top === 2 ? (
        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            接下来填课程名、选星期与节次即可。之后点课表格子也能直接添加。
          </ThemedText>
        </View>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  weekBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  weekLabel: {
    flex: 1,
    alignItems: 'center',
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  toolbarSpacer: {
    flex: 1,
  },
  toggle: {
    paddingHorizontal: Spacing.two,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  emptyText: {
    lineHeight: 18,
  },
  courseSection: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  courseMeta: {
    flex: 1,
    gap: 2,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  footerLink: {
    textAlign: 'center',
  },
  weeksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  square: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeksValue: {
    minWidth: 32,
    textAlign: 'center',
  },
  error: {
    color: '#D64545',
    fontSize: 12,
  },
  stepRow: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});