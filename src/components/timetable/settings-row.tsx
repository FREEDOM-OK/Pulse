import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { TabIcon } from '@/constants/tabs';

interface SettingsRowProps {
  icon?: TabIcon;
  label: string;
  value?: string | null;
  placeholder?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** 右侧自定义内容（开关等），优先于 value。 */
  right?: ReactNode;
  /** 是否画底部分隔线。 */
  divider?: boolean;
}

/** 课表二级页统一的行：左图标 + 标签 + 右侧值（可选灰字）+ ›。 */
export function SettingsRow({
  icon,
  label,
  value,
  placeholder = '选填',
  onPress,
  disabled = false,
  right,
  divider = true,
}: SettingsRowProps) {
  const theme = useTheme();
  const hasValue = Boolean(value);

  const content = (
    <View
      style={[
        styles.row,
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.backgroundElement },
      ]}>
      {icon ? (
        <SymbolView name={icon} size={20} tintColor={theme.textSecondary} style={styles.icon} />
      ) : null}
      <ThemedText style={[styles.label, { color: theme.text }]}>{label}</ThemedText>
      <View style={styles.right}>
        {right ?? (
          <>
            <ThemedText
              type="small"
              style={{ color: hasValue ? theme.text : theme.textSecondary }}>
              {hasValue ? value : placeholder}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ›
            </ThemedText>
          </>
        )}
      </View>
    </View>
  );

  if (!onPress || disabled) {
    return <View style={disabled ? styles.disabled : undefined}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${hasValue ? value : placeholder}`}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 22,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
});