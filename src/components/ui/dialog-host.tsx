import { useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGlass, useTheme, useThemeMode } from '@/hooks/use-theme';
import { glassSheetStyle } from '@/lib/glass';
import {
  closeDialog,
  getDialogSnapshot,
  runDialogOption,
  subscribeDialog,
} from '@/lib/dialogs';

/** 挂一次在根布局里，负责渲染 `showNotice` / `askConfirm` / `showActions`。 */
export function DialogHost() {
  const dialog = useSyncExternalStore(subscribeDialog, getDialogSnapshot, getDialogSnapshot);
  const theme = useTheme();
  const glass = useGlass();
  const scheme = useThemeMode();

  return (
    <Modal
      visible={dialog !== null}
      transparent
      animationType="fade"
      onRequestClose={() => closeDialog(false)}>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          accessibilityLabel="关闭弹窗"
          onPress={() => closeDialog(false)}
        />
        <ThemedView style={[styles.card, glass ? glassSheetStyle(scheme) : null]}>
          {dialog ? (
            <>
              <ThemedText style={styles.title}>{dialog.title}</ThemedText>
              {dialog.message ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
                  {dialog.message}
                </ThemedText>
              ) : null}

              {dialog.kind === 'actions' ? (
                <View style={styles.options}>
                  {(dialog.options ?? []).map((option) => (
                    <Pressable
                      key={option.label}
                      accessibilityRole="button"
                      accessibilityLabel={option.label}
                      onPress={() => runDialogOption(option)}
                      style={({ pressed }) => [
                        styles.option,
                        { borderTopColor: theme.backgroundElement },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        style={[
                          styles.optionLabel,
                          option.danger ? { color: '#D64545' } : null,
                        ]}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.actions}>
                  {dialog.kind === 'confirm' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="取消"
                      onPress={() => closeDialog(false)}
                      style={({ pressed }) => [
                        styles.button,
                        { backgroundColor: theme.backgroundElement },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="small">取消</ThemedText>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={dialog.confirmLabel ?? '确定'}
                    onPress={() => closeDialog(true)}
                    style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: dialog.danger ? '#D64545' : theme.text },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: dialog.danger ? '#fff' : theme.background }}>
                      {dialog.confirmLabel ?? '确定'}
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </>
          ) : null}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  button: {
    minWidth: 76,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  options: {
    marginTop: Spacing.two,
  },
  option: {
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
});