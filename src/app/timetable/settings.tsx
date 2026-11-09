import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { SettingsRow } from '@/components/timetable/settings-row';
import { SubPageHeader } from '@/components/timetable/sub-header';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { TextField } from '@/components/ui/text-field';
import { ValueDialog } from '@/components/ui/value-dialog';
import { AppButton } from '@/components/ui/app-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getPeriodCount,
  getRowHeight,
  getShowWeekend,
  getTermConfig,
  setPeriodCount,
  setRowHeight,
  setShowWeekend,
  setTermConfig,
  type TermConfig,
} from '@/db/repositories/settings';
import { bumpDataVersion } from '@/lib/data-version';
import { parseDate, toDateStr } from '@/lib/date';
import {
  MAX_PERIOD_COUNT,
  MAX_ROW_HEIGHT,
  MIN_PERIOD_COUNT,
  MIN_ROW_HEIGHT,
} from '@/lib/timetable-periods';

type ValueField = 'weeks' | 'periods' | 'height' | null;

/** 课表设置：行式六项，改动即时保存。 */
export default function TimetableSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();

  const [term, setTerm] = useState<TermConfig>({ startDate: null, totalWeeks: 18 });
  const [periodCount, setPeriodCountState] = useState(11);
  const [weekend, setWeekend] = useState(true);
  const [rowHeight, setRowHeightState] = useState(64);
  const [valueField, setValueField] = useState<ValueField>(null);
  const [termSheet, setTermSheet] = useState(false);
  const [termDraft, setTermDraft] = useState('');
  const [termError, setTermError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [termConfig, count, showWeekend, height] = await Promise.all([
      getTermConfig(),
      getPeriodCount(),
      getShowWeekend(),
      getRowHeight(),
    ]);
    setTerm(termConfig);
    setPeriodCountState(count);
    setWeekend(showWeekend);
    setRowHeightState(height);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (params.focus === 'import') setNotice('导入课表即将支持，先用「添加课程」手动录入。');
  }, [params.focus]);

  const openTerm = () => {
    setTermDraft(term.startDate ?? toDateStr(new Date()));
    setTermError(null);
    setTermSheet(true);
  };

  const saveTerm = async () => {
    const value = termDraft.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parseDate(value).getTime())) {
      setTermError('日期格式是 YYYY-MM-DD，例如 2026-09-01');
      return;
    }
    const next = { ...term, startDate: value };
    setTerm(next);
    setTermSheet(false);
    await setTermConfig(next);
    bumpDataVersion();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
      <SubPageHeader title="课表设置" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {notice ? (
          <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">{notice}</ThemedText>
          </View>
        ) : null}

        <View style={[styles.card, { borderColor: theme.backgroundElement }]}>
          <SettingsRow label="学期开始日" value={term.startDate} onPress={openTerm} />
          <SettingsRow
            label="总周数"
            value={`${term.totalWeeks} 周`}
            onPress={() => setValueField('weeks')}
          />
          <SettingsRow
            label="节数"
            value={`${periodCount} 节`}
            onPress={() => setValueField('periods')}
          />
          <SettingsRow
            label="显示周六周日"
            right={
              <Switch
                accessibilityLabel="显示周六周日"
                value={weekend}
                trackColor={{ true: theme.text, false: theme.backgroundElement }}
                thumbColor={theme.background}
                onValueChange={async (next) => {
                  setWeekend(next);
                  await setShowWeekend(next);
                  bumpDataVersion();
                }}
              />
            }
          />
          <SettingsRow
            label="课程格子高度"
            value={`${rowHeight}dp`}
            onPress={() => setValueField('height')}
          />
          <SettingsRow label="导入课表" value="即将支持" disabled placeholder="即将支持" divider={false} />
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.footHint}>
          总周数决定周次滚轮的上限；节数调小只会隐藏多余的节，不会删除已填课程。
        </ThemedText>
      </ScrollView>

      <ValueDialog
        visible={valueField === 'weeks'}
        title="总周数"
        hint="一般一学期 18 周，可填 1–30"
        min={1}
        max={30}
        unit=" 周"
        value={term.totalWeeks}
        onCancel={() => setValueField(null)}
        onConfirm={async (value) => {
          const next = { ...term, totalWeeks: value };
          setTerm(next);
          setValueField(null);
          await setTermConfig(next);
          bumpDataVersion();
        }}
      />

      <ValueDialog
        visible={valueField === 'periods'}
        title="节数"
        hint={`每天显示 1–${MAX_PERIOD_COUNT} 节，默认 11 节`}
        min={MIN_PERIOD_COUNT}
        max={MAX_PERIOD_COUNT}
        unit=" 节"
        value={periodCount}
        onCancel={() => setValueField(null)}
        onConfirm={async (value) => {
          setPeriodCountState(value);
          setValueField(null);
          await setPeriodCount(value);
          bumpDataVersion();
        }}
      />

      <ValueDialog
        visible={valueField === 'height'}
        title="课程格子高度"
        hint={`${MIN_ROW_HEIGHT}–${MAX_ROW_HEIGHT}dp，默认 64dp`}
        min={MIN_ROW_HEIGHT}
        max={MAX_ROW_HEIGHT}
        step={4}
        unit="dp"
        value={rowHeight}
        onCancel={() => setValueField(null)}
        onConfirm={async (value) => {
          setRowHeightState(value);
          setValueField(null);
          await setRowHeight(value);
          bumpDataVersion();
        }}
      />

      <ModalSheet visible={termSheet} title="学期开始日" onClose={() => setTermSheet(false)}>
        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            格式 YYYY-MM-DD，第 1 周从这一天所在的周一算起
          </ThemedText>
          <TextField
            accessibilityLabel="学期开始日"
            value={termDraft}
            onChangeText={(value) => {
              setTermDraft(value);
              setTermError(null);
            }}
            placeholder="2026-09-01"
            autoCapitalize="none"
            error={termError ?? undefined}
          />
        </View>
        <View style={modalStyles.actionsRow}>
          <View style={styles.action}>
            <AppButton label="取消" variant="secondary" onPress={() => setTermSheet(false)} />
          </View>
          <View style={styles.action}>
            <AppButton label="保存" onPress={saveTerm} />
          </View>
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
  },
  notice: {
    borderRadius: 12,
    padding: Spacing.three,
  },
  footHint: {
    lineHeight: 19,
  },
  action: {
    flex: 1,
  },
});