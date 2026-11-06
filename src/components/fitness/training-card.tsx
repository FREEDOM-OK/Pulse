import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SwipeRow } from '@/components/ui/swipe-row';
import { Spacing } from '@/constants/theme';
import type { TrainingItemRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

interface TrainingCardProps {
  item: TrainingItemRow;
  doneSets: number;
  onComplete: (values: { reps: number; weight: number }) => void;
  onDelete: () => void;
  onUpdate: (patch: { reps?: number; weight?: number }) => void;
}

/** 待训练卡片：次数 × 重量可改，点「完成」记一组。 */
export function TrainingCard({ item, doneSets, onComplete, onDelete, onUpdate }: TrainingCardProps) {
  const theme = useTheme();
  const [repsText, setRepsText] = useState(String(item.reps));
  const [weightText, setWeightText] = useState(String(item.weight));

  useEffect(() => {
    setRepsText(String(item.reps));
    setWeightText(String(item.weight));
  }, [item.reps, item.weight]);

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

  const currentReps = () => {
    const value = Number(repsText);
    return Number.isFinite(value) && value >= 1 ? Math.round(value) : item.reps;
  };

  const currentWeight = () => {
    const value = Number(weightText);
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : item.weight;
  };

  return (
    <SwipeRow
      actions={[{ label: '删除', color: '#D64545', onPress: onDelete }]}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.nameArea}>
            <ThemedText type="smallBold" style={styles.name}>
              {item.exercise_name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.progress}>
              已练 {doneSets} 组
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`完成一组 ${item.exercise_name}`}
            onPress={() =>
              onComplete({
                reps: currentReps(),
                weight: currentWeight(),
              })
            }
            style={({ pressed }) => [
              styles.completeButton,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              完成
            </ThemedText>
          </Pressable>
        </View>

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
            <ThemedText type="small" themeColor="textSecondary" style={styles.selfWeight}>
              自重
            </ThemedText>
          ) : null}
        </View>
      </ThemedView>
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
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
  selfWeight: {
    marginLeft: 'auto',
  },
  pressed: {
    opacity: 0.75,
  },
});
