import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface SubPageHeaderProps {
  title: string;
  onBack: () => void;
  /** 右侧文字按钮（保存 / 添加）。 */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

/** 课表二级页头：返回 + 28pt 标题 + 右侧文字按钮，没有下边线。 */
export function SubPageHeader({
  title,
  onBack,
  actionLabel,
  onAction,
  actionDisabled = false,
}: SubPageHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="返回"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          size={22}
          tintColor={theme.text}
        />
      </Pressable>

      <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </ThemedText>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: actionDisabled }}
          disabled={actionDisabled}
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: actionDisabled ? theme.backgroundElement : theme.text },
            pressed && styles.pressed,
          ]}>
          <ThemedText
            type="small"
            style={{
              color: actionDisabled ? theme.textSecondary : theme.background,
              fontWeight: '700',
            }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : (
        <View style={styles.actionSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  back: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  action: {
    minWidth: 52,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionSpacer: {
    width: 8,
  },
  pressed: {
    opacity: 0.6,
  },
});