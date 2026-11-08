import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ModuleColors, Spacing } from '@/constants/theme';
import { createEvent } from '@/db/repositories/events';
import { EVENT_TITLE_LABELS, EVENT_TYPE_LABELS, type EventType } from '@/db/types';
import { parseAmount } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

interface EventFormProps {
  visible: boolean;
  type: EventType | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 添加事件的表单：屏幕正中的卡片。
 * 只有名称是必填；金额可留空、可以带小数；日期固定是今天。
 */
export function EventForm({ visible, type, onClose, onSaved }: EventFormProps) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setAmountText('');
    setNote('');
    setError(null);
    setBusy(false);
  }, [visible, type]);

  if (!type) return null;

  const titleLabel = EVENT_TITLE_LABELS[type];

  const handleSave = async () => {
    setError(null);
    if (title.trim().length === 0) {
      setError(`请填写${titleLabel}`);
      return;
    }
    const amount = parseAmount(amountText);
    if (amount === null && amountText.trim().length > 0) {
      setError('金额只能填数字，可以用小数点');
      return;
    }
    setBusy(true);
    try {
      await createEvent({ type, title, note, amount });
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}>
        <View
          style={styles.backdrop}
          accessible={false}
          onStartShouldSetResponder={() => true}
          onResponderRelease={onClose}
        />
        <ThemedView style={styles.sheet}>
          <ThemedText type="smallBold" style={styles.title}>
            {EVENT_TYPE_LABELS[type]}
          </ThemedText>

          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              {titleLabel}
            </ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              accessibilityLabel={titleLabel}
              placeholder={`填写${titleLabel}`}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              金额（可不填）
            </ThemedText>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              accessibilityLabel="金额"
              placeholder="例如 12.5"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              备注（可不填）
            </ThemedText>
            <TextInput
              value={note}
              onChangeText={setNote}
              accessibilityLabel="备注"
              placeholder="补充说明"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="取消"
              onPress={onClose}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                取消
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="保存事件"
              disabled={busy}
              onPress={() => {
                handleSave().catch(() => undefined);
              }}
              style={({ pressed }) => [
                styles.save,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}>
              <ThemedText type="small" style={styles.saveText}>
                {busy ? '保存中…' : '保存'}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 16,
    paddingHorizontal: Spacing.one,
  },
  error: {
    color: '#D64545',
    paddingHorizontal: Spacing.one,
  },
  field: {
    gap: Spacing.one,
  },
  label: {
    paddingHorizontal: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 15,
    minHeight: 42,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  cancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  save: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: ModuleColors.events,
  },
  saveText: {
    color: '#ffffff',
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});