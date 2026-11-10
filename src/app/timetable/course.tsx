import React, { useState, useMemo } from 'react';
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
import { useTimetable } from '@/features/timetable/TimetableContext';
import { SessionEntity } from '@/features/timetable/repository';
import { askConfirm, showNotice } from '@/lib/dialogs';
import {
  COURSE_COLORS,
  SAFE_TOP_DP,
  SAFE_BOTTOM_DP,
  formatWeeks,
  weeksFromRange,
} from '@/lib/timetable-core';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

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
  const params = useLocalSearchParams<{ id?: string; day?: string; period?: string }>();
  const { courses, activeSchedule, settings, saveCourse } = useTimetable();

  const existingCourse = useMemo(
    () => (params.id ? courses.find((c) => c.id === params.id) : undefined),
    [params.id, courses]
  );

  const totalWeeks = activeSchedule.totalWeeks || 20;
  const totalPeriods = settings.periodTimes.length || 11;
  const defaultSpan = settings.defaultSpan || 2;

  const initStartPeriod = params.period ? parseInt(params.period, 10) : 1;
  const initEndPeriod = Math.min(initStartPeriod + defaultSpan - 1, totalPeriods);

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
        dayOfWeek: params.day ? parseInt(params.day, 10) : 1,
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showTimeWheel, setShowTimeWheel] = useState(false);
  const [showCustomTimePage, setShowCustomTimePage] = useState(false);

  const activeSession = sessions[activeSessionIdx] || sessions[0];

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
    await saveCourse({
      id: courseId,
      scheduleId: activeSchedule.id,
      name: trimmedName,
      color,
      credits,
      sessions,
    });
    router.back();
  };

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
      {/* 1. 顶部操作栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.barTitle}>{existingCourse ? '编辑课程' : '添加课程'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveText}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 卡片 1: 课程名称输入 */}
        <View style={styles.nameCard}>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={30}
            placeholder="例如：高等数学"
            placeholderTextColor="#94A3B8"
            style={styles.nameInput}
          />
        </View>

        {/* 卡片 2: 颜色与学分 */}
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.rowItem}
            onPress={() => setShowColorPicker(true)}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🎨</Text>
              <Text style={styles.rowLabel}>颜色</Text>
            </View>
            <View style={styles.colorRingBorder}>
              <View style={[styles.colorCenterCircle, { backgroundColor: color }]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, { borderBottomWidth: 0 }]}
            onPress={() => {
              const order = ['选填', '1.0', '2.0', '3.0', '4.0'];
              const next = order[(order.indexOf(credits) + 1) % order.length];
              setCredits(next);
            }}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>⭐</Text>
              <Text style={styles.rowLabel}>学分</Text>
            </View>
            <Text style={styles.rowRightHint}>{credits} ›</Text>
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
                <Text style={styles.sectionTitle}>时段{idx + 1}</Text>
                <View style={styles.sectionActions}>
                  <TouchableOpacity onPress={() => handleCopySession(idx)}>
                    <Text style={styles.copyText}>复制</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!canDelete}
                    onPress={() => handleDeleteSession(idx)}
                  >
                    <Text style={canDelete ? styles.deleteActiveText : styles.deleteText}>
                      删除
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.groupCard}>
                {/* 周数选择 */}
                <TouchableOpacity
                  style={styles.rowItem}
                  onPress={() => {
                    setActiveSessionIdx(idx);
                    setShowWeekPicker(true);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowEmoji}>📅</Text>
                    <Text style={styles.rowLabel}>周数</Text>
                  </View>
                  <Text style={styles.rowRightValue}>
                    {sess.weeks.length > 0 ? `第 ${formatWeeks(sess.weeks)} 周` : '未选择'} ›
                  </Text>
                </TouchableOpacity>

                {/* 节数选择 */}
                <TouchableOpacity
                  style={styles.rowItem}
                  onPress={() => {
                    setActiveSessionIdx(idx);
                    setShowTimeWheel(true);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowEmoji}>⏰</Text>
                    <Text style={styles.rowLabel}>节数</Text>
                  </View>
                  <Text style={styles.rowRightValue}>
                    {DAYS[sess.dayOfWeek - 1]}   第 {sess.startPeriod} - {sess.endPeriod} 节 ›
                  </Text>
                </TouchableOpacity>

                {/* 自定义时间直达行 */}
                <TouchableOpacity
                  style={styles.rowItem}
                  onPress={() => {
                    setActiveSessionIdx(idx);
                    setShowCustomTimePage(true);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowEmoji}>📝</Text>
                    <Text style={styles.rowLabel}>自定义时间</Text>
                  </View>
                  <Text style={styles.rowRightHint}>{customLabel} ›</Text>
                </TouchableOpacity>

                {/* 地点 */}
                <View style={styles.rowItem}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowEmoji}>📍</Text>
                    <Text style={styles.rowLabel}>地点</Text>
                  </View>
                  <TextInput
                    value={sess.location}
                    onChangeText={(txt) => updateSessionField(idx, 'location', txt)}
                    placeholder="选填"
                    placeholderTextColor="#94A3B8"
                    style={styles.rowInput}
                  />
                </View>

                {/* 教师 */}
                <View style={styles.rowItem}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowEmoji}>👤</Text>
                    <Text style={styles.rowLabel}>教师</Text>
                  </View>
                  <TextInput
                    value={sess.teacher}
                    onChangeText={(txt) => updateSessionField(idx, 'teacher', txt)}
                    placeholder="选填"
                    placeholderTextColor="#94A3B8"
                    style={styles.rowInput}
                  />
                </View>

                {/* 备注 */}
                <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowEmoji}>📋</Text>
                    <Text style={styles.rowLabel}>备注</Text>
                  </View>
                  <TextInput
                    value={sess.remark || ''}
                    maxLength={100}
                    onChangeText={(txt) => updateSessionField(idx, 'remark', txt)}
                    placeholder="选填，最长 100 字"
                    placeholderTextColor="#94A3B8"
                    style={styles.rowInput}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {/* 底部按钮：＋ 添加时段（虚线框，高 48） */}
        <TouchableOpacity
          style={styles.addSessionBtn}
          activeOpacity={0.7}
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
          <Text style={styles.addSessionBtnText}>＋ 添加时段</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ================= 子模态 1：自定义时间页 ================= */}
      <Modal visible={showCustomTimePage} animationType="slide">
        <View
          style={[
            styles.subPageContainer,
            { paddingTop: insets.top || SAFE_TOP_DP },
          ]}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setShowCustomTimePage(false)}>
              <Text style={styles.backChevron}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.barTitle}>自定义时间</Text>
            <View style={{ width: 32 }} />
          </View>

          <View style={{ padding: 16 }}>
            <View style={styles.groupCard}>
              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>自定义时间</Text>
                <Switch
                  value={activeSession?.customTime?.enabled ?? false}
                  onValueChange={(val) => {
                    updateSessionField(activeSessionIdx, 'customTime', {
                      enabled: val,
                      startTime: activeSession?.customTime?.startTime || '08:00',
                      endTime: activeSession?.customTime?.endTime || '09:30',
                    });
                  }}
                  trackColor={{ false: '#E2E8F0', true: '#E15241' }}
                />
              </View>

              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>上课时间</Text>
                <TextInput
                  value={activeSession?.customTime?.startTime || '08:00'}
                  onChangeText={(txt) =>
                    updateSessionField(activeSessionIdx, 'customTime', {
                      enabled: activeSession?.customTime?.enabled ?? true,
                      startTime: txt,
                      endTime: activeSession?.customTime?.endTime || '09:30',
                    })
                  }
                  style={styles.timePillInput}
                />
              </View>

              <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
                <Text style={styles.rowLabel}>下课时间</Text>
                <TextInput
                  value={activeSession?.customTime?.endTime || '09:30'}
                  onChangeText={(txt) =>
                    updateSessionField(activeSessionIdx, 'customTime', {
                      enabled: activeSession?.customTime?.enabled ?? true,
                      startTime: activeSession?.customTime?.startTime || '08:00',
                      endTime: txt,
                    })
                  }
                  style={styles.timePillInput}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= 子模态 2：20 周选择弹窗 ================= */}
      <Modal visible={showWeekPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetTopBar}>
              <Text style={styles.sheetSubCount}>
                已选 {activeSession?.weeks.length || 0} 周
              </Text>
              <Text style={styles.sheetTitle}>周数</Text>
              <TouchableOpacity onPress={() => setShowWeekPicker(false)}>
                <Text style={styles.sheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 快捷单选行 */}
            <View style={styles.weekRadioRow}>
              <TouchableOpacity
                onPress={() =>
                  updateSessionField(
                    activeSessionIdx,
                    'weeks',
                    weeksFromRange(1, totalWeeks, 'odd')
                  )
                }
              >
                <Text style={styles.radioItemText}>○ 单周</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  updateSessionField(
                    activeSessionIdx,
                    'weeks',
                    weeksFromRange(1, totalWeeks, 'even')
                  )
                }
              >
                <Text style={styles.radioItemText}>○ 双周</Text>
              </TouchableOpacity>
              <TouchableOpacity
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
                onPress={() => updateSessionField(activeSessionIdx, 'weeks', [])}
              >
                <Text style={styles.radioItemText}>清空</Text>
              </TouchableOpacity>
            </View>

            {/* 周方块网格 */}
            <View style={styles.weekGrid}>
              {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
                const isSelected = activeSession?.weeks.includes(w);
                return (
                  <TouchableOpacity
                    key={w}
                    style={[styles.weekGridBox, isSelected && styles.weekGridBoxActive]}
                    onPress={() => {
                      const cur = activeSession?.weeks || [];
                      const next = cur.includes(w)
                        ? cur.filter((x) => x !== w)
                        : [...cur, w].sort((a, b) => a - b);
                      updateSessionField(activeSessionIdx, 'weeks', next);
                    }}
                  >
                    <Text style={[styles.weekGridNum, isSelected && styles.weekGridNumActive]}>
                      {w}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.fullWidthRedBtn}
              onPress={() => setShowWeekPicker(false)}
            >
              <Text style={styles.fullWidthRedBtnText}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= 子模态 3：星期与节次选择弹窗 ================= */}
      <Modal visible={showTimeWheel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetTopBar}>
              <View style={{ width: 24 }} />
              <Text style={styles.sheetTitle}>选择上课时间</Text>
              <TouchableOpacity onPress={() => setShowTimeWheel(false)}>
                <Text style={styles.sheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 7 个等宽星期胶囊 */}
            <View style={styles.dayCapsulesRow}>
              {DAYS.map((dayLabel, i) => {
                const dNum = i + 1;
                const active = activeSession?.dayOfWeek === dNum;
                return (
                  <TouchableOpacity
                    key={dNum}
                    style={[styles.dayCap, active && styles.dayCapActive]}
                    onPress={() => updateSessionField(activeSessionIdx, 'dayOfWeek', dNum)}
                  >
                    <Text style={[styles.dayCapText, active && styles.dayCapTextActive]}>
                      {dayLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 开始节 / 结束节选择 */}
            <Text style={styles.wheelSectionLabel}>开始节次</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {Array.from({ length: totalPeriods }, (_, i) => i + 1).map((p) => {
                const active = activeSession?.startPeriod === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodPill, active && styles.periodPillActive]}
                    onPress={() => {
                      updateSessionField(activeSessionIdx, 'startPeriod', p);
                      if ((activeSession?.endPeriod || 1) < p) {
                        updateSessionField(
                          activeSessionIdx,
                          'endPeriod',
                          Math.min(p + defaultSpan - 1, totalPeriods)
                        );
                      }
                    }}
                  >
                    <Text style={[styles.periodPillText, active && styles.periodPillTextActive]}>
                      第 {p} 节
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.wheelSectionLabel}>结束节次</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {Array.from({ length: totalPeriods }, (_, i) => i + 1).map((p) => {
                const disabled = p < (activeSession?.startPeriod || 1);
                const active = activeSession?.endPeriod === p;
                return (
                  <TouchableOpacity
                    key={p}
                    disabled={disabled}
                    style={[
                      styles.periodPill,
                      active && styles.periodPillActive,
                      disabled && { opacity: 0.35 },
                    ]}
                    onPress={() => updateSessionField(activeSessionIdx, 'endPeriod', p)}
                  >
                    <Text style={[styles.periodPillText, active && styles.periodPillTextActive]}>
                      第 {p} 节
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.fullWidthRedBtn}
              onPress={() => setShowTimeWheel(false)}
            >
              <Text style={styles.fullWidthRedBtnText}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= 子模态 4：20 色选择器 ================= */}
      <Modal visible={showColorPicker} transparent animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
          <View style={styles.colorDialogCard}>
            <Text style={styles.dialogTitle}>选择课程颜色</Text>

            <View style={styles.presetColorGrid}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorBubble,
                    { backgroundColor: c },
                    color.toUpperCase() === c.toUpperCase() && styles.colorBubbleActive,
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
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowEmoji: { fontSize: 16 },
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
  timePillInput: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    minWidth: 80,
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
  dayCapsulesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 4,
  },
  dayCap: {
    flex: 1,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCapActive: { backgroundColor: '#E15241' },
  dayCapText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  dayCapTextActive: { color: '#FFFFFF' },
  wheelSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  periodPillActive: { backgroundColor: '#E15241' },
  periodPillText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  periodPillTextActive: { color: '#FFFFFF' },
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
