import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import {
  DASH_CARD_HEIGHT,
  DASH_CARD_WIDTH,
  DashCarousel,
  type DashCardModel,
} from '@/components/home/dash-carousel';
import { DashStack } from '@/components/home/dash-stack';
import { TodayList } from '@/components/today/today-list';
import { countRecordsInRange } from '@/db/repositories/calendar';
import { listCoursesForDate, type CourseOnDate } from '@/features/timetable/bridge';
import { getLatestPlayed, listWishlist } from '@/db/repositories/games';
import { getProfile } from '@/db/repositories/profile';
import { getCardColor, getCardStyle, getDashMode, getHomeCards, getMiddleTab } from '@/db/repositories/settings';
import { getTrainingSummary, type TrainingSummary } from '@/db/repositories/training';
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<ElementRef<typeof TextInput>>(null);
  const searchTranslateY = useRef(new Animated.Value(0)).current;
  /** 0 = 首页，1 = 沉浸搜索；用于背景淡出与搜索面板淡入。 */
  const searchProgress = useRef(new Animated.Value(0)).current;
  const searchBackgroundOpacity = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const searchLayoutY = useRef(0);
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
    // 没被选中的只能开二级页。课表始终是独立全屏页，所以直接 push。
    fitness: () => (middle === 'fitness' ? router.navigate('/middle') : router.push('/fitness')),
    games: () => router.push('/games'),
    calendar: () => (middle === 'calendar' ? router.navigate('/middle') : router.push('/calendar')),
    timetable: () => router.push('/timetable'),
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

  // 两个平台统一用这套下拉拉伸，不再依赖原生刷新指示器 / iOS 原生 overscroll。
  // 这里只在「列表已经在顶部 + 向下拉」时用 PanResponder 接手，其余情况一律不拦截，避免抢走 Tasks 的滚动。
  const atTopRef = useRef(true);
  const pull = useRef(new Animated.Value(0)).current;
  const pullValueRef = useRef(0);
  const pullScale = pull.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 1.2],
    extrapolate: 'clamp',
  });
  const pullResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          atTopRef.current &&
          !refreshingRef.current &&
          gesture.dy > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        // 搜索框是 TextInput，会先拿到触摸；这里在捕获阶段只接管「顶部向下」
        // 的垂直手势，保证从搜索栏开始下拉时整页仍能联动，同时不抢横向手势。
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          atTopRef.current &&
          !refreshingRef.current &&
          gesture.dy > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          const next = Math.min(Math.max(gesture.dy * 0.5, 0), 120);
          pullValueRef.current = next;
          pull.setValue(next);
        },
        onPanResponderRelease: () => {
          const shouldRefresh = pullValueRef.current >= 64;
          if (!shouldRefresh) {
            pullValueRef.current = 0;
            Animated.spring(pull, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
              speed: 18,
            }).start();
            return;
          }
          // 刷新完成前保持标题拉伸；数据回来后直接弹回，原生转圈已经移除。
          handleRefresh()
            .catch(() => undefined)
            .finally(() => {
              pullValueRef.current = 0;
              Animated.spring(pull, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 6,
                speed: 18,
              }).start();
            });
        },
        onPanResponderTerminate: () => {
          pullValueRef.current = 0;
          Animated.spring(pull, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [handleRefresh, pull]
  );

  const titleScale: Animated.AnimatedInterpolation<number> = pullScale;
  const titleLift = titleScale.interpolate({
    inputRange: [1, 1.2],
    outputRange: [0, -6],
    extrapolate: 'clamp',
  });
  const titleTransform = [{ translateY: titleLift }, { scale: titleScale }];
  // 位移加到包裹全部内容的容器上，Search / Dash / Tasks 与标题一起下移，避免标题压住卡片。
  const contentTransform = { transform: [{ translateY: pull }] };

  const stackWidth = DASH_CARD_WIDTH;
  const stackHeight = DASH_CARD_HEIGHT;

  const SEARCH_ANIMATION = {
    duration: 250,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    useNativeDriver: true,
  } as const;

  const handleSearchFocus = () => {
    setSearchFocused(true);
    const currentTop = searchLayoutY.current - scrollOffsetRef.current;
    const target = Math.min(0, insets.top + 8 - currentTop);
    Animated.parallel([
      Animated.timing(searchTranslateY, { ...SEARCH_ANIMATION, toValue: target }),
      Animated.timing(searchProgress, { ...SEARCH_ANIMATION, toValue: 1 }),
    ]).start();
  };

  const handleSearchBlur = () => {
    setSearchFocused(false);
    Animated.parallel([
      Animated.timing(searchTranslateY, { ...SEARCH_ANIMATION, toValue: 0 }),
      Animated.timing(searchProgress, { ...SEARCH_ANIMATION, toValue: 0 }),
    ]).start();
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
      <Animated.View
        pointerEvents="none"
        style={[styles.searchPanel, { opacity: searchProgress }]}
      />
      <View style={styles.pullWrap} {...pullResponder.panHandlers}>
        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          scrollEnabled={!searchFocused}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            // 只有列表已经在最顶部时才允许下拉拉伸接手手势。
            scrollOffsetRef.current = offsetY;
            atTopRef.current = offsetY <= 0;
          }}>
          <Animated.View style={contentTransform}>
          <Animated.View
            pointerEvents={searchFocused ? 'none' : 'auto'}
            style={[
              styles.titleZone,
              {
                paddingTop: insets.top + 20,
                opacity: searchBackgroundOpacity,
              },
            ]}>
            <View style={styles.headerRow}>
              <Animated.View style={[styles.headerText, { transform: titleTransform }]}>
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

          <Animated.View
            onLayout={(event) => {
              searchLayoutY.current = event.nativeEvent.layout.y;
            }}
            style={[
              styles.searchBar,
              searchFocused && styles.searchBarFocused,
              { transform: [{ translateY: searchTranslateY }] },
            ]}>
            <View style={styles.searchLeft}>
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                tintColor="#8E8E93"
                size={20}
              />
              <TextInput
                ref={searchInputRef}
                accessibilityLabel="搜索"
                placeholder="搜索"
                placeholderTextColor="#8E8E93"
                value={searchText}
                onChangeText={setSearchText}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                style={styles.searchInput}
                returnKeyType="search"
                selectionColor="#000000"
                underlineColorAndroid="transparent"
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={searchFocused ? '关闭搜索' : '筛选'}
              hitSlop={6}
              onPress={() => searchInputRef.current?.blur()}
              style={({ pressed }) => [
                styles.filterButton,
                searchFocused && styles.filterButtonClose,
                pressed && styles.pressed,
              ]}>
              <SymbolView
                name={
                  searchFocused
                    ? { ios: 'xmark', android: 'close', web: 'close' }
                    : { ios: 'line.3.horizontal.decrease', android: 'tune', web: 'tune' }
                }
                tintColor="#000000"
                size={searchFocused ? 16 : 18}
              />
            </Pressable>
          </Animated.View>

          <Animated.View
            pointerEvents={searchFocused ? 'none' : 'auto'}
            style={{ opacity: searchBackgroundOpacity }}>
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
          </Animated.View>
          </Animated.View>
        </Animated.ScrollView>
      </View>
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
  searchPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F7F7FA',
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
  searchBarFocused: {
    zIndex: 20,
    elevation: 20,
  },
  searchLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 15,
    color: '#000000',
    // Web 默认焦点描边会盖住胶囊圆角；原生端忽略这两个样式。
    outlineColor: 'transparent',
    outlineWidth: 0,
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonClose: {
    borderRadius: 17,
    backgroundColor: '#E5E5EA',
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