import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { WheelPicker } from '@/components/ui/wheel-picker';
import { SubPageHeader } from '@/components/timetable/sub-header';
import type { CourseBackground } from '@/db/types';
import { COURSE_BACKGROUNDS, COURSE_BACKGROUND_LABELS } from '@/db/types';
import {
  createCourse,
  findSlotConflict,
  getCourse,
  updateCourse,
  type CreateSlotInput,
} from '@/db/repositories/courses';
import { getPeriodCount, getTermConfig } from '@/db/repositories/settings';
import { bumpDataVersion } from '@/lib/data-version';
import { Space, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { validateCourseDraft, weeksFromRange, weeksToRange, type SlotDraft } from '@/lib/course-form';
import { WEEKDAY_LABELS } from '@/lib/timetable-grid';

const COURSE_COLORS = [
  '#4C8DF6',
  '#F2994A',
  '#4CAF7D',
  '#9B6DF3',
  '#E5677E',
  '#3BA6B8',
  '#D1A33C',
  '#6B7280',
];

const EMPTY_SLOT: SlotDraft = { weekday: 1, startPeriod: 1, endPeriod: 2, weeks: [] };

export default function CoursePage() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string; weekday?: string; period?: string }>();
  const courseId = params.id ? Number(params.id) : null;

  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState(COURSE_COLORS[0]);
  const [background, setBackground] = useState<CourseBackground>('plain');
  const [note, setNote] = useState('');
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [periodCount, setPeriodCount] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(18);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{ slots: SlotDraft[]; name: string } | null>(null);

  const [slotSheet, setSlotSheet] = useState(false);
  const [slotDraft, setSlotDraft] = useState<SlotDraft>(EMPTY_SLOT);
  const [weeksText, setWeeksText] = useState('');

  const load = useCallback(async () => {
    const [count, term] = await Promise.all([getPeriodCount(), getTermConfig()]);
    setPeriodCount(count);
    setTotalWeeks(term.totalWeeks);

    if (courseId) {
      const course = await getCourse(courseId);
      if (course) {
        setName(course.name);
        setTeacher(course.teacher ?? '');
        setRoom(course.room ?? '');
        setColor(course.color ?? COURSE_COLORS[0]);
        setBackground((course.background as CourseBackground) ?? 'plain');
        setNote(course.note ?? '');
        setSlots(
          course.slots.map((slot) => ({
            weekday: slot.weekday,
            startPeriod: slot.startPeriod,
            endPeriod: slot.endPeriod,
            weeks: slot.weeks,
          }))
        );
      }
    } else {
      const weekday = params.weekday ? Number(params.weekday) : 1;
      const period = params.period ? Number(params.period) : 1;
      const end = Math.min(count, period + 1);
      setSlots([{ weekday: clamp(weekday, 1, 7), startPeriod: period, endPeriod: end, weeks: [] }]);
    }
  }, [courseId, params.weekday, params.period]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const weekdayOptions = useMemo(
    () => WEEKDAY_LABELS.map((label, index) => ({ value: String(index + 1), label: `周${label}` })),
    []
  );
  const periodOptions = useMemo(
    () =>
      Array.from({ length: periodCount }, (_, index) => ({
        value: String(index + 1),
        label: `第 ${index + 1} 节`,
      })),
    [periodCount]
  );

  function addSlot() {
    setSlotDraft(EMPTY_SLOT);
    setWeeksText('');
    setSlotSheet(true);
  }

  function confirmSlot() {
    const next: SlotDraft = {
      ...slotDraft,
      weeks: weeksText ? weeksFromRange(weeksText, totalWeeks) : [],
    };
    if (next.startPeriod > next.endPeriod) {
      setSlotDraft((current) => ({ ...current, endPeriod: current.startPeriod }));
      return;
    }
    setSlots((current) => [...current, next]);
    setSlotSheet(false);
  }

  async function persist() {
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        teacher: teacher.trim() || undefined,
        room: room.trim() || undefined,
        color,
        background,
        note: note.trim() || undefined,
        slots: slots.map<CreateSlotInput>((slot) => ({
          weekday: slot.weekday,
          startPeriod: slot.startPeriod,
          endPeriod: slot.endPeriod,
          weeks: slot.weeks,
        })),
      };
      if (courseId) await updateCourse(courseId, input);
      else await createCourse(input);
      bumpDataVersion();
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    const draft = { name, teacher, room, color, background, note, slots };
    const message = validateCourseDraft(draft, periodCount);
    if (message) {
      setError(message);
      return;
    }
    setError(null);

    for (const slot of slots) {
      const hit = await findSlotConflict(slot, courseId ?? undefined);
      if (hit) {
        setConflict({ slots, name: hit.name });
        return;
      }
    }
    await persist();
  }

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <SubPageHeader
        title={courseId ? '编辑课程' : '添加课程'}
        onBack={() => router.back()}
        actionLabel={saving ? '保存中' : '保存'}
        onAction={handleSave}
        actionDisabled={saving}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <InputRow label="课程名称" value={name} onChangeText={setName} placeholder="例如：高等数学" />
          <Divider />
          <InputRow label="老师" value={teacher} onChangeText={setTeacher} placeholder="选填" />
          <Divider />
          <InputRow label="地点" value={room} onChangeText={setRoom} placeholder="选填" />
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          颜色
        </ThemedText>
        <View style={[styles.card, styles.swatchCard, { backgroundColor: theme.backgroundElement }]}>
          {COURSE_COLORS.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`颜色 ${item}`}
              onPress={() => setColor(item)}
              style={[
                styles.swatch,
                { backgroundColor: item },
                color === item && { borderWidth: 2, borderColor: theme.text },
              ]}
            />
          ))}
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          底色样式
        </ThemedText>
        <View style={[styles.card, styles.segmentCard, { backgroundColor: theme.backgroundElement }]}>
          {COURSE_BACKGROUNDS.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`底色 ${COURSE_BACKGROUND_LABELS[item]}`}
              onPress={() => setBackground(item)}
              style={[
                styles.segmentItem,
                background === item && { backgroundColor: theme.background },
              ]}>
              <ThemedText type="small">{COURSE_BACKGROUND_LABELS[item]}</ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          上课时段
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          {slots.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySlots}>
              还没有时段，点下面的「添加时段」
            </ThemedText>
          ) : (
            slots.map((slot, index) => (
              <View key={`${slot.weekday}-${slot.startPeriod}-${index}`}>
                {index > 0 ? <Divider /> : null}
                <View style={styles.slotRow}>
                  <View style={styles.slotText}>
                    <ThemedText type="small">
                      周{WEEKDAY_LABELS[slot.weekday - 1]} 第 {slot.startPeriod}-{slot.endPeriod} 节
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {slot.weeks.length === 0 ? '每周' : weeksToRange(slot.weeks)}
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`删除第 ${index + 1} 个时段`}
                    onPress={() => setSlots((current) => current.filter((_, i) => i !== index))}
                    style={styles.removeSlot}>
                    <ThemedText type="small" themeColor="textSecondary">
                      移除
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
          <Divider />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="添加时段"
            onPress={addSlot}
            style={styles.addSlot}>
            <ThemedText type="small">＋ 添加时段</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          备注
        </ThemedText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="想记的内容"
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[
            styles.noteInput,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundElement },
          ]}
          accessibilityLabel="课程备注"
        />

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </ScrollView>

      <BottomSheet visible={slotSheet} onClose={() => setSlotSheet(false)} heightRatio={0.62}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.sheetTitle}>
          选择星期与节次
        </ThemedText>
        <WheelPicker
          columns={[
            { key: 'weekday', options: weekdayOptions },
            { key: 'start', options: periodOptions },
            { key: 'end', options: periodOptions },
          ]}
          value={{
            weekday: String(slotDraft.weekday),
            start: String(slotDraft.startPeriod),
            end: String(slotDraft.endPeriod),
          }}
          onChange={(next) =>
            setSlotDraft({
              weekday: Number(next.weekday),
              startPeriod: Number(next.start),
              endPeriod: Number(next.end),
              weeks: slotDraft.weeks,
            })
          }
        />
        <View style={styles.weeksRow}>
          <ThemedText type="small" themeColor="textSecondary">
            周次
          </ThemedText>
          <TextInput
            value={weeksText}
            onChangeText={setWeeksText}
            placeholder="每周"
            placeholderTextColor={theme.textSecondary}
            style={[styles.weeksInput, { color: theme.text, borderColor: theme.backgroundElement }]}
            accessibilityLabel="周次"
          />
          {['每周', '单周', '双周'].map((label) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={`周次 ${label}`}
              onPress={() => setWeeksText(label === '每周' ? '' : label)}
              style={[styles.quickChip, { borderColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.sheetActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="取消时段"
            onPress={() => setSlotSheet(false)}
            style={[styles.sheetButton, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="small">取消</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="确定时段"
            onPress={confirmSlot}
            style={[styles.sheetButton, { backgroundColor: theme.text }]}>
            <ThemedText type="small" style={{ color: theme.background }}>
              确定
            </ThemedText>
          </Pressable>
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={conflict !== null}
        title="时间冲突"
        message={conflict ? `与「${conflict.name}」冲突，仍要添加？` : ''}
        confirmLabel="仍然保存"
        onCancel={() => setConflict(null)}
        onConfirm={() => {
          setConflict(null);
          persist().catch(() => undefined);
        }}
      />
    </View>
  );
}

function InputRow({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.inputRow}>
      <ThemedText type="small" style={styles.inputLabel}>
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        accessibilityLabel={label}
      />
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Space.three,
    paddingBottom: Space.five,
    gap: Space.one,
  },
  card: {
    borderRadius: Space.two,
    paddingHorizontal: Space.three,
  },
  sectionLabel: {
    paddingTop: Space.three,
    paddingBottom: Space.one,
    paddingHorizontal: Space.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.two,
    minHeight: 54,
  },
  inputLabel: {
    width: 76,
  },
  input: {
    flex: 1,
    minHeight: 44,
    ...Type.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  swatchCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.two,
    paddingVertical: Space.three,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  segmentCard: {
    flexDirection: 'row',
    padding: 3,
    marginVertical: Space.one,
  },
  segmentItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: Space.two - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlots: {
    paddingVertical: Space.two,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.two,
    minHeight: 54,
  },
  slotText: {
    flex: 1,
    gap: 2,
  },
  removeSlot: {
    paddingHorizontal: Space.two,
    paddingVertical: Space.one,
  },
  addSlot: {
    minHeight: 48,
    justifyContent: 'center',
  },
  noteInput: {
    minHeight: 88,
    borderRadius: Space.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Space.two,
    textAlignVertical: 'top',
  },
  error: {
    color: '#D14343',
    paddingTop: Space.two,
  },
  sheetTitle: {
    paddingBottom: Space.two,
  },
  weeksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.one,
    paddingTop: Space.two,
  },
  weeksInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Space.two,
    paddingHorizontal: Space.two,
  },
  quickChip: {
    paddingHorizontal: Space.two,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: Space.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Space.two,
    paddingTop: Space.three,
  },
  sheetButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Space.three,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});