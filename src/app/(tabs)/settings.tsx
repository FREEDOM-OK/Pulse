import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { Spacing } from '@/constants/theme';
import {
  BackupError,
  clearAllData,
  exportBackup,
  importBackup,
  summarizeBackup,
  type BackupPayload,
} from '@/db/repositories/backup';
import type { ThemeSetting } from '@/db/repositories/settings';
import { buildAutoBackupName, buildBackupFileName, parseBackupText, serializeBackup } from '@/lib/backup-text';
import { pickBackupText, saveAutoBackup, saveBackupFile } from '@/lib/backup-file';
import { useThemePreference } from '@/theme/theme-context';
import { useTheme } from '@/hooks/use-theme';

const THEME_OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

function errorMessage(error: unknown): string {
  if (error instanceof BackupError) return error.message;
  if (error instanceof Error) return error.message;
  return '操作失败';
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<BackupPayload | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await exportBackup();
      const result = await saveBackupFile(buildBackupFileName(), serializeBackup(payload));
      setMessage(result.message);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const handlePickImport = async () => {
    setError(null);
    try {
      const text = await pickBackupText();
      if (!text) return;
      setImportPayload(parseBackupText(text));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const handleConfirmImport = async () => {
    if (!importPayload) return;
    setBusy(true);
    setError(null);
    try {
      const current = serializeBackup(await exportBackup());
      const location = await saveAutoBackup(buildAutoBackupName(), current);
      await importBackup(importPayload);
      setImportPayload(null);
      setMessage(`导入完成，数据已整体替换。${location}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setClearOpen(false);
    setBusy(true);
    setError(null);
    try {
      const current = serializeBackup(await exportBackup());
      const location = await saveAutoBackup(buildAutoBackupName(), current);
      await clearAllData();
      await setPreference('system');
      setMessage(`已清空所有数据，主题恢复为「跟随系统」。${location}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const summary = importPayload ? summarizeBackup(importPayload) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              设置
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              数据与偏好
            </ThemedText>
          </View>

          {message ? (
            <ThemedView type="backgroundElement" style={styles.messageBox}>
              <ThemedText type="small">{message}</ThemedText>
            </ThemedView>
          ) : null}

          {error ? (
            <ThemedView type="backgroundElement" style={styles.errorBox}>
              <ThemedText type="small" style={styles.errorText}>
                {error}
              </ThemedText>
            </ThemedView>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            数据
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="备份数据"
              disabled={busy}
              onPress={() => handleExport().catch(() => undefined)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">备份数据</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  导出全部数据为一个 JSON 文件
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="导入备份"
              disabled={busy}
              onPress={() => handlePickImport().catch(() => undefined)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">导入备份</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  选择备份文件，整体替换当前数据
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="清空所有数据"
              disabled={busy}
              onPress={() => setClearOpen(true)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small" style={styles.danger}>
                  清空所有数据
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  清空前会自动备份一份
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            外观
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <View style={styles.row}>
              <ThemedText type="small">主题</ThemedText>
              <View style={styles.themeOptions}>
                {THEME_OPTIONS.map((option) => {
                  const active = preference === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => {
                        setPreference(option.value).catch(() => undefined);
                      }}
                      style={({ pressed }) => [
                        styles.themeChip,
                        { backgroundColor: active ? theme.text : theme.background },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="small"
                        style={{ color: active ? theme.background : theme.text }}>
                        {active ? '✓ ' : ''}
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            关于
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <View style={styles.row}>
              <ThemedText type="small">生活记录</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                版本 {version}
              </ThemedText>
            </View>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            数据只保存在本机，不联网、不上传。
          </ThemedText>
        </ScrollView>
      </SafeAreaView>

      <ModalSheet
        visible={importPayload !== null}
        title="确认导入备份"
        onClose={() => setImportPayload(null)}
        footer={
          <View style={styles.modalActions}>
            <Pressable
              onPress={() => setImportPayload(null)}
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small">取消</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleConfirmImport().catch(() => undefined)}
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: theme.text },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" style={{ color: theme.background }}>
                确认导入
              </ThemedText>
            </Pressable>
          </View>
        }>
        {summary ? (
          <View style={styles.summaryList}>
            <ThemedText type="small" themeColor="textSecondary">
              导出时间：{summary.exportedAt || '未知'}
            </ThemedText>
            <ThemedText type="small">任务 {summary.tasks} 条</ThemedText>
            <ThemedText type="small">备忘 {summary.memos} 条</ThemedText>
            <ThemedText type="small">训练项目 {summary.trainingItems} 个</ThemedText>
            <ThemedText type="small">完成组 {summary.setRecords} 组</ThemedText>
            <ThemedText type="small">饮食 {summary.dietRecords} 条</ThemedText>
            <ThemedText type="small">想玩 {summary.wishlist} 条</ThemedText>
            <ThemedText type="small">已玩 {summary.playedGames} 条</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.warning}>
              导入会整体替换当前数据；导入前会自动把当前数据另存一份。
            </ThemedText>
          </View>
        ) : null}
      </ModalSheet>

      <ConfirmDialog
        visible={clearOpen}
        title="清空所有数据？"
        message="所有任务、备忘、训练、饮食、游戏记录都会被删除，清空前会自动备份一份。"
        confirmLabel="确认清空"
        danger
        onCancel={() => setClearOpen(false)}
        onConfirm={() => handleClear().catch(() => undefined)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    paddingHorizontal: Spacing.one,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  sectionLabel: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  group: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  hint: {
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  themeChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  messageBox: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  errorBox: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  errorText: {
    color: '#D64545',
  },
  danger: {
    color: '#D64545',
  },
  footer: {
    marginTop: Spacing.four,
    textAlign: 'center',
    fontSize: 11,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  modalButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    minWidth: 80,
    alignItems: 'center',
  },
  summaryList: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  warning: {
    marginTop: Spacing.two,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
