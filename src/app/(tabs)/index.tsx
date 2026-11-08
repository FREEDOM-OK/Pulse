import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WonderCarousel, type WonderCardModel } from '@/components/home/wonder-carousel';
import { TodayList } from '@/components/today/today-list';
import { Spacing } from '@/constants/theme';
import { countRecordsInRange } from '@/db/repositories/calendar';
import { listCourses } from '@/db/repositories/courses';
import { getLatestPlayed, listWishlist } from '@/db/repositories/games';
import { getProfile } from '@/db/repositories/profile';
import { getHomeCards, getPeriodTimes, getTermConfig } from '@/db/repositories/settings';
import { getTrainingSummary, type TrainingSummary } from '@/db/repositories/training';
import type { HomeCardId, ProfileRow, WishlistRow, PlayedGameRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { useDataVersion } from '@/lib/data-version';
import { formatMonthDay, parseDate, todayStr } from '@/lib/date';
import { coursesOnDate, type CourseOnDate } from '@/lib/timetable';

const WEEKDAY_CHARS = ['日', '一', '二', '三', '四', '五', '六'];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = todayStr();
  const dataVersion = useDataVersion();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [cards, setCards] = useState<HomeCardId[]>([]);
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
    const [profileRow, cardIds, summary, wishList, latest, monthTotal, todayTotal, courseList, term, periodTimes] =
      await Promise.all([
        getProfile(),
        getHomeCards(),
        getTrainingSummary(today),
        listWishlist(),
        getLatestPlayed(),
        countRecordsInRange(monthStart, monthEnd),
        countRecordsInRange(today, today),
        listCourses(),
        getTermConfig(),
        getPeriodTimes(),
      ]);
    setProfile(profileRow);
    setCards(cardIds);
    setTraining(summary);
    setWishes(wishList);
    setLatestPlayed(latest);
    setMonthCount(monthTotal);
    setTodayCount(todayTotal);
    setTodayCourses(coursesOnDate(today, courseList, term.startDate, periodTimes));
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

  const cardDescriptions: Record<HomeCardId, { title: string; subtitle: string; icon: WonderCardModel['icon'] }> = {
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

  const cardModels: WonderCardModel[] = cards.map((id) => ({
    id,
    title: cardDescriptions[id].title,
    subtitle: cardDescriptions[id].subtitle,
    icon: cardDescriptions[id].icon,
    onPress: cardActions[id],
  }));

  const name = profile?.name || '用户';
  const weekday = WEEKDAY_CHARS[parseDate(today).getDay()];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
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

          <WonderCarousel cards={cardModels} onManage={() => router.push('/cards')} />

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
    paddingBottom: Spacing.six,
    gap: Spacing.five,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
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
    fontSize: 28,
    lineHeight: 34,
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
  tasks: {
    paddingHorizontal: Spacing.four,
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