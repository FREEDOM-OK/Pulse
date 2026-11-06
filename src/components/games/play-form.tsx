import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { NumberWheel } from '@/components/ui/number-wheel';
import { StarRating } from '@/components/games/star-rating';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { PlayedGameRow } from '@/db/types';
import { updatePlayed } from '@/db/repositories/games';
import { durationPartsFromMinutes, durationPartsToMinutes } from '@/lib/duration-wheel';
import { validateDurationMinutes, validateRating } from '@/lib/validation';

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

/** 「玩了」弹窗：滚动选择时长 + 体验 + 1~5 星；也可用于编辑已玩记录。 */
export function PlayForm({ visible, gameName, played, onClose, onConfirm }: PlayFormProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [experience, setExperience] = useState('');
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const parts = durationPartsFromMinutes(played?.duration_minutes ?? 0);
    setHours(parts.hours);
    setMinutes(parts.minutes);
    setExperience(played?.experience ?? '');
    setRating(played?.rating ?? 0);
    setError(null);
  }, [visible, played]);

  const handleConfirm = () => {
    const durationMinutes = durationPartsToMinutes(hours, minutes);
    const durationError = validateDurationMinutes(durationMinutes);
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
    onConfirm({ durationMinutes, experience, rating });
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
          游玩时长（上下滑动选择）
        </ThemedText>
        <View style={styles.durationWheels}>
          <NumberWheel
            label="游玩小时"
            unit="小时"
            value={hours}
            min={0}
            max={24}
            onChange={setHours}
          />
          <NumberWheel
            label="游玩分钟"
            unit="分钟"
            value={minutes}
            min={0}
            max={59}
            onChange={setMinutes}
          />
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
  durationWheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingVertical: Spacing.two,
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
