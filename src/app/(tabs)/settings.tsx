import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionMenu } from '@/components/ui/action-menu';
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
import {
  getFitnessDefaults,
  getMiddleTab,
  getSortMode,
  setFitnessDefaults,
  setMiddleTab,
  setSortMode,
  type ThemeSetting,
} from '@/db/repositories/settings';
import {
  MIDDLE_TABS,
  MIDDLE_TAB_LABELS,
  SORT_MODES,
  SORT_MODE_LABELS,
  type MiddleTab,
  type ProfileRow,
  type SortMode,
} from '@/db/types';
import { bumpDataVersion } from '@/lib/data-version';
import { buildAutoBackupName, buildBackupFileName, parseBackupText, serializeBackup } from '@/lib/backup-text';
import { pickBackupText, saveAutoBackup, saveBackupFile } from '@/lib/backup-file';
import { deleteAvatarFile } from '@/lib/avatar';
import { getProfile } from '@/db/repositories/profile';
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
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<BackupPayload | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [defaultRepsText, setDefaultRepsText] = useState('8');
  const [defaultWeightText, setDefaultWeightText] = useState('0');
  const [sortMode, setSortModeState] = useState<SortMode>('memo-first');
  const [sortOpen, setSortOpen] = useState(false);
  const [middle, setMiddleState] = useState<MiddleTab>('fitness');
  const [middleOpen, setMiddleOpen] = useState(false);

  useEffect(() => {
    getFitnessDefaults()
      .then((defaults) => {
        setDefaultRepsText(String(defaults.reps));
        setDefaultWeightText(String(defaults.weight));
      })
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getProfile()
        .then(setProfile)
        .catch(() => undefined);
      getSortMode()
        .then(setSortModeState)
        .catch(() => undefined);
      getMiddleTab()
        .then(setMiddleState)
        .catch(() => undefined);
    }, [])
  );

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
      await deleteAvatarFile(profile?.avatarUri ?? null);
      setProfile(null);
      await setPreference('system');
      setMessage(`已清空所有数据，主题恢复为「跟随系统」。${location}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const sumDefaultReps = Math.round(Number(defaultRepsText));
  const sumDefaultWeight = Math.round(Number(defaultWeightText));
  const defaultsValid =
    Number.isInteger(sumDefaultReps) &&
    sumDefaultReps >= 1 &&
    Number.isInteger(sumDefaultWeight) &&
    sumDefaultWeight >= 0;

  const commitFitnessDefaults = async () => {
    if (!defaultsValid) return;
    const defaults = { reps: sumDefaultReps, weight: sumDefaultWeight };
    try {
      await setFitnessDefaults(defaults);
      setDefaultRepsText(String(defaults.reps));
      setDefaultWeightText(String(defaults.weight));
      setError(null);
      setMessage('健身默认值已保存。');
    } catch (reason) {
      setMessage(null);
      setError(errorMessage(reason));
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`账号 ${profile?.name ?? '用户'}`}
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.account, pressed && styles.pressed]}>
            <View style={[styles.accountAvatar, { backgroundColor: theme.backgroundElement }]}>
              {profile?.avatarUri ? (
                <Image
                  key={profile.avatarUri}
                  source={{ uri: profile.avatarUri }}
                  style={styles.accountAvatarImage}
                />
              ) : (
                <ThemedText type="subtitle" style={styles.accountInitial}>
                  {(profile?.name ?? '用户').slice(0, 1)}
                </ThemedText>
              )}
            </View>
            <ThemedText style={styles.accountName}>{profile?.name ?? '用户'}</ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            首页
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="首页卡片"
              onPress={() => router.push('/cards')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">首页卡片</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  调整 Dash 卡片的顺序与显示开关
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="列表排序"
              onPress={() => setSortOpen(true)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">列表排序</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  首页与今日计划共用
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {SORT_MODE_LABELS[sortMode]} ›
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            快捷入口
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="快捷入口 健身"
              onPress={() => router.push('/fitness')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedText type="small">健身</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="快捷入口 课表"
              onPress={() => router.push('/timetable')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedText type="small">课表</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="快捷入口 日历回顾"
              onPress={() => router.push('/calendar')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedText type="small">日历回顾</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            外观
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`第三个标签 ${MIDDLE_TAB_LABELS[middle]}`}
              onPress={() => setMiddleOpen(true)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">第三个标签</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  底栏中间放健身还是课表
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {MIDDLE_TAB_LABELS[middle]} ›
              </ThemedText>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.background }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="个性化"
              onPress={() => router.push('/personalize')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <ThemedText type="small">个性化</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  主题、Dash 卡片模式与样式
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>
          </ThemedView>

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
            健身默认值
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <View style={styles.defaultsRow}>
              <ThemedText type="small">默认次数</ThemedText>
              <TextInput
                value={defaultRepsText}
                onChangeText={setDefaultRepsText}
                keyboardType="number-pad"
                maxLength={3}
                accessibilityLabel="健身默认次数"
                style={[styles.numberInput, { backgroundColor: theme.background, color: theme.text }]}
              />
              <ThemedText type="small" themeColor="textSecondary">次</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.background }]} />
            <View style={styles.defaultsRow}>
              <ThemedText type="small">默认重量</ThemedText>
              <TextInput
                value={defaultWeightText}
                onChangeText={setDefaultWeightText}
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel="健身默认重量"
                style={[styles.numberInput, { backgroundColor: theme.background, color: theme.text }]}
              />
              <ThemedText type="small" themeColor="textSecondary">kg</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.background }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="保存健身默认值"
              disabled={busy || !defaultsValid}
              onPress={() => commitFitnessDefaults().catch(() => undefined)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed, !defaultsValid && styles.disabled]}
            >
              <View style={styles.rowText}>
                <ThemedText type="small">保存健身默认值</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  之后新增的训练动作会使用这里的次数和重量，仍可单独修改
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">›</ThemedText>
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
            <ThemedText type="small">训练项目 {summary.trainingItems} 个</ThemedText>
            <ThemedText type="small">完成组 {summary.setRecords} 组</ThemedText>
            <ThemedText type="small">事件 {summary.events} 条</ThemedText>
            <ThemedText type="small">想玩 {summary.wishlist} 条</ThemedText>
            <ThemedText type="small">已玩 {summary.playedGames} 条</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.warning}>
              导入会整体替换当前数据；导入前会自动把当前数据另存一份。
            </ThemedText>
          </View>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={sortOpen}
        title="列表排序"
        onClose={() => setSortOpen(false)}>
        <View style={styles.summaryList}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.warning}>
            同时作用于首页 Tasks 与今日计划。置顶内容始终排在最前，已完成的沉在底部。
          </ThemedText>
          {SORT_MODES.map((mode) => {
            const active = sortMode === mode;
            return (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  setSortModeState(mode);
                  setSortOpen(false);
                  setSortMode(mode)
                    .then(() => bumpDataVersion())
                    .catch(() => undefined);
                }}
                style={({ pressed }) => [
                  styles.sortRow,
                  { backgroundColor: active ? theme.background : 'transparent' },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="small">
                  {active ? '✓ ' : ''}
                  {SORT_MODE_LABELS[mode]}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  {mode === 'memo-first'
                    ? '备忘置顶、有时间的在前'
                    : mode === 'task-first'
                      ? '计划置顶、有时间的在前'
                      : '只按时间排列'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ModalSheet>

      <ActionMenu
        visible={middleOpen}
        title="第三个标签"
        items={MIDDLE_TABS.map((tab) => ({
          key: tab,
          label: MIDDLE_TAB_LABELS[tab],
          onPress: () => {
            setMiddleOpen(false);
            setMiddleState(tab);
            setMiddleTab(tab)
              .then(() => bumpDataVersion())
              .catch(() => undefined);
          },
        }))}
        onClose={() => setMiddleOpen(false)}
      />

      <ConfirmDialog
        visible={clearOpen}
        title="清空所有数据？"
        message="所有任务、训练、事件、游戏记录都会被删除，清空前会自动备份一份。"
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
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarImage: {
    width: '100%',
    height: '100%',
  },
  accountInitial: {
    fontSize: 22,
    lineHeight: 28,
  },
  accountName: {
    fontSize: 22,
    fontWeight: 600,
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
  defaultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  numberInput: {
    width: 72,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 14,
    textAlign: 'center',
    minHeight: 34,
  },
  disabled: {
    opacity: 0.4,
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
  sortRow: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: 2,
  },
});
