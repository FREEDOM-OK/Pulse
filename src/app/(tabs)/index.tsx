import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MiniCalendar } from '@/components/home/mini-calendar';
import { Spacing } from '@/constants/theme';
import { getMonthActivity, type DayFlags } from '@/db/repositories/calendar';
import { getLatestPlayed } from '@/db/repositories/games';
import { getTaskStats, listTasksByDate } from '@/db/repositories/tasks';
import { getTrainingSummary, type TrainingSummary } from '@/db/repositories/training';
import type { PlayedGameRow, TaskRow } from '@/db/types';
import { formatMonthDay, monthRange, parseDate, todayStr, weekdayLabel } from '@/lib/date';
import { useTheme } from '@/hooks/use-theme';

const PREVIEW_TASKS = 3;

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayStr();
  const parsed = parseDate(today);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [training, setTraining] = useState<TrainingSummary>({ sets: 0, items: 0, firstExercise: null });
  const [latestPlayed, setLatestPlayed] = useState<PlayedGameRow | null>(null);
  const [cursor, setCursor] = useState({ year: parsed.getFullYear(), month: parsed.getMonth() });
  const [activity, setActivity] = useState<Record<string, DayFlags>>({});

  const load = useCallback(async () => {
    const [taskList, taskStats, trainingSummary, played] = await Promise.all([
      listTasksByDate(today),
      getTaskStats(today),
      getTrainingSummary(today),
      getLatestPlayed(),
    ]);
    setTasks(taskList);
    setStats(taskStats);
    setTraining(trainingSummary);
    setLatestPlayed(played);
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const loadMonth = useCallback(async () => {
    const { from, to } = monthRange(cursor.year, cursor.month);
    setActivity(await getMonthActivity(from, to));
  }, [cursor]);

  useFocusEffect(
    useCallback(() => {
      loadMonth().catch(() => undefined);
    }, [loadMonth])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              {formatMonthDay(today)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.weekday}>
              {weekdayLabel(parseDate(today))}
            </ThemedText>
          </View>

          {/* 今日计划 */}
          <Pressable onPress={() => router.navigate('/today')} style={styles.cardPressable}>
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold">今日计划</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  完成 {stats.completed}/{stats.total} ›
                </ThemedText>
              </View>
              {tasks.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  今天还没有计划
                </ThemedText>
              ) : (
                tasks.slice(0, PREVIEW_TASKS).map((task) => (
                  <View key={task.id} style={styles.taskRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {task.done === 1 ? '☑' : '☐'}
                    </ThemedText>
                    {task.time ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {task.time}
                      </ThemedText>
                    ) : null}
                    <ThemedText
                      type="small"
                      numberOfLines={1}
                      themeColor={task.done === 1 ? 'textSecondary' : 'text'}
                      style={[styles.taskTitle, task.done === 1 && styles.doneText]}>
                      {task.title}
                    </ThemedText>
                  </View>
                ))
              )}
              {tasks.length > PREVIEW_TASKS ? (
                <ThemedText type="small" themeColor="textSecondary">
                  还有 {tasks.length - PREVIEW_TASKS} 条…
                </ThemedText>
              ) : null}
            </ThemedView>
          </Pressable>

          {/* 模块摘要 */}
          <View style={styles.summaryList}>
            <Pressable onPress={() => router.navigate('/fitness')} style={styles.cardPressable}>
              <ThemedView type="backgroundElement" style={styles.summaryRow}>
                <ThemedText type="smallBold" style={styles.summaryLabel}>
                  健身
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.summaryValue}>
                  {training.sets > 0
                    ? `今日 ${training.sets} 组${training.firstExercise ? ` · ${training.firstExercise}` : ''}`
                    : '今天还没练'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  ›
                </ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable onPress={() => router.navigate('/games')} style={styles.cardPressable}>
              <ThemedView type="backgroundElement" style={styles.summaryRow}>
                <ThemedText type="smallBold" style={styles.summaryLabel}>
                  游戏
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.summaryValue}>
                  {latestPlayed
                    ? `${latestPlayed.game_name} · ${'★'.repeat(latestPlayed.rating)}`
                    : '还没有游玩记录'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  ›
                </ThemedText>
              </ThemedView>
            </Pressable>
          </View>

          {/* 日历回顾入口 */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <MiniCalendar
              year={cursor.year}
              month={cursor.month}
              activity={activity}
              onChangeMonth={(delta) => {
                const next = new Date(cursor.year, cursor.month + delta, 1);
                setCursor({ year: next.getFullYear(), month: next.getMonth() });
              }}
              onSelectDate={(date) => router.push({ pathname: '/calendar', params: { date } })}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="查看日历回顾"
              onPress={() => router.push({ pathname: '/calendar', params: { date: today } })}
              style={({ pressed }) => [styles.calendarLink, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                查看完整日历回顾 ›
              </ThemedText>
            </Pressable>
          </ThemedView>
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
  },
  weekday: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 3,
  },
  cardPressable: {
    borderRadius: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  memoBody: {
    flex: 1,
    gap: Spacing.half,
  },
  memoTitleRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'flex-start',
  },
  memoContent: {
    flex: 1,
    fontSize: 14,
  },
  pin: {
    fontSize: 12,
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(127,127,127,0.16)',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
  },
  tagText: {
    fontSize: 11,
  },
  moreButton: {
    paddingHorizontal: Spacing.one,
  },
  summaryList: {
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  summaryLabel: {
    width: 44,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
  },
  calendarLink: {
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
  actionList: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  actionButton: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  deleteText: {
    color: '#D64545',
  },
  pressed: {
    opacity: 0.7,
  },
});
