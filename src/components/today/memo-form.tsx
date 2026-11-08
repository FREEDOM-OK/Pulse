import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { createMemo, updateMemo } from '@/db/repositories/memos';
import type { MemoRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { bumpDataVersion } from '@/lib/data-version';
import { parseTimeInput } from '@/lib/validation';

interface MemoFormProps {
  visible: boolean;
  date: string;
  memo: MemoRow | null;
  onClose: () => void;
  onSaved: () => void;
}

/** 新建/编辑备忘。备忘没有勾选状态，只有内容、时间和置顶。 */
export function MemoForm({ visible, date, memo, onClose, onSaved }: MemoFormProps) {
  const theme = useTheme();
  const [content, setContent] = useState('');
  const [time, setTime] = useState('');
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setContent(memo?.content ?? '');
    setTime(memo?.time ?? '');
    setPinned(memo?.pinned === 1);
    setError(null);
    setSaving(false);
  }, [visible, memo, date]);

  const handleSave = async () => {
    if (content.trim().length === 0) {
      setError('请填写备忘内容');
      return;
    }
    const parsedTime = parseTimeInput(time);
    if (parsedTime.error) {
      setError(parsedTime.error);
      return;
    }

    setSaving(true);
    try {
      if (memo) {
        await updateMemo(memo.id, {
          content: content.trim(),
          time: parsedTime.value,
          pinned,
        });
      } else {
        await createMemo({
          date,
          content: content.trim(),
          time: parsedTime.value,
          pinned,
        });
      }
      bumpDataVersion();
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
      title={memo ? '编辑备忘' : '新建备忘'}
      onClose={onClose}
      footer={
        <View style={modalStyles.actionsRow}>
          <AppButton label="取消" variant="secondary" onPress={onClose} />
          <AppButton label={saving ? '保存中…' : '保存'} onPress={handleSave} disabled={saving} />
        </View>
      }>
      <View style={modalStyles.field}>
        <TextField
          label="备忘内容"
          placeholder="例如：周五前交房租"
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={200}
          autoFocus
          style={styles.multiline}
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
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="置顶备忘"
          accessibilityState={{ checked: pinned }}
          onPress={() => setPinned((value) => !value)}
          style={({ pressed }) => [
            styles.pinRow,
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

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    minHeight: 44,
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