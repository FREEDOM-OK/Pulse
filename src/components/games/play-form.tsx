import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { StarRating } from '@/components/games/star-rating';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { PlayedGameRow } from '@/db/types';
import { updatePlayed } from '@/db/repositories/games';
import { parseDurationInput, validateDurationMinutes, validateRating } from '@/lib/validation';

export interface PlayedDraft {
  durationMinutes: number;
  experience: string;
  rating: number;
}

interface PlayFormProps {
  visible: boolean;
  gameName: string;
  played: PlayedGameRow | null;
  onClose: () => void;
  onConfirm: (draft: PlayedDraft) => void;
}

/** 「玩了」弹窗：游玩时长 + 体验 + 1~5 星；也可用于编辑已玩记录。 */
export function PlayForm({ visible, gameName, played, onClose, onConfirm }: PlayFormProps) {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [experience, setExperience] = useState('');
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const total = played?.duration_minutes ?? 0;
    setHours(total >= 60 ? String(Math.floor(total / 60)) : '');
    setMinutes(total % 60 > 0 ? String(total % 60) : '');
    setExperience(played?.experience ?? '');
    setRating(played?.rating ?? 0);
    setError(null);
  }, [visible, played]);

  const handleConfirm = () => {
    const parsed = parseDurationInput(hours, minutes);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    const durationError = validateDurationMinutes(parsed.value);
    if (durationError) {
      setError(durationError);
      return;
    }
    const ratingError = validateRating(rating);
    if (ratingError) {
      setError(ratingError);
      return;
    }
    setError(null);
    onConfirm({ durationMinutes: parsed.value, experience, rating });
  };

  return (
    <ModalSheet
      visible={visible}
      title={played ? '编辑已玩记录' : `玩了：${gameName || '游戏'}`}
      onClose={onClose}
      footer={
        <View style={modalStyles.actionsRow}>
          <AppButton label="取消" variant="secondary" onPress={onClose} />
          <AppButton label="保存" onPress={handleConfirm} />
        </View>
      }>
      <View style={modalStyles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          游玩时长
        </ThemedText>
        <View style={styles.durationRow}>
          <TextField
            placeholder="0"
            value={hours}
            onChangeText={setHours}
            keyboardType="number-pad"
            maxLength={2}
            style={styles.numberInput}
          />
          <ThemedText type="small" themeColor="textSecondary">
            小时
          </ThemedText>
          <TextField
            placeholder="0"
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            maxLength={2}
            style={styles.numberInput}
          />
          <ThemedText type="small" themeColor="textSecondary">
            分钟
          </ThemedText>
        </View>
      </View>

      <View style={modalStyles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          打分
        </ThemedText>
        <StarRating value={rating} onChange={setRating} size={28} />
      </View>

      <View style={modalStyles.field}>
        <TextField
          label="体验（选填）"
          placeholder="玩起来怎么样"
          value={experience}
          onChangeText={setExperience}
          multiline
          maxLength={300}
          style={styles.textarea}
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

/** 编辑已玩记录时复用的保存函数。 */
export async function savePlayedEdit(id: number, draft: PlayedDraft): Promise<void> {
  await updatePlayed(id, {
    durationMinutes: draft.durationMinutes,
    experience: draft.experience,
    rating: draft.rating,
  });
}

const styles = StyleSheet.create({
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  numberInput: {
    width: 72,
    textAlign: 'center',
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
  error: {
    color: '#D64545',
    fontSize: 12,
  },
});
