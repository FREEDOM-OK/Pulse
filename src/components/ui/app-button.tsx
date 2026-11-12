import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { RipplePressable } from '@/components/ui/ripple-pressable';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? theme.text : variant === 'danger' ? '#D64545' : theme.backgroundElement;
  const color = variant === 'secondary' ? theme.text : theme.background;
  const rippleColor = variant === 'secondary' ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.24)';

  return (
    <RipplePressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      rippleColor={rippleColor}
      style={[
        styles.button,
        { backgroundColor: background },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
      ]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </RipplePressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 38,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    flex: 1,
  },
  disabled: {
    opacity: 0.4,
  },
});