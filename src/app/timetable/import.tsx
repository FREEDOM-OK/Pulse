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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { askConfirm } from '@/lib/dialogs';
import { useTimetable } from '@/features/timetable/TimetableContext';
import {
  ParseResult,
  parseImportText,
  SAFE_TOP_DP,
  SAFE_BOTTOM_DP,
} from '@/lib/timetable-core';

const DEMO_TEXT = `高等数学 周一 1-2 1-16 张老师 A101
大学英语 周三 3-4 1-16单 李老师 B203
体育 周五 5-6 王老师 操场`;

export default function ImportTimetableScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeSchedule, importCoursesToActiveSchedule } = useTimetable();

  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParseResult | null>(null);

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/plain',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      setRawText(content);
    }
  };

  const handleParse = () => {
    const res = parseImportText(rawText, activeSchedule.totalWeeks);
    setPreview(res);
  };

  const handleConfirmImport = async () => {
    if (!preview || preview.courses.length === 0) return;
    const ok = await askConfirm({
      title: '确认导入',
      message: '将覆盖当前课表的全部课程，确定导入吗？',
      confirmLabel: '确定',
      danger: true,
    });
    if (!ok) return;
    await importCoursesToActiveSchedule(preview.courses);
    router.replace('/timetable');
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
        <Text style={styles.headerTitle}>导入课表</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Text style={styles.topHint}>
          每行一门课：课程名 星期 节次 [周次] [教师] [地点]，至少写前三项。
        </Text>

        <TextInput
          value={rawText}
          onChangeText={setRawText}
          multiline
          placeholder={DEMO_TEXT}
          placeholderTextColor="rgba(0,0,0,0.3)"
          style={styles.textArea}
        />

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setRawText(DEMO_TEXT)}>
            <Text style={styles.secondaryBtnText}>粘贴示例</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handlePickFile}>
            <Text style={styles.secondaryBtnText}>从文件导入</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleParse}>
            <Text style={styles.primaryBtnText}>解析</Text>
          </TouchableOpacity>
        </View>

        {preview && (
          <View style={styles.previewCard}>
            <Text style={styles.previewHeader}>
              解析到 {preview.courses.length} 门课 / {preview.totalSessions} 个时段
            </Text>

            {preview.courses.map((c) => (
              <Text key={c.name} style={styles.courseRowText}>
                {c.name} · {c.sessions.length} 个时段
              </Text>
            ))}

            {preview.errors.length > 0 && (
              <View style={styles.errorBox}>
                {preview.errors.map((err, i) => (
                  <Text key={i} style={styles.errorLine}>
                    {err}
                  </Text>
                ))}
              </View>
            )}

            {preview.errors.length === 0 && preview.courses.length > 0 && (
              <TouchableOpacity style={styles.importCommitBtn} onPress={handleConfirmImport}>
                <Text style={styles.importCommitBtnText}>导入</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  scrollBody: { padding: 16, gap: 12 },
  topHint: { fontSize: 13, fontWeight: '400', color: 'rgba(0,0,0,0.6)' },
  textArea: {
    minHeight: 168,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    color: '#111113',
    textAlignVertical: 'top',
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '500', color: '#111113' },
  primaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  previewHeader: { fontSize: 14, fontWeight: '600', color: '#111113' },
  courseRowText: { fontSize: 13, color: 'rgba(0,0,0,0.75)' },
  errorBox: { marginTop: 6, gap: 4 },
  errorLine: { fontSize: 12, color: '#EF4444' },
  importCommitBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importCommitBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
