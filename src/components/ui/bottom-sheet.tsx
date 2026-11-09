import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 占屏高度比例，默认 0.6。 */
  heightRatio?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * 自下而上的抽屉：停屏幕中下、顶部把手、点遮罩关闭。
 * 用 Modal 的 slide 动画，避免自己维护 translateY 与返回键。
 */
export function BottomSheet({
  visible,
  onClose,
  heightRatio = 0.6,
  children,
  footer,
}: BottomSheetProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [opacity, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Pressable
            accessibilityLabel="关闭抽屉"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>

        <View
          style={[
            styles.sheet,
            {
              height: Math.round(height * heightRatio),
              backgroundColor: theme.background,
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.backgroundElement }]} />
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
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