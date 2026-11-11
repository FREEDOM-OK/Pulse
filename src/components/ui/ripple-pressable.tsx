import { useCallback, useEffect, useRef, useState } from 'react';
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

/** 按下时缩到 96%，松手用弹簧回 1（PRD_module 第 10 节 E1）。 */
const PRESS_SCALE = 0.96;

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
 * 不依赖系统原生 ripple，三端表现一致；开启减弱动效时直接不画波纹、也不做回弹。
 */
export function RipplePressable({
  children,
  style,
  contentStyle,
  rippleColor = 'rgba(0,0,0,0.10)',
  rippleRadius = 48,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: RipplePressableProps) {
  const reduced = useReducedMotion();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      if (!reduced) {
        const { locationX, locationY } = event.nativeEvent;
        rippleSeed += 1;
        setRipples((current) => [...current, { key: rippleSeed, x: locationX, y: locationY }]);
        Animated.timing(scale, {
          toValue: PRESS_SCALE,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }
      onPressIn?.(event);
    },
    [onPressIn, reduced, scale],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      if (!reduced) {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 6,
          speed: 20,
        }).start();
      }
      onPressOut?.(event);
    },
    [onPressOut, reduced, scale],
  );

  const dropRipple = useCallback((key: number) => {
    setRipples((current) => current.filter((item) => item.key !== key));
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        disabled ? styles.disabled : null,
        { transform: [{ scale }] },
      ]}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [styles.hit, pressed ? styles.pressed : null]}>
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
    </Animated.View>
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
  // 内容层铺满外层：卡片有固定宽高，按钮按内容撑开，两种都用 grow/shrink + basis auto 兼顾。
  hit: {
    position: 'relative',
    overflow: 'hidden',
    flexGrow: 1,
    flexShrink: 1,
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