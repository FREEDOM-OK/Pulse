import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
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
  /** 高度档位，默认半屏。autoHeight 时忽略。 */
  size?: BottomSheetSize;
  /** 兼容旧调用：给了精确比例就以它为准。autoHeight 时忽略。 */
  heightRatio?: number;
  /** 由内容撑高，不固定高度（底部抽屉这类内容较少的场景）。 */
  autoHeight?: boolean;
  /** 是否显示顶部把手，默认显示。 */
  showHandle?: boolean;
  /** 抽屉本体样式，可覆盖背景色/圆角/内边距。 */
  sheetStyle?: StyleProp<ViewStyle>;
  /** 内容区样式，默认带左右 20 的内边距。 */
  bodyStyle?: StyleProp<ViewStyle>;
  /** 遮罩层无障碍标签，便于不同抽屉在测试/读屏里区分。 */
  closeLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * 悬浮在 Modal 最顶层的浮层（Toast 之类）。
   *
   * 必须挂在 Modal 内部的根节点上：普通页面里的绝对定位 View 会被 Modal
   * 的独立窗口层级压住，抽屉不关闭时根本看不见。
   */
  overlay?: React.ReactNode;
}

const ENTER_MS = 220;
const EXIT_MS = 180;
const BACKDROP_MS = 180;
/** 抽屉收起时的位移基准：短抽屉至少退 600dp，保证整块完全滑出屏幕。 */
const MIN_TRAVEL = 600;

/**
 * 自下而上的抽屉：停屏幕中下、顶部把手、点遮罩关闭。
 *
 * 动画拆成两段（PRD 明确要求）：遮罩只淡入淡出 180ms，抽屉本体 220ms 从底部升起。
 * 所以这里**不能**再借 Modal 的 `animationType="slide"` —— 那会让遮罩跟着抽屉一起滑上来。
 * 关的时候先播完动画再卸载 Modal，否则会「啪」一下消失。
 *
 * 使用 `statusBarTranslucent` + 全屏 Modal：Tab 模式下也能盖住悬浮底栏，
 * 因此抽屉底部不需要为底栏额外留白，只避让系统手势条即可。
 */
export function BottomSheet({
  visible,
  onClose,
  size = 'half',
  heightRatio,
  autoHeight = false,
  showHandle = true,
  sheetStyle,
  bodyStyle,
  closeLabel = '关闭抽屉',
  children,
  footer,
  overlay,
}: BottomSheetProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const sheetHeight = autoHeight ? undefined : Math.round(height * (heightRatio ?? SIZE_RATIO[size]));

  /** 0 = 收起，1 = 展开。用 0..1 的进度而不是像素，屏幕高度变了插值自动跟着变。 */
  const progress = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);
  const runningRef = useRef<Animated.CompositeAnimation | null>(null);
  const openStartedRef = useRef(false);

  /**
   * 打开动画只允许启动一次：requestAnimationFrame、定时兜底与 Modal.onShow
   * 三路都能兜住 Android 首帧未挂载的情况，但重复调用不能把动画重置回起点。
   */
  const startOpenAnimation = useCallback(() => {
    if (openStartedRef.current) return;
    openStartedRef.current = true;
    const animation = Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: BACKDROP_MS,
        useNativeDriver: true,
      }),
    ]);
    runningRef.current = animation;
    animation.start();
  }, [backdropOpacity, progress]);

  /**
   * 第一段：visible 刚变 true 时只做「复位」。
   * 此时 rendered 可能仍是 false（<Modal> 还没挂载），这一轮绝不能启动动画：
   * 否则动画空跑并把 openStartedRef 锁死，等 onShow 真正到来时会被幂等守卫
   * 直接拦掉，抽屉永远停在屏幕外。
   */
  useEffect(() => {
    if (!visible) return;
    openStartedRef.current = false;
    progress.setValue(0);
    backdropOpacity.setValue(0);
  }, [backdropOpacity, progress, visible]);

  /** 第二段：只负责把 Modal 放进渲染树，不碰动画。 */
  useEffect(() => {
    if (visible && !rendered) setRendered(true);
  }, [rendered, visible]);

  /**
   * 第三段：visible && rendered 同时为 true（Modal 已真正进入渲染树）后，
   * 才允许启动打开动画。rAF、100ms 兜底与 Modal.onShow 三路幂等触发。
   */
  useEffect(() => {
    if (!visible || !rendered) return;
    const frame = requestAnimationFrame(startOpenAnimation);
    const fallback = setTimeout(startOpenAnimation, 100);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fallback);
    };
  }, [rendered, startOpenAnimation, visible]);

  // 关闭：先播完退场动画再卸载；只有已经挂载过的抽屉才需要播。
  useEffect(() => {
    if (visible || !rendered) return;
    runningRef.current?.stop();
    const animation = Animated.parallel([
      Animated.timing(progress, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: BACKDROP_MS,
        useNativeDriver: true,
      }),
    ]);
    runningRef.current = animation;
    animation.start(({ finished }) => {
      if (finished && !visible) setRendered(false);
    });
    return () => animation.stop();
  }, [backdropOpacity, progress, rendered, visible]);

  // 短抽屉（autoHeight）退 600dp 足够完全出屏；近全屏抽屉必须按屏幕高度退，
  // 否则收起态还会露出顶部一截。
  const travel = Math.max(MIN_TRAVEL, height);
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [travel, 0],
  });

  useEffect(
    () => () => {
      runningRef.current?.stop();
    },
    [],
  );

  if (!rendered) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={startOpenAnimation}
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            accessibilityLabel={closeLabel}
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
            sheetStyle,
          ]}>
          {showHandle ? (
            <View style={[styles.handle, { backgroundColor: theme.backgroundElement }]} />
          ) : null}
          <View
            style={[autoHeight ? styles.bodyAutoHeight : styles.bodyFlex, bodyStyle]}>
            {children}
          </View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>

        {/* 顶层浮层：与 backdrop / sheet 同级，因此能盖在抽屉本体之上 */}
        {overlay}
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
  bodyFlex: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bodyAutoHeight: {
    width: '100%',
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
});