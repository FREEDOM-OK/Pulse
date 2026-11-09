import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { WheelPicker } from '@/components/ui/wheel-picker';
import { useTheme } from '@/hooks/use-theme';

interface ValueDialogProps {
  visible: boolean;
  title: string;
  hint?: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  value: number;
  onCancel: () => void;
  onConfirm: (value: number) => void;
}

/** 居中修改框：标题 + 范围说明 + 单个数值滚轮 + 取消 / 确定。 */
export function ValueDialog({
  visible,
  title,
  hint,
  min,
  max,
  step = 1,
  unit = '',
  value,
  onCancel,
  onConfirm,
}: ValueDialogProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState<number>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const options = [];
  for (let current = min; current <= max; current += step) {
    options.push({ value: String(current), label: `${current}${unit}` });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <View style={[styles.card, { backgroundColor: theme.background }]}>
          <ThemedText type="subtitle">{title}</ThemedText>
          {hint ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              {hint}
            </ThemedText>
          ) : null}

          <WheelPicker
            columns={[{ key: 'value', options }]}
            value={{ value: String(draft) }}
            onChange={(next) => setDraft(Number(next.value))}
          />

          <View style={styles.actions}>
            <View style={styles.action}>
              <AppButton label="取消" variant="secondary" onPress={onCancel} />
            </View>
            <View style={styles.action}>
              <AppButton label="确定" onPress={() => onConfirm(draft)} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  hint: {
    marginTop: -4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  action: {
    flex: 1,
  },
});