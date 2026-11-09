import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TrainingItemRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

interface CompleteValues {
  reps?: number;
  weight?: number;
  durationMinutes?: number;
}

interface TrainingCardProps {
  item: TrainingItemRow;
  doneSets: number;
  /** 这个动作练的部位（胸/背/腿…），显示在卡片右下角。 */
  category?: string;
  onComplete: (values: CompleteValues) => void;
  /** 长按卡片时打开「删除」菜单。 */
  onMenu: () => void;
  onUpdate: (patch: { reps?: number; weight?: number; durationMinutes?: number }) => void;
  /** 刚完成一组时短暂显示对勾（2.5 秒后自动消失）。 */
  flash?: boolean;
}

/** 待训练卡片：按组动作填写次数与重量，按时间动作填写运动分钟数。 */
export function TrainingCard({
  item,
  doneSets,
  category,
  onComplete,
  onMenu,
  onUpdate,
  flash = false,
}: TrainingCardProps) {
  const theme = useTheme();
  const isDuration = item.tracking_type === 'duration';
  const partLabel = category
    ? category === '自定义类'
      ? '自定义'
      : `练${category}`
    : '';
  const [repsText, setRepsText] = useState(String(item.reps));
  const [weightText, setWeightText] = useState(String(item.weight));
  const [durationText, setDurationText] = useState(String(item.duration_minutes));

  useEffect(() => {
    setRepsText(String(item.reps));
    setWeightText(String(item.weight));
    setDurationText(String(item.duration_minutes));
  }, [item.reps, item.weight, item.duration_minutes]);

  const commitReps = () => {
    const value = Number(repsText);
    if (!Number.isFinite(value) || value < 1) {
      setRepsText(String(item.reps));
      return;
    }
    const rounded = Math.round(value);
    setRepsText(String(rounded));
    if (rounded !== item.reps) onUpdate({ reps: rounded });
  };

  const commitWeight = () => {
    const value = Number(weightText);
    if (!Number.isFinite(value) || value < 0) {
      setWeightText(String(item.weight));
      return;
    }
    const rounded = Math.round(value);
    setWeightText(String(rounded));
    if (rounded !== item.weight) onUpdate({ weight: rounded });
  };

  const commitDuration = () => {
    const value = Number(durationText);
    if (!Number.isFinite(value) || value < 1) {
      setDurationText(String(item.duration_minutes));
      return;
    }
    const rounded = Math.round(value);
    setDurationText(String(rounded));
    if (rounded !== item.duration_minutes) onUpdate({ durationMinutes: rounded });
  };

  const currentReps = () => {
    const value = Number(repsText);
    return Number.isFinite(value) && value >= 1 ? Math.round(value) : item.reps;
  };

  const currentWeight = () => {
    const value = Number(weightText);
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : item.weight;
  };

  const currentDuration = () => {
    const value = Number(durationText);
    return Number.isFinite(value) && value >= 1 ? Math.round(value) : item.duration_minutes;
  };

  return (
    <Pressable
      accessibilityLabel={`训练项目 ${item.exercise_name}`}
      accessibilityHint="长按可删除"
      delayLongPress={400}
      onLongPress={onMenu}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressedCard]}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.nameArea}>
            <ThemedText type="smallBold" style={styles.name}>
              {item.exercise_name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.progress}>
              已练 {doneSets} {isDuration ? '次' : '组'}
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`完成${isDuration ? '一次' : '一组'} ${item.exercise_name}`}
            onPress={() =>
              onComplete(
                isDuration
                  ? { durationMinutes: currentDuration() }
                  : { reps: currentReps(), weight: currentWeight() }
              )
            }
            style={({ pressed }) => [
              styles.completeButton,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              {flash ? '✓' : '完成'}
            </ThemedText>
          </Pressable>
        </View>

        {isDuration ? (
          <View style={styles.paramRow}>
            <TextInput
              value={durationText}
              onChangeText={setDurationText}
              onBlur={commitDuration}
              onSubmitEditing={commitDuration}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel={`${item.exercise_name} 运动时间`}
              style={[styles.numberInput, { backgroundColor: theme.background, color: theme.text }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              分钟
            </ThemedText>
            {partLabel ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.partLabel}>
                {partLabel}
              </ThemedText>
            ) : null}
          </View>
        ) : (
          <View style={styles.paramRow}>
            <TextInput
              value={repsText}
              onChangeText={setRepsText}
              onBlur={commitReps}
              onSubmitEditing={commitReps}
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel={`${item.exercise_name} 每组次数`}
              style={[styles.numberInput, { backgroundColor: theme.background, color: theme.text }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              次 ×
            </ThemedText>
            <TextInput
              value={weightText}
              onChangeText={setWeightText}
              onBlur={commitWeight}
              onSubmitEditing={commitWeight}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel={`${item.exercise_name} 重量`}
              style={[styles.numberInput, { backgroundColor: theme.background, color: theme.text }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              kg
            </ThemedText>
            {item.weight === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                自重
              </ThemedText>
            ) : null}
            {partLabel ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.partLabel}>
                {partLabel}
              </ThemedText>
            ) : null}
          </View>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Spacing.three,
  },
  pressedCard: {
    opacity: 0.92,
  },
  card: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  nameArea: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
  },
  progress: {
    fontSize: 12,
  },
  completeButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    minHeight: 34,
    justifyContent: 'center',
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  numberInput: {
    width: 56,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 14,
    textAlign: 'center',
    minHeight: 34,
  },
  partLabel: {
    marginLeft: 'auto',
  },
  pressed: {
    opacity: 0.75,
  },
});
