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
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { askConfirm, showNotice } from '@/lib/dialogs';
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
  const theme = useTheme();
  const { scheme } = useThemePreference();
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
    try {
      await importCoursesToActiveSchedule(preview.courses);
    } catch (err) {
      // 导入失败要留在当前页并提示，避免未捕获的 Promise 拒绝把页面崩回首页
      showNotice(`导入失败：${err instanceof Error ? err.message : '未知错误'}`);
      return;
    }
    router.replace('/timetable');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top || SAFE_TOP_DP,
          paddingBottom: insets.bottom || SAFE_BOTTOM_DP,
        },
      ]}
    >
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
          onPress={() => router.back()}
        >
          <Text style={[styles.backArrow, { color: theme.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>导入课表</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={styles.scrollBody}>
        <Text style={[styles.topHint, { color: theme.textSecondary }]}>
          每行一门课：课程名 星期 节次 [周次] [教师] [地点]，至少写前三项。
        </Text>

        <TextInput
          value={rawText}
          onChangeText={setRawText}
          multiline
          accessibilityLabel="导入文本"
          placeholder={DEMO_TEXT}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.textArea,
            { backgroundColor: theme.backgroundElement, color: theme.text },
          ]}
        />

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: theme.backgroundSelected }]}
            accessibilityLabel="粘贴示例"
            onPress={() => setRawText(DEMO_TEXT)}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>粘贴示例</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: theme.backgroundSelected }]}
            accessibilityLabel="从文件导入"
            onPress={handlePickFile}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>从文件导入</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleParse} accessibilityLabel="解析">
            <Text style={styles.primaryBtnText}>解析</Text>
          </TouchableOpacity>
        </View>

        {preview && (
          <View style={[styles.previewCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.previewHeader, { color: theme.text }]}>
              解析到 {preview.courses.length} 门课 / {preview.totalSessions} 个时段
            </Text>

            {preview.courses.map((c) => (
              <Text key={c.name} style={[styles.courseRowText, { color: theme.text }]}>
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
              <TouchableOpacity
                style={styles.importCommitBtn}
                accessibilityLabel="确认导入"
                onPress={handleConfirmImport}
              >
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
  scrollBody: { padding: 16, gap: 12 },
  topHint: { fontSize: 13, fontWeight: '400' },
  textArea: {
    minHeight: 168,
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '500' },
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
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  previewHeader: { fontSize: 14, fontWeight: '600' },
  courseRowText: { fontSize: 13 },
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
