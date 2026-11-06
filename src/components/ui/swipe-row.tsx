import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface SwipeAction {
  label: string;
  color: string;
  textColor?: string;
  onPress: () => void;
}

interface SwipeRowProps {
  children: ReactNode;
  actions: SwipeAction[];
  /** trailing：左滑露出右侧按钮（默认）；leading：右滑露出左侧按钮。 */
  reveal?: 'trailing' | 'leading';
}

const ACTION_WIDTH = 76;

/** 左滑/右滑露出操作按钮的行。用 PanResponder 实现，Web 与 Android 都可用。 */
export function SwipeRow({ children, actions, reveal = 'trailing' }: SwipeRowProps) {
  const width = actions.length * ACTION_WIDTH;
  const translateX = useRef(new Animated.Value(0)).current;
  const offset = useRef(0);

  const settle = (open: boolean) => {
    const target = open ? (reveal === 'trailing' ? -width : width) : 0;
    offset.current = target;
    Animated.spring(translateX, {
      toValue: target,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        let next = offset.current + gesture.dx;
        if (reveal === 'trailing') {
          next = Math.max(-width, Math.min(0, next));
        } else {
          next = Math.min(width, Math.max(0, next));
        }
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const next = offset.current + gesture.dx;
        settle(reveal === 'trailing' ? next < -width / 2 : next > width / 2);
      },
      onPanResponderTerminate: () => settle(false),
    })
  ).current;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.actions,
          reveal === 'trailing' ? styles.actionsRight : styles.actionsLeft,
          { width },
        ]}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => {
              settle(false);
              action.onPress();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: action.color },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={{ color: action.textColor ?? '#fff' }}>
              {action.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: Spacing.three,
  },
  actions: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  actionsRight: {
    right: 0,
  },
  actionsLeft: {
    left: 0,
  },
  actionButton: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
