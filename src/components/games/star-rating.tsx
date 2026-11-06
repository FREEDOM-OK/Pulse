import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, size = 22, readOnly = false }: StarRatingProps) {
  const theme = useTheme();

  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={`评分 ${value} 星`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <Pressable
            key={star}
            disabled={readOnly}
            accessibilityLabel={`${star} 星`}
            onPress={() => onChange?.(star)}
            hitSlop={4}>
            <ThemedText
              style={{
                fontSize: size,
                lineHeight: size + 4,
                color: filled ? '#F2B33D' : theme.textSecondary,
              }}>
              {filled ? '★' : '☆'}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
});
