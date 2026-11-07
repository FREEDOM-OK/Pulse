import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export interface ActionMenuItem {
  key: string;
  label: string;
  danger?: boolean;
  onPress: () => void;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  message?: string;
  items: ActionMenuItem[];
  onClose: () => void;
}

/**
 * 长按某一行后弹出的操作菜单（编辑 / 删除），显示在屏幕正中。
 * 用长按替代左右滑动，避免和外层的横滑（游戏页切页签）抢手势。
 */
export function ActionMenu({ visible, title, message, items, onClose }: ActionMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {/*
          用响应者系统而不是 Pressable 的 onPress 来关闭：
          Web 上长按松手会补发一个 click，落在刚出现的遮罩上，Pressable 会把它当成点击而立刻关掉菜单。
          只认「从遮罩上按下」的手势就不会有这个问题。
        */}
        <View
          style={styles.backdrop}
          accessible={false}
          onStartShouldSetResponder={() => true}
          onResponderRelease={onClose}
        />
        <ThemedView style={styles.sheet}>
          {title ? (
            <ThemedText type="smallBold" style={styles.title}>
              {title}
            </ThemedText>
          ) : null}
          {message ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.message}>
              {message}
            </ThemedText>
          ) : null}
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <ThemedText type="small" style={item.danger ? styles.danger : undefined}>
                {item.label}
              </ThemedText>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="取消"
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              取消
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    /** 固定宽度，避免卡片随标题/条目文字长短忽宽忽窄。 */
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    borderRadius: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    gap: 2,
  },
  title: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    fontSize: 15,
  },
  message: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  item: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  danger: {
    color: '#D64545',
  },
  cancel: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.3)',
  },
  pressed: {
    opacity: 0.6,
  },
});