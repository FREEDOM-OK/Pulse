import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseDetailDrawer } from '@/components/timetable/course-detail-drawer';
import { GlassGlow } from '@/components/ui/glass-glow';
import { TimetableMoreSheet } from '@/components/timetable/timetable-more-sheet';
import { WeekGrid } from '@/components/timetable/week-grid';
import { WeekHeader } from '@/components/timetable/week-header';
import { useTimetable } from '@/features/timetable/TimetableContext';
import type { CourseEntity } from '@/features/timetable/repository';
import { useGlass, useGlassMaterial, useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';
import { askConfirm, showNotice } from '@/lib/dialogs';
import {
  SAFE_TOP_DP,
  TIME_COL,
  currentWeekNumber,
  visibleWeekDays,
  weekDateFor,
} from '@/lib/timetable-core';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export interface TimetableScreenProps {
  /** tab = 底栏第三格内嵌，无返回按钮；page = 独立二级页，带圆形返回。 */
  mode?: 'tab' | 'page';
}

const formatYMD = (date: Date) =>
  `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(
    date.getDate(),
  ).padStart(2, '0')}`;

/**
 * 课表编排层：只负责周次/翻页状态、数据加载与三个子组件的拼装。
 *
 * - WeekHeader：静态周次/日期 + ＋/导入/⋯；
 * - WeekGrid：单周网格（左列三行时间、行底 hairline、课程块）；
 * - TimetableMoreSheet：⋯ 打开的底部抽屉（周滑动条、课表切换、四个入口）。
 * 旧的翻周胶囊、齿轮、左上切换课表以及两个右上角气泡菜单都已删除。
 */
export function TimetableScreen({ mode = 'page' }: TimetableScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const theme = useTheme();
  const { scheme } = useThemePreference();
  const glass = useGlass();
  const material = useGlassMaterial();
  const screenWidth = windowWidth || 375;
  // 横向分页要用的真实宽度：以容器 onLayout 实测为准。窗口宽度和滚动容器宽度可能
  // 因为内边距、安全区、刘海屏而不一致；差几个像素，每次翻页就会「差一点」，
  // 在 Android 上表现为列表自己左右来回弹（抽搐）。
  const [listWidth, setListWidth] = useState(0);
  const pageWidth = listWidth || screenWidth;

  const {
    activeSchedule,
    courses,
    settings,
    viewingWeek,
    setViewingWeek,
    deleteCourse,
  } = useTimetable();

  // 深色模式下，默认浅色网格底（#F5F5F7 / #FFFFFF）自动换成深色：
  // 容器/表头/时间列用 theme.background，空白格子用 theme.backgroundElement；
  // 用户主动选过的其他颜色则原样保留。
  const gridColor = settings.gridBackgroundColor.toUpperCase();
  const isDefaultLightGrid = gridColor === '#F5F5F7' || gridColor === '#FFFFFF';
  const useDarkGrid = scheme === 'dark' && isDefaultLightGrid;
  // 毛玻璃皮肤：页面是环境光画布，表头行/左侧时间列换成半透明磨砂条。
  const screenBackgroundColor = glass
    ? theme.background
    : useDarkGrid
      ? theme.background
      : settings.gridBackgroundColor;
  const headerBackgroundColor = glass ? material.block : screenBackgroundColor;
  const cellBackgroundColor = glass
    ? 'transparent'
    : useDarkGrid
      ? theme.backgroundElement
      : settings.gridBackgroundColor;

  // 可见星期序列：起点由「每周起始日」决定，周六/周日可单独隐藏。
  const visibleDays = useMemo(
    () => visibleWeekDays(settings.weekStartDay, settings.showSaturday, settings.showSunday),
    [settings.weekStartDay, settings.showSaturday, settings.showSunday]
  );
  // 列宽按可见天数摊平，隐藏周六/周日时每列自动变宽。
  const dayColWidth = (pageWidth - TIME_COL) / Math.max(1, visibleDays.length);

  const flatListRef = useRef<FlatList<number>>(null);
  /** 最新周次，供 onLayout 等异步回调读取，避免闭包里拿到旧 viewingWeek。 */
  const viewingWeekRef = useRef(viewingWeek);
  viewingWeekRef.current = viewingWeek;
  /** 当前横向滚动位置（px），用来判断「目标周」是不是已经在眼前，避免重复滚动。 */
  const scrollOffsetRef = useRef(0);
  /**
   * 程序化翻周（周滑动条 / 回到本周 / 保存后跳周 / 深链）期间置 true。
   * 这段时间产生的 momentum 事件一律不回写周次，只认用户手指滑动，
   * 否则「程序滚动 → onMomentumScrollEnd 回写 → 再滚一次」会互相触发，表现为左右来回抽搐。
   */
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** web 上滚动停止后推算周次的计时器（RN-web 不派发 momentum 事件）。 */
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  // 点击课程块弹出的抽屉状态
  const [selectedCourse, setSelectedCourse] = useState<CourseEntity | null>(null);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);

  // 从首页「今日课程」带 courseId 进来：定位到本周并直接打开详情抽屉
  const { courseId: deepLinkCourseId } = useLocalSearchParams<{ courseId?: string }>();
  const handledDeepLink = useRef<string | null>(null);

  const today = new Date();
  const totalWeeks = Math.max(1, activeSchedule.totalWeeks);
  const currentWeek = Math.min(
    totalWeeks,
    Math.max(1, currentWeekNumber(activeSchedule.startDate, today)),
  );
  const todayDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  const viewedDate = weekDateFor(activeSchedule.startDate, viewingWeek, todayDayOfWeek);
  const headerTitle = `第 ${viewingWeek} 周 ${DAYS[todayDayOfWeek - 1]}`;
  const headerSubtitle = formatYMD(viewedDate);

  const weeksArray = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  /**
   * 无条件把横向列表滚到指定周。聚焦归位时必须用「强制」版本：
   * 上一次可能停在第 5 周，而归位的目标周可能恰好等于 viewingWeek，
   * 带「已在目标附近就跳过」判断的普通跳周会提前返回。
   */
  const forceScrollToWeek = useCallback(
    (week: number, animated: boolean) => {
      if (week < 1 || week > totalWeeks) return;
      const target = (week - 1) * pageWidth;

      programmaticScrollRef.current = true;
      if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
      programmaticTimerRef.current = setTimeout(
        () => {
          programmaticScrollRef.current = false;
          programmaticTimerRef.current = null;
        },
        // 动画时长 + 余量：等 momentum 事件走完再放开回写
        animated ? 480 : 80,
      );
      scrollOffsetRef.current = target;
      flatListRef.current?.scrollToOffset({ offset: target, animated });
    },
    [totalWeeks, pageWidth],
  );

  /**
   * 显式跳周：state 与横向偏移一起改，不再用 useEffect 监听 viewingWeek。
   * 供抽屉滑条 /「回到本周」等外部入口调用；滑条必须传 animated=false 跟手。
   */
  const jumpToWeek = useCallback(
    (week: number, animated: boolean) => {
      setViewingWeek(week);
      forceScrollToWeek(week, animated);
    },
    [forceScrollToWeek, setViewingWeek],
  );

  // 深链落点：等课程加载出来后切到本周并打开该课抽屉（只处理一次）。
  // 这里同样走 jumpToWeek，保证「周次 state」和「横向分页偏移」一起更新。
  useEffect(() => {
    if (!deepLinkCourseId || handledDeepLink.current === deepLinkCourseId) return;
    const target = courses.find((course) => course.id === deepLinkCourseId);
    if (!target) return;
    handledDeepLink.current = deepLinkCourseId;
    jumpToWeek(currentWeek, false);
    const sessionIdx = target.sessions.findIndex(
      (session) => session.dayOfWeek === todayDayOfWeek,
    );
    setSelectedSessionIdx(sessionIdx >= 0 ? sessionIdx : 0);
    setSelectedCourse(target);
  }, [deepLinkCourseId, courses, currentWeek, todayDayOfWeek, jumpToWeek]);

  // 每次重新获得焦点（切回底栏第三格、从二级页返回）都回到「今天所在的周」。
  // 先 setViewingWeek 再在下一帧强制对齐偏移：此时 rendered 的 pageWidth/周次
  // 都已稳定，不会再用旧 viewingWeek 反向滚一次。
  useFocusEffect(
    useCallback(() => {
      const targetWeek = Math.min(
        totalWeeks,
        Math.max(1, currentWeekNumber(activeSchedule.startDate, new Date())),
      );
      setViewingWeek(targetWeek);
      const frame = requestAnimationFrame(() => forceScrollToWeek(targetWeek, false));
      return () => cancelAnimationFrame(frame);
    }, [
      activeSchedule.startDate,
      totalWeeks,
      setViewingWeek,
      forceScrollToWeek,
    ]),
  );

  // 实测宽度确定/变化后，把当前周对齐到整页偏移（不带动画）。
  // 通过 viewingWeekRef 读取最新周次，避免 listWidth 更新与 setViewingWeek
  // 同一轮提交时闭包拿到旧周、把刚归位的周次冲掉。
  useEffect(() => {
    if (!listWidth) return;
    forceScrollToWeek(viewingWeekRef.current, false);
  }, [forceScrollToWeek, listWidth]);

  // 卸载时清掉计时器，避免组件销毁后回调改 ref
  useEffect(
    () => () => {
      if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
      if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
    },
    [],
  );

  /** 按当前横向偏移回写周次（程序化滚动期间不认）。 */
  const syncWeekFromOffset = useCallback(
    (x: number) => {
      if (programmaticScrollRef.current) return;
      const nextWeek = Math.round(x / pageWidth) + 1;
      if (nextWeek >= 1 && nextWeek <= totalWeeks && nextWeek !== viewingWeek) {
        setViewingWeek(nextWeek);
      }
    },
    [totalWeeks, pageWidth, viewingWeek, setViewingWeek],
  );

  /** 横向滚动中：记录偏移；web 没有 momentum 事件，停下 160ms 后按最终位置回写周次。 */
  const handleHorizontalScroll = useCallback(
    (x: number) => {
      scrollOffsetRef.current = x;
      if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
      if (Platform.OS !== 'web') return;
      scrollSettleTimerRef.current = setTimeout(() => {
        scrollSettleTimerRef.current = null;
        syncWeekFromOffset(x);
      }, 160);
    },
    [syncWeekFromOffset],
  );

  const openAddCourse = (day: number, period: number, endPeriod?: number) => {
    router.push({
      pathname: '/timetable/course',
      params: {
        day: String(day),
        period: String(period),
        ...(endPeriod ? { endPeriod: String(endPeriod) } : {}),
      },
    });
  };

  const renderWeekPage = ({ item: weekNum }: { item: number }) => (
    <WeekGrid
      weekNum={weekNum}
      width={pageWidth}
      dayColWidth={dayColWidth}
      periods={settings.periodTimes}
      lunchAfter={settings.lunchAfter}
      courses={courses}
      currentWeek={currentWeek}
      todayDayOfWeek={todayDayOfWeek}
      startDate={activeSchedule.startDate}
      saturation={settings.saturation}
      cellHeight={settings.cellHeight}
      cellRadius={settings.cellRadius}
      gridBackgroundColor={headerBackgroundColor}
      cellBackgroundColor={cellBackgroundColor}
      visibleDays={visibleDays}
      bottomPadding={mode === 'tab' ? 100 : 32}
      defaultSpan={settings.defaultSpan || 2}
      onAddCourse={openAddCourse}
      onPressCourse={(course, sessionIndex) => {
        setSelectedCourse(course);
        setSelectedSessionIdx(sessionIndex);
      }}
      onImport={() => router.push('/timetable/import')}
    />
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top || SAFE_TOP_DP, backgroundColor: screenBackgroundColor },
      ]}>
      {glass ? <GlassGlow scheme={scheme} /> : null}
      <WeekHeader
        mode={mode}
        backgroundColor={headerBackgroundColor}
        title={headerTitle}
        subtitle={headerSubtitle}
        onBack={() => router.back()}
        // 顶栏 ＋ 必须直达全屏添加页，绝不能再弹任何抽屉/遮罩。
        // 网格空白格的 ＋ 仍走 openAddCourse，带上具体星期与节次。
        onAdd={() => router.push('/timetable/course')}
        onImport={() => router.push('/timetable/import')}
        onMore={() => setMoreSheetVisible(true)}
      />

      {/* 横向翻周分页容器（FlatList + getItemLayout） */}
      <FlatList
        ref={flatListRef}
        style={styles.weekPager}
        data={weeksArray}
        keyExtractor={(week) => String(week)}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        // 初始偏移统一交给 forceScrollToWeek / onLayout 处理，避免 Android 原生
        // initialScrollIndex 在 Tab 切换时与受控偏移互相打架。
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        scrollEventThrottle={16}
        onScroll={(event) => handleHorizontalScroll(event.nativeEvent.contentOffset.x)}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        // 实测容器宽度：真正决定每页宽度的就是它，窗口宽度只是拿不到布局时的兜底
        onLayout={(event) => {
          const width = Math.round(event.nativeEvent.layout.width);
          if (width > 0 && width !== listWidth) setListWidth(width);
        }}
        onMomentumScrollEnd={(event) => {
          const x = event.nativeEvent.contentOffset.x;
          scrollOffsetRef.current = x;
          // 程序化翻周导致的惯性结束不回写周次，只认用户手势
          syncWeekFromOffset(x);
        }}
        renderItem={renderWeekPage}
      />

      {/* 点击课程块弹出的抽屉详情 */}
      <CourseDetailDrawer
        visible={Boolean(selectedCourse)}
        course={selectedCourse}
        sessionIndex={selectedSessionIdx}
        periodTimes={settings.periodTimes}
        onClose={() => setSelectedCourse(null)}
        onEdit={(course) => {
          setSelectedCourse(null);
          router.push({ pathname: '/timetable/course', params: { id: course.id } });
        }}
        onDelete={(course) => {
          void askConfirm({
            title: '确认删除',
            message: `确定删除「${course.name}」吗？`,
            confirmLabel: '删除',
            danger: true,
          })
            .then(async (ok) => {
              if (!ok) return;
              try {
                await deleteCourse(course.id);
              } catch (err) {
                showNotice(`删除失败：${err instanceof Error ? err.message : '未知错误'}`);
              }
              setSelectedCourse(null);
            })
            .catch(() => undefined);
        }}
      />

      <TimetableMoreSheet
        visible={moreSheetVisible}
        onClose={() => setMoreSheetVisible(false)}
        onJumpToWeek={jumpToWeek}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekPager: { flex: 1 },
});