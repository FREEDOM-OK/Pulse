import { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { Motion } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export interface StaggeredAppearProps {
  children: React.ReactNode;
  /** 列表序号，用来错开入场时间（每项 +40ms，最多错开 240ms）。 */
  index?: number;
  style?: StyleProp<ViewStyle>;
  /** 位移起点，默认向上 8pt。 */
  offset?: number;
}

/**
 * 列表项入场：淡入 + 轻微上移，逐条错开。
 * 只在挂载时播放一次；开启减弱动效时直接显示。
 */
export function StaggeredAppear({ children, index = 0, style, offset = 8 }: StaggeredAppearProps) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const delay = Math.min(index, 6) * 40;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Motion.enter,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, progress, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}