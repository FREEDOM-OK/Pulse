import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { MonthPicker } from '@/components/ui/month-picker';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TaskRow } from '@/db/types';
import { createMemo, createMemoSeries } from '@/db/repositories/memos';
import {
  createTask,
  createTaskSeries,
  isTaskAutoPostpone,
  moveTaskToDate,
  setTaskAutoPostpone,
  updateTask,
} from '@/db/repositories/tasks';
import { formatDay } from '@/lib/date';
import { parseTimeInput, validateTaskTitle } from '@/lib/validation';

/** 综合弹窗的新建类型：任务或备忘。 */
export type EntryKind = 'task' | 'memo';

interface TaskFormProps {
  visible: boolean;
  date: string;
  task: TaskRow | null;
  /** 新建时的默认类型；编辑任务时固定为任务模式。 */
  initialKind?: EntryKind;
  onClose: () => void;
  onSaved: () => void;
}

const RANGE_OPTIONS = [
  { days: 1, label: '仅今日' },
  { days: 3, label: '今日起3天' },
  { days: 7, label: '今日起7天' },
];

const KIND_OPTIONS: { kind: EntryKind; label: string }[] = [
  { kind: 'task', label: '任务' },
  { kind: 'memo', label: '备忘' },
];

/**
 * 底栏「＋」与计划页共用的综合弹窗：
 * 新建时可在「任务 / 备忘」之间切换；编辑已有任务时固定为任务模式。
 */
