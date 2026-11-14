import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { deleteHomeBgImage, persistHomeBgImage, pickHomeBgImage } from '@/lib/home-bg-image';
import { showNotice } from '@/lib/dialogs';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';

/**
 * 首页自定义壁纸面板：选图 / 预览 / 清除。
 * 图片会复制到 App 私有目录（复用头像那套 expo-image-picker + expo-file-system），
 * 避免系统相册缓存被清理后壁纸失效。
 */
export function HomeBgImagePanel() {
  const theme = useTheme();
  const { homeBgImage, setHomeBgImage, setHomeBgMode } = useThemePreference();
  const [busy, setBusy] = useState(false);

  const handlePick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const picked = await pickHomeBgImage();
      if (!picked) return;
      const persisted = await persistHomeBgImage(picked);
      await setHomeBgImage(persisted);
      await setHomeBgMode('image');
    } catch (error) {
      await showNotice(error instanceof Error ? error.message : '选择图片失败');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteHomeBgImage(homeBgImage);
      await setHomeBgImage(null);
    } catch {
      await showNotice('清除图片失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.panel}>
      {homeBgImage ? (
        <View style={styles.previewCard}>
          <Image source={{ uri: homeBgImage }} resizeMode="cover" style={styles.preview} />
        </View>
      ) : (
        <View style={[styles.placeholder, { borderColor: theme.textSecondary }]}>
          <ThemedText type="small" themeColor="textSecondary">
            还没有选择图片
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            建议用竖版壁纸，效果最好
          </ThemedText>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="从相册选择图片"
          disabled={busy}
          onPress={() => {
            void handlePick();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.text },
            (pressed || busy) && styles.pressed,
          ]}>
          {busy ? (
            <ActivityIndicator size="small" color={theme.background} />
          ) : (
            <ThemedText type="small" style={{ color: theme.background }}>
              从相册选择图片
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="清除图片"
          disabled={!homeBgImage || busy}
          onPress={() => {
            void handleClear();
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: theme.backgroundElement },
            (pressed || !homeBgImage) && styles.pressed,
            !homeBgImage && styles.disabled,
          ]}>
          <ThemedText type="small">清除图片</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingVertical: Space.two,
    gap: Space.three,
  },
  previewCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    aspectRatio: 9 / 13,
  },
  placeholder: {
    height: 160,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: Space.two,
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: Space.three,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
});