import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { Memo } from '@/db/repositories/memos';
import { MAX_MEMO_TAGS, createMemo, updateMemo } from '@/db/repositories/memos';
import { validateMemoContent } from '@/lib/validation';

interface MemoFormProps {
  visible: boolean;
  memo: Memo | null;
  onClose: () => void;
  onSaved: () => void;
}

export function MemoForm({ visible, memo, onClose, onSaved }: MemoFormProps) {
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setContent(memo?.content ?? '');
    setTagsText(memo?.tags.join('，') ?? '');
    setError(null);
  }, [visible, memo]);

  const parseTags = () =>
    tagsText
      .split(/[,，\s]+/)
      .map((tag) => tag.replace(/^#/, '').trim())
      .filter(Boolean)
      .slice(0, MAX_MEMO_TAGS);

  const handleSave = async () => {
    const contentError = validateMemoContent(content);
    setError(contentError);
    if (contentError) return;

    setSaving(true);
    try {
      if (memo) {
        await updateMemo(memo.id, { content: content.trim(), tags: parseTags() });
      } else {
        await createMemo({ content: content.trim(), tags: parseTags() });
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
      title={memo ? '编辑备忘' : '添加备忘'}
      onClose={onClose}
      footer={
        <View style={modalStyles.actionsRow}>
          <AppButton label="取消" variant="secondary" onPress={onClose} />
          <AppButton label={saving ? '保存中…' : '保存'} onPress={handleSave} disabled={saving} />
        </View>
      }>
      <View style={modalStyles.field}>
        <TextField
          label="内容"
          placeholder="例如：交房租"
          value={content}
          onChangeText={setContent}
          autoFocus
          multiline
          maxLength={200}
          style={styles.textarea}
        />
      </View>
      <View style={modalStyles.field}>
        <TextField
          label={`标签（选填，最多 ${MAX_MEMO_TAGS} 个，用逗号分隔）`}
          placeholder="例如：财务，生活"
          value={tagsText}
          onChangeText={setTagsText}
          maxLength={40}
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
  textarea: {
    minHeight: 76,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
  error: {
    color: '#D64545',
    fontSize: 12,
  },
});
