import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';
import { useTimetable } from '@/features/timetable/TimetableContext';
import {
  SAFE_TOP_DP,
  SAFE_BOTTOM_DP,
  currentWeekNumber,
} from '@/lib/timetable-core';
import { WheelSheet } from '@/components/timetable/wheel-sheet';
import { WheelPicker, type WheelOption } from '@/components/ui/wheel-picker';
import { formatDay, formatMonth, monthGrid, parseDate, toDateStr } from '@/lib/date';
import { showNotice } from '@/lib/dialogs';

/** 每周起始日滚轮：按「星期六 / 星期日 / 星期一」排列，和设计稿一致。 */
const WEEK_START_OPTIONS: WheelOption[] = [
  { value: '6', label: '星期六' },
  { value: '7', label: '星期日' },
  { value: '1', label: '星期一' },
];

/** 课程格高度 44~90，步进 2。 */
const CELL_HEIGHT_OPTIONS: WheelOption[] = Array.from({ length: 24 }, (_, i) => {
  const v = 44 + i * 2;
  return { value: String(v), label: `${v} dp` };
});

/** 课程格圆角 0~18，步进 1。 */
const CELL_RADIUS_OPTIONS: WheelOption[] = Array.from({ length: 19 }, (_, i) => ({
  value: String(i),
  label: `${i} dp`,
}));

const CAL_WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_TOTAL_WEEKS = 60;

function weekStartLabel(day: 1 | 6 | 7): string {
  if (day === 7) return '星期日';
  if (day === 6) return '星期六';
  return '星期一';
}

