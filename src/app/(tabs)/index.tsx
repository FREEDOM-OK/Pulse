import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { EventForm } from '@/components/home/event-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionMenu } from '@/components/ui/action-menu';
import { ModuleColors, Spacing } from '@/constants/theme';
import { countEventsByDate } from '@/db/repositories/events';
import { getLatestPlayed } from '@/db/repositories/games';
import { getProfile } from '@/db/repositories/profile';
import { getTaskStats, listTasksByDate, toggleTask } from '@/db/repositories/tasks';
import { getTrainingSummary, type TrainingSummary } from '@/db/repositories/training';
import {
  EVENT_TYPES,
  type EventType,
  type PlayedGameRow,
  type TaskRow,
} from '@/db/types';
import { formatMonthDay, parseDate, todayStr, weekdayLabel } from '@/lib/date';
import { useTheme } from '@/hooks/use-theme';

const EVENT_MENU_LABELS: Record<EventType, string> = {
  expense: '添加重大消费',
  shopping: '添加重大购物',
  meal: '添加今日好饭',
};

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayStr();

  const [name, setName] = useState('用户');
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [training, setTraining] = useState<TrainingSummary>({
    sets: 0,
    items: 0,
    firstExercise: null,
  });
  const [latestPlayed, setLatestPlayed] = useState<PlayedGameRow | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const [eventType, setEventType] = useState<EventType | null>(null);

  const load = useCallback(async () => {
    const [profile, taskList, taskStats, trainingSummary, played, events] = await Promise.all([
      getProfile(),
      listTasksByDate(today),
      getTaskStats(today),
      getTrainingSummary(today),
      getLatestPlayed(),
      countEventsByDate(today),
    ]);
    setName(profile.name);
    setTasks(taskList);
    setStats(taskStats);
    setTraining(trainingSummary);
    setLatestPlayed(played);
    setEventCount(events);
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const handleToggleTask = (task: TaskRow) => {
    toggleTask(task.id)
      .then(() => load())
      .catch(() => undefined);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.page}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.greeting} numberOfLines={1}>
              Hi，{name}
            </ThemedText>
            <View style={styles.dateRow}>
              <ThemedText type="small" style={styles.dateText}>
                今日是 {formatMonthDay(today)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.weekday}>
                {weekdayLabel(parseDate(today))}
              </ThemedText>
            </View>
          </View>

          {/* 框 1：今日计划（内部滚动，占两格高度） */}
          <ThemedView type="backgroundElement" style={[styles.card, styles.planCard]}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold">今日计划</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="打开今日计划"
                onPress={() => router.navigate('/today')}
                style={({ pressed }) => [styles.headerLink, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  完成 {stats.completed}/{stats.total} ›
                </ThemedText>
              </Pressable>
            </View>
            {tasks.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                今天还没有计划
              </ThemedText>
            ) : (
              <ScrollView
                style={styles.taskScroll}
                contentContainerStyle={styles.taskList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}>
                {tasks.map((task) => (
                  <Pressable
                    key={task.id}
                    accessibilityRole="button"
                    accessibilityLabel={`任务 ${task.title}`}
                    accessibilityState={{ checked: task.done === 1 }}
                    onPress={() => handleToggleTask(task)}
                    style={({ pressed }) => [styles.taskRow, pressed && styles.pressed]}>
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
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </ThemedView>

          {/* 框 2、3：添加事件 / 去健身 */}
          <View style={styles.middleRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="添加事件"
              onPress={() => setEventMenuOpen(true)}
              style={({ pressed }) => [styles.halfBox, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" style={styles.fill}>
                <ThemedText type="subtitle" style={[styles.plus, { color: ModuleColors.events }]}>
                  ＋
                </ThemedText>
                <ThemedText type="smallBold">添加事件</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {eventCount > 0 ? `今日 ${eventCount} 条` : '消费 / 购物 / 好饭'}
                </ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="去健身"
              onPress={() => router.navigate('/fitness')}
              style={({ pressed }) => [styles.halfBox, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" style={styles.fill}>
                <ThemedText type="subtitle" style={[styles.boxIcon, { color: ModuleColors.fitness }]}>
                  练
                </ThemedText>
                <ThemedText type="smallBold">去健身</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {training.sets > 0 ? `今日 ${training.sets} 组` : '今天还没练'}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </View>

          {/* 框 4：游戏（通栏） */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="游戏"
            onPress={() => router.navigate('/games')}
            style={({ pressed }) => [styles.gamesBox, pressed && styles.pressed]}>
            <ThemedView type="backgroundElement" style={styles.fill}>
              <View style={styles.gamesRow}>
                <ThemedText type="smallBold" style={styles.gamesLabel}>
                  游戏
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.gamesValue}>
                  {latestPlayed
                    ? `${latestPlayed.game_name} · ${'★'.repeat(latestPlayed.rating)}`
                    : '还没有游玩记录'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  ›
                </ThemedText>
              </View>
            </ThemedView>
          </Pressable>
        </View>
      </SafeAreaView>

      <ActionMenu
        visible={eventMenuOpen}
        title="添加事件"
        items={EVENT_TYPES.map((type) => ({
          key: type,
          label: EVENT_MENU_LABELS[type],
          onPress: () => setEventType(type),
        }))}
        onClose={() => setEventMenuOpen(false)}
      />

      <EventForm
        visible={eventType !== null}
        type={eventType}
        onClose={() => setEventType(null)}
        onSaved={() => {
          setEventType(null);
          load().catch(() => undefined);
        }}
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
  page: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  header: {
    gap: 2,
    paddingHorizontal: Spacing.one,
  },
  greeting: {
    fontSize: 26,
    lineHeight: 32,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  dateText: {
    fontSize: 16,
  },
  weekday: {
    fontSize: 13,
    marginBottom: 1,
  },
  planCard: {
    flex: 2,
    minHeight: 96,
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
  headerLink: {
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.one,
  },
  taskScroll: {
    flex: 1,
  },
  taskList: {
    gap: Spacing.one,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: 2,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
  middleRow: {
    flex: 1,
    minHeight: 88,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  halfBox: {
    flex: 1,
    borderRadius: Spacing.three,
  },
  fill: {
    flex: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    justifyContent: 'center',
    gap: 2,
  },
  plus: {
    fontSize: 22,
    lineHeight: 26,
  },
  boxIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  gamesBox: {
    flex: 1,
    minHeight: 72,
    borderRadius: Spacing.three,
  },
  gamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  gamesLabel: {
    width: 44,
  },
  gamesValue: {
    flex: 1,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.7,
  },
});