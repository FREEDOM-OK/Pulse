import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';
import { useTimetable } from '@/features/timetable/TimetableContext';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { WheelPicker } from '@/components/ui/wheel-picker';
import { showActions, showNotice } from '@/lib/dialogs';
import {
  DURATION_STEP,
  MAX_DURATION_MINUTES,
  MAX_PERIODS,
  MIN_DURATION_MINUTES,
  PeriodTime,
  SAFE_BOTTOM_DP,
  SAFE_TOP_DP,
  TimeTablePreset,
  addMinutes,
  appendPeriod,
  applyFixedDuration,
  relayoutPeriods,
  toMinutes,
  validatePeriods,
} from '@/lib/timetable-core';

const ACCENT = '#F43F5E';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const value = String(hour).padStart(2, '0');
  return { value, label: value };
});
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => {
  const value = String(minute).padStart(2, '0');
  return { value, label: value };
});
const DURATION_OPTIONS: { value: string; label: string }[] = [];
for (let minutes = MIN_DURATION_MINUTES; minutes <= MAX_DURATION_MINUTES; minutes += DURATION_STEP) {
  DURATION_OPTIONS.push({ value: String(minutes), label: `${minutes} 分钟` });
}

type SheetField = 'start' | 'end';

interface SheetTarget {
  index: number;
  field: SheetField;
}

function clonePreset(preset: TimeTablePreset): TimeTablePreset {
  return {
    ...preset,
    periods: preset.periods.map((p) => ({ start: p.start, end: p.end })),
  };
}

/**
 * 设置时间表：一个路由承载两个视图。
 *
 * - 列表视图：列出全部 `TimeTablePreset`，右侧单选按钮直接把「当前课表」绑到该套时间表；
 * - 编辑视图：改名称 / 固定时长开关 / 逐节起止时间（底部双列滚轮）。
 *
 * 数据只落在 `settings` 的两个 JSON 键上，真正生效的节次仍写回 `period.times`，
 * 所以首页、计划页、课表网格拿到的永远是同一份时间。
 */