/** 今天是本周几（周一=0…周日=6），用来反推学期起始日。 */
function mondayOf(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

/** 居中卡片里的数字输入弹窗（当前周 / 学期周数共用同一套皮）。 */
function NumberFieldModal({
  visible,
  title,
  value,
  rangeText,
  onChange,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  value: string;
  rangeText: string;
  onChange: (next: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.centerOverlay} onPress={onCancel}>
        <Pressable
          style={[styles.centerCard, { backgroundColor: theme.backgroundElement }]}
          onPress={() => {}}>
          <Text style={[styles.centerTitle, { color: theme.text }]}>{title}</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={[styles.inputField, { color: theme.text }]}
              value={value}
              onChangeText={(next) => onChange(next.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel={`${title}输入`}
            />
            <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>周</Text>
          </View>
          <Text style={[styles.rangeHint, { color: theme.textSecondary }]}>{rangeText}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              accessibilityLabel={`${title}取消`}
              style={styles.actionBtn}
              onPress={onCancel}>
              <Text style={[styles.actionCancel, { color: theme.textSecondary }]}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`${title}确定`}
              style={styles.actionBtn}
              onPress={onConfirm}>
              <Text style={styles.actionConfirm}>确定</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function TimetableSettingsScreen() {
  const theme = useTheme();
  const { scheme } = useThemePreference();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    schedules,
    courses,
    settings,
    updateSetting,
    activeSchedule,
    viewingWeek,
    setViewingWeek,
    createOrUpdateSchedule,
  } = useTimetable();

  // —— 开学时间（居中日历） ——
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState(activeSchedule.startDate);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // —— 每周起始日 / 格子高度 / 圆角（底部滚轮） ——
  const [weekStartVisible, setWeekStartVisible] = useState(false);
  const [draftWeekStart, setDraftWeekStart] = useState<string>(String(settings.weekStartDay));
  const [cellHeightVisible, setCellHeightVisible] = useState(false);
  const [draftCellHeight, setDraftCellHeight] = useState<string>(String(settings.cellHeight));
  const [cellRadiusVisible, setCellRadiusVisible] = useState(false);
  const [draftCellRadius, setDraftCellRadius] = useState<string>(String(settings.cellRadius));

  // —— 当前周 / 学期周数（居中输入） ——
  const [currentWeekVisible, setCurrentWeekVisible] = useState(false);
  const [currentWeekDraft, setCurrentWeekDraft] = useState('');
  const [totalWeeksVisible, setTotalWeeksVisible] = useState(false);
  const [totalWeeksDraft, setTotalWeeksDraft] = useState('');

  // —— 午休位置（沿用旧的列表抽屉） ——
  const [showLunchDrawer, setShowLunchDrawer] = useState(false);

  const realCurrentWeek = Math.min(
    activeSchedule.totalWeeks,
    Math.max(1, currentWeekNumber(activeSchedule.startDate, new Date()))
  );

  const calWeeks = useMemo(() => monthGrid(calYear, calMonth), [calYear, calMonth]);
  /** 行分隔线：深色下用低透明白，避免纯黑细线在深色背景上消失。 */
  const dividerColor = scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const openCalendar = () => {
    // 用 parseDate 手工拆 YYYY-MM-DD，避免 Hermes 把日期串当 UTC 解析后差一天。
    const parsed = parseDate(activeSchedule.startDate);
    setDraftStartDate(activeSchedule.startDate);
    setCalYear(parsed.getFullYear());
    setCalMonth(parsed.getMonth());
    setCalendarVisible(true);
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(calYear, calMonth + delta, 1);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
  };

  const confirmStartDate = async () => {
    setCalendarVisible(false);
    if (!draftStartDate || draftStartDate === activeSchedule.startDate) return;
    await createOrUpdateSchedule({
      id: activeSchedule.id,
      name: activeSchedule.name,
      startDate: draftStartDate,
      totalWeeks: activeSchedule.totalWeeks,
    });
    // 起始日变了，当前周也要跟着重算，否则网格还停在旧周次。
    const week = currentWeekNumber(draftStartDate, new Date());
    setViewingWeek(Math.min(activeSchedule.totalWeeks, Math.max(1, week)));
  };

  const confirmWeekStart = async () => {
    const next = Number(draftWeekStart) === 7 ? 7 : Number(draftWeekStart) === 6 ? 6 : 1;
    setWeekStartVisible(false);
    if (next === settings.weekStartDay) return;
    await updateSetting('weekStartDay', next as 1 | 6 | 7);
  };

  const confirmCellHeight = async () => {
    const next = parseInt(draftCellHeight, 10) || settings.cellHeight;
    setCellHeightVisible(false);
    if (next === settings.cellHeight) return;
    await updateSetting('cellHeight', next);
  };

  const confirmCellRadius = async () => {
    const next = Number.isFinite(parseInt(draftCellRadius, 10))
      ? parseInt(draftCellRadius, 10)
      : settings.cellRadius;
    setCellRadiusVisible(false);
    if (next === settings.cellRadius) return;
    await updateSetting('cellRadius', next);
  };

  /** 反推：把「当前周 = target」写回学期起始日（本周一往前推 (target-1) 周）。 */
  const confirmCurrentWeek = async () => {
    const target = parseInt(currentWeekDraft, 10);
    if (!Number.isFinite(target) || target < 1 || target > activeSchedule.totalWeeks) {
      showNotice(`请输入 1 ~ ${activeSchedule.totalWeeks} 之间的周数`);
      return;
    }
    setCurrentWeekVisible(false);
    if (target === realCurrentWeek) {
      setViewingWeek(target);
      return;
    }
    const monday = mondayOf(new Date());
    monday.setDate(monday.getDate() - (target - 1) * 7);
    const newStartDate = toDateStr(monday);
    await createOrUpdateSchedule({
      id: activeSchedule.id,
      name: activeSchedule.name,
      startDate: newStartDate,
      totalWeeks: activeSchedule.totalWeeks,
    });
    setViewingWeek(target);
  };

  const confirmTotalWeeks = async () => {
    const target = parseInt(totalWeeksDraft, 10);
    if (!Number.isFinite(target) || target < 1 || target > MAX_TOTAL_WEEKS) {
      showNotice(`请输入 1 ~ ${MAX_TOTAL_WEEKS} 之间的周数`);
      return;
    }
    setTotalWeeksVisible(false);
    if (target === activeSchedule.totalWeeks) return;
    await createOrUpdateSchedule({
      id: activeSchedule.id,
      name: activeSchedule.name,
      startDate: activeSchedule.startDate,
      totalWeeks: target,
    });
    if (viewingWeek > target) setViewingWeek(target);
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
      ]}>
      <View style={[styles.headerBar, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.backBtnCircle,
            {
              borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
              backgroundColor: theme.backgroundElement,
            },
          ]}
          accessibilityLabel="返回"
          onPress={() => router.back()}>
          <Text style={[styles.backArrow, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>设置</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={styles.scrollBody}>
        {/* ═══ 课程数据 ═══ */}
        <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>课程数据</Text>
        <View style={[styles.cardGroup, { backgroundColor: theme.backgroundElement }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="上课时间"
            onPress={() => router.push('/timetable/periods')}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>上课时间</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>点击此处更改</Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="开学时间"
            onPress={openCalendar}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>开学时间</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{activeSchedule.startDate}</Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="每周起始日"
            onPress={() => {
              setDraftWeekStart(String(settings.weekStartDay));
              setWeekStartVisible(true);
            }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>每周起始日</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{weekStartLabel(settings.weekStartDay)}</Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="当前周"
            onPress={() => {
              setCurrentWeekDraft(String(realCurrentWeek));
              setCurrentWeekVisible(true);
            }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>当前周</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>第 {realCurrentWeek} 周</Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="学期周数"
            onPress={() => {
              setTotalWeeksDraft(String(activeSchedule.totalWeeks));
              setTotalWeeksVisible(true);
            }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>学期周数</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{activeSchedule.totalWeeks} 周</Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            accessibilityLabel="导入课表"
            onPress={() => router.push('/timetable/import')}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>导入课表</Text>
            <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ 课表 ═══ */}
        <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>课表</Text>
        <View style={[styles.cardGroup, { backgroundColor: theme.backgroundElement }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="课表管理"
            onPress={() => router.push('/timetable/schedules')}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>课表管理</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>共 {schedules.length} 张</Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            accessibilityLabel="全部课程"
            onPress={() => router.push('/timetable/courses')}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>全部课程</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{courses.length} 门</Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ═══ 课表外观 ═══ */}
        <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>课表外观</Text>
        <View style={[styles.cardGroup, { backgroundColor: theme.backgroundElement }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="显示周六"
            onPress={() => updateSetting('showSaturday', !settings.showSaturday)}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>显示周六</Text>
            <View style={[styles.checkbox, settings.showSaturday && styles.checkboxOn]}>
              {settings.showSaturday ? <Text style={styles.checkboxCheck}>✓</Text> : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="显示周日"
            onPress={() => updateSetting('showSunday', !settings.showSunday)}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>显示周日</Text>
            <View style={[styles.checkbox, settings.showSunday && styles.checkboxOn]}>
              {settings.showSunday ? <Text style={styles.checkboxCheck}>✓</Text> : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="课程格子高度"
            onPress={() => {
              setDraftCellHeight(String(settings.cellHeight));
              setCellHeightVisible(true);
            }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>课程格子高度</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{settings.cellHeight} dp</Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="格子圆角半径"
            onPress={() => {
              setDraftCellRadius(String(settings.cellRadius));
              setCellRadiusVisible(true);
            }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>格子圆角半径</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{settings.cellRadius} dp</Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: dividerColor }]}
            accessibilityLabel="午休位置"
            onPress={() => setShowLunchDrawer(true)}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>午休位置</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
                {settings.lunchAfter === 0 ? '不显示' : `第 ${settings.lunchAfter} 节后`}
              </Text>
              <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowTall, { borderBottomWidth: 0 }]}
            accessibilityLabel="更多外观设置"
            onPress={() => router.push('/timetable/appearance')}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>更多外观设置</Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>背景、文字颜色和大小、格子高度和不透明度……</Text>
            </View>
            <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 开学时间：居中日历 */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}>
        <Pressable style={styles.centerOverlay} onPress={() => setCalendarVisible(false)}>
          <Pressable
            style={[styles.calendarCard, { backgroundColor: theme.backgroundElement }]}
            onPress={() => {}}>
            <Text style={[styles.calendarLabel, { color: theme.textSecondary }]}>开学时间</Text>
            <View style={styles.calendarTitleRow}>
              <Text style={[styles.calendarTitle, { color: theme.text }]}>
                {formatDay(draftStartDate)}
              </Text>
              <Text style={[styles.calendarPencil, { color: theme.textSecondary }]}>✎</Text>
            </View>

            <View style={styles.calendarMonthRow}>
              <Text style={[styles.calendarMonthText, { color: theme.text }]}>
                {formatMonth(calYear, calMonth)}
              </Text>
              <View style={styles.monthNavRow}>
                <TouchableOpacity
                  style={[styles.monthNavBtn, { backgroundColor: theme.backgroundSelected }]}
                  accessibilityLabel="上个月"
                  onPress={() => shiftMonth(-1)}>
                  <Text style={[styles.monthNavText, { color: theme.text }]}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.monthNavBtn, { backgroundColor: theme.backgroundSelected }]}
                  accessibilityLabel="下个月"
                  onPress={() => shiftMonth(1)}>
                  <Text style={[styles.monthNavText, { color: theme.text }]}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.calWeekdayRow}>
              {CAL_WEEKDAYS.map((label) => (
                <Text key={label} style={[styles.calWeekdayText, { color: theme.textSecondary }]}>
                  {label}
                </Text>
              ))}
            </View>

            {calWeeks.map((week, weekIndex) => (
              <View key={`w${weekIndex}`} style={styles.calWeekRow}>
                {week.map((dateStr, dayIndex) => {
                  if (!dateStr) {
                    return <View key={`e${weekIndex}_${dayIndex}`} style={styles.calCell} />;
                  }
                  const dayNum = Number(dateStr.slice(8, 10));
                  const selected = dateStr === draftStartDate;
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={styles.calCell}
                      accessibilityLabel={`选择${dayNum}日`}
                      onPress={() => setDraftStartDate(dateStr)}>
                      <View style={[styles.calDayCircle, selected && styles.calDayCircleOn]}>
                        <Text
                          style={[
                            styles.calDayText,
                            { color: theme.text },
                            selected && styles.calDayTextOn,
                          ]}>
                          {dayNum}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityLabel="开学时间取消"
                style={styles.actionBtn}
                onPress={() => setCalendarVisible(false)}>
                <Text style={styles.actionCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="开学时间确定"
                style={styles.actionBtn}
                onPress={confirmStartDate}>
                <Text style={styles.actionConfirm}>确定</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 每周起始日：底部单列滚轮 */}
      <WheelSheet
        visible={weekStartVisible}
        title="星期"
        onClose={() => setWeekStartVisible(false)}
        onSave={confirmWeekStart}>
        <WheelPicker
          columns={[{ key: 'weekStart', options: WEEK_START_OPTIONS }]}
          value={{ weekStart: draftWeekStart }}
          highlightColor="transparent"
          separators
          onChange={(next) => setDraftWeekStart(next.weekStart)}
        />
      </WheelSheet>

      {/* 课程格子高度 */}
      <WheelSheet
        visible={cellHeightVisible}
        title="课程格子高度"
        onClose={() => setCellHeightVisible(false)}
        onSave={confirmCellHeight}>
        <WheelPicker
          columns={[{ key: 'cellHeight', options: CELL_HEIGHT_OPTIONS }]}
          value={{ cellHeight: draftCellHeight }}
          highlightColor="transparent"
          separators
          onChange={(next) => setDraftCellHeight(next.cellHeight)}
        />
      </WheelSheet>

      {/* 格子圆角半径 */}
      <WheelSheet
        visible={cellRadiusVisible}
        title="格子圆角半径"
        onClose={() => setCellRadiusVisible(false)}
        onSave={confirmCellRadius}>
        <WheelPicker
          columns={[{ key: 'cellRadius', options: CELL_RADIUS_OPTIONS }]}
          value={{ cellRadius: draftCellRadius }}
          highlightColor="transparent"
          separators
          onChange={(next) => setDraftCellRadius(next.cellRadius)}
        />
      </WheelSheet>

      {/* 当前周 */}
      <NumberFieldModal
        visible={currentWeekVisible}
        title="当前周"
        value={currentWeekDraft}
        rangeText={`范围 1 ~ ${activeSchedule.totalWeeks}`}
        onChange={setCurrentWeekDraft}
        onCancel={() => setCurrentWeekVisible(false)}
        onConfirm={confirmCurrentWeek}
      />

      {/* 学期周数 */}
      <NumberFieldModal
        visible={totalWeeksVisible}
        title="学期周数"
        value={totalWeeksDraft}
        rangeText={`范围 1 ~ ${MAX_TOTAL_WEEKS}`}
        onChange={setTotalWeeksDraft}
        onCancel={() => setTotalWeeksVisible(false)}
        onConfirm={confirmTotalWeeks}
      />

      {/* 午休位置（沿用列表抽屉） */}
      <Modal visible={showLunchDrawer} transparent animationType="fade">
        <Pressable style={styles.drawerOverlay} onPress={() => setShowLunchDrawer(false)}>
          <View style={[styles.drawerSheet, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.drawerTitle, { color: theme.text }]}>午休位置</Text>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {Array.from({ length: 17 }, (_, i) => i).map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.optionRow, { borderBottomColor: dividerColor }]}
                  accessibilityLabel={pos === 0 ? '午休不显示' : `午休第${pos}节后`}
                  onPress={async () => {
                    await updateSetting('lunchAfter', pos);
                    setShowLunchDrawer(false);
                  }}>
                  <Text style={[styles.optionText, { color: theme.text }]}>
                    {pos === 0 ? '不显示' : `第 ${pos} 节后`}
                  </Text>
                  {settings.lunchAfter === pos && <Text style={styles.optionCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, lineHeight: 24 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scrollBody: { padding: 16, paddingBottom: 40 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  cardGroup: {
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  rowTall: {
    minHeight: 60,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 3 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 13 },
  rowArrow: { fontSize: 16 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#4A5588', borderColor: '#4A5588' },
  checkboxCheck: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', lineHeight: 15 },

  // —— 居中弹窗通用 ——
  centerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  centerCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 20,
  },
  centerTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  inputBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: { flex: 1, fontSize: 16, padding: 0 },
  inputSuffix: { fontSize: 15 },
  rangeHint: { fontSize: 12, marginTop: 8, alignSelf: 'flex-start' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  actionCancel: { fontSize: 15, fontWeight: '500' },
  actionConfirm: { fontSize: 15, fontWeight: '700', color: '#4A5588' },

  // —— 日历 ——
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
  },
  calendarLabel: { fontSize: 12, marginBottom: 6 },
  calendarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calendarTitle: { fontSize: 20, fontWeight: '700' },
  calendarPencil: { fontSize: 14 },
  calendarMonthRow: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarMonthText: { fontSize: 14, fontWeight: '600' },
  monthNavRow: { flexDirection: 'row', gap: 8 },
  monthNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: { fontSize: 16, lineHeight: 18 },
  calWeekdayRow: { flexDirection: 'row' },
  calWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    paddingVertical: 6,
  },
  calWeekRow: { flexDirection: 'row' },
  calCell: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  calDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  calDayCircleOn: { borderColor: '#4A5588' },
  calDayText: { fontSize: 13, fontVariant: ['tabular-nums'] },
  calDayTextOn: { color: '#4A5588', fontWeight: '700' },

  // —— 列表抽屉（午休） ——
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  drawerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  optionRow: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  optionText: { fontSize: 14, fontWeight: '500' },
  optionCheck: { fontSize: 15, color: '#3B82F6', fontWeight: '700' },
});