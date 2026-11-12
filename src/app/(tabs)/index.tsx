import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import {
  DASH_CARD_HEIGHT,
  DASH_CARD_WIDTH,
  DashCarousel,
  type DashCardModel,
} from '@/components/home/dash-carousel';
import { DashStack } from '@/components/home/dash-stack';
import { SearchOverlay } from '@/components/home/search-overlay';
import { TodayList } from '@/components/today/today-list';
import { countRecordsInRange } from '@/db/repositories/calendar';
import { listCoursesForDate, type CourseOnDate } from '@/features/timetable/bridge';
import { getLatestPlayed, listWishlist } from '@/db/repositories/games';
import { getProfile } from '@/db/repositories/profile';
import { getCardColor, getCardStyle, getDashMode, getHomeCards, getMiddleTab } from '@/db/repositories/settings';
import { getTrainingSummary, type TrainingSummary } from '@/db/repositories/training';
import type { SearchResult } from '@/db/repositories/search';
import type {
  CardStyle,
  DashMode,
  HomeCardId,
  MiddleTab,
  ProfileRow,
  WishlistRow,
  PlayedGameRow,
} from '@/db/types';
import { bumpDataVersion, useDataVersion } from '@/lib/data-version';
import { formatMonthDay, parseDate, todayStr } from '@/lib/date';

const WEEKDAY_CHARS = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * SharedValue 的可写封装。PanResponder 的回调由 useMemo 创建，
 * 直接在这里赋值会触发 react-hooks/immutability；集中到纯函数里更清晰。
 */
