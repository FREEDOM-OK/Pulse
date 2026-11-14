import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Space, Type } from '@/constants/theme';
import { getCardColor, setCardColor } from '@/db/repositories/settings';
import { DEFAULT_CARD_COLOR } from '@/db/types';
import { bumpDataVersion } from '@/lib/data-version';
import { useTheme } from '@/hooks/use-theme';

/** 8 个预设色，深浅各半，保证卡片上的白字可读。 */
const PRESET_COLORS = [
  '#26262A',
  '#1F3A5F',
  '#3D2E4F',
  '#4A2E2A',
  '#2E4A3A',
  '#5A4A1F',
  '#2A2A2A',
  '#3A3A3F',
];

export default function PersonalizeCardsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [color, setColorState] = useState(DEFAULT_CARD_COLOR);

  useFocusEffect(
    useCallback(() => {
      getCardColor()
        .then(setColorState)
        .catch(() => undefined);
    }, [])
  );

  const choose = (next: string) => {
    setColorState(next);
    setCardColor(next)
      .then(() => bumpDataVersion())
      .catch(() => undefined);
  };

  return (
    <ThemedView style={styles.container} glow>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Breadcrumb
            trail={[
              { label: '我的', onPress: () => router.back() },
              { label: '个性化', onPress: () => router.back() },
              { label: '卡片样式' },
            ]}
          />
          <ThemedText style={styles.title}>卡片样式</ThemedText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            选一个底色，主卡与其它卡共用。文字会自动用浅色。
          </ThemedText>

          <View style={styles.grid}>
            {PRESET_COLORS.map((preset) => {
              const active = preset.toLowerCase() === color.toLowerCase();
              return (
                <Pressable
                  key={preset}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`卡片颜色 ${preset}`}
                  onPress={() => choose(preset)}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: preset,
                      borderColor: active ? theme.text : 'transparent',
                    },
                  ]}>
                  {active ? <ThemedText style={styles.swatchCheck}>✓</ThemedText> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.preview, { backgroundColor: color }]}>
            <ThemedText style={styles.previewTitle}>去健身</ThemedText>
            <ThemedText style={styles.previewSubtitle}>今天还没练</ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: Space.three,
    paddingTop: Space.two,
    paddingBottom: Space.one,
    gap: Space.one,
  },
  title: {
    fontSize: Type.display.fontSize,
    lineHeight: Type.display.lineHeight,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  content: {
    paddingHorizontal: Space.three,
    paddingBottom: Space.five,
    gap: Space.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.two,
  },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  preview: {
    height: 163,
    borderRadius: 24,
    padding: Space.three,
    justifyContent: 'flex-end',
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  previewSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
});