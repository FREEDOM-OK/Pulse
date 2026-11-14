import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';
import { useTimetable } from '@/features/timetable/TimetableContext';
import {
  SAFE_TOP_DP,
  SAFE_BOTTOM_DP,
  softenColor,
  foregroundFor,
} from '@/lib/timetable-core';
import { showNotice } from '@/lib/dialogs';

/** 8 个护眼课表底色。 */
const BG_PALETTE: { hex: string; name: string }[] = [
  { hex: '#F5F5F7', name: '默认浅灰' },
  { hex: '#FFFFFF', name: '纯白' },
  { hex: '#FAF8F5', name: '奶油米白' },
  { hex: '#F0F7F4', name: '淡雅薄荷' },
  { hex: '#EFF6FF', name: '雾霾淡蓝' },
  { hex: '#FFF5F7', name: '樱花粉白' },
  { hex: '#F5F3FF', name: '薰衣草紫' },
  { hex: '#E8F3E8', name: '护眼豆沙绿' },
];

const SATURATION_STEPS = [0.2, 0.4, 0.6, 0.8, 1.0];

/** 暂未开放项：点了只弹提示，不做任何写入。 */
const LOCKED_ROWS = [
  '自定义背景图片',
  '课程文字大小与字重',
  '网格线显示与颜色',
  '课程格子不透明度',
];

export default function AppearanceScreen() {
  const theme = useTheme();
  const { scheme } = useThemePreference();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting, resetAppearanceDefaults } = useTimetable();

  const sampleBg = softenColor('#3B82F6', settings.saturation);
  const sampleFg = foregroundFor(sampleBg);

  // 深色模式下，默认的浅色课表底会白得刺眼：这两档自动改用深色表面色，
  // 用户主动选过的其它背景色仍然照用。
  const previewBg =
    scheme === 'dark' &&
    ['#F5F5F7', '#FFFFFF'].includes(settings.gridBackgroundColor.toUpperCase())
      ? theme.backgroundElement
      : settings.gridBackgroundColor;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top || SAFE_TOP_DP,
          paddingBottom: insets.bottom || SAFE_BOTTOM_DP,
        },
      ]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={[
            styles.backBtnCircle,
            {
              borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
              backgroundColor: theme.backgroundElement,
            },
          ]}
          accessibilityLabel="返回"
          onPress={() => router.back()}>
          <Text style={[styles.backArrow, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>更多外观设置</Text>
        <TouchableOpacity
          style={styles.resetBtn}
          accessibilityLabel="恢复默认"
          onPress={resetAppearanceDefaults}>
          <Text style={styles.resetBtnText}>恢复默认</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={styles.body}>
        {/* 实时预览：背景色 / 格子高度 / 圆角 / 饱和度四者一起联动 */}
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: previewBg,
              borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}>
          <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>实时预览</Text>
          <View
            style={[
              styles.sampleBlock,
              {
                backgroundColor: sampleBg,
                height: settings.cellHeight,
                borderRadius: settings.cellRadius,
              },
            ]}>
            <Text style={[styles.sampleTitle, { color: sampleFg }]}>高等数学</Text>
            <Text style={[styles.sampleSub, { color: sampleFg }]}>A101</Text>
          </View>
        </View>

        {/* 功能区 1：背景色 + 饱和度 */}
        <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>课程表背景颜色</Text>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.swatchRow}>
            {BG_PALETTE.map((item) => {
              const selected =
                item.hex.toUpperCase() === settings.gridBackgroundColor.toUpperCase();
              return (
                <TouchableOpacity
                  key={item.hex}
                  accessibilityLabel={`背景${item.name}`}
                  style={styles.swatchCell}
                  onPress={() => updateSetting('gridBackgroundColor', item.hex)}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: item.hex },
                      {
                        borderColor:
                          scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)',
                      },
                      selected && styles.swatchSelected,
                    ]}>
                    {selected ? <Text style={styles.swatchCheck}>✓</Text> : null}
                  </View>
                  <Text style={[styles.swatchName, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
            ]}
          />

          <Text style={[styles.subLabel, { color: theme.text }]}>色彩饱和度</Text>
          <View style={styles.stepPillRow}>
            {SATURATION_STEPS.map((v) => {
              const active = Math.abs(settings.saturation - v) < 0.05;
              return (
                <TouchableOpacity
                  key={v}
                  accessibilityLabel={`饱和度${Math.round(v * 100)}%`}
                  style={[
                    styles.stepPill,
                    { backgroundColor: theme.backgroundSelected },
                    active && styles.stepPillActive,
                  ]}
                  onPress={() => updateSetting('saturation', v)}>
                  <Text
                    style={[
                      styles.stepPillText,
                      { color: theme.text },
                      active && styles.stepPillTextActive,
                    ]}>
                    {Math.round(v * 100)}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 功能区 2：暂未开放的高级项 */}
        <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>高级外观定制</Text>
        <View style={[styles.cardList, { backgroundColor: theme.backgroundElement }]}>
          {LOCKED_ROWS.map((label, index) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.row,
                {
                  borderBottomColor:
                    scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
                index === LOCKED_ROWS.length - 1 && { borderBottomWidth: 0 },
              ]}
              accessibilityLabel={label}
              onPress={() => showNotice('该功能暂未开放，敬请期待')}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{label}</Text>
              <View style={styles.rowRight}>
                <Text style={[styles.rowLocked, { color: theme.textSecondary }]}>暂未开放</Text>
                <Text style={[styles.rowArrow, { color: theme.textSecondary }]}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, lineHeight: 24 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  resetBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  resetBtnText: { fontSize: 14, fontWeight: '600', color: '#4A5588' },
  body: { padding: 16, paddingBottom: 40 },
  previewCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewLabel: { fontSize: 12 },
  sampleBlock: {
    width: 120,
    padding: 6,
    justifyContent: 'center',
  },
  sampleTitle: { fontSize: 11, fontWeight: '700' },
  sampleSub: { fontSize: 9, marginTop: 2, opacity: 0.85 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  cardList: {
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchCell: { width: 56, alignItems: 'center', gap: 5 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatchSelected: { borderWidth: 2, borderColor: '#4A5588' },
  swatchCheck: { fontSize: 15, fontWeight: '700', color: '#4A5588' },
  swatchName: { fontSize: 10 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  subLabel: { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  stepPillRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  stepPill: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillActive: { backgroundColor: '#4A5588' },
  stepPillText: { fontSize: 12, fontWeight: '600' },
  stepPillTextActive: { color: '#FFFFFF' },
  row: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLocked: { fontSize: 12 },
  rowArrow: { fontSize: 16 },
});