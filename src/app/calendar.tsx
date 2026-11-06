import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MonthView } from '@/components/calendar/month-view';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';
import { getDayDetail, getMonthActivity, type DayDetail, type DayFlags } from '@/db/repositories/calendar';
import { formatDay, formatDuration, monthRange, parseDate, todayStr } from '@/lib/date';
import { MEAL_LABEL } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export default function CalendarScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const initialDate = typeof params.date === 'string' && params.date ? params.date : todayStr();

  const [selected, setSelected] = useState(initialDate);
  const [cursor, setCursor] = useState(() => {
    const parsed = parseDate(initialDate);
    return { year: parsed.getFullYear(), month: parsed.getMonth() };
  });
  const [activity, setActivity] = useState<Record<string, DayFlags>>({});
  const [detail, setDetail] = useState<DayDetail | null>(null);

  const loadMonth = useCallback(async () => {
    const { from, to } = monthRange(cursor.year, cursor.month);
    setActivity(await getMonthActivity(from, to));
  }, [cursor]);

  useEffect(() => {
    loadMonth().catch(() => undefined);
  }, [loadMonth]);

  useEffect(() => {
    getDayDetail(selected)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selected]);

  const hasAny = useMemo(() => {
    if (!detail) return false;
    return (
      detail.tasks.length > 0 ||
      detail.fitness.length > 0 ||
      detail.diet.records.length > 0 ||
      detail.games.length > 0
    );
  }, [detail]);

  const taskStats = useMemo(() => {
    if (!detail) return { total: 0, completed: 0 };
    return {
      total: detail.tasks.length,
      completed: detail.tasks.filter((task) => task.done === 1).length,
    };
  }, [detail]);

  const fitnessSets = useMemo(
    () => (detail ? detail.fitness.reduce((sum, item) => sum + item.sets, 0) : 0),
    [detail]
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <MonthView
          year={cursor.year}
          month={cursor.month}
          activity={activity}
          selected={selected}
          onChangeMonth={(delta) => {
            const next = new Date(cursor.year, cursor.month + delta, 1);
            setCursor({ year: next.getFullYear(), month: next.getMonth() });
          }}
          onSelect={setSelected}
        />

        <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />

        <View style={styles.dayHeader}>
          <ThemedText type="smallBold" style={styles.dayTitle}>
            {formatDay(selected)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {selected === todayStr() ? '今天' : '历史'}
          </ThemedText>
        </View>

        {!hasAny ? (
          <EmptyState text="这天没有记录" />
        ) : (
          <View style={styles.sections}>
            {detail && detail.tasks.length > 0 ? (
              <ThemedView type="backgroundElement" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">计划</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    共 {taskStats.total} 条 · 完成 {taskStats.completed}
                  </ThemedText>
                </View>
                {detail.tasks.map((task) => (
                  <View key={task.id} style={styles.plainRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {task.done === 1 ? '☑' : '☐'}
                    </ThemedText>
                    {task.time ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {task.time}
                      </ThemedText>
                    ) : null}
                    <ThemedText
                      type="small"
                      themeColor={task.done === 1 ? 'textSecondary' : 'text'}
                      style={[styles.flexText, task.done === 1 && styles.doneText]}>
                      {task.title}
                    </ThemedText>
                  </View>
                ))}
              </ThemedView>
            ) : null}

            {detail && detail.fitness.length > 0 ? (
              <ThemedView type="backgroundElement" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">健身</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    共 {fitnessSets} 组
                  </ThemedText>
                </View>
                {detail.fitness.map((item) => (
                  <View key={item.exerciseName} style={styles.plainRow}>
                    <ThemedText type="small" style={styles.flexText}>
                      {item.exerciseName}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.sets} 组
                    </ThemedText>
                  </View>
                ))}
              </ThemedView>
            ) : null}

            {detail && detail.diet.records.length > 0 ? (
              <ThemedView type="backgroundElement" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">饮食</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {detail.diet.totalCalories} kcal
                  </ThemedText>
                </View>
                {detail.diet.records.map((record) => (
                  <View key={record.id} style={styles.plainRow}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.mealLabel}>
                      {MEAL_LABEL[record.meal_type]}
                    </ThemedText>
                    <ThemedText type="small" style={styles.flexText} numberOfLines={1}>
                      {record.content}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {record.calories != null ? `${record.calories} kcal` : '未填'}
                    </ThemedText>
                  </View>
                ))}
              </ThemedView>
            ) : null}

            {detail && detail.games.length > 0 ? (
              <ThemedView type="backgroundElement" style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">游戏</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {detail.games.length} 条
                  </ThemedText>
                </View>
                {detail.games.map((record) => (
                  <View key={record.id} style={styles.gameRow}>
                    <View style={styles.gameTitleRow}>
                      <ThemedText type="small" style={styles.flexText}>
                        {record.game_name}
                      </ThemedText>
                      <ThemedText type="small" style={styles.stars}>
                        {'★'.repeat(record.rating)}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDuration(record.duration_minutes)}
                    </ThemedText>
                  </View>
                ))}
              </ThemedView>
            ) : null}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.three,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  dayTitle: {
    fontSize: 15,
  },
  sections: {
    gap: Spacing.two,
  },
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  flexText: {
    flex: 1,
    fontSize: 14,
  },
  mealLabel: {
    width: 34,
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
  gameRow: {
    gap: 2,
  },
  gameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stars: {
    color: '#F2B33D',
  },
});
