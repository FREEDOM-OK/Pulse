import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DashCarousel, type DashCardModel } from '@/components/home/dash-carousel';
import { DashStack } from '@/components/home/dash-stack';
import { TAB_BAR_HEIGHT } from '@/components/nav/app-tab-bar';
import { TodayList } from '@/components/today/today-list';
import { DashCardSize, Spacing } from '@/constants/theme';
import { countRecordsInRange } from '@/db/repositories/calendar';
import { listCoursesForDate, type CourseOnDate } from '@/features/timetable/bridge';
import { getLatestPlayed, listWishlist } from '@/db/repositories/games';
import { getProfile } from '@/db/repositories/profile';
import { getCardColor, getCardStyle, getDashMode, getHomeCards } from '@/db/repositories/settings';
import { getTrainingSummary, type TrainingSummary } from '@/db/repositories/training';
import type { CardStyle, DashMode, HomeCardId, ProfileRow, WishlistRow, PlayedGameRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { useDataVersion } from '@/lib/data-version';
import { formatMonthDay, parseDate, todayStr } from '@/lib/date';

const WEEKDAY_CHARS = ['日', '一', '二', '三', '四', '五', '六'];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayStr();
  const dataVersion = useDataVersion();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [cards, setCards] = useState<HomeCardId[]>([]);
  const [dashMode, setDashMode] = useState<DashMode>('carousel');
  const [cardStyle, setCardStyle] = useState<CardStyle>('default');
  const [cardColor, setCardColor] = useState('#26262A');
  const [stats, setStats] = useState({ total: 0, done: 0 });
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
  }, [today]);

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
    fitness: () => router.navigate('/fitness'),
    games: () => router.push('/games'),
    calendar: () => router.push('/calendar'),
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

  // 标题区占可用高度的 30%，Dash 区块占 70%（PRDv1.2.2 第 3.1 节）。
  const availableHeight = Math.max(
    320,
    windowHeight - insets.top - insets.bottom - TAB_BAR_HEIGHT
  );
  const titleZoneHeight = Math.round(availableHeight * 0.3);

  const titleScale = scrollY.interpolate({
    inputRange: [-240, 0],
    outputRange: [1.18, 1],
    extrapolate: 'clamp',
  });

  const stackWidth = Math.min(DashCardSize.width, Math.max(200, windowWidth - 96));
  const stackHeight = Math.round(stackWidth / 1.618);

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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}>
          <Animated.View style={[styles.titleZone, { minHeight: titleZoneHeight, transform: [{ scale: titleScale }] }]}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <ThemedText style={[styles.hello, { color: theme.textSecondary }]}>
                  Hey，{name}！
                </ThemedText>
                <View style={styles.dateRow}>
                  <ThemedText style={styles.date}>今天是 {formatMonthDay(today)}</ThemedText>
                  <ThemedText style={[styles.weekday, { color: theme.textSecondary }]}>
                    星期{weekday}
                  </ThemedText>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="打开个人资料"
                onPress={() => router.push('/profile')}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
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

            <View style={styles.dashTitleRow}>
              <ThemedText style={styles.dashTitle}>Dash</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="管理首页卡片"
                onPress={() => router.push('/cards')}
                hitSlop={8}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  管理 ›
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.dashBlock}>{dashBlock}</View>

          <View style={styles.tasks}>
            <View style={styles.tasksHeader}>
              <ThemedText type="smallBold">Tasks</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="查看今日全部"
                onPress={() => router.navigate('/today')}
                hitSlop={8}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {stats.total > 0 ? `完成 ${stats.done}/${stats.total} ›` : '查看全部 ›'}
                </ThemedText>
              </Pressable>
            </View>
            <TodayList date={today} onStats={setStats} emptyText="今天还没有安排" />
          </View>
        </Animated.ScrollView>
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
    paddingBottom: Spacing.six,
  },
  titleZone: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  hello: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  date: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  weekday: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  dashTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  dashTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  dashBlock: {
    paddingTop: Spacing.two,
  },
  tasks: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.7,
  },
});