export default function PeriodsSettingScreen() {
  const theme = useTheme();
  const { scheme } = useThemePreference();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    timeTables,
    scheduleTimeTableMap,
    activeSchedule,
    timeTableIdForSchedule,
    selectTimeTable,
    saveTimeTable,
    createTimeTable,
    deleteTimeTable,
  } = useTimetable();

  /** null = 列表视图；非 null = 正在编辑这套时间表的副本。 */
  const [draft, setDraft] = useState<TimeTablePreset | null>(null);

  // —— 底部时间滚轮 ——
  const [sheetTarget, setSheetTarget] = useState<SheetTarget | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetHour, setSheetHour] = useState('08');
  const [sheetMinute, setSheetMinute] = useState('00');

  // —— 每节课时长滚轮 ——
  const [durationVisible, setDurationVisible] = useState(false);
  const [durationDraft, setDurationDraft] = useState('45');

  const activeTimeTableId = timeTableIdForSchedule(activeSchedule.id);

  const usageCount = (timeTableId: string) =>
    Object.values(scheduleTimeTableMap).filter((id) => id === timeTableId).length;

  // ———————————————————— 列表视图 ————————————————————

  const handleCreate = async () => {
    const preset = await createTimeTable(`时间表 ${timeTables.length + 1}`);
    setDraft(clonePreset(preset));
  };

  const handleDeletePreset = (preset: TimeTablePreset) => {
    showActions({
      title: preset.name,
      message: `绑定它的课表会改绑到其它时间表`,
      options: [
        {
          label: '删除该时间表',
          danger: true,
          onPress: async () => {
            const result = await deleteTimeTable(preset.id);
            if (!result.ok) showNotice(result.message ?? '删除失败');
          },
        },
      ],
    });
  };

  // ———————————————————— 编辑视图 ————————————————————

  const openTimeSheet = (index: number, field: SheetField) => {
    if (!draft) return;
    const value = draft.periods[index]?.[field] ?? '08:00';
    const [hour = '08', minute = '00'] = value.split(':');
    setSheetTarget({ index, field });
    setSheetHour(hour);
    setSheetMinute(minute);
    setSheetVisible(true);
  };

  const handleTimePillPress = (index: number, field: SheetField) => {
    if (!draft) return;
    if (field === 'end' && draft.fixedDuration) {
      showNotice('已开启固定上课时长，下课时间自动计算');
      return;
    }
    openTimeSheet(index, field);
  };

  const applyTimeSheet = () => {
    if (!draft || !sheetTarget) {
      setSheetVisible(false);
      return;
    }
    const value = `${sheetHour}:${sheetMinute}`;
    const periods: PeriodTime[] = draft.periods.map((p) => ({ ...p }));
    const index = sheetTarget.index;

    if (sheetTarget.field === 'start') {
      periods[index].start = value;
      if (draft.fixedDuration) {
        // 固定时长：结束时间随之重算，重叠的后续节次按原课间整体顺延。
        setDraft({ ...draft, periods: relayoutPeriods(periods, index, draft.durationMinutes) });
      } else {
        // 自由模式：开始时间越过结束时间时，把结束时间顺延一个课时，避免保存时才报错。
        if (toMinutes(periods[index].end) <= toMinutes(value)) {
          periods[index].end = addMinutes(value, draft.durationMinutes || 45);
        }
        setDraft({ ...draft, periods });
      }
    } else {
      periods[index].end = value;
      setDraft({ ...draft, periods });
    }
    setSheetVisible(false);
  };

  const handleToggleFixed = (enabled: boolean) => {
    if (!draft) return;
    setDraft({
      ...draft,
      fixedDuration: enabled,
      // 打开开关时立刻把所有结束时间对齐到「开始 + 时长」。
      periods: enabled ? applyFixedDuration(draft.periods, draft.durationMinutes) : draft.periods,
    });
  };

  const handleAddPeriod = () => {
    if (!draft) return;
    if (draft.periods.length >= MAX_PERIODS) {
      showNotice(`最多只能添加 ${MAX_PERIODS} 节课`);
      return;
    }
    setDraft({ ...draft, periods: appendPeriod(draft.periods, draft.durationMinutes) });
  };

  const handleRemovePeriod = (index: number) => {
    if (!draft) return;
    if (draft.periods.length <= 1) {
      showNotice('至少保留一节课');
      return;
    }
    showActions({
      title: `第 ${index + 1} 节课`,
      options: [
        {
          label: '删除该节',
          danger: true,
          onPress: () => {
            if (!draft) return;
            setDraft({ ...draft, periods: draft.periods.filter((_, i) => i !== index) });
          },
        },
      ],
    });
  };

  const applyDuration = () => {
    if (!draft) return;
    const minutes = Number(durationDraft);
    setDraft({
      ...draft,
      durationMinutes: minutes,
      periods: applyFixedDuration(draft.periods, minutes),
    });
    setDurationVisible(false);
  };

  const handleSave = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      showNotice('请输入时间表名称');
      return;
    }
    const periods = draft.fixedDuration
      ? applyFixedDuration(draft.periods, draft.durationMinutes)
      : draft.periods;
    const error = validatePeriods(periods);
    if (error) {
      showNotice(error);
      return;
    }
    await saveTimeTable({ ...draft, name, periods });
    setDraft(null);
  };

  const paddingTop = insets.top || SAFE_TOP_DP;
  const paddingBottom = insets.bottom || SAFE_BOTTOM_DP;
  /** 行 / 卡片分隔线：深色下透明度反过来，用低透明白。 */
  const dividerColor = scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  // ———————————————————— 渲染 ————————————————————

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background, paddingTop, paddingBottom }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={[
            styles.backBtnCircle,
            {
              borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
              backgroundColor: theme.backgroundElement,
            },
          ]}
          accessibilityLabel="返回"
          onPress={() => (draft ? setDraft(null) : router.back())}>
          <Text style={[styles.backArrow, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {draft ? '编辑时间表' : '设置时间表'}
        </Text>
        {draft ? (
          <TouchableOpacity accessibilityLabel="保存" onPress={handleSave}>
            <Text style={styles.saveText}>保存</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.newPill, { backgroundColor: theme.backgroundElement }]}
            accessibilityLabel="新建时间表"
            onPress={handleCreate}>
            <Text style={styles.newPillText}>新建</Text>
          </TouchableOpacity>
        )}
      </View>

      {draft ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.scrollBody}>
          {/* 名称 */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardRow}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>时间表名称</Text>
              <TextInput
                value={draft.name}
                accessibilityLabel="时间表名称"
                maxLength={20}
                onChangeText={(name) => setDraft({ ...draft, name })}
                style={[styles.nameInput, { color: theme.text }]}
              />
            </View>
          </View>

          {/* 固定上课时长 */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardRow}>
              <View style={styles.cardLabelBlock}>
                <Text style={[styles.cardLabel, { color: theme.text }]}>固定上课时长</Text>
                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                  {draft.fixedDuration ? '修改上课时间会跟随联动' : '可随意调整节上课时间'}
                </Text>
              </View>
              <Switch
                value={draft.fixedDuration}
                accessibilityLabel="固定上课时长"
                trackColor={{ false: scheme === 'dark' ? '#3A3A3C' : '#E5E7EB', true: ACCENT }}
                onValueChange={handleToggleFixed}
              />
            </View>

            {draft.fixedDuration ? (
              <>
                <View style={[styles.cardDivider, { backgroundColor: dividerColor }]} />
                <TouchableOpacity
                  style={styles.cardRow}
                  accessibilityLabel="每节课时长"
                  onPress={() => {
                    setDurationDraft(String(draft.durationMinutes));
                    setDurationVisible(true);
                  }}>
                  <Text style={[styles.cardLabel, { color: theme.text }]}>每节课时长（分钟）</Text>
                  <Text style={[styles.cardValue, { color: theme.textSecondary }]}>
                    {draft.durationMinutes}分钟 ›
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          {/* 节次引导行 */}
          <View style={styles.periodHintRow}>
            <Text style={[styles.periodHint, { color: theme.textSecondary }]}>请注意是 24 小时制！</Text>
            <TouchableOpacity
              style={[
                styles.addPill,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
              ]}
              accessibilityLabel="添加一节"
              onPress={handleAddPeriod}>
              <Text style={styles.addPillText}>⊞ 添加</Text>
            </TouchableOpacity>
          </View>

          {/* 节次列表 */}
          <View style={[styles.periodCard, { backgroundColor: theme.backgroundElement }]}>
            {draft.periods.map((item, idx) => {
              const endLocked = draft.fixedDuration;
              return (
                <View key={idx}>
                  {idx > 0 ? (
                    <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    delayLongPress={400}
                    accessibilityLabel={`第${idx + 1}节课`}
                    onLongPress={() => handleRemovePeriod(idx)}
                    style={styles.periodRow}>
                    <Text style={[styles.periodLabel, { color: theme.text }]}>第 {idx + 1} 节课</Text>
                    <View style={styles.periodTimes}>
                      <TouchableOpacity
                        style={[styles.timePill, { backgroundColor: theme.backgroundSelected }]}
                        accessibilityLabel={`第${idx + 1}节开始时间`}
                        onPress={() => handleTimePillPress(idx, 'start')}>
                        <Text style={[styles.timePillText, { color: theme.text }]}>{item.start}</Text>
                      </TouchableOpacity>
                      <Text style={[styles.timeDash, { color: theme.textSecondary }]}>-</Text>
                      <TouchableOpacity
                        style={[styles.timePill, { backgroundColor: theme.backgroundSelected }]}
                        accessibilityLabel={`第${idx + 1}节结束时间`}
                        onPress={() => handleTimePillPress(idx, 'end')}>
                        <Text
                          style={[
                            styles.timePillText,
                            { color: theme.text },
                            endLocked && styles.timePillTextLocked,
                          ]}>
                          {item.end}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <Text style={styles.footHint}>长按任意一节课可删除</Text>

          {timeTables.length > 1 ? (
            <TouchableOpacity
              style={styles.deletePresetBtn}
              accessibilityLabel="删除时间表"
              onPress={() => {
                if (draft) handleDeletePreset(draft);
              }}>
              <Text style={styles.deletePresetText}>删除时间表</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.scrollBody}>
          {timeTables.map((preset) => {
            const inUse = preset.id === activeTimeTableId;
            const count = usageCount(preset.id);
            return (
              <View key={preset.id} style={styles.presetCard}>
                <TouchableOpacity
                  style={styles.presetInfo}
                  accessibilityLabel={`编辑时间表${preset.name}`}
                  onPress={() => setDraft(clonePreset(preset))}>
                  <View style={styles.presetNameRow}>
                    <Text style={styles.presetName}>{preset.name}</Text>
                    <Text style={styles.pencil}>✎</Text>
                  </View>
                  <Text style={styles.presetMeta}>
                    共 {preset.periods.length} 节课 · {preset.durationMinutes}分钟/节
                  </Text>
                  <Text style={styles.presetMeta}>
                    {inUse ? '当前课表在用' : `${count}个课表在用`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioHit}
                  accessibilityLabel={`使用时间表${preset.name}`}
                  accessibilityState={{ selected: inUse }}
                  onPress={() => selectTimeTable(preset.id)}>
                  {inUse ? (
                    <View style={styles.radioOn}>
                      <Text style={styles.radioCheck}>✓</Text>
                    </View>
                  ) : (
                    <View style={styles.radioOff} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.addPillWide}
            accessibilityLabel="新建时间表"
            onPress={handleCreate}>
            <Text style={styles.addPillText}>＋ 新建时间表</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 底部双列时间滚轮 */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        autoHeight
        showHandle={false}
        bodyStyle={styles.sheetBody}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            {sheetTarget?.field === 'end' ? '下课时间' : '上课时间'}
          </Text>
          <TouchableOpacity
            style={styles.sheetClose}
            accessibilityLabel="关闭"
            onPress={() => setSheetVisible(false)}>
            <Text style={styles.sheetCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.wheelRow}>
          <View style={styles.wheelColumn}>
            <WheelPicker
              columns={[{ key: 'hour', options: HOUR_OPTIONS }]}
              value={{ hour: sheetHour }}
              highlightColor="transparent"
              separators
              onChange={(next) => setSheetHour(next.hour)}
            />
          </View>
          <Text style={styles.colon}>:</Text>
          <View style={styles.wheelColumn}>
            <WheelPicker
              columns={[{ key: 'minute', options: MINUTE_OPTIONS }]}
              value={{ minute: sheetMinute }}
              highlightColor="transparent"
              separators
              onChange={(next) => setSheetMinute(next.minute)}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.sheetSaveBtn}
          accessibilityLabel="保存时间"
          onPress={applyTimeSheet}>
          <Text style={styles.sheetSaveText}>保存</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* 每节课时长滚轮 */}
      <BottomSheet
        visible={durationVisible}
        onClose={() => setDurationVisible(false)}
        autoHeight
        showHandle={false}
        bodyStyle={styles.sheetBody}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>每节课时长</Text>
          <TouchableOpacity
            style={styles.sheetClose}
            accessibilityLabel="关闭"
            onPress={() => setDurationVisible(false)}>
            <Text style={styles.sheetCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <WheelPicker
          columns={[{ key: 'duration', options: DURATION_OPTIONS }]}
          value={{ duration: durationDraft }}
          highlightColor="transparent"
          separators
          onChange={(next) => setDurationDraft(next.duration)}
        />

        <TouchableOpacity
          style={styles.sheetSaveBtn}
          accessibilityLabel="保存时长"
          onPress={applyDuration}>
          <Text style={styles.sheetSaveText}>保存</Text>
        </TouchableOpacity>
      </BottomSheet>
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
  saveText: { fontSize: 15, fontWeight: '600', color: ACCENT },
  newPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  newPillText: { fontSize: 14, fontWeight: '600', color: ACCENT },
  scrollBody: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  cardLabelBlock: { flex: 1, paddingRight: 12 },
  cardLabel: { fontSize: 15, color: '#111113', fontWeight: '500' },
  cardSub: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  cardValue: { fontSize: 14, color: '#8E8E93' },
  cardDivider: { height: 0.5, backgroundColor: 'rgba(0,0,0,0.08)' },
  nameInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    color: '#111113',
    paddingVertical: 4,
    marginLeft: 12,
  },

  periodHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  periodHint: { fontSize: 12, color: '#8E8E93' },
  addPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  addPillWide: {
    marginTop: 4,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPillText: { fontSize: 13, fontWeight: '600', color: ACCENT },

  periodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  periodRow: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: { height: 0.5, backgroundColor: 'rgba(0,0,0,0.08)' },
  periodLabel: { fontSize: 15, color: '#111113' },
  periodTimes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timePill: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  timePillText: {
    fontSize: 16,
    color: '#111113',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timePillTextLocked: { color: '#9CA3AF' },
  timeDash: { fontSize: 14, color: 'rgba(0,0,0,0.4)' },
  footHint: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 10,
  },
  deletePresetBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePresetText: { fontSize: 15, color: '#EF4444', fontWeight: '600' },

  presetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetInfo: { flex: 1, paddingRight: 12 },
  presetNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  presetName: { fontSize: 18, fontWeight: '700', color: '#111113' },
  pencil: { fontSize: 14, color: '#8E8E93' },
  presetMeta: { fontSize: 14, color: '#8E8E93', marginTop: 8 },
  radioHit: { padding: 4 },
  radioOn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCheck: { fontSize: 14, color: '#FFFFFF', fontWeight: '700', lineHeight: 18 },
  radioOff: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#C7C7CC',
  },

  sheetBody: { paddingHorizontal: 20, paddingBottom: 8 },
  sheetHeader: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111113' },
  sheetClose: {
    position: 'absolute',
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  wheelRow: { flexDirection: 'row', alignItems: 'center' },
  wheelColumn: { flex: 1 },
  colon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111113',
    marginHorizontal: 2,
    marginTop: 4,
  },
  sheetSaveBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSaveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});