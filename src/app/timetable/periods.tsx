import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { SubPageHeader } from '@/components/timetable/sub-header';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PeriodTime } from '@/db/types';
import { getPeriodTimes, setPeriodTimes } from '@/db/repositories/settings';
import { bumpDataVersion } from '@/lib/data-version';
import { findPeriodOverlap, isValidTime } from '@/lib/timetable-periods';

/** 上课时间：逐节改开始 / 结束时间，保存前校验格式与重叠。 */
export default function TimetablePeriodsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [times, setTimes] = useState<PeriodTime[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setTimes(await getPeriodTimes());
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const update = (index: number, key: keyof PeriodTime, value: string) => {
    setTimes((current) =>
      current.map((time, currentIndex) =>
        currentIndex === index ? { ...time, [key]: value } : time
      )
    );
    setError(null);
  };

  const save = async () => {
    for (let index = 0; index < times.length; index += 1) {
      const time = times[index];
      if (!isValidTime(time.start) || !isValidTime(time.end)) {
        setError(`第 ${index + 1} 节的时间要写成 HH:MM，例如 08:00`);
        return;
      }
      if (time.end <= time.start) {
        setError(`第 ${index + 1} 节的结束时间要晚于开始时间`);
        return;
      }
    }
    const overlap = findPeriodOverlap(times);
    if (overlap !== null) {
      setError(`第 ${overlap} 节与第 ${overlap - 1} 节时间重叠`);
      return;
    }
    await setPeriodTimes(times);
    bumpDataVersion();
    router.back();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
      <SubPageHeader title="上课时间" onBack={() => router.back()} actionLabel="保存" onAction={save} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          共 {times.length} 节。改了时间后，课表左侧与课程详情里的时间会一起变。
        </ThemedText>

        {error ? (
          <ThemedText type="small" style={[styles.error, { color: theme.text }]}>
            {error}
          </ThemedText>
        ) : null}

        <View style={[styles.table, { borderColor: theme.backgroundElement }]}>
          <View style={[styles.headRow, { borderBottomColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.colNo}>
              节次
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.colTime}>
              开始
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.colTime}>
              结束
            </ThemedText>
          </View>

          {times.map((time, index) => (
            <View
              key={index}
              style={[
                styles.row,
                index < times.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.backgroundElement,
                },
              ]}>
              <ThemedText style={[styles.colNo, styles.periodNo]}>第 {index + 1} 节</ThemedText>
              <View style={styles.colTime}>
                <TextField
                  accessibilityLabel={`第 ${index + 1} 节开始时间`}
                  value={time.start}
                  onChangeText={(value) => update(index, 'start', value)}
                  placeholder="08:00"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
              <View style={styles.colTime}>
                <TextField
                  accessibilityLabel={`第 ${index + 1} 节结束时间`}
                  value={time.end}
                  onChangeText={(value) => update(index, 'end', value)}
                  placeholder="08:45"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  hint: {
    lineHeight: 19,
  },
  error: {
    fontWeight: '600',
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: Spacing.three,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  colNo: {
    width: 96,
    fontSize: 13,
  },
  periodNo: {
    fontWeight: '600',
  },
  colTime: {
    flex: 1,
  },
  input: {
    fontSize: 13,
  },
});