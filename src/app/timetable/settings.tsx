import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTimetable } from '@/features/timetable/TimetableContext';
import {
  SAFE_TOP_DP,
  SAFE_BOTTOM_DP,
  softenColor,
  foregroundFor,
} from '@/lib/timetable-core';

export default function TimetableSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { schedules, courses, settings, updateSetting } = useTimetable();

  const [showSatDrawer, setShowSatDrawer] = useState(false);
  const [showLunchDrawer, setShowLunchDrawer] = useState(false);
  const [showDurationDrawer, setShowDurationDrawer] = useState(false);
  const [showSpanDrawer, setShowSpanDrawer] = useState(false);

  const previewBg = softenColor('#3B82F6', settings.saturation);
  const previewFg = foregroundFor(previewBg);

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
        <TouchableOpacity
          style={styles.backBtnCircle}
          accessibilityLabel="返回"
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {/* 课程分组 */}
        <Text style={styles.groupTitle}>课程</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.row}
            accessibilityLabel="节次设置"
            onPress={() => router.push('/timetable/periods')}
          >
            <Text style={styles.rowTitle}>节次设置</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            accessibilityLabel="导入课表"
            onPress={() => router.push('/timetable/import')}
          >
            <Text style={styles.rowTitle}>导入课表</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 课表分组 */}
        <Text style={styles.groupTitle}>课表</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.row}
            accessibilityLabel="课表管理"
            onPress={() => router.push('/timetable/schedules')}
          >
            <Text style={styles.rowTitle}>课表管理</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>共 {schedules.length} 张</Text>
              <Text style={styles.rowArrow}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            accessibilityLabel="全部课程"
            onPress={() => router.push('/timetable/courses')}
          >
            <Text style={styles.rowTitle}>全部课程</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{courses.length} 门</Text>
              <Text style={styles.rowArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 外观分组 */}
        <Text style={styles.groupTitle}>外观</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.row}
            accessibilityLabel="色彩饱和度"
            onPress={() => setShowSatDrawer(true)}
          >
            <Text style={styles.rowTitle}>色彩饱和度</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{Math.round(settings.saturation * 100)}%</Text>
              <Text style={styles.rowArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            accessibilityLabel="午休位置"
            onPress={() => setShowLunchDrawer(true)}
          >
            <Text style={styles.rowTitle}>午休位置</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>
                {settings.lunchAfter === 0 ? '不显示' : `第 ${settings.lunchAfter} 节后`}
              </Text>
              <Text style={styles.rowArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            accessibilityLabel="单节时长"
            onPress={() => setShowDurationDrawer(true)}
          >
            <Text style={styles.rowTitle}>单节时长</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{settings.periodDuration} 分钟</Text>
              <Text style={styles.rowArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            accessibilityLabel="默认连堂节数"
            onPress={() => setShowSpanDrawer(true)}
          >
            <Text style={styles.rowTitle}>默认连堂节数</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{settings.defaultSpan} 节</Text>
              <Text style={styles.rowArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 关于分组 */}
        <Text style={styles.groupTitle}>关于</Text>
        <View style={styles.cardGroup}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.rowTitle}>版本</Text>
            <Text style={styles.rowValue}>
              {Constants.expoConfig?.version ?? '1.2.2'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 饱和度抽屉 */}
      <Modal visible={showSatDrawer} transparent animationType="fade">
        <Pressable style={styles.drawerOverlay} onPress={() => setShowSatDrawer(false)}>
          <View style={styles.drawerSheet}>
            <Text style={styles.drawerTitle}>色彩饱和度</Text>
            <View style={[styles.previewBlock, { backgroundColor: previewBg }]}>
              <Text style={[styles.previewBlockTitle, { color: previewFg }]}>高等数学</Text>
              <Text style={[styles.previewBlockSub, { color: previewFg }]}>A101</Text>
            </View>
            <View style={styles.stepPillRow}>
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
                <TouchableOpacity
                  key={v}
                  accessibilityLabel={`饱和度${Math.round(v * 100)}%`}
                  style={[
                    styles.stepPill,
                    Math.abs(settings.saturation - v) < 0.05 && styles.stepPillActive,
                  ]}
                  onPress={() => updateSetting('saturation', v)}
                >
                  <Text
                    style={[
                      styles.stepPillText,
                      Math.abs(settings.saturation - v) < 0.05 && styles.stepPillTextActive,
                    ]}
                  >
                    {Math.round(v * 100)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 午休位置抽屉 */}
      <Modal visible={showLunchDrawer} transparent animationType="fade">
        <Pressable style={styles.drawerOverlay} onPress={() => setShowLunchDrawer(false)}>
          <View style={styles.drawerSheet}>
            <Text style={styles.drawerTitle}>午休位置</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {Array.from({ length: 17 }, (_, i) => i).map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={styles.optionRow}
                  accessibilityLabel={pos === 0 ? '午休不显示' : `午休第${pos}节后`}
                  onPress={async () => {
                    await updateSetting('lunchAfter', pos);
                    setShowLunchDrawer(false);
                  }}
                >
                  <Text style={styles.optionText}>
                    {pos === 0 ? '不显示' : `第 ${pos} 节后`}
                  </Text>
                  {settings.lunchAfter === pos && <Text style={styles.optionCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* 单节时长抽屉 (30–90 步进 5) */}
      <Modal visible={showDurationDrawer} transparent animationType="fade">
        <Pressable style={styles.drawerOverlay} onPress={() => setShowDurationDrawer(false)}>
          <View style={styles.drawerSheet}>
            <Text style={styles.drawerTitle}>单节时长</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {[30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90].map((min) => (
                <TouchableOpacity
                  key={min}
                  style={styles.optionRow}
                  accessibilityLabel={`${min}分钟`}
                  onPress={async () => {
                    await updateSetting('periodDuration', min);
                    setShowDurationDrawer(false);
                  }}
                >
                  <Text style={styles.optionText}>{min} 分钟</Text>
                  {settings.periodDuration === min && <Text style={styles.optionCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* 默认连堂节数抽屉 (1–4) */}
      <Modal visible={showSpanDrawer} transparent animationType="fade">
        <Pressable style={styles.drawerOverlay} onPress={() => setShowSpanDrawer(false)}>
          <View style={styles.drawerSheet}>
            <Text style={styles.drawerTitle}>默认连堂节数</Text>
            {[1, 2, 3, 4].map((span) => (
              <TouchableOpacity
                key={span}
                style={styles.optionRow}
                accessibilityLabel={`${span}节`}
                onPress={async () => {
                  await updateSetting('defaultSpan', span);
                  setShowSpanDrawer(false);
                }}
              >
                <Text style={styles.optionText}>{span} 节</Text>
                {settings.defaultSpan === span && <Text style={styles.optionCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
    backgroundColor: '#F5F5F7',
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
  scrollBody: { padding: 16 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.5)',
    marginBottom: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  rowTitle: { fontSize: 15, fontWeight: '500', color: '#111113' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 13, color: 'rgba(0,0,0,0.6)' },
  rowArrow: { fontSize: 16, color: 'rgba(0,0,0,0.3)' },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  drawerTitle: { fontSize: 16, fontWeight: '700', color: '#111113', marginBottom: 14 },
  previewBlock: {
    width: 110,
    height: 76,
    borderRadius: 6,
    padding: 6,
    alignSelf: 'center',
    marginBottom: 16,
  },
  previewBlockTitle: { fontSize: 11, fontWeight: '700' },
  previewBlockSub: { fontSize: 9, marginTop: 2, opacity: 0.85 },
  stepPillRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  stepPill: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillActive: { backgroundColor: '#3B82F6' },
  stepPillText: { fontSize: 12, fontWeight: '600', color: '#111113' },
  stepPillTextActive: { color: '#FFFFFF' },
  optionRow: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  optionText: { fontSize: 14, color: '#111113', fontWeight: '500' },
  optionCheck: { fontSize: 15, color: '#3B82F6', fontWeight: '700' },
});
