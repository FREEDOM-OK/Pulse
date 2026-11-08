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
import { QUICK_MEMO_MAX_LENGTH, saveQuickMemo } from '@/db/repositories/memo';
import { useTheme } from '@/hooks/use-theme';

interface MemoEditorProps {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSaved: () => void;
}

/** 首页备忘录用的小卡片：一段文字，留空保存等于清空。 */
export function MemoEditor({ visible, value, onClose, onSaved }: MemoEditorProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setText(value);
    setBusy(false);
  }, [visible, value]);

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveQuickMemo(text);
      onSaved();
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
            备忘录
          </ThemedText>
          <TextInput
            value={text}
            onChangeText={setText}
            accessibilityLabel="备忘录内容"
            placeholder="记一笔想做的事，留空保存即清空"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={QUICK_MEMO_MAX_LENGTH}
            textAlignVertical="top"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
            {text.length}/{QUICK_MEMO_MAX_LENGTH}
          </ThemedText>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="取消备忘"
              onPress={onClose}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                取消
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="保存备忘"
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
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 15,
    minHeight: 108,
  },
  counter: {
    textAlign: 'right',
    paddingHorizontal: Spacing.one,
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