import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ColorPickerPanel } from '@/components/personalize/color-picker';
import { HomeBgImagePanel } from '@/components/personalize/home-bg-image-panel';
import { SettingsRow } from '@/components/timetable/settings-row';
import { Space, Type } from '@/constants/theme';
import {
  getCardStyle,
  getDashMode,
  getHideCompleted,
  setCardStyle,
  setDashMode,
  setHideCompleted,
} from '@/db/repositories/settings';
import {
  APP_SKINS,
  APP_SKIN_LABELS,
  CARD_STYLES,
  CARD_STYLE_LABELS,
  DASH_MODES,
  DASH_MODE_LABELS,
  HOME_BG_MODES,
  HOME_BG_MODE_LABELS,
  type CardStyle,
  type DashMode,
} from '@/db/types';
import { bumpDataVersion } from '@/lib/data-version';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';

export default function PersonalizeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const {
    preference,
    setPreference,
    skin,
    setAppSkin,
    homeBgMode,
    homeBgColor,
    setHomeBgMode,
    setHomeBgColor,
  } = useThemePreference();
  const [dashMode, setDashModeState] = useState<DashMode>('carousel');
  const [cardStyle, setCardStyleState] = useState<CardStyle>('default');
  const [hideCompleted, setHideCompletedState] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getDashMode()
        .then(setDashModeState)
        .catch(() => undefined);
      getCardStyle()
        .then(setCardStyleState)
        .catch(() => undefined);
      getHideCompleted()
        .then(setHideCompletedState)
        .catch(() => undefined);
    }, [])
  );

  const themeLabel =
    preference === 'system' ? '跟随系统' : preference === 'dark' ? '深色' : '浅色';

  return (
    <ThemedView style={styles.container} glow>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Breadcrumb
            trail={[
              { label: '我的', onPress: () => router.back() },
              { label: '个性化' },
            ]}
          />
          <ThemedText style={styles.title}>个性化</ThemedText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            主题
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {(['system', 'light', 'dark'] as const).map((value, index) => {
              const label = value === 'system' ? '跟随系统' : value === 'dark' ? '深色' : '浅色';
              const active = preference === value;
              return (
                <View key={value}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`主题 ${label}`}
                    onPress={() => setPreference(value).catch(() => undefined)}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                    <ThemedText type="small">
                      {active ? '✓ ' : ''}
                      {label}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            个性皮肤
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {APP_SKINS.map((value, index) => {
              const active = skin === value;
              return (
                <View key={value}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`个性皮肤 ${APP_SKIN_LABELS[value]}`}
                    onPress={() => {
                      setAppSkin(value).catch(() => undefined);
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      styles.skinRow,
                      pressed && styles.pressed,
                    ]}>
                    <View
                      style={[
                        styles.skinPreview,
                        value === 'glass'
                          ? styles.glassPreview
                          : [styles.classicPreview, { backgroundColor: theme.text }],
                      ]}
                    />
                    <View style={styles.skinText}>
                      <ThemedText type="small">
                        {active ? '✓ ' : ''}
                        {APP_SKIN_LABELS[value]}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {value === 'glass'
                          ? '磨砂透光玻璃质感 + 镜面高光描边'
                          : '纯色高对比度现代极简风'}
                      </ThemedText>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            页面背景（首页 / 计划 / 第三页）
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {HOME_BG_MODES.map((mode, index) => {
              const active = homeBgMode === mode;
              return (
                <View key={mode}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`首页背景 ${HOME_BG_MODE_LABELS[mode]}`}
                    onPress={() => {
                      setHomeBgMode(mode).catch(() => undefined);
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                    <ThemedText type="small">
                      {active ? '✓ ' : ''}
                      {HOME_BG_MODE_LABELS[mode]}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}

            {homeBgMode === 'color' ? (
              <View style={[styles.panelDivider, { borderTopColor: theme.background }]}>
                <ColorPickerPanel
                  color={homeBgColor}
                  onChange={(hex) => {
                    setHomeBgColor(hex).catch(() => undefined);
                  }}
                />
              </View>
            ) : null}

            {homeBgMode === 'image' ? (
              <View style={[styles.panelDivider, { borderTopColor: theme.background }]}>
                <HomeBgImagePanel />
              </View>
            ) : null}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            Dash 卡片模式
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {DASH_MODES.map((mode, index) => {
              const active = dashMode === mode;
              return (
                <View key={mode}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`卡片模式 ${DASH_MODE_LABELS[mode]}`}
                    onPress={() => {
                      setDashModeState(mode);
                      setDashMode(mode)
                        .then(() => bumpDataVersion())
                        .catch(() => undefined);
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                    <ThemedText type="small">
                      {active ? '✓ ' : ''}
                      {DASH_MODE_LABELS[mode]}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            卡片样式
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            {CARD_STYLES.map((style, index) => {
              const active = cardStyle === style;
              return (
                <View key={style}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.background }]} />
                  ) : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`卡片样式 ${CARD_STYLE_LABELS[style]}`}
                    onPress={() => {
                      setCardStyleState(style);
                      setCardStyle(style)
                        .then(() => bumpDataVersion())
                        .catch(() => undefined);
                      if (style === 'custom') router.push('/personalize/cards');
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
                    <ThemedText type="small">
                      {active ? '✓ ' : ''}
                      {CARD_STYLE_LABELS[style]}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>

          <SettingsRow
            label="自定义颜色"
            value={cardStyle === 'custom' ? '去设置' : undefined}
            placeholder="仅自定义样式可用"
            disabled={cardStyle !== 'custom'}
            onPress={() => router.push('/personalize/cards')}
          />

          <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
            当前主题：{themeLabel}
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            列表
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <ThemedText type="small">隐藏已完成</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  勾选后不再显示在任务列表里
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel="隐藏已完成"
                value={hideCompleted}
                onValueChange={(next) => {
                  setHideCompletedState(next);
                  setHideCompleted(next)
                    .then(() => bumpDataVersion())
                    .catch(() => undefined);
                }}
                trackColor={{ true: theme.text, false: theme.background }}
              />
            </View>
          </ThemedView>
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
  },
  sectionLabel: {
    marginTop: Space.three,
    marginBottom: Space.one,
    paddingHorizontal: Space.one,
  },
  group: {
    borderRadius: Space.three,
    paddingHorizontal: Space.three,
  },
  optionRow: {
    paddingVertical: Space.two,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  skinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.three,
  },
  skinPreview: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  classicPreview: {
    borderColor: 'rgba(255,255,255,0.55)',
  },
  glassPreview: {
    backgroundColor: 'rgba(147,197,253,0.35)',
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  skinText: {
    flex: 1,
    gap: 2,
  },
  panelDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Space.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.two,
    paddingVertical: Space.two,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  footnote: {
    marginTop: Space.three,
    paddingHorizontal: Space.one,
  },
});