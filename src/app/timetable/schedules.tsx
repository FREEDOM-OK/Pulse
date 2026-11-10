import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTimetable } from '@/features/timetable/TimetableContext';
import { ScheduleEntity } from '@/features/timetable/repository';
import { SAFE_TOP_DP, SAFE_BOTTOM_DP } from '@/lib/timetable-core';

export default function SchedulesManageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    schedules,
    activeSchedule,
    courses,
    switchSchedule,
    createOrUpdateSchedule,
    deleteSchedule,
  } = useTimetable();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [schedName, setSchedName] = useState('');
  const [startDate, setStartDate] = useState('2026-09-07');
  const [totalWeeks, setTotalWeeks] = useState('20');

  const openForm = (sched?: ScheduleEntity) => {
    if (sched) {
      setEditingId(sched.id);
      setSchedName(sched.name);
      setStartDate(sched.startDate);
      setTotalWeeks(String(sched.totalWeeks));
    } else {
      setEditingId(undefined);
      setSchedName('');
      setStartDate('2026-09-07');
      setTotalWeeks('20');
    }
    setDrawerVisible(true);
  };

  const handleSave = async () => {
    const trimmed = schedName.trim();
    if (!trimmed) {
      Alert.alert('提示', '请填写课表名称');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      Alert.alert('提示', '开学日期格式应为 YYYY-MM-DD');
      return;
    }
    const weeksNum = parseInt(totalWeeks, 10);
    if (isNaN(weeksNum) || weeksNum < 1 || weeksNum > 60) {
      Alert.alert('提示', '总周数应为 1-60 的数字');
      return;
    }

    await createOrUpdateSchedule({
      id: editingId,
      name: trimmed,
      startDate: startDate.trim(),
      totalWeeks: weeksNum,
    });
    setDrawerVisible(false);
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
        <Text style={styles.headerTitle}>课表管理</Text>
        <TouchableOpacity onPress={() => openForm()}>
          <Text style={styles.addTopText}>＋ 新建</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {schedules.map((s) => {
          const isCurrent = s.id === activeSchedule.id;
          const cCount = isCurrent ? courses.length : 0;

          return (
            <TouchableOpacity
              key={s.id}
              style={styles.schedCard}
              onPress={async () => {
                await switchSchedule(s.id);
                router.replace('/timetable');
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.schedName}>{s.name}</Text>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>当前</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.subMeta}>
                  {cCount} 门课 · {s.startDate.replace(/-/g, '/')} 开学 · 共 {s.totalWeeks} 周
                </Text>
              </View>

              <TouchableOpacity
                style={styles.moreBtn}
                onPress={() => {
                  Alert.alert(s.name, '操作课表', [
                    { text: '重命名', onPress: () => openForm(s) },
                    {
                      text: '删除',
                      style: 'destructive',
                      onPress: () => {
                        if (schedules.length <= 1) {
                          Alert.alert('提示', '至少保留一张课表');
                          return;
                        }
                        Alert.alert(
                          '确认删除',
                          `确定删除「${s.name}」吗？里面的课程也会一并删除。`,
                          [
                            { text: '取消', style: 'cancel' },
                            {
                              text: '删除',
                              style: 'destructive',
                              onPress: () => deleteSchedule(s.id),
                            },
                          ]
                        );
                      },
                    },
                    { text: '取消', style: 'cancel' },
                  ]);
                }}
              >
                <Text style={styles.moreDots}>⋯</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={drawerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.drawerSheet}>
            <Text style={styles.drawerTitle}>{editingId ? '重命名课表' : '新建课表'}</Text>

            <Text style={styles.fieldLabel}>课表名称</Text>
            <TextInput
              value={schedName}
              onChangeText={setSchedName}
              placeholder="例如：2026 秋"
              style={styles.input}
            />

            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>开学日期 (YYYY-MM-DD)</Text>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date();
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  setStartDate(`${y}-${m}-${day}`);
                }}
              >
                <Text style={styles.pickTodayText}>选今天</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-09-07"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>总周数 (1–60)</Text>
            <TextInput
              value={totalWeeks}
              onChangeText={setTotalWeeks}
              keyboardType="number-pad"
              style={styles.input}
            />

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDrawerVisible(false)}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  addTopText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  scrollBody: { padding: 16, gap: 10 },
  schedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  schedName: { fontSize: 16, fontWeight: '600', color: '#111113' },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: '#3B82F6' },
  subMeta: { fontSize: 12, color: 'rgba(0,0,0,0.6)', marginTop: 4 },
  moreBtn: { padding: 8 },
  moreDots: { fontSize: 18, color: 'rgba(0,0,0,0.5)' },
  modalOverlay: {
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: { fontSize: 12, color: 'rgba(0,0,0,0.6)', marginBottom: 6, marginTop: 8 },
  pickTodayText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
  input: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111113',
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: 'rgba(0,0,0,0.6)' },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
