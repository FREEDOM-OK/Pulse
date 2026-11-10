import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTimetable } from '@/features/timetable/TimetableContext';
import {
  SAFE_TOP_DP,
  SAFE_BOTTOM_DP,
  softenColor,
  foregroundFor,
} from '@/lib/timetable-core';

export default function AppearanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, resetAppearanceDefaults } = useTimetable();

  const bg = softenColor('#3B82F6', settings.saturation);
  const fg = foregroundFor(bg);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top || SAFE_TOP_DP,
          paddingBottom: insets.bottom || SAFE_BOTTOM_DP,
        },
      ]}
    >
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtnCircle} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>外观</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.previewCard}>
          <Text style={styles.label}>示例课程块实时预览</Text>
          <View style={[styles.sampleBlock, { backgroundColor: bg }]}>
            <Text style={[styles.sampleTitle, { color: fg }]}>高等数学</Text>
            <Text style={[styles.sampleSub, { color: fg }]}>A101</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={resetAppearanceDefaults}>
          <Text style={styles.resetBtnText}>恢复默认</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
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
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: '#111113', lineHeight: 24 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111113' },
  body: { padding: 16, gap: 16 },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  label: { fontSize: 13, color: 'rgba(0,0,0,0.6)' },
  sampleBlock: {
    width: 100,
    height: 86,
    borderRadius: 6,
    padding: 6,
  },
  sampleTitle: { fontSize: 11, fontWeight: '700' },
  sampleSub: { fontSize: 9, marginTop: 2, opacity: 0.85 },
  resetBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
});
