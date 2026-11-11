import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

/** 两档高度：半屏 / 近全屏（PRD 第 6 节）。 */
export type BottomSheetSize = 'half' | 'full';

const SIZE_RATIO: Record<BottomSheetSize, number> = {
  half: 0.5,
  full: 0.92,
};

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 高度档位，默认半屏。 */
  size?: BottomSheetSize;
  /** 兼容旧调用：给了精确比例就以它为准。 */
  heightRatio?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const ENTER_MS = 220;
const EXIT_MS = 180;
const BACKDROP_MS = 180;

/**
 * 自下而上的抽屉：停屏幕中下、顶部把手、点遮罩关闭。
 *
 * 动画拆成两段（PRD 明确要求）：遮罩只淡入淡出 180ms，抽屉本体 220ms 从底部升起。
 * 所以这里**不能**再借 Modal 的 `animationType="slide"` —— 那会让遮罩跟着抽屉一起滑上来。
 * 关的时候先播完动画再卸载 Modal，否则会「啪」一下消失。
 */
export function BottomSheet({
  visible,
  onClose,
  size = 'half',
  heightRatio,
  children,
  footer,
}: BottomSheetProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * (heightRatio ?? SIZE_RATIO[size]));

  /** 0 = 收起，1 = 展开。用 0..1 的进度而不是像素，屏幕高度变了插值自动跟着变。 */
  const progress = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) setRendered(true);
    const animation = Animated.parallel([
      Animated.timing(progress, {
        toValue: visible ? 1 : 0,
        duration: visible ? ENTER_MS : EXIT_MS,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: BACKDROP_MS,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !visible) setRendered(false);
    });
    return () => animation.stop();
  }, [backdropOpacity, progress, visible]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight, 0],
  });

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            accessibilityLabel="关闭抽屉"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              backgroundColor: theme.background,
              transform: [{ translateY }],
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.backgroundElement }]} />
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
});