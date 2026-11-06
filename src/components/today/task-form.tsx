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
import { createTask, createTaskSeries, moveTaskToDate, updateTask } from '@/db/repositories/tasks';
import { formatDay } from '@/lib/date';
import { parseTimeInput, validateTaskTitle } from '@/lib/validation';

interface TaskFormProps {
  visible: boolean;
  date: string;
  task: TaskRow | null;
  onClose: () => void;
  onSaved: () => void;
}

const RANGE_OPTIONS = [
  { days: 1, label: '仅今天' },
  { days: 3, label: '今天起 3 天' },
  { days: 7, label: '今天起 7 天' },
];

export function TaskForm({ visible, date, task, onClose, onSaved }: TaskFormProps) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [time, setTime] = useState('');
  const [formDate, setFormDate] = useState(date);
  const [days, setDays] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? '');
    setNote(task?.note ?? '');
    setTime(task?.time ?? '');
    setFormDate(task?.date ?? date);
    setDays(1);
    setError(null);
  }, [visible, task, date]);

  const handleSave = async () => {
    const titleError = validateTaskTitle(title);
    const parsedTime = parseTimeInput(time);
    const nextError = titleError ?? parsedTime.error;
    setError(nextError);
    if (nextError) return;

    setSaving(true);
    try {
      if (task) {
        await updateTask(task.id, {
          title: title.trim(),
          note: note.trim() ? note.trim() : null,
          time: parsedTime.value,
        });
        if (formDate !== task.date) {
          await moveTaskToDate(task.id, formDate);
        }
      } else if (days === 1) {
        await createTask({
          date: formDate,
          title: title.trim(),
          note: note.trim() ? note.trim() : null,
          time: parsedTime.value,
        });
      } else {
        await createTaskSeries(
          {
            date: formDate,
            title: title.trim(),
            note: note.trim() ? note.trim() : null,
            time: parsedTime.value,
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
        title={task ? '编辑任务' : '添加任务'}
        onClose={onClose}
        footer={
          <View style={modalStyles.actionsRow}>
            <AppButton label="取消" variant="secondary" onPress={onClose} />
            <AppButton label={saving ? '保存中…' : '保存'} onPress={handleSave} disabled={saving} />
          </View>
        }>
        <View style={modalStyles.field}>
          <TextField
            label="任务内容"
            placeholder="例如：写周报"
            value={title}
            onChangeText={setTitle}
            autoFocus
            maxLength={120}
          />
        </View>

        <View style={modalStyles.field}>
          <TextField
            label="备注（选填）"
            placeholder="补充说明"
            value={note}
            onChangeText={setNote}
            maxLength={200}
          />
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

        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            日期
          </ThemedText>
          <Pressable
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

        {!task ? (
          <View style={modalStyles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              添加到
            </ThemedText>
            <View style={styles.rangeRow}>
              {RANGE_OPTIONS.map((option) => {
                const active = days === option.days;
                return (
                  <Pressable
                    key={option.days}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    minHeight: 42,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  rangeChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  error: {
    color: '#D64545',
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
