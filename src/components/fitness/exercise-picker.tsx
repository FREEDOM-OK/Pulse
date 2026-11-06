import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/db/repositories/exercises';
import {
  createCustomExercise,
  deleteExercise,
  listExercisesByCategory,
} from '@/db/repositories/exercises';
import {
  ALL_EXERCISE_CATEGORIES,
  CUSTOM_EXERCISE_CATEGORY,
  TRACKING_TYPE_LABELS,
  type TrackingType,
} from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (exercises: Exercise[]) => void;
}

const TRACKING_TYPES: TrackingType[] = ['sets', 'duration'];

/** 动作库选择器：按部位分类、支持多选、可新增/删除自定义动作。 */
export function ExercisePicker({ visible, onClose, onConfirm }: ExercisePickerProps) {
  const theme = useTheme();
  const [grouped, setGrouped] = useState<Record<string, Exercise[]>>({});
  const [category, setCategory] = useState<string>(ALL_EXERCISE_CATEGORIES[0]);
  const [selected, setSelected] = useState<Record<number, Exercise>>({});
  const [manageMode, setManageMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTrackingType, setNewTrackingType] = useState<TrackingType>('sets');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Exercise | null>(null);

  const loadLibrary = useCallback(async () => {
    const data = await listExercisesByCategory();
    setGrouped(data);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setSelected({});
    setManageMode(false);
    setAddOpen(false);
    setError(null);
    loadLibrary().catch(() => undefined);
  }, [visible, loadLibrary]);

  const currentList = grouped[category] ?? [];
  const selectedCount = useMemo(() => Object.keys(selected).length, [selected]);

  const toggleSelect = (exercise: Exercise) => {
    setSelected((previous) => {
      const next = { ...previous };
      if (next[exercise.id]) delete next[exercise.id];
      else next[exercise.id] = exercise;
      return next;
    });
  };

  const openCreateDialog = () => {
    setNewName('');
    setNewTrackingType('sets');
    setError(null);
    setAddOpen(true);
  };

  const closeCreateDialog = () => {
    setAddOpen(false);
    setError(null);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setError('运动名称不能为空');
      return;
    }
    const duplicate = Object.values(grouped)
      .flat()
      .some((exercise) => exercise.name === name);
    if (duplicate) {
      setError('动作库已有同名动作');
      return;
    }

    await createCustomExercise(name, newTrackingType);
    setCategory(CUSTOM_EXERCISE_CATEGORY);
    closeCreateDialog();
    await loadLibrary();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteExercise(deleting.id);
    setDeleting(null);
    await loadLibrary();
  };

  return (
    <>
      <ModalSheet
        visible={visible}
        title={manageMode ? '管理动作库' : '选择动作'}
        onClose={onClose}
        footer={
          manageMode ? (
            <View style={styles.footerRow}>
              <AppButton label="完成" onPress={() => setManageMode(false)} />
            </View>
          ) : (
            <View style={styles.footerRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.footerHint}>
                已选 {selectedCount} 个
              </ThemedText>
              <AppButton label="取消" variant="secondary" onPress={onClose} />
              <AppButton
                label="添加到所选日期"
                disabled={selectedCount === 0}
                onPress={() => onConfirm(Object.values(selected))}
              />
            </View>
          )
        }>
        <View style={styles.toolbar}>
          <Pressable onPress={openCreateDialog}>
            <ThemedText type="linkPrimary">＋ 新增自定义动作</ThemedText>
          </Pressable>
          <Pressable onPress={() => setManageMode((value) => !value)}>
            <ThemedText type="linkPrimary">{manageMode ? '退出管理' : '管理动作'}</ThemedText>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <View style={styles.categoryRow}>
            {ALL_EXERCISE_CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: active ? theme.text : theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: active ? theme.background : theme.text }}>
                    {item}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.list}>
          {currentList.length === 0 ? (
            <EmptyState
              text={category === CUSTOM_EXERCISE_CATEGORY ? '还没有自定义动作' : '这个部位还没有动作'}
              hint="点上方「新增自定义动作」添加"
            />
          ) : (
            currentList.map((exercise) => {
              const checked = Boolean(selected[exercise.id]);
              return (
                <Pressable
                  key={exercise.id}
                  onPress={() => (manageMode ? undefined : toggleSelect(exercise))}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: checked ? theme.backgroundSelected : theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" style={styles.rowLabel}>
                    {exercise.name}
                  </ThemedText>
                  {!exercise.isPreset || exercise.trackingType === 'duration' ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {!exercise.isPreset ? '自定义 · ' : ''}
                      {TRACKING_TYPE_LABELS[exercise.trackingType]}
                    </ThemedText>
                  ) : null}
                  {manageMode ? (
                    exercise.isPreset ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        基础
                      </ThemedText>
                    ) : (
                      <Pressable onPress={() => setDeleting(exercise)} hitSlop={8}>
                        <ThemedText type="small" style={styles.deleteText}>
                          删除
                        </ThemedText>
                      </Pressable>
                    )
                  ) : (
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: checked ? theme.text : theme.textSecondary,
                          backgroundColor: checked ? theme.text : 'transparent',
                        },
                      ]}>
                      {checked ? (
                        <ThemedText type="small" style={{ color: theme.background, fontSize: 12 }}>
                          ✓
                        </ThemedText>
                      ) : null}
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </ModalSheet>

      <ModalSheet
        visible={addOpen}
        title="新增自定义动作"
        onClose={closeCreateDialog}
        footer={
          <View style={styles.footerRow}>
            <AppButton label="取消" variant="secondary" onPress={closeCreateDialog} />
            <AppButton label="确定" onPress={() => handleCreate().catch(() => undefined)} />
          </View>
        }>
        <View style={styles.createForm}>
          <TextField
            label="运动名称"
            placeholder="例如：壶铃摇摆"
            value={newName}
            onChangeText={(value) => {
              setNewName(value);
              setError(null);
            }}
            maxLength={30}
          />
          <ThemedText type="small" themeColor="textSecondary">
            计算方式
          </ThemedText>
          <View style={styles.categoryRow}>
            {TRACKING_TYPES.map((item) => {
              const active = newTrackingType === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setNewTrackingType(item)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: active ? theme.text : theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: active ? theme.background : theme.text }}>
                    {TRACKING_TYPE_LABELS[item]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}
        </View>
      </ModalSheet>

      <ConfirmDialog
        visible={deleting !== null}
        title="删除动作？"
        message={
          deleting
            ? `「${deleting.name}」会从自定义类移除，但已有的训练记录不会受影响。`
            : undefined
        }
        confirmLabel="确认删除"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => handleDelete().catch(() => undefined)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  createForm: {
    gap: Spacing.three,
  },
  categoryScroll: {
    marginBottom: Spacing.two,
    flexGrow: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#D64545',
  },
  error: {
    color: '#D64545',
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  footerHint: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
});
