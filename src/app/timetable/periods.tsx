import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTimetable } from '@/features/timetable/TimetableContext';
import { showNotice } from '@/lib/dialogs';
import { PeriodTime, SAFE_TOP_DP, SAFE_BOTTOM_DP } from '@/lib/timetable-core';

export default function PeriodsSettingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting } = useTimetable();
  const [list, setList] = useState<PeriodTime[]>(() =>
    JSON.parse(JSON.stringify(settings.periodTimes))
  );

  const handleAddPeriod = () => {
    if (list.length >= 16) return;
    const last = list[list.length - 1] || { start: '08:00', end: '08:45' };
    let [h, m] = last.end.split(':').map(Number);
    m += 10;
    if (m >= 60) {
      h = (h + Math.floor(m / 60)) % 24;
      m %= 60;
    }
    const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    m += settings.periodDuration;
    if (m >= 60) {
      h = (h + Math.floor(m / 60)) % 24;
      m %= 60;
    }
    const end = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setList((prev) => [...prev, { start, end }]);
  };

  const handleSave = async () => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    for (let i = 0; i < list.length; i++) {
      const { start, end } = list[i];
      if (!timeRegex.test(start) || !timeRegex.test(end)) {
        showNotice('时间格式应为 HH:MM');
        return;
      }
      if (start >= end && !(start >= '23:00' && end <= '02:00')) {
        showNotice(`第 ${i + 1} 节的结束时间需晚于开始时间`);
        return;
      }
      if (i > 0 && start < list[i - 1].end) {
        showNotice(`第 ${i + 1} 节与第 ${i} 节时间重叠`);
        return;
      }
    }
    await updateSetting('periodTimes', list);
    router.back();
  };

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
        <Text style={styles.headerTitle}>节次设置</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {list.map((item, idx) => {
          const canDelete = list.length > 1;
          return (
            <View key={idx} style={styles.periodCard}>
              <Text style={styles.periodLabel}>第 {idx + 1} 节</Text>
              <View style={styles.rightControls}>
                <TextInput
                  value={item.start}
                  maxLength={5}
                  onChangeText={(txt) => {
                    const next = [...list];
                    next[idx].start = txt;
                    setList(next);
                  }}
                  style={styles.timeInput}
                />
                <Text style={styles.dash}>–</Text>
                <TextInput
                  value={item.end}
                  maxLength={5}
                  onChangeText={(txt) => {
                    const next = [...list];
                    next[idx].end = txt;
                    setList(next);
                  }}
                  style={styles.timeInput}
                />
                <TouchableOpacity
                  disabled={!canDelete}
                  onPress={() => setList((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Text style={canDelete ? styles.delText : styles.delDisabled}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addBtn} onPress={handleAddPeriod}>
          <Text style={styles.addBtnText}>＋ 添加一节</Text>
        </TouchableOpacity>
      </ScrollView>
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
  saveText: { fontSize: 15, fontWeight: '600', color: '#3B82F6' },
  scrollBody: { padding: 16, gap: 10 },
  periodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodLabel: { fontSize: 14, fontWeight: '600', color: '#111113' },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: {
    width: 62,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#111113',
  },
  dash: { color: 'rgba(0,0,0,0.4)' },
  delText: { fontSize: 13, color: '#EF4444', fontWeight: '500', marginLeft: 6 },
  delDisabled: { fontSize: 13, color: 'rgba(0,0,0,0.2)', marginLeft: 6 },
  addBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.6)' },
});
