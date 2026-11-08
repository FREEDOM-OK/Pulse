import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarPanel } from '@/components/calendar/calendar-panel';
import { EventForm } from '@/components/home/event-form';
import { MemoEditor } from '@/components/home/memo-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionMenu } from '@/components/ui/action-menu';
import { ModuleColors, Spacing } from '@/constants/theme';
import { countEventsByDate } from '@/db/repositories/events';
import { listWishlist } from '@/db/repositories/games';
import { getQuickMemo } from '@/db/repositories/memo';
import { getProfile } from '@/db/repositories/profile';
import { getTaskStats, listTasksByDate, toggleTask } from '@/db/repositories/tasks';
import { getTrainingSummary, type TrainingSummary } from '@/db/repositories/training';
import {
  EVENT_TYPES,
  type EventType,
  type TaskRow,
  type WishlistRow,
} from '@/db/types';
import { formatMonthDay, parseDate, todayStr, weekdayLabel } from '@/lib/date';
import { INITIAL_SCROLL_STATE, resolvePagerTarget, type ScrollState } from '@/lib/home-pager';
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
  const [wishes, setWishes] = useState<WishlistRow[]>([]);
  const [memo, setMemo] = useState('');
  const [memoOpen, setMemoOpen] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [onPage2, setOnPage2] = useState(false);
  const pageHeightRef = useRef(0);

  const progress = useRef(new Animated.Value(0)).current;
  const progressRef = useRef(0);
  const startProgress = useRef(0);
  const planScroll = useRef<ScrollState>(INITIAL_SCROLL_STATE);
  const calendarScroll = useRef<ScrollState>(INITIAL_SCROLL_STATE);
  const planOffset = useRef(0);
  const planContentHeight = useRef(0);
  const planViewportHeight = useRef(0);

  const load = useCallback(async () => {
    const [profile, taskList, taskStats, trainingSummary, wishList, quickMemo, events] =
      await Promise.all([
        getProfile(),
        listTasksByDate(today),
        getTaskStats(today),
        getTrainingSummary(today),
        listWishlist(),
        getQuickMemo(),
        countEventsByDate(today),
      ]);
    setName(profile.name);
    setTasks(taskList);
    setStats(taskStats);
    setTraining(trainingSummary);
    setWishes(wishList);
    setMemo(quickMemo);
    setEventCount(events);
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      // 每次回到首页都回到第一页（上下翻页的另一页只作为日历查看用）
      progress.setValue(0);
      progressRef.current = 0;
      startProgress.current = 0;
      load().catch(() => undefined);
      setRefreshToken((token) => token + 1);
    }, [load, progress])
  );

  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      progressRef.current = value;
      const next = value > 0.5;
      setOnPage2((prev) => (prev === next ? prev : next));
    });
    return () => progress.removeListener(listener);
  }, [progress]);

  const animateTo = useCallback(
    (target: 0 | 1) => {
      Animated.spring(progress, {
        toValue: target,
        useNativeDriver: false,
        speed: 18,
        bounciness: 0,
      }).start();
    },
    [progress]
  );

  useEffect(() => {
    if (!onPage2) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      animateTo(0);
      return true;
    });
    return () => subscription.remove();
  }, [animateTo, onPage2]);

  const pager = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_event, gesture) => {
        if (Math.abs(gesture.dy) < 10) return false;
        if (Math.abs(gesture.dy) < Math.abs(gesture.dx) * 1.2) return false;
        if (progressRef.current > 0.5) {
          // 第二页：只有在日历滚到顶部、往下拖时才翻回去
          return calendarScroll.current.atTop && gesture.dy > 0;
        }
        // 第一页：计划框滚到底（或内容不够滚）才把向上拖交给翻页
        if (!planScroll.current.scrollable) return true;
        return planScroll.current.atBottom && gesture.dy < 0;
      },
      onPanResponderGrant: () => {
        startProgress.current = progressRef.current > 0.5 ? 1 : 0;
      },
      onPanResponderMove: (_event, gesture) => {
        if (pageHeightRef.current <= 0) return;
        let next = startProgress.current - gesture.dy / pageHeightRef.current;
        if (next < 0) next *= 0.3;
        if (next > 1) next = 1 + (next - 1) * 0.3;
        progress.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        const target = resolvePagerTarget({
          dragY: gesture.dy,
          velocityY: gesture.vy,
          height: pageHeightRef.current,
          current: startProgress.current > 0.5 ? 1 : 0,
        });
        animateTo(target);
      },
      onPanResponderTerminate: () => {
        animateTo(progressRef.current > 0.5 ? 1 : 0);
      },
    })
  ).current;

  const refreshPlanScroll = () => {
    planScroll.current = {
      atTop: planOffset.current <= 1,
      atBottom:
        planOffset.current + planViewportHeight.current >= planContentHeight.current - 1,
      scrollable: planContentHeight.current > planViewportHeight.current + 1,
    };
  };

  const handleToggleTask = (task: TaskRow) => {
    toggleTask(task.id)
      .then(() => load())
      .catch(() => undefined);
  };

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -pageHeight],
  });
  const page2TranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [pageHeight, 0],
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View
          style={styles.pager}
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            pageHeightRef.current = height;
            setPageHeight(height);
          }}
          {...pager.panHandlers}>
          <Animated.View style={[styles.pageWrap, { transform: [{ translateY }] }]}>
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
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={(event) => {
                      planOffset.current = event.nativeEvent.contentOffset.y;
                      refreshPlanScroll();
                    }}
                    onContentSizeChange={(_width, height) => {
                      planContentHeight.current = height;
                      refreshPlanScroll();
                    }}
                    onLayout={(event) => {
                      planViewportHeight.current = event.nativeEvent.layout.height;
                      refreshPlanScroll();
                    }}>
                    {tasks.map((task) => (
                      <Pressable
                        key={task.id}
                        accessibilityRole="button"
                        accessibilityLabel={`任务 ${task.title}`}
                        accessibilityState={{ checked: task.done === 1 }}
                        onPress={() => handleToggleTask(task)}
                        style={({ pressed }) => [styles.taskRow, pressed && styles.pressed]}>
                        <ThemedText type="small" style={[styles.taskMeta, { color: theme.textSecondary }]}>
                          {task.done === 1 ? '☑' : '☐'}
                        </ThemedText>
                        {task.time ? (
                          <ThemedText type="small" themeColor="textSecondary" style={styles.taskMeta}>
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
                  <ThemedView type="backgroundElement" style={[styles.fill, styles.fillCenter]}>
                    <ThemedText type="subtitle" style={[styles.plus, { color: ModuleColors.events }]}>
                      ＋
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.centerText}>
                      添加事件
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                      {eventCount > 0 ? `今日 ${eventCount} 条` : '消费 / 购物 / 好饭'}
                    </ThemedText>
                  </ThemedView>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="去健身"
                  onPress={() => router.navigate('/fitness')}
                  style={({ pressed }) => [styles.halfBox, pressed && styles.pressed]}>
                  <ThemedView type="backgroundElement" style={[styles.fill, styles.fillCenter]}>
                    <ThemedText type="subtitle" style={[styles.boxIcon, { color: ModuleColors.fitness }]}>
                      练
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.centerText}>
                      去健身
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                      {training.sets > 0 ? `今日 ${training.sets} 组` : '今天还没练'}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </View>

              {/* 框 4：备忘录（点开编辑） */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="备忘录"
                onPress={() => setMemoOpen(true)}
                style={({ pressed }) => [styles.memoBox, pressed && styles.pressed]}>
                <ThemedView type="backgroundElement" style={styles.fill}>
                  <View style={styles.memoHeader}>
                    <ThemedText type="smallBold">备忘录</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      编辑 ›
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="small"
                    numberOfLines={2}
                    themeColor={memo ? 'text' : 'textSecondary'}
                    style={styles.memoText}>
                    {memo || '记一笔想做的事…'}
                  </ThemedText>
                </ThemedView>
              </Pressable>

              {/* 框 5：游戏（显示想玩清单） */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="游戏"
                onPress={() => router.navigate('/games')}
                style={({ pressed }) => [styles.gamesBox, pressed && styles.pressed]}>
                <ThemedView type="backgroundElement" style={styles.fill}>
                  <View style={styles.gamesRow}>
                    <ThemedText type="smallBold">游戏</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.gamesValue}>
                      {wishes.length > 0 ? `想玩 ${wishes.length} 款` : '还没有想玩的游戏'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      ›
                    </ThemedText>
                  </View>
                  {wishes.length > 0 ? (
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={1}
                      style={styles.gamesWish}>
                      {wishes
                        .slice(0, 3)
                        .map((wish) => wish.name)
                        .join('、')}
                    </ThemedText>
                  ) : null}
                </ThemedView>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.pageWrap,
              styles.page2,
              { transform: [{ translateY: page2TranslateY }] },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="返回第一页"
              onPress={() => animateTo(0)}
              style={({ pressed }) => [styles.page2Handle, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                ⌃
              </ThemedText>
            </Pressable>
            <CalendarPanel
              refreshToken={refreshToken}
              onScrollState={(state) => {
                calendarScroll.current = state;
              }}
              style={styles.calendar}
            />
          </Animated.View>
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
          setRefreshToken((token) => token + 1);
          load().catch(() => undefined);
        }}
      />

      <MemoEditor
        visible={memoOpen}
        value={memo}
        onClose={() => setMemoOpen(false)}
        onSaved={() => {
          setMemoOpen(false);
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
  pager: {
    flex: 1,
    overflow: 'hidden',
    // Web 上拖动会先选中文字，选中会终止 Responder，必须禁用文字选择
    userSelect: 'none',
  },
  pageWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  page: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
    userSelect: 'none',
  },
  page2: {
    backgroundColor: 'transparent',
  },
  page2Handle: {
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendar: {
    flex: 1,
  },
  header: {
    gap: 2,
    paddingHorizontal: Spacing.one,
  },
  greeting: {
    fontSize: 32,
    lineHeight: 40,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  dateText: {
    fontSize: 19,
  },
  weekday: {
    fontSize: 15,
    marginBottom: 1,
  },
  planCard: {
    flex: 22,
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
    fontSize: 16,
  },
  taskMeta: {
    fontSize: 15,
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
  middleRow: {
    flex: 10,
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
  fillCenter: {
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  plus: {
    fontSize: 22,
    lineHeight: 26,
  },
  boxIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  memoBox: {
    flex: 9,
    minHeight: 64,
    borderRadius: Spacing.three,
  },
  memoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoText: {
    fontSize: 15,
    lineHeight: 21,
  },
  gamesBox: {
    flex: 6,
    minHeight: 60,
    borderRadius: Spacing.three,
  },
  gamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  gamesValue: {
    flex: 1,
    textAlign: 'right',
  },
  gamesWish: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});