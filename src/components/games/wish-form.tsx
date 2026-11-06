import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import type { WishlistRow } from '@/db/types';
import { addWish, updateWish } from '@/db/repositories/games';
import { validateGameName } from '@/lib/validation';

interface WishFormProps {
  visible: boolean;
  wish: WishlistRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function WishForm({ visible, wish, onClose, onSaved }: WishFormProps) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(wish?.name ?? '');
    setNote(wish?.note ?? '');
    setError(null);
  }, [visible, wish]);

  const handleSave = async () => {
    const nameError = validateGameName(name);
    setError(nameError);
    if (nameError) return;

    setSaving(true);
    try {
      if (wish) {
        await updateWish(wish.id, { name: name.trim(), note: note.trim() || null });
      } else {
        await addWish(name.trim(), note.trim() || null);
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
      title={wish ? '编辑想玩的游戏' : '添加想玩的游戏'}
      onClose={onClose}
      footer={
        <View style={modalStyles.actionsRow}>
          <AppButton label="取消" variant="secondary" onPress={onClose} />
          <AppButton label={saving ? '保存中…' : '保存'} onPress={handleSave} disabled={saving} />
        </View>
      }>
      <View style={modalStyles.field}>
        <TextField
          label="游戏名"
          placeholder="例如：塞尔达：王国之泪"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={60}
        />
      </View>
      <View style={modalStyles.field}>
        <TextField
          label="备注（选填）"
          placeholder="为什么想玩"
          value={note}
          onChangeText={setNote}
          maxLength={120}
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
  error: {
    color: '#D64545',
    fontSize: 12,
  },
});
