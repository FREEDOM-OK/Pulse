import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { Motion } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface Ripple {
  key: number;
  x: number;
  y: number;
}

export interface RipplePressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  /** 外层容器样式，负责圆角与 overflow 裁切。 */
  style?: StyleProp<ViewStyle>;
  /** 内层内容样式。 */
  contentStyle?: StyleProp<ViewStyle>;
  rippleColor?: string;
  rippleRadius?: number;
}

let rippleSeed = 0;

/**
 * 自绘波纹按钮（PRDv1.2.2 第 5 节）：从触点扩散、200ms 结束。
 * 不依赖系统原生 ripple，三端表现一致；开启减弱动效时直接不画波纹。
 */
export function RipplePressable({
  children,
  style,
  contentStyle,
  rippleColor = 'rgba(0,0,0,0.10)',
  rippleRadius = 48,
  disabled,
  onPressIn,
  ...rest
}: RipplePressableProps) {
  const reduced = useReducedMotion();
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      if (!reduced) {
        const { locationX, locationY } = event.nativeEvent;
        rippleSeed += 1;
        setRipples((current) => [...current, { key: rippleSeed, x: locationX, y: locationY }]);
      }
      onPressIn?.(event);
    },
    [onPressIn, reduced],
  );

  const dropRipple = useCallback((key: number) => {
    setRipples((current) => current.filter((item) => item.key !== key));
  }, []);

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      style={({ pressed }) => [styles.container, style, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}>
      <View style={[styles.clip, contentStyle]}>{children}</View>
      {ripples.map((ripple) => (
        <RippleBubble
          key={ripple.key}
          x={ripple.x}
          y={ripple.y}
          radius={rippleRadius}
          color={rippleColor}
          onDone={() => dropRipple(ripple.key)}
        />
      ))}
    </Pressable>
  );
}

function RippleBubble({
  x,
  y,
  radius,
  color,
  onDone,
}: {
  x: number;
  y: number;
  radius: number;
  color: string;
  onDone: () => void;
}) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Motion.ripple,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => animation.stop();
    // onDone 每帧可能变化，但气泡只需动画一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 0.5, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          marginLeft: -radius,
          marginTop: -radius,
          backgroundColor: color,
          opacity,
          transform: [{ translateX: x }, { translateY: y }, { scale }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  clip: {
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.45,
  },
  bubble: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});