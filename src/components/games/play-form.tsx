import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { MonthPicker } from '@/components/ui/month-picker';
import { NumberWheel } from '@/components/ui/number-wheel';
import { StarRating } from '@/components/games/star-rating';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { PlayedGameRow } from '@/db/types';
import { updatePlayed } from '@/db/repositories/games';
import { durationPartsFromMinutes, durationPartsToMinutes } from '@/lib/duration-wheel';
import { useTheme } from '@/hooks/use-theme';
import { formatPlayedDate, resolvePlayedDate } from '@/lib/played-date';
import { validateDurationMinutes, validateRating } from '@/lib/validation';

export interface PlayedDraft {
  playedDate: string;
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

/** 「玩了」弹窗：游玩日期、滚动时长、体验与星级；也可用于编辑已玩记录。 */
export function PlayForm({ visible, gameName, played, onClose, onConfirm }: PlayFormProps) {
  const theme = useTheme();
  const [playedDate, setPlayedDate] = useState(() => resolvePlayedDate(null));
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [experience, setExperience] = useState('');
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const parts = durationPartsFromMinutes(played?.duration_minutes ?? 0);
    setPlayedDate(resolvePlayedDate(played?.played_date));
    setHours(parts.hours);
    setMinutes(parts.minutes);
    setExperience(played?.experience ?? '');
    setRating(played?.rating ?? 0);
    setError(null);
    setDatePickerOpen(false);
  }, [visible, played]);

  const handleClose = () => {
    setDatePickerOpen(false);
    onClose();
  };

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
    onConfirm({ playedDate, durationMinutes, experience, rating });
  };

  return (
    <>
      <ModalSheet
        visible={visible}
        title={played ? '编辑已玩记录' : `玩了：${gameName || '游戏'}`}
        onClose={handleClose}
        footer={
          <View style={modalStyles.actionsRow}>
            <AppButton label="取消" variant="secondary" onPress={handleClose} />
            <AppButton label="保存" onPress={handleConfirm} />
          </View>
        }>
        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            游玩日期
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`游玩日期 ${playedDate}`}
            onPress={() => setDatePickerOpen(true)}
            style={[styles.dateButton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{formatPlayedDate(playedDate)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              更改
            </ThemedText>
          </Pressable>
        </View>

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

      <MonthPicker
        visible={visible && datePickerOpen}
        value={playedDate}
        onSelect={(date) => {
          setPlayedDate(date);
          setDatePickerOpen(false);
        }}
        onClose={() => setDatePickerOpen(false)}
      />
    </>
  );
}

/** 编辑已玩记录时复用的保存函数。 */
export async function savePlayedEdit(id: number, draft: PlayedDraft): Promise<void> {
  await updatePlayed(id, {
    playedDate: draft.playedDate,
    durationMinutes: draft.durationMinutes,
    experience: draft.experience,
    rating: draft.rating,
  });
}

const styles = StyleSheet.create({
  dateButton: {
    minHeight: 42,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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