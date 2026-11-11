import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface EmptyStateProps {
  text: string;
  hint?: string;
  /** 固定浅色页面（如首页）传入，避免深色模式下浅字落在白底上。 */
  textColor?: string;
  hintColor?: string;
}

export function EmptyState({ text, hint, textColor, hintColor }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={[styles.text, textColor ? { color: textColor } : undefined]}>
        {text}
      </ThemedText>
      {hint ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={[styles.hint, hintColor ? { color: hintColor } : undefined]}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.one,
  },
  text: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
