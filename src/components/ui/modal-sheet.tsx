import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ModalSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** 通用弹窗容器：居中卡片，点遮罩关闭，内容可滚动。 */
export function ModalSheet({ visible, title, onClose, children, footer }: ModalSheetProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <View style={styles.root}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <ThemedView style={styles.card}>
            <View style={styles.header}>
              <ThemedText type="smallBold" style={styles.title}>
                {title}
              </ThemedText>
            </View>
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer ? (
              <View style={[styles.footer, { borderTopColor: theme.backgroundElement }]}>
                {footer}
              </View>
            ) : null}
          </ThemedView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const modalStyles = StyleSheet.create({
  field: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  label: {
    marginBottom: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    flexWrap: 'nowrap',
  },
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '100%',
    minHeight: 0,
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  header: {
    flexShrink: 0,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 16,
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  footer: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
