import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { DietRecordRow, MealType } from '@/db/types';
import { MEAL_TYPES } from '@/db/types';
import { addDietRecord, updateDietRecord } from '@/db/repositories/diet';
import { parseCaloriesInput } from '@/lib/validation';
import { useTheme } from '@/hooks/use-theme';

interface DietFormProps {
  visible: boolean;
  date: string;
  record: DietRecordRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function DietForm({ visible, date, record, onClose, onSaved }: DietFormProps) {
  const theme = useTheme();
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [content, setContent] = useState('');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMealType(record?.meal_type ?? 'breakfast');
    setContent(record?.content ?? '');
    setCalories(record?.calories != null ? String(record.calories) : '');
    setError(null);
  }, [visible, record]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError('吃了什么不能为空');
      return;
    }
    const parsed = parseCaloriesInput(calories);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (record) {
        await updateDietRecord(record.id, {
          mealType,
          content: trimmed,
          calories: parsed.value,
        });
      } else {
        await addDietRecord({
          date,
          mealType,
          content: trimmed,
          calories: parsed.value,
        });
      }
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      title={record ? '编辑饮食记录' : '今日饮食添加'}
      onClose={onClose}
      footer={
        <View style={modalStyles.actionsRow}>
          <AppButton label="取消" variant="secondary" onPress={onClose} />
          <AppButton label={saving ? '保存中…' : '保存'} onPress={handleSave} disabled={saving} />
        </View>
      }>
      <View style={modalStyles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          餐次
        </ThemedText>
        <View style={styles.mealRow}>
          {MEAL_TYPES.map((meal) => {
            const active = mealType === meal.value;
            return (
              <Pressable
                key={meal.value}
                onPress={() => setMealType(meal.value)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: active ? theme.text : theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: active ? theme.background : theme.text }}>
                  {meal.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={modalStyles.field}>
        <TextField
          label="吃了什么"
          placeholder="例如：鸡胸肉饭"
          value={content}
          onChangeText={setContent}
          autoFocus
          maxLength={80}
        />
      </View>

      <View style={modalStyles.field}>
        <TextField
          label="热量（选填，单位 kcal）"
          placeholder="例如：520"
          value={calories}
          onChangeText={setCalories}
          keyboardType="number-pad"
          maxLength={5}
        />
      </View>

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  mealRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  chip: {
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