export function TaskForm({
  visible,
  date,
  task,
  initialKind = 'task',
  onClose,
  onSaved,
}: TaskFormProps) {
  const theme = useTheme();
  const [entryKind, setEntryKind] = useState<EntryKind>(initialKind);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [time, setTime] = useState('');
  const [formDate, setFormDate] = useState(date);
  const [days, setDays] = useState(1);
  const [autoPostpone, setAutoPostpone] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setEntryKind(task ? 'task' : initialKind);
    setTitle(task?.title ?? '');
    setNote(task?.note ?? '');
    setTime(task?.time ?? '');
    setFormDate(task?.date ?? date);
    setDays(1);
    setAutoPostpone(false);
    setPinned(false);
    setError(null);
    setSaving(false);

    if (!task) return;
    let active = true;
    isTaskAutoPostpone(task.id)
      .then((value) => {
        if (active) setAutoPostpone(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [visible, task, date, initialKind]);

  const isMemo = !task && entryKind === 'memo';

  const handleSave = async () => {
    const trimmed = title.trim();
    const titleError = isMemo
      ? trimmed === ''
        ? '请填写备忘内容'
        : trimmed.length > 200
          ? '备忘内容最多 200 个字'
          : null
      : validateTaskTitle(title);
    const parsedTime = parseTimeInput(time);
    const nextError = titleError ?? parsedTime.error;
    setError(nextError);
    if (nextError) return;

    setSaving(true);
    try {
      if (isMemo) {
        const input = {
          date: formDate,
          content: trimmed,
          time: parsedTime.value,
          pinned,
        };
        if (days === 1) await createMemo(input);
        else await createMemoSeries(input, days);
      } else if (task) {
        await updateTask(task.id, {
          title: trimmed,
          note: note.trim() ? note.trim() : null,
          time: parsedTime.value,
        });
        if (formDate !== task.date) {
          await moveTaskToDate(task.id, formDate);
        }
        await setTaskAutoPostpone(task.id, autoPostpone);
      } else if (days === 1) {
        await createTask({
          date: formDate,
          title: trimmed,
          note: note.trim() ? note.trim() : null,
          time: parsedTime.value,
          autoPostpone,
        });
      } else {
        await createTaskSeries(
          {
            date: formDate,
            title: trimmed,
            note: note.trim() ? note.trim() : null,
            time: parsedTime.value,
            autoPostpone,
          },
          days
        );
      }
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalSheet
        visible={visible}
        title={task ? '编辑任务' : '新建任务/备忘'}
        onClose={onClose}
        footer={
          <View style={modalStyles.actionsRow}>
            <AppButton label="取消" variant="secondary" onPress={onClose} />
            <AppButton label={saving ? '保存中…' : '保存'} onPress={handleSave} disabled={saving} />
          </View>
        }>
        {!task ? (
          <View style={modalStyles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              类型
            </ThemedText>
            <View style={styles.chipRow}>
              {KIND_OPTIONS.map((option) => {
                const active = entryKind === option.kind;
                return (
                  <Pressable
                    key={option.kind}
                    accessibilityRole="button"
                    accessibilityLabel={`类型 ${option.label}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      setEntryKind(option.kind);
                      setError(null);
                    }}
                    style={({ pressed }) => [
                      styles.kindChip,
                      { backgroundColor: active ? theme.text : theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: active ? theme.background : theme.text }}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={modalStyles.field}>
          <TextField
            label="内容"
            placeholder={isMemo ? '例如：周五前交房租' : '例如：写周报'}
            value={title}
            onChangeText={setTitle}
            autoFocus
            multiline={isMemo}
            maxLength={isMemo ? 200 : 120}
            style={isMemo ? styles.multiline : undefined}
          />
        </View>

        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            日期
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`选择日期 ${formDate}`}
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.dateRow,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small">{formatDay(formDate)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              修改 ›
            </ThemedText>
          </Pressable>
        </View>

        <View style={modalStyles.field}>
          <TextField
            label="时间（选填）"
            placeholder="09:00"
            value={time}
            onChangeText={setTime}
            autoCapitalize="none"
            maxLength={5}
          />
        </View>

        {!isMemo ? (
          <View style={modalStyles.field}>
            <TextField
              label="备注（选填）"
              placeholder="补充说明"
              value={note}
              onChangeText={setNote}
              maxLength={200}
            />
          </View>
        ) : null}

        {isMemo ? (
          <View style={modalStyles.field}>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="置顶备忘"
              accessibilityState={{ checked: pinned }}
              onPress={() => setPinned((value) => !value)}
              style={({ pressed }) => [
                styles.switchRow,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">置顶备忘</ThemedText>
              <View
                style={[
                  styles.checkbox,
                  pinned
                    ? { backgroundColor: theme.text, borderColor: theme.text }
                    : { borderColor: theme.textSecondary },
                ]}>
                {pinned ? (
                  <ThemedText type="small" style={{ color: theme.background }}>
                    ✓
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={modalStyles.field}>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="今日未完成自动延期到下一天"
              accessibilityState={{ checked: autoPostpone }}
              onPress={() => setAutoPostpone((value) => !value)}
              style={({ pressed }) => [
                styles.switchRow,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" style={styles.switchLabel}>
                今日未完成自动延期到下一天
              </ThemedText>
              <View
                style={[
                  styles.checkbox,
                  autoPostpone
                    ? { backgroundColor: theme.text, borderColor: theme.text }
                    : { borderColor: theme.textSecondary },
                ]}>
                {autoPostpone ? (
                  <ThemedText type="small" style={{ color: theme.background }}>
                    ✓
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          </View>
        )}

        {!task ? (
          <View style={modalStyles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              添加到
            </ThemedText>
            <View style={styles.chipRow}>
              {RANGE_OPTIONS.map((option) => {
                const active = days === option.days;
                return (
                  <Pressable
                    key={option.days}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: active }}
                    onPress={() => setDays(option.days)}
                    style={({ pressed }) => [
                      styles.rangeChip,
                      {
                        backgroundColor: active ? theme.text : theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: active ? theme.background : theme.text }}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </ModalSheet>

      <MonthPicker
        visible={pickerOpen}
        value={formDate}
        onClose={() => setPickerOpen(false)}
        onSelect={(selected) => {
          setFormDate(selected);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    minHeight: 42,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  kindChip: {
    minWidth: 76,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  rangeChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    minHeight: 44,
  },
  switchLabel: {
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#D64545',
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});