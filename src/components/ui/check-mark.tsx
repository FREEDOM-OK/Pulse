import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Motion } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export interface CheckMarkProps {
  checked: boolean;
  /** 勾选框边长，默认 22。 */
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

/**
 * 方形勾选框（PRDv1.2.2 第 4 节）：22pt、圆角 7。
 * 勾选时描边补全约 200ms，配合今日列表「对勾画完再移入已完成」。
 */
export function CheckMark({
  checked,
  size = 22,
  onPress,
  accessibilityLabel,
  disabled,
}: CheckMarkProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(checked ? 1 : 0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: checked ? 1 : 0,
      duration: Motion.check,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [checked, progress, reduced]);

  const box = (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: 7,
          borderColor: checked ? theme.text : theme.textSecondary,
          backgroundColor: checked ? theme.text : 'transparent',
        },
      ]}>
      <Animated.View
        style={[
          styles.check,
          {
            width: size * 0.28,
            height: size * 0.52,
            borderRightWidth: 2,
            borderBottomWidth: 2,
            borderColor: theme.background,
            opacity: progress,
            transform: [
              { rotate: '45deg' },
              { scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
            ],
          },
        ]}
      />
    </View>
  );

  if (!onPress) return box;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={disabled ? styles.disabled : undefined}>
      {box}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  check: {
    marginTop: -3,
  },
  disabled: {
    opacity: 0.45,
  },
});