function writePullDistance(shared: SharedValue<number>, value: number) {
  shared.value = value;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = todayStr();
  const dataVersion = useDataVersion();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [cards, setCards] = useState<HomeCardId[]>([]);
  const [dashMode, setDashMode] = useState<DashMode>('carousel');
  const [cardStyle, setCardStyle] = useState<CardStyle>('default');
  const [cardColor, setCardColor] = useState('#26262A');
  const [training, setTraining] = useState<TrainingSummary>({
    sets: 0,
    items: 0,
    firstExercise: null,
  });
  const [wishes, setWishes] = useState<WishlistRow[]>([]);
  const [latestPlayed, setLatestPlayed] = useState<PlayedGameRow | null>(null);
  const [monthCount, setMonthCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [todayCourses, setTodayCourses] = useState<CourseOnDate[]>([]);
  /** 底栏第三格放的是谁：决定健身/日历卡片是切到第 3 页还是开二级页。 */
  const [middle, setMiddle] = useState<MiddleTab>('fitness');
  const refreshingRef = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrollOffsetRef = useRef(0);

  const load = useCallback(async () => {
    const monthStart = `${today.slice(0, 7)}-01`;
    const [year, month] = today.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${today.slice(0, 7)}-${String(daysInMonth).padStart(2, '0')}`;
    const [
      profileRow,
      cardIds,
      mode,
      style,
      color,
      summary,
      wishList,
      latest,
      monthTotal,
      todayTotal,
      courseList,
      middleTab,
    ] = await Promise.all([
      getProfile(),
      getHomeCards(),
      getDashMode(),
      getCardStyle(),
      getCardColor(),
      getTrainingSummary(today),
      listWishlist(),
      getLatestPlayed(),
      countRecordsInRange(monthStart, monthEnd),
      countRecordsInRange(today, today),
      listCoursesForDate(today),
      getMiddleTab(),
    ]);
    setProfile(profileRow);
    setCards(cardIds);
    setDashMode(mode);
    setCardStyle(style);
    setCardColor(color);
    setTraining(summary);
    setWishes(wishList);
    setLatestPlayed(latest);
    setMonthCount(monthTotal);
    setTodayCount(todayTotal);
    setTodayCourses(courseList);
    setMiddle(middleTab);
  }, [today]);

  const handleRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      await load();
      // 让首页 Tasks / 计划页共享的 SQLite 数据一起重新读取。
      bumpDataVersion();
    } finally {
      refreshingRef.current = false;
    }
  }, [load]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (dataVersion === 0) return;
    load().catch(() => undefined);
  }, [dataVersion, load]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const nowTime = new Date().toTimeString().slice(0, 5);
  const nextCourse = todayCourses.find((course) => course.time >= nowTime) ?? null;

  const cardDescriptions: Record<HomeCardId, { title: string; subtitle: string; icon: DashCardModel['icon'] }> = {
    fitness: {
      title: '去健身',
      subtitle:
        training.sets > 0
          ? `已练 ${training.sets} 组${training.firstExercise ? ` · ${training.firstExercise}` : ''}`
          : '今天还没练',
      icon: {
        ios: 'figure.strengthtraining.traditional',
        android: 'fitness_center',
        web: 'fitness_center',
      },
    },
    games: {
      title: '去游戏',
      subtitle:
        wishes.length > 0
          ? `想玩 ${wishes.length} 款${latestPlayed ? ` · 最近在玩 ${latestPlayed.game_name}` : ''}`
          : '想玩清单还是空的',
      icon: { ios: 'gamecontroller', android: 'sports_esports', web: 'sports_esports' },
    },
    calendar: {
      title: '看日历',
      subtitle: `本月 ${monthCount} 条 · 今天 ${todayCount} 条`,
      icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    },
    timetable: {
      title: '看课表',
      subtitle:
        todayCourses.length > 0
          ? `今天 ${todayCourses.length} 节课${nextCourse ? ` · 下一节 ${nextCourse.name}` : ''}`
          : '今天没有课',
      icon: { ios: 'calendar.badge.clock', android: 'schedule', web: 'schedule' },
    },
  };

  const cardActions: Record<HomeCardId, () => void> = {
    // 被选进底栏第三格的模块，点卡片直接切到那个 Tab（不叠一层返回）；
    // 没被选中的只能开二级页。课表在第三格时也必须留在 Tab 内，不能跳全屏页。
    fitness: () => (middle === 'fitness' ? router.navigate('/middle') : router.push('/fitness')),
    games: () => router.push('/games'),
    calendar: () => (middle === 'calendar' ? router.navigate('/middle') : router.push('/calendar')),
    timetable: () => (middle === 'timetable' ? router.navigate('/middle') : router.push('/timetable')),
  };

  const cardModels: DashCardModel[] = cards.map((id) => ({
    id,
    title: cardDescriptions[id].title,
    subtitle: cardDescriptions[id].subtitle,
    icon: cardDescriptions[id].icon,
    onPress: cardActions[id],
  }));

  const name = profile?.name || '用户';
  const weekday = WEEKDAY_CHARS[parseDate(today).getDay()];
  const dateLabel = `今天是 ${formatMonthDay(today)} 星期${weekday}`;

  // 只在「列表已经在顶部 + 向下拉」时接手，其余情况不拦截 Tasks 的纵向滚动。
  // 用 Reanimated 的 pullDistance 驱动标题 scale 和整页 translateY，
  // Android 原生 ScrollView 不会产生负数 scrollY，因此不再依赖原生 bounces。
  const atTopRef = useRef(true);
  const pullDistance = useSharedValue(0);
  const pullResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          atTopRef.current &&
          !refreshingRef.current &&
          gesture.dy > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          atTopRef.current &&
          !refreshingRef.current &&
          gesture.dy > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          writePullDistance(pullDistance, Math.min(Math.max(gesture.dy * 0.5, 0), 120));
        },
        onPanResponderRelease: () => {
          const settle = () => {
            writePullDistance(pullDistance, withSpring(0, { damping: 18, stiffness: 180 }));
          };
          if (pullDistance.value > 60) {
            handleRefresh()
              .catch(() => undefined)
              .finally(settle);
          } else {
            settle();
          }
        },
        onPanResponderTerminate: () => {
          writePullDistance(pullDistance, withSpring(0, { damping: 18, stiffness: 180 }));
        },
      }),
    [handleRefresh, pullDistance]
  );

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          pullDistance.value,
          [0, 100],
          [1, 1.18],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullDistance.value }],
  }));

  const stackWidth = DASH_CARD_WIDTH;
  const stackHeight = DASH_CARD_HEIGHT;

  const handleSearchResultPress = (result: SearchResult) => {
    if (result.kind === 'fitness') {
      router.push({ pathname: '/fitness', params: { date: result.date } });
    } else {
      router.push({ pathname: '/day/[date]', params: { date: result.date } });
    }
  };

  const dashBlock = useMemo(() => {
    if (dashMode === 'stack') {
      return (
        <DashStack
          cards={cardModels}
          style={cardStyle}
          color={cardColor}
          width={stackWidth}
          height={stackHeight}
        />
      );
    }
    return (
      <DashCarousel
        cards={cardModels}
        style={cardStyle}
        color={cardColor}
        onManage={() => router.push('/cards')}
      />
    );
  }, [dashMode, cardModels, cardStyle, cardColor, stackWidth, stackHeight, router]);

  return (
    <View style={styles.container}>
      <View style={styles.pullWrap} {...pullResponder.panHandlers}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            scrollOffsetRef.current = offsetY;
            atTopRef.current = offsetY <= 0;
          }}>
          <Animated.View testID="home-content" style={contentAnimatedStyle}>
            <Animated.View style={[styles.titleZone, { paddingTop: insets.top + 20 }]}>
              <View style={styles.headerRow}>
                <Animated.View testID="home-title-text" style={[styles.headerText, titleAnimatedStyle]}>
                  <ThemedText style={styles.hello}>Hey, {name}!</ThemedText>
                  <ThemedText style={styles.date}>{dateLabel}</ThemedText>
                </Animated.View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="打开个人资料"
                  onPress={() => router.push('/profile')}
                  style={({ pressed }) => [pressed && styles.pressed]}>
                  <View style={styles.avatar}>
                    {profile?.avatarUri ? (
                      <Image
                        key={profile.avatarUri}
                        source={{ uri: profile.avatarUri }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <ThemedText style={styles.avatarText}>{name.slice(0, 1)}</ThemedText>
                    )}
                  </View>
                </Pressable>
              </View>
            </Animated.View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="搜索"
              onPress={() => setSearchOpen(true)}
              style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}>
              <View style={styles.searchLeft}>
                <SymbolView
                  name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                  tintColor="#8E8E93"
                  size={20}
                />
                <ThemedText style={styles.searchPlaceholder}>搜索</ThemedText>
              </View>

              <View style={styles.filterButton}>
                <SymbolView
                  name={{ ios: 'line.3.horizontal.decrease', android: 'tune', web: 'tune' }}
                  tintColor="#000000"
                  size={18}
                />
              </View>
            </Pressable>

            <View>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Dash</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="管理首页卡片"
                  onPress={() => router.push('/cards')}
                  hitSlop={8}
                  style={({ pressed }) => [pressed && styles.pressed]}>
                  <ThemedText style={styles.sectionLink}>管理 &gt;</ThemedText>
                </Pressable>
              </View>

              <View style={styles.dashBlock}>{dashBlock}</View>

              <View style={styles.tasks}>
                <View style={styles.tasksHeader}>
                  <ThemedText style={styles.sectionTitle}>Tasks</ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="查看今日全部"
                    onPress={() => router.navigate('/today')}
                    hitSlop={8}
                    style={({ pressed }) => [pressed && styles.pressed]}>
                    <ThemedText style={styles.sectionLink}>完成 &gt;</ThemedText>
                  </Pressable>
                </View>

                <TodayList
                  date={today}
                  emptyText="今天还没有安排"
                  checkSize={20}
                  checkRadius={6}
                  checkBorderColor="#8E8E93"
                  checkCheckedColor="#000000"
                  checkCheckColor="#FFFFFF"
                  courseVariant="home"
                  textColor="#000000"
                  secondaryTextColor="#8E8E93"
                  rowSpacing={16}
                  showSeparators={false}
                  showAddRow={false}
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      <SearchOverlay
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectResult={handleSearchResultPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pullWrap: {
    flex: 1,
    // Web 上下拉时不要选中文字：selectionchange 会抢走 PanResponder 的响应者。
    userSelect: 'none',
  },

  titleZone: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerText: {
    flex: 1,
    // 从左侧放大，避免下拉时问候语与右侧头像被屏幕边缘裁掉。
    transformOrigin: 'left center',
  },
  hello: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#666666',
  },
  date: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#000000',
    marginTop: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  searchBar: {
    marginTop: 24,
    marginHorizontal: 20,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  searchLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 15,
    lineHeight: 20,
    color: '#8E8E93',
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginTop: 32,
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#000000',
  },
  sectionLink: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8E8E93',
  },
  dashBlock: {},
  tasks: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});