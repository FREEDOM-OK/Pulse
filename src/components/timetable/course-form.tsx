import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import {
  createCourse,
  findSlotConflict,
  updateCourse,
  type CreateSlotInput,
  type CourseWithSlots,
} from '@/db/repositories/courses';
import { useTheme } from '@/hooks/use-theme';
import { bumpDataVersion } from '@/lib/data-version';
import { DEFAULT_COURSE_COLOR } from '@/lib/timetable';
import { formatWeeks, parseWeeksInput, WEEKDAY_LABELS } from '@/lib/timetable-grid';

export const COURSE_COLORS = [
  '#4C8DF6',
  '#F2994A',
  '#4CAF7D',
  '#9B6DF3',
  '#E5677E',
  '#3BA6B8',
  '#D1A33C',
  '#6B7280',
];

const PERIOD_COUNT = 8;

interface CourseFormProps {
  visible: boolean;
  course: CourseWithSlots | null;
  totalWeeks: number;
  /** 从空白格子进来时带上星期与节次。 */
  preset?: { weekday: number; startPeriod: number } | null;
  onClose: () => void;
  onSaved: () => void;
}

/** 新建 / 编辑课程：课程信息 + 多个上课时段，保存前做冲突检测。 */
export function CourseForm({
  visible,
  course,
  totalWeeks,
  preset,
  onClose,
  onSaved,
}: CourseFormProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState(DEFAULT_COURSE_COLOR);
  const [slots, setSlots] = useState<CreateSlotInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [draftWeekday, setDraftWeekday] = useState(1);
  const [draftStart, setDraftStart] = useState(1);
  const [draftEnd, setDraftEnd] = useState(2);
  const [draftWeeks, setDraftWeeks] = useState('');

  const [conflict, setConflict] = useState<{ name: string; slots: CreateSlotInput[] } | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(course?.name ?? '');
    setTeacher(course?.teacher ?? '');
    setRoom(course?.room ?? '');
    setColor(course?.color ?? DEFAULT_COURSE_COLOR);
    setSlots(
      course
        ? course.slots.map((slot) => ({
            weekday: slot.weekday,
            startPeriod: slot.startPeriod,
            endPeriod: slot.endPeriod,
            weeks: slot.weeks,
          }))
        : []
    );
    setDraftWeekday(preset?.weekday ?? 1);
    setDraftStart(preset?.startPeriod ?? 1);
    setDraftEnd(preset ? Math.min(PERIOD_COUNT, preset.startPeriod + 1) : 2);
    setDraftWeeks('');
    setError(null);
    setSaving(false);
    setConflict(null);
  }, [visible, course, preset]);

  const addSlot = () => {
    const start = Math.max(1, Math.min(PERIOD_COUNT, Math.min(draftStart, draftEnd)));
    const end = Math.max(1, Math.min(PERIOD_COUNT, Math.max(draftStart, draftEnd)));
    const weeks = parseWeeksInput(draftWeeks, totalWeeks);
    setSlots((current) => {
      const exists = current.some(
        (slot) =>
          slot.weekday === draftWeekday &&
          slot.startPeriod === start &&
          slot.endPeriod === end &&
          formatWeeks(slot.weeks) === formatWeeks(weeks)
      );
      return exists
        ? current
        : [...current, { weekday: draftWeekday, startPeriod: start, endPeriod: end, weeks }];
    });
    setDraftWeeks('');
  };

  const persist = async (pendingSlots: CreateSlotInput[]) => {
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        teacher: teacher.trim() || null,
        room: room.trim() || null,
        color,
        slots: pendingSlots,
      };
      if (course) await updateCourse(course.id, input);
      else await createCourse(input);
      bumpDataVersion();
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (name.trim().length === 0) {
      setError('请填写课程名');
      return;
    }
    if (slots.length === 0) {
      setError('至少添加一个上课时段');
      return;
    }

    for (const slot of slots) {
      const hit = await findSlotConflict(slot, course?.id);
      if (hit) {
        setConflict({ name: hit.name, slots });
        return;
      }
    }
    await persist(slots);
  };

  return (
    <>
      <ModalSheet
        visible={visible}
        title={course ? '编辑课程' : '新建课程'}
        onClose={onClose}
        footer={
          <View style={modalStyles.actionsRow}>
            <AppButton label="取消" variant="secondary" onPress={onClose} />
            <AppButton
              label={saving ? '保存中…' : '保存'}
              onPress={() => {
                handleSave().catch(() => undefined);
              }}
              disabled={saving}
            />
          </View>
        }>
        <View style={modalStyles.field}>
          <TextField
            label="课程名"
            placeholder="例如：高等数学"
            value={name}
            onChangeText={setName}
            maxLength={24}
          />
        </View>

        <View style={modalStyles.row}>
          <View style={styles.half}>
            <TextField
              label="老师（选填）"
              placeholder="张老师"
              value={teacher}
              onChangeText={setTeacher}
            />
          </View>
          <View style={styles.half}>
            <TextField
              label="地点（选填）"
              placeholder="A301"
              value={room}
              onChangeText={setRoom}
            />
          </View>
        </View>

        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            颜色
          </ThemedText>
          <View style={styles.colorRow}>
            {COURSE_COLORS.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`颜色 ${item}`}
                accessibilityState={{ selected: item === color }}
                onPress={() => setColor(item)}
                style={[
                  styles.colorDot,
                  { backgroundColor: item },
                  item === color && { borderWidth: 2, borderColor: theme.text },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={modalStyles.field}>
          <ThemedText type="smallBold">上课时段</ThemedText>
          {slots.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              还没有时段，下面选好星期和节次后点「添加时段」。
            </ThemedText>
          ) : (
            slots.map((slot, index) => (
              <View key={`${slot.weekday}-${slot.startPeriod}-${index}`} style={styles.slotRow}>
                <ThemedText type="small" style={styles.slotText}>
                  周{WEEKDAY_LABELS[slot.weekday - 1]} 第 {slot.startPeriod}-
                  {slot.endPeriod} 节 · {formatWeeks(slot.weeks)}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="删除该时段"
                  onPress={() =>
                    setSlots((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  hitSlop={8}>
                  <ThemedText type="small" themeColor="textSecondary">
                    ✕
                  </ThemedText>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            添加时段
          </ThemedText>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, index) => {
              const weekday = index + 1;
              const selected = draftWeekday === weekday;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDraftWeekday(weekday)}
                  style={[
                    styles.chip,
                    { borderColor: theme.textSecondary },
                    selected && { backgroundColor: theme.text, borderColor: theme.text },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: selected ? theme.background : theme.text }}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.stepperRow}>
            <Stepper
              label="开始节"
              value={draftStart}
              min={1}
              max={PERIOD_COUNT}
              onChange={setDraftStart}
            />
            <Stepper
              label="结束节"
              value={draftEnd}
              min={1}
              max={PERIOD_COUNT}
              onChange={setDraftEnd}
            />
          </View>

          <TextField
            placeholder="周次：每周 / 1-16 / 单周 / 双周"
            value={draftWeeks}
            onChangeText={setDraftWeeks}
            autoCapitalize="none"
          />

          <AppButton label="添加时段" variant="secondary" onPress={addSlot} />
        </View>

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </ModalSheet>

      <ConfirmDialog
        visible={conflict !== null}
        title="时间冲突"
        message={conflict ? `与「${conflict.name}」冲突，仍要添加？` : undefined}
        confirmLabel="仍然保存"
        onCancel={() => setConflict(null)}
        onConfirm={() => {
          const pending = conflict?.slots ?? [];
          setConflict(null);
          persist(pending).catch(() => undefined);
        }}
      />
    </>
  );
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const theme = useTheme();
  return (
    <View style={styles.stepper}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityLabel={`${label}减少`}
          onPress={() => onChange(Math.max(min, value - 1))}
          hitSlop={6}
          style={[styles.stepperButton, { borderColor: theme.backgroundElement }]}>
          <ThemedText type="small">－</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.stepperValue}>
          {value}
        </ThemedText>
        <Pressable
          accessibilityLabel={`${label}增加`}
          onPress={() => onChange(Math.min(max, value + 1))}
          hitSlop={6}
          style={[styles.stepperButton, { borderColor: theme.backgroundElement }]}>
          <ThemedText type="small">＋</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  half: {
    flex: 1,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  slotText: {
    flex: 1,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stepper: {
    flex: 1,
    gap: 4,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 20,
    textAlign: 'center',
  },
  error: {
    color: '#D64545',
    fontSize: 12,
  },
});