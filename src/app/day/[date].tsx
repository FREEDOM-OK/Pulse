import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubPageHeader } from '@/components/nav/sub-page-header';
import { ThemedView } from '@/components/themed-view';
import { TodayList } from '@/components/today/today-list';
import { DateStrip } from '@/components/ui/date-strip';
import { formatDay, parseDate, todayStr } from '@/lib/date';

function validDate(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return todayStr();
  const parsed = parseDate(value);
  return Number.isNaN(parsed.getTime()) ? todayStr() : value;
}

/** 搜索结果里的计划/备忘详情：直接渲染某一天的计划页数据。 */
export default function DayDetailScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const insets = useSafeAreaInsets();
  const initialDate = validDate(typeof params.date === 'string' ? params.date : undefined);
  const [date, setDate] = useState(initialDate);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <SubPageHeader title="计划" subtitle={formatDay(date)} mode="page" />
        <DateStrip value={date} onChange={setDate} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}>
          <TodayList date={date} showAddRow={false} />
        </ScrollView>
      </SafeAreaView>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});