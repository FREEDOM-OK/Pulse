import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTimetable } from '@/features/timetable/TimetableContext';
import type { TabIcon } from '@/constants/tabs';
import { SessionEntity } from '@/features/timetable/repository';
import { askConfirm, showNotice } from '@/lib/dialogs';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';
import { TimeWheelSheet, WheelSheet } from '@/components/timetable/wheel-sheet';
import { WheelPicker } from '@/components/ui/wheel-picker';
import {
  COURSE_COLORS,
  SAFE_TOP_DP,
  SAFE_BOTTOM_DP,
  formatWeeks,
  fromMinutes,
  periodsForTimeRange,
  toMinutes,
  weeksFromRange,
} from '@/lib/timetable-core';

/** 三列节次滚轮的行高与整体高度（5 行 × 44）。 */
const PERIOD_WHEEL_ROW_H = 44;

/** `HH:MM` 加减分钟，夹在当天 00:00–23:59 之间（时间不允许跨天）。 */
function shiftClamped(value: string, delta: number): string {
  const base = toMinutes(value);
  if (!Number.isFinite(base)) return value;
  return fromMinutes(Math.min(1439, Math.max(0, base + delta)));
}

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 表单行左侧的单色线性图标（与详情抽屉、顶栏同一套 SymbolView 口径）。 */
const COLOR_ICON: TabIcon = { ios: 'paintpalette', android: 'palette', web: 'palette' };
const CREDIT_ICON: TabIcon = { ios: 'star.circle', android: 'stars', web: 'stars' };
const WEEKS_ICON: TabIcon = { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' };
const PERIOD_ICON: TabIcon = { ios: 'clock', android: 'schedule', web: 'schedule' };
const CUSTOM_TIME_ICON: TabIcon = {
  ios: 'square.and.pencil',
  android: 'edit_note',
  web: 'edit_note',
};
const PLACE_ICON: TabIcon = { ios: 'location', android: 'place', web: 'place' };
const TEACHER_ICON: TabIcon = {
  ios: 'person',
  android: 'person_outline',
  web: 'person_outline',
};
const REMARK_ICON: TabIcon = { ios: 'doc.text', android: 'notes', web: 'notes' };

function RowIcon({ icon }: { icon: TabIcon }) {
  const theme = useTheme();
  return <SymbolView name={icon} size={20} tintColor={theme.text} />;
}

/** 本地临时主键：课程/时段写库前先拿到稳定 id（放模块级，避免在渲染里调用 Date）。 */
let localIdSeed = 0;
function newLocalId(prefix: 'c' | 's'): string {
  localIdSeed += 1;
  return `${prefix}_${Date.now()}_${localIdSeed}`;
}
const PRESET_COLORS = Array.from(
  new Set([
    '#C8644A',
    '#5B8FB9',
    '#C27084',
    '#9E9AA7',
    ...COURSE_COLORS,
  ])
).slice(0, 20);

export default function AddOrEditCourseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { scheme } = useThemePreference();
  /** 深色下用极淡白线做行分隔，浅色沿用原来的浅灰细线。 */
  const dividerColor = scheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#F1F5F9';
  const params = useLocalSearchParams<{
    id?: string;
    day?: string;
    period?: string;
    endPeriod?: string;
  }>();
  const { courses, activeSchedule, settings, saveCourse } = useTimetable();

  const existingCourse = useMemo(
    () => (params.id ? courses.find((c) => c.id === params.id) : undefined),
    [params.id, courses]
  );

  const totalWeeks = activeSchedule.totalWeeks || 20;
  const totalPeriods = settings.periodTimes.length || 11;
  const defaultSpan = settings.defaultSpan || 2;

  const initStartPeriod = Math.min(
    Math.max(params.period ? parseInt(params.period, 10) || 1 : 1, 1),
    totalPeriods
  );
  // 网格里的 ＋ 预览块会带上它实际展示的结束节，直接沿用，避免“预览 2 节、打开变别的数”。
  const initEndPeriod = params.endPeriod
    ? Math.min(
        Math.max(initStartPeriod, parseInt(params.endPeriod, 10) || initStartPeriod),
        totalPeriods
      )
    : Math.min(initStartPeriod + defaultSpan - 1, totalPeriods);
  // 顶栏 ＋ 现在直接 push 本页、不带 day 参数；默认仍落在今天，
  // 保持「点 ＋ 就能录入今天这节」的旧习惯（编辑已有课程时走 existingCourse）。
  const todayDayOfWeek = new Date().getDay() || 7;

  const [courseId] = useState(existingCourse?.id || newLocalId('c'));
  const [name, setName] = useState(existingCourse?.name || '');
  const [color, setColor] = useState(
    existingCourse?.color || COURSE_COLORS[courses.length % COURSE_COLORS.length]
  );
  const [credits, setCredits] = useState(existingCourse?.credits || '选填');

  const [sessions, setSessions] = useState<SessionEntity[]>(() => {
    if (existingCourse && existingCourse.sessions.length > 0) {
      return JSON.parse(JSON.stringify(existingCourse.sessions));
    }
    return [
      {
        id: newLocalId('s'),
        courseId,
        dayOfWeek: params.day ? parseInt(params.day, 10) : todayDayOfWeek,
        startPeriod: initStartPeriod,
        endPeriod: initEndPeriod,
        weeks: weeksFromRange(1, totalWeeks, 'all'),
        teacher: '',
        location: '',
        remark: '',
        customTime: {
          enabled: false,
          startTime: settings.periodTimes[initStartPeriod - 1]?.start || '08:00',
          endTime: settings.periodTimes[initEndPeriod - 1]?.end || '09:40',
        },
      },
    ];
  });

  // 当前正在编辑哪个时段子模态
  const [activeSessionIdx, setActiveSessionIdx] = useState<number>(0);
  /** 保存进行中标记：挡住双击「保存」造成的并发写入。 */
  const savingRef = useRef(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showTimeWheel, setShowTimeWheel] = useState(false);
  const [showCustomTimePage, setShowCustomTimePage] = useState(false);

  /** 三列节次滚轮的草稿：点「保存」才写回 sessions，中途滑动不会污染表单。 */
  const [draftDay, setDraftDay] = useState(1);
  const [draftStart, setDraftStart] = useState(1);
  const [draftEnd, setDraftEnd] = useState(1);
  /** 自定义时间里正在选的是上课还是下课时间。 */
  const [customTimePickerTarget, setCustomTimePickerTarget] = useState<'start' | 'end' | null>(null);

  const activeSession = sessions[activeSessionIdx] || sessions[0];

  const dayOptions = useMemo(
    () => DAYS.map((label, i) => ({ value: String(i + 1), label })),
    []
  );
  const periodOptions = useMemo(
    () =>
      Array.from({ length: totalPeriods }, (_, i) => ({
        value: String(i + 1),
        label: `第 ${i + 1} 节`,
      })),
    [totalPeriods]
  );

  const updateSessionField = <K extends keyof SessionEntity>(
    idx: number,
    key: K,
    val: SessionEntity[K]
  ) => {
    setSessions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  };

  const periodStartOf = (period: number) => settings.periodTimes[period - 1]?.start || '08:00';
  const periodEndOf = (period: number) => settings.periodTimes[period - 1]?.end || '09:40';

  /** 打开三列滚轮前，先把当前时段的星期/起止节装进草稿。 */
  const openPeriodWheel = (idx: number, sess: SessionEntity) => {
    setActiveSessionIdx(idx);
    setDraftDay(sess.dayOfWeek || 1);
    setDraftStart(sess.startPeriod || 1);
    setDraftEnd(Math.max(sess.startPeriod || 1, sess.endPeriod || 1));
    setShowTimeWheel(true);
  };

  /** 三列滚轮「保存」：一次写回星期与起止节，未开启自定义时间时顺手刷新时间备份。 */
  const applyPeriodDraft = () => {
    const startP = Math.min(Math.max(1, draftStart), totalPeriods);
    const endP = Math.min(Math.max(startP, draftEnd), totalPeriods);
    setSessions((prev) => {
      const next = [...prev];
      const sess = next[activeSessionIdx];
      if (!sess) return prev;
      const customTime = sess.customTime?.enabled
        ? sess.customTime
        : { enabled: false, startTime: periodStartOf(startP), endTime: periodEndOf(endP) };
      next[activeSessionIdx] = {
        ...sess,
        dayOfWeek: Math.min(7, Math.max(1, draftDay)),
        startPeriod: startP,
        endPeriod: endP,
        customTime,
      };
      return next;
    });
    setShowTimeWheel(false);
  };

  /** 点时间胶囊：没开自定义时间就顺带打开，再弹出双列时间滚轮。 */
  const openCustomTimePicker = (target: 'start' | 'end') => {
    const cur = activeSession?.customTime;
    if (!cur?.enabled) {
      updateSessionField(activeSessionIdx, 'customTime', {
        enabled: true,
        startTime: cur?.startTime || periodStartOf(activeSession?.startPeriod || 1),
        endTime: cur?.endTime || periodEndOf(activeSession?.endPeriod || 1),
      });
    }
    setCustomTimePickerTarget(target);
  };

  /** 时间滚轮「保存」：下课时间不能早于上课时间，冲突时自动顺延 45 分钟。 */
  const handleCustomTimeSave = (next: string) => {
    const target = customTimePickerTarget;
    if (!target) return;
    const cur = activeSession?.customTime;
    let startTime = cur?.startTime || '08:00';
    let endTime = cur?.endTime || '09:30';

    if (target === 'start') {
      startTime = next;
      if (toMinutes(endTime) <= toMinutes(startTime)) endTime = shiftClamped(startTime, 45);
    } else {
      endTime = next;
      if (toMinutes(endTime) <= toMinutes(startTime)) startTime = shiftClamped(endTime, -45);
    }

    updateSessionField(activeSessionIdx, 'customTime', { enabled: true, startTime, endTime });
    // 自定义时间一变，就反推与之相交的起止节次，让详情里的「第 X - Y 节」和真实跨度一致。
    const span = periodsForTimeRange(startTime, endTime, settings.periodTimes);
    if (span) {
      updateSessionField(activeSessionIdx, 'startPeriod', span.startPeriod);
      updateSessionField(activeSessionIdx, 'endPeriod', span.endPeriod);
    }
    setCustomTimePickerTarget(null);
  };

  // 复制时段到列表末尾
  const handleCopySession = (idx: number) => {
    const target = sessions[idx];
    const cloned: SessionEntity = {
      ...JSON.parse(JSON.stringify(target)),
      id: newLocalId('s'),
    };
    setSessions((prev) => [...prev, cloned]);
  };

  // 删除时段（只剩 1 个时置灰不删除）
  const handleDeleteSession = (idx: number) => {
    if (sessions.length <= 1) return;
    setSessions((prev) => prev.filter((_, i) => i !== idx));
  };

  // 保存校验（逐条，命中第一条停下并提示）
  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showNotice('请填写课程名称');
      return;
    }
    if (trimmedName.length > 30) {
      showNotice('课程名称最多 30 个字');
      return;
    }
    if (sessions.length === 0) {
      showNotice('至少添加一个时段');
      return;
    }

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s.weeks || s.weeks.length === 0) {
        showNotice(`请为「时段${i + 1}」选择上课周数`);
        return;
      }
      if (
        s.startPeriod < 1 ||
        s.startPeriod > totalPeriods ||
        s.endPeriod < 1 ||
        s.endPeriod > totalPeriods
      ) {
        showNotice(`节次需在 1–${totalPeriods} 之间`);
        return;
      }
      if (s.endPeriod < s.startPeriod) {
        showNotice('结束节不能早于开始节');
        return;
      }
    }

    // 检查时段冲突（同一星期、节次重叠、周次有交集）
    let conflictCourseName: string | null = null;
    for (const other of courses) {
      if (other.id === courseId || other.scheduleId !== activeSchedule.id) continue;
      for (const sOther of other.sessions) {
        for (const sNew of sessions) {
          if (sOther.dayOfWeek === sNew.dayOfWeek) {
            const overlap =
              Math.max(sOther.startPeriod, sNew.startPeriod) <=
              Math.min(sOther.endPeriod, sNew.endPeriod);
            if (overlap) {
              const common = sOther.weeks.filter((w) => sNew.weeks.includes(w));
              if (common.length > 0) {
                conflictCourseName = other.name;
                break;
              }
            }
          }
        }
        if (conflictCourseName) break;
      }
      if (conflictCourseName) break;
    }

    if (conflictCourseName) {
      void askConfirm({
        title: '冲突确认',
        message: `与「${conflictCourseName}」时间冲突，仍要保存吗？`,
        confirmLabel: '仍然保存',
      }).then((ok) => {
        if (ok) commitSave(trimmedName);
      });
      return;
    }

    commitSave(trimmedName);
  };

  const commitSave = async (trimmedName: string) => {
    // 双击保存 / 点「仍然保存」时手指还没离开：第二次直接忽略，避免同一门课并发写两次。
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await saveCourse({
        id: courseId,
        scheduleId: activeSchedule.id,
        name: trimmedName,
        color,
        credits,
        sessions,
      });
      if (router.canGoBack()) router.back();
      else router.replace('/timetable');
    } catch (err) {
      // 写库失败（例如旧库还带着 v7 的唯一索引）不能把异常冒成未捕获的 Promise 拒绝：
      // 原生端会直接崩掉页面回到首页，用户看到的就是「保存后闪退」。
      showNotice(`保存失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top || SAFE_TOP_DP,
          paddingBottom: insets.bottom || SAFE_BOTTOM_DP,
        },
      ]}
    >
      {/* 1. 顶部操作栏 */}
      <View style={[styles.topBar, { backgroundColor: theme.background, borderBottomColor: dividerColor }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          accessibilityLabel="关闭"
        >
          <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.barTitle, { color: theme.text }]}>
          {existingCourse ? '编辑课程' : '添加课程'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} accessibilityLabel="保存课程">
          <Text style={styles.saveText}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 卡片 1: 课程名称输入 */}
        <View style={[styles.nameCard, { backgroundColor: theme.backgroundElement }]}>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={30}
            accessibilityLabel="课程名称"
            placeholder="例如：高等数学"
            placeholderTextColor={theme.textSecondary}
            style={[styles.nameInput, { color: theme.text }]}
          />
        </View>

        {/* 卡片 2: 颜色与学分 */}
        <View style={[styles.groupCard, { backgroundColor: theme.backgroundElement }]}>
          <TouchableOpacity
            style={[styles.rowItem, { borderBottomColor: dividerColor }]}
            onPress={() => setShowColorPicker(true)}
            accessibilityLabel="选择颜色"
          >
            <View style={styles.rowLeft}>
              <RowIcon icon={COLOR_ICON} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>颜色</Text>
            </View>
            <View style={styles.colorRingBorder}>
              <View style={[styles.colorCenterCircle, { backgroundColor: color }]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, { borderBottomWidth: 0 }]}
            accessibilityLabel="学分"
            onPress={() => {
              const order = ['选填', '1.0', '2.0', '3.0', '4.0'];
              const next = order[(order.indexOf(credits) + 1) % order.length];
              setCredits(next);
            }}
          >
            <View style={styles.rowLeft}>
              <RowIcon icon={CREDIT_ICON} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>学分</Text>
            </View>
            <Text style={[styles.rowRightHint, { color: theme.textSecondary }]}>{credits} ›</Text>
          </TouchableOpacity>
        </View>

        {/* 时段区：支持多时段卡片 */}
        {sessions.map((sess, idx) => {
          const canDelete = sessions.length > 1;
          const customEnabled = sess.customTime?.enabled ?? false;
          const customLabel = customEnabled
            ? `${sess.customTime?.startTime} - ${sess.customTime?.endTime}`
            : '关闭';

          return (
            <View key={sess.id}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>时段{idx + 1}</Text>
                <View style={styles.sectionActions}>
                  <TouchableOpacity
                    onPress={() => handleCopySession(idx)}
                    accessibilityLabel={`复制时段${idx + 1}`}
                  >
                    <Text style={styles.copyText}>复制</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!canDelete}
                    onPress={() => handleDeleteSession(idx)}
                    accessibilityLabel={`删除时段${idx + 1}`}
                  >
                    <Text style={[canDelete ? styles.deleteActiveText : styles.deleteText, !canDelete && { color: theme.textSecondary }]}>
                      删除
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.groupCard, { backgroundColor: theme.backgroundElement }]}>
                {/* 周数选择 */}
                <TouchableOpacity
                  style={[styles.rowItem, { borderBottomColor: dividerColor }]}
                  accessibilityLabel={`选择周数 时段${idx + 1}`}
                  onPress={() => {
                    setActiveSessionIdx(idx);
                    setShowWeekPicker(true);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <RowIcon icon={WEEKS_ICON} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>周数</Text>
                  </View>
                  <Text style={[styles.rowRightValue, { color: theme.text }]}>
                    {sess.weeks.length > 0 ? `第 ${formatWeeks(sess.weeks)} 周` : '未选择'} ›
                  </Text>
                </TouchableOpacity>

                {/* 节数选择 */}
                <TouchableOpacity
                  style={[styles.rowItem, { borderBottomColor: dividerColor }]}
                  accessibilityLabel={`选择节次 时段${idx + 1}`}
                  onPress={() => openPeriodWheel(idx, sess)}
                >
                  <View style={styles.rowLeft}>
                    <RowIcon icon={PERIOD_ICON} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>节数</Text>
                  </View>
                  <Text style={[styles.rowRightValue, { color: theme.text }]}>
                    {DAYS[sess.dayOfWeek - 1]}   第 {sess.startPeriod} - {sess.endPeriod} 节 ›
                  </Text>
                </TouchableOpacity>

                {/* 自定义时间直达行 */}
                <TouchableOpacity
                  style={[styles.rowItem, { borderBottomColor: dividerColor }]}
                  accessibilityLabel={`自定义时间 时段${idx + 1}`}
                  onPress={() => {
                    setActiveSessionIdx(idx);
                    setShowCustomTimePage(true);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <RowIcon icon={CUSTOM_TIME_ICON} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>自定义时间</Text>
                  </View>
                  <Text style={[styles.rowRightHint, { color: theme.textSecondary }]}>{customLabel} ›</Text>
                </TouchableOpacity>

                {/* 地点 */}
                <View style={[styles.rowItem, { borderBottomColor: dividerColor }]}>
                  <View style={styles.rowLeft}>
                    <RowIcon icon={PLACE_ICON} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>地点</Text>
                  </View>
                  <TextInput
                    value={sess.location}
                    onChangeText={(txt) => updateSessionField(idx, 'location', txt)}
                    placeholder="选填"
                    accessibilityLabel={`地点 时段${idx + 1}`}
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.rowInput, { color: theme.text }]}
                  />
                </View>

                {/* 教师 */}
                <View style={[styles.rowItem, { borderBottomColor: dividerColor }]}>
                  <View style={styles.rowLeft}>
                    <RowIcon icon={TEACHER_ICON} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>教师</Text>
                  </View>
                  <TextInput
                    value={sess.teacher}
                    onChangeText={(txt) => updateSessionField(idx, 'teacher', txt)}
                    placeholder="选填"
                    accessibilityLabel={`教师 时段${idx + 1}`}
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.rowInput, { color: theme.text }]}
                  />
                </View>

                {/* 备注 */}
                <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
                  <View style={styles.rowLeft}>
                    <RowIcon icon={REMARK_ICON} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>备注</Text>
                  </View>
                  <TextInput
                    value={sess.remark || ''}
                    maxLength={100}
                    onChangeText={(txt) => updateSessionField(idx, 'remark', txt)}
                    placeholder="选填，最长 100 字"
                    accessibilityLabel={`备注 时段${idx + 1}`}
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.rowInput, { color: theme.text }]}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {/* 底部按钮：＋ 添加时段（虚线框，高 48） */}
        <TouchableOpacity
          style={[styles.addSessionBtn, { borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }]}
          activeOpacity={0.7}
          accessibilityLabel="添加时段"
          onPress={() => {
            setSessions((prev) => [
              ...prev,
              {
                id: newLocalId('s'),
                courseId,
                dayOfWeek: 1,
                startPeriod: 1,
                endPeriod: Math.min(1 + defaultSpan - 1, totalPeriods),
                weeks: weeksFromRange(1, totalWeeks, 'all'),
                teacher: '',
                location: '',
                remark: '',
                customTime: {
                  enabled: false,
                  startTime: settings.periodTimes[0]?.start || '08:00',
                  endTime: settings.periodTimes[1]?.end || '09:40',
                },
              },
            ]);
          }}
        >
          <Text style={[styles.addSessionBtnText, { color: theme.textSecondary }]}>＋ 添加时段</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ================= 子模态 1：自定义时间页 ================= */}
      <Modal visible={showCustomTimePage} animationType="slide">
        <View
          style={[
            styles.subPageContainer,
            {
              backgroundColor: theme.background,
              paddingTop: insets.top || SAFE_TOP_DP,
            },
          ]}
        >
          <View style={[styles.topBar, { backgroundColor: theme.background, borderBottomColor: dividerColor }]}>
            <TouchableOpacity onPress={() => setShowCustomTimePage(false)} accessibilityLabel="返回">
              <Text style={[styles.backChevron, { color: theme.text }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.barTitle, { color: theme.text }]}>自定义时间</Text>
            <View style={{ width: 32 }} />
          </View>

          <View style={{ padding: 16 }}>
            <View style={[styles.groupCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.rowItem, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>自定义时间</Text>
                <Switch
                  accessibilityLabel="启用自定义时间"
                  value={activeSession?.customTime?.enabled ?? false}
                  onValueChange={(val) => {
                    updateSessionField(activeSessionIdx, 'customTime', {
                      enabled: val,
                      startTime: activeSession?.customTime?.startTime || '08:00',
                      endTime: activeSession?.customTime?.endTime || '09:30',
                    });
                  }}
                  trackColor={{ false: scheme === 'dark' ? '#3A3A3C' : '#E2E8F0', true: '#E15241' }}
                />
              </View>

              <View style={[styles.rowItem, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>上课时间</Text>
                <TouchableOpacity
                  accessibilityLabel="上课时间"
                  onPress={() => openCustomTimePicker('start')}
                  style={[styles.timePill, { backgroundColor: theme.backgroundElement, borderColor: dividerColor }]}>
                  <Text
                    style={[
                      styles.timePillText,
                      { color: theme.text },
                      !(activeSession?.customTime?.enabled ?? false) && [
                        styles.timePillTextMuted,
                        { color: theme.textSecondary },
                      ],
                    ]}>
                    {activeSession?.customTime?.startTime || '08:00'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>下课时间</Text>
                <TouchableOpacity
                  accessibilityLabel="下课时间"
                  onPress={() => openCustomTimePicker('end')}
                  style={[styles.timePill, { backgroundColor: theme.backgroundElement, borderColor: dividerColor }]}>
                  <Text
                    style={[
                      styles.timePillText,
                      { color: theme.text },
                      !(activeSession?.customTime?.enabled ?? false) && [
                        styles.timePillTextMuted,
                        { color: theme.textSecondary },
                      ],
                    ]}>
                    {activeSession?.customTime?.endTime || '09:30'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 双列时间滚轮：挂在自定义时间页内部，才能盖在这层 Modal 上面 */}
          <TimeWheelSheet
            visible={customTimePickerTarget !== null}
            title={customTimePickerTarget === 'end' ? '下课时间' : '上课时间'}
            value={
              customTimePickerTarget === 'end'
                ? activeSession?.customTime?.endTime || '09:30'
                : activeSession?.customTime?.startTime || '08:00'
            }
            onClose={() => setCustomTimePickerTarget(null)}
            onSave={handleCustomTimeSave}
          />
        </View>
      </Modal>

      {/* ================= 子模态 2：20 周选择弹窗 ================= */}
      <Modal visible={showWeekPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContainer, { backgroundColor: theme.background }]}>
            <View style={styles.sheetTopBar}>
              <Text style={[styles.sheetSubCount, { color: theme.textSecondary }]}>
                已选 {activeSession?.weeks.length || 0} 周
              </Text>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>周数</Text>
              <TouchableOpacity onPress={() => setShowWeekPicker(false)} accessibilityLabel="关闭周数">
                <Text style={[styles.sheetCloseText, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 快捷单选行 */}
            <View style={styles.weekRadioRow}>
              <TouchableOpacity
                accessibilityLabel="单周"
                onPress={() =>
                  updateSessionField(
                    activeSessionIdx,
                    'weeks',
                    weeksFromRange(1, totalWeeks, 'odd')
                  )
                }
              >
                <Text style={[styles.radioItemText, { color: theme.textSecondary }]}>○ 单周</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="双周"
                onPress={() =>
                  updateSessionField(
                    activeSessionIdx,
                    'weeks',
                    weeksFromRange(1, totalWeeks, 'even')
                  )
                }
              >
                <Text style={[styles.radioItemText, { color: theme.textSecondary }]}>○ 双周</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="全部周"
                onPress={() =>
                  updateSessionField(
                    activeSessionIdx,
                    'weeks',
                    weeksFromRange(1, totalWeeks, 'all')
                  )
                }
              >
                <Text style={[styles.radioItemText, { color: '#E15241', fontWeight: '700' }]}>
                  ● 全部
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="清空周次"
                onPress={() => updateSessionField(activeSessionIdx, 'weeks', [])}
              >
                <Text style={[styles.radioItemText, { color: theme.textSecondary }]}>清空</Text>
              </TouchableOpacity>
            </View>

            {/* 周方块网格 */}
            <View style={styles.weekGrid}>
              {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
                const isSelected = activeSession?.weeks.includes(w);
                return (
                  <TouchableOpacity
                    key={w}
                    accessibilityLabel={`第${w}周`}
                    style={[
                      styles.weekGridBox,
                      { backgroundColor: theme.backgroundElement, borderColor: dividerColor },
                      isSelected && styles.weekGridBoxActive,
                    ]}
                    onPress={() => {
                      const cur = activeSession?.weeks || [];
                      const next = cur.includes(w)
                        ? cur.filter((x) => x !== w)
                        : [...cur, w].sort((a, b) => a - b);
                      updateSessionField(activeSessionIdx, 'weeks', next);
                    }}
                  >
                    <Text
                      style={[
                        styles.weekGridNum,
                        { color: theme.textSecondary },
                        isSelected && styles.weekGridNumActive,
                      ]}
                    >
                      {w}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.fullWidthRedBtn}
              accessibilityLabel="确定周数"
              onPress={() => setShowWeekPicker(false)}
            >
              <Text style={styles.fullWidthRedBtnText}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= 子模态 3：三列节次滚轮（星期 / 开始节 / 结束节） ================= */}
      <WheelSheet
        visible={showTimeWheel}
        title="选择上课时间"
        onClose={() => setShowTimeWheel(false)}
        onSave={applyPeriodDraft}>
        <View style={styles.periodWheelArea}>
          {/* 选中行上下各一条贯穿细线：三列共用，避免每列各画一段留下断口 */}
          <View
            pointerEvents="none"
            style={[styles.periodWheelLine, { top: PERIOD_WHEEL_ROW_H * 2, backgroundColor: dividerColor }]}
          />
          <View
            pointerEvents="none"
            style={[styles.periodWheelLine, { top: PERIOD_WHEEL_ROW_H * 3, backgroundColor: dividerColor }]}
          />

          <View style={styles.periodWheelRow}>
            <View style={styles.dayWheelCol}>
              <WheelPicker
                columns={[{ key: 'day', options: dayOptions }]}
                value={{ day: String(draftDay) }}
                highlightColor="transparent"
                itemHeight={PERIOD_WHEEL_ROW_H}
                onChange={(next) => setDraftDay(Number(next.day) || 1)}
              />
            </View>

            <View style={styles.periodWheelCol}>
              <WheelPicker
                columns={[{ key: 'start', options: periodOptions }]}
                value={{ start: String(draftStart) }}
                highlightColor="transparent"
                itemHeight={PERIOD_WHEEL_ROW_H}
                onChange={(next) => {
                  const v = Number(next.start) || 1;
                  setDraftStart(v);
                  // 防倒挂：开始节已经超过结束节时，结束节跟着走。
                  if (v > draftEnd) setDraftEnd(v);
                }}
              />
            </View>

            <Text style={[styles.periodWheelDash, { color: theme.textSecondary }]}>—</Text>

            <View style={styles.periodWheelCol}>
              <WheelPicker
                columns={[{ key: 'end', options: periodOptions }]}
                value={{ end: String(draftEnd) }}
                highlightColor="transparent"
                itemHeight={PERIOD_WHEEL_ROW_H}
                onChange={(next) => {
                  const v = Number(next.end) || 1;
                  setDraftEnd(v);
                  // 反向防倒挂：结束节滑到开始节之前时，开始节跟着退。
                  if (v < draftStart) setDraftStart(v);
                }}
              />
            </View>
          </View>
        </View>
      </WheelSheet>

      {/* ================= 子模态 4：20 色选择器 ================= */}
      <Modal visible={showColorPicker} transparent animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
          <View style={[styles.colorDialogCard, { backgroundColor: theme.background }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>选择课程颜色</Text>

            <View style={styles.presetColorGrid}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorBubble,
                    { backgroundColor: c },
                    color.toUpperCase() === c.toUpperCase() && [
                      styles.colorBubbleActive,
                      { borderColor: theme.text },
                    ],
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.fullWidthRedBtn}
              onPress={() => setShowColorPicker(false)}
            >
              <Text style={styles.fullWidthRedBtnText}>确认颜色</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  subPageContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: { padding: 4 },
  closeIcon: { fontSize: 18, color: '#64748B' },
  backChevron: { fontSize: 26, color: '#1E293B', fontWeight: '300' },
  barTitle: { fontSize: 17, fontWeight: '600', color: '#111113' },
  saveBtn: { padding: 4 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#E15241' },
  scrollContent: { flex: 1, padding: 16 },
  nameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  nameInput: { fontSize: 17, fontWeight: '600', color: '#0F172A', padding: 0 },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  rowItem: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: '#1E293B' },
  colorRingBorder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#F472B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCenterCircle: { width: 18, height: 18, borderRadius: 9 },
  rowRightHint: { fontSize: 13, color: '#94A3B8' },
  rowRightValue: { fontSize: 13, color: '#1E293B', fontWeight: '500' },
  rowInput: {
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'right',
    width: 150,
    fontWeight: '500',
    padding: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  sectionActions: { flexDirection: 'row', gap: 14 },
  copyText: { fontSize: 12, color: '#E15241', fontWeight: '600' },
  deleteActiveText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  deleteText: { fontSize: 12, color: 'rgba(0,0,0,0.25)', fontWeight: '500' },
  addSessionBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  addSessionBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.6)' },
  /** 自定义时间里可点的时间胶囊（原 TextInput 的容器样式）。 */
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 80,
    alignItems: 'center',
  },
  timePillText: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#1E293B',
  },
  timePillTextMuted: { color: '#94A3B8' },

  /** 三列节次滚轮：5 行 × 44，两条细线贯穿三列。 */
  periodWheelArea: {
    height: PERIOD_WHEEL_ROW_H * 5,
    position: 'relative',
    justifyContent: 'center',
  },
  periodWheelLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: '#E5E7EB',
  },
  periodWheelRow: { flexDirection: 'row', alignItems: 'center' },
  dayWheelCol: { flex: 1.15 },
  periodWheelCol: { flex: 1 },
  periodWheelDash: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 6,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetSubCount: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  sheetCloseText: { fontSize: 16, color: '#94A3B8', padding: 4 },
  weekRadioRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  radioItemText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weekGridBox: {
    width: '18%',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    alignItems: 'center',
  },
  weekGridBoxActive: {
    backgroundColor: '#FFE6E9',
    borderColor: '#FFCCD2',
  },
  weekGridNum: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  weekGridNumActive: { color: '#E15241', fontWeight: '700' },
  fullWidthRedBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E15241',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthRedBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  colorDialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  dialogTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  presetColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  colorBubble: { width: 36, height: 36, borderRadius: 18 },
  colorBubbleActive: { borderWidth: 2.5, borderColor: '#0F172A' },
});
