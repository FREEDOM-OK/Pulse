import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  useWindowDimensions,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { askConfirm, showNotice } from '@/lib/dialogs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTimetable } from '@/features/timetable/TimetableContext';
import { CourseEntity } from '@/features/timetable/repository';
import { CourseDetailDrawer } from '@/components/timetable/course-detail-drawer';
import { TAB_BAR_CLEARANCE } from '@/components/nav/app-tab-bar';
import {
  TIME_COL,
  HEADER_H,
  ROW_H,
  LUNCH_H,
  SAFE_TOP_DP,
  SAFE_BOTTOM_DP,
  currentWeekNumber,
  weekDateFor,
  formatMD,
  weekRangeLabel,
  isActiveOn,
  blocksOf,
  rowTop,
  rowBottom,
  softenColor,
  foregroundFor,
} from '@/lib/timetable-core';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export interface TimetableScreenProps {
  /** tab = 底栏第三格内嵌，无返回按钮；page = 独立二级页，带圆形返回。 */
  mode?: 'tab' | 'page';
}

export function TimetableScreen({ mode = 'page' }: TimetableScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth || 375;
  // 横向分页要用的真实宽度：以容器 onLayout 实测为准。窗口宽度和滚动容器宽度可能
  // 因为内边距、安全区、刘海屏而不一致；差几个像素，每次翻页就会「差一点」，
  // 在 Android 上表现为列表自己左右来回弹（抽搐）。
  const [listWidth, setListWidth] = useState(0);
  const pageWidth = listWidth || screenWidth;
  const dayColWidth = (pageWidth - TIME_COL) / 7;

  const {
    schedules,
    activeSchedule,
    courses,
    settings,
    viewingWeek,
    setViewingWeek,
    switchSchedule,
    deleteCourse,
    duplicateCourse,
  } = useTimetable();

  const flatListRef = useRef<FlatList<number>>(null);
  /** 当前横向滚动位置（px），用来判断「目标周」是不是已经在眼前，避免重复滚动。 */
  const scrollOffsetRef = useRef(0);
  /**
   * 程序化翻周（按钮 / 回到本周 / 保存后跳周 / 深链）期间置 true。
   * 这段时间产生的 momentum 事件一律不回写周次，只认用户手指滑动，
   * 否则「程序滚动 → onMomentumScrollEnd 回写 → 再滚一次」会互相触发，表现为左右来回抽搐。
   */
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** web 上滚动停止后推算周次的计时器（RN-web 不派发 momentum 事件）。 */
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 点击课程块弹出的抽屉状态
  const [selectedCourse, setSelectedCourse] = useState<CourseEntity | null>(null);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);

  // 从首页「今日课程」带 courseId 进来：定位到本周并直接打开详情抽屉
  const { courseId: deepLinkCourseId } = useLocalSearchParams<{ courseId?: string }>();
  const handledDeepLink = useRef<string | null>(null);

  const today = new Date();
  const currentWeek = currentWeekNumber(activeSchedule.startDate, today);
  const isViewingCurrentWeek = viewingWeek === currentWeek;
  const todayDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  const weeksArray = Array.from({ length: activeSchedule.totalWeeks }, (_, i) => i + 1);

  // 深链落点：等课程加载出来后切到本周并打开该课抽屉（只处理一次）
  useEffect(() => {
    if (!deepLinkCourseId || handledDeepLink.current === deepLinkCourseId) return;
    const target = courses.find((c) => c.id === deepLinkCourseId);
    if (!target) return;
    handledDeepLink.current = deepLinkCourseId;
    setViewingWeek(currentWeek);
    const sIdx = target.sessions.findIndex((s) => s.dayOfWeek === todayDayOfWeek);
    setSelectedSessionIdx(sIdx >= 0 ? sIdx : 0);
    setSelectedCourse(target);
  }, [deepLinkCourseId, courses, currentWeek, todayDayOfWeek, setViewingWeek]);

  /**
   * 把横向列表滚到指定周。滚动期间临时屏蔽 onMomentumScrollEnd 的回写，
   * 避免动画过程中产生的 momentum 事件把 viewingWeek 改回去（抽搐的根因）。
   */
  const scrollToWeek = useCallback(
    (week: number, animated: boolean) => {
      if (week < 1 || week > activeSchedule.totalWeeks) return;
      const target = (week - 1) * pageWidth;
      // 已经在目标位置附近（误差小于半屏）就不再动它，省掉一次多余的滚动动画
      if (Math.abs(scrollOffsetRef.current - target) < pageWidth / 2) return;

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
    [activeSchedule.totalWeeks, pageWidth],
  );

  // viewingWeek 是唯一的「当前周」来源：手指滑动结束时回写它，程序化跳周时读它来滚。
  useEffect(() => {
    scrollToWeek(viewingWeek, true);
  }, [viewingWeek, scrollToWeek]);

  // 实测宽度确定/变化后，把当前周对齐到整页偏移（不带动画）：
  // 否则首帧会按窗口宽度滚一次、再按真实宽度纠正一次，看起来就是「抽搐」。
  useEffect(() => {
    if (!listWidth) return;
    const target = (viewingWeek - 1) * listWidth;
    scrollOffsetRef.current = target;
    programmaticScrollRef.current = true;
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
      programmaticTimerRef.current = null;
    }, 120);
    flatListRef.current?.scrollToOffset({ offset: target, animated: false });
    // 只在实测宽度变化时对齐；周次变化由上面的 scrollToWeek 负责
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listWidth]);

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
      const nextW = Math.round(x / pageWidth) + 1;
      if (nextW >= 1 && nextW <= activeSchedule.totalWeeks && nextW !== viewingWeek) {
        setViewingWeek(nextW);
      }
    },
    [activeSchedule.totalWeeks, pageWidth, viewingWeek, setViewingWeek],
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

  const handleJumpWeek = (targetWeek: number) => {
    const clamped = Math.max(1, Math.min(activeSchedule.totalWeeks, targetWeek));
    setViewingWeek(clamped);
  };

  // 渲染单周页面（供横向 FlatList 分页调用）
  const renderWeekPage = ({ item: weekNum }: { item: number }) => {
    const periods = settings.periodTimes;
    const totalPeriods = periods.length;
    const lunchAfter = settings.lunchAfter;
    const isThisWeek = weekNum === currentWeek;

    return (
      <View style={{ width: pageWidth, flex: 1 }}>
        {/* 6.3 表头（横坐标行）固定在滚动区之外，高度 HEADER_H = 40 */}
        <View style={[styles.headerRow, { height: HEADER_H }]}>
          <View style={[styles.cornerCell, { width: TIME_COL }]}>
            <Text style={styles.cornerText}>
              {weekDateFor(activeSchedule.startDate, weekNum, 1).getMonth() + 1}月
            </Text>
          </View>

          {DAYS.map((dayName, idx) => {
            const d = idx + 1;
            const dateObj = weekDateFor(activeSchedule.startDate, weekNum, d);
            const isTodayCol = isThisWeek && d === todayDayOfWeek;

            return (
              <View
                key={d}
                style={[
                  styles.dayHeaderCell,
                  { width: dayColWidth },
                  isTodayCol && styles.todayHeaderBg,
                ]}
              >
                <Text style={[styles.dayHeaderTitle, isTodayCol && styles.todayHeaderText]}>
                  {dayName}
                </Text>
                <Text style={[styles.dayHeaderDate, isTodayCol && styles.todayHeaderDateText]}>
                  {formatMD(dateObj)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 纵向网格区 */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            minHeight: rowBottom(totalPeriods, ROW_H, LUNCH_H, lunchAfter),
          }}
        >
          <View style={styles.gridBodyRow}>
            {/* 6.4 左侧时间列 (TIME_COL = 40) */}
            <View style={[styles.timeColumn, { width: TIME_COL }]}>
              {periods.map((pt, idx) => {
                const p = idx + 1;
                return (
                  <React.Fragment key={p}>
                    <View style={[styles.timeCell, { height: ROW_H }]}>
                      <Text style={styles.periodNumText}>{p}</Text>
                      <Text style={styles.periodStartText}>{pt.start}</Text>
                    </View>
                    {lunchAfter > 0 && p === lunchAfter && (
                      <View style={[styles.lunchTimeCell, { height: LUNCH_H }]}>
                        <Text style={styles.lunchText}>午休</Text>
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* 6.5 & 6.6 右侧 7 列课程网格区域 */}
            <View
              style={[
                styles.daysGridContainer,
                {
                  width: dayColWidth * 7,
                  height: rowBottom(totalPeriods, ROW_H, LUNCH_H, lunchAfter),
                },
              ]}
            >
              {/* 横向网格线 & 点击空白格添加课程 */}
              {periods.map((_, idx) => {
                const p = idx + 1;
                const hideBottomBorder =
                  lunchAfter > 0 && (p === lunchAfter || p === lunchAfter + 1);
                return (
                  <React.Fragment key={p}>
                    <View
                      style={[
                        styles.gridRowLine,
                        { height: ROW_H },
                        !hideBottomBorder && styles.hairlineBottom,
                      ]}
                    >
                      {DAYS.map((__, dIdx) => (
                        <TouchableOpacity
                          key={dIdx}
                          activeOpacity={0.6}
                          accessibilityLabel={`${DAYS[dIdx]}第${p}节 添加课程`}
                          style={{ width: dayColWidth, height: ROW_H }}
                          onPress={() =>
                            router.push({
                              pathname: '/timetable/course',
                              params: { day: String(dIdx + 1), period: String(p) },
                            })
                          }
                        />
                      ))}
                    </View>
                    {lunchAfter > 0 && p === lunchAfter && (
                      <View style={[styles.lunchRowBanner, { height: LUNCH_H }]} />
                    )}
                  </React.Fragment>
                );
              })}

              {/* 空状态 */}
              {courses.length === 0 ? (
                <View style={styles.emptyStateOverlay}>
                  <Text style={styles.emptyIcon}>📅</Text>
                  <Text style={styles.emptyTitle}>还没有课程</Text>
                  <Text style={styles.emptySub}>
                    点右上角 + 手动添加，或到「设置」里导入
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    accessibilityLabel="去设置导入"
                    onPress={() => router.push('/timetable/import')}
                  >
                    <Text style={styles.emptyBtnText}>去设置导入</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* 渲染当周课程色块 */
                courses.map((course) =>
                  course.sessions.map((session, sIdx) => {
                    if (!isActiveOn(session.weeks, weekNum)) return null;
                    const blocks = blocksOf(
                      session.startPeriod,
                      session.endPeriod,
                      lunchAfter
                    );

                    return blocks.map(([bStart, bEnd], bIdx) => {
                      if (bStart > totalPeriods) return null;
                      const boundedEnd = Math.min(bEnd, totalPeriods);

                      const top = rowTop(bStart, ROW_H, LUNCH_H, lunchAfter) + 1;
                      const bottom = rowBottom(boundedEnd, ROW_H, LUNCH_H, lunchAfter) - 1;
                      const height = bottom - top - 1;
                      const left = (session.dayOfWeek - 1) * dayColWidth + 1;
                      const width = dayColWidth - 2;

                      const bg = softenColor(course.color, settings.saturation);
                      const fg = foregroundFor(bg);
                      const subInfo = session.location || session.teacher || '';

                      return (
                        <TouchableOpacity
                          key={`${session.id}_${bIdx}`}
                          activeOpacity={0.75}
                          accessibilityLabel={`${course.name} ${DAYS[session.dayOfWeek - 1]}第${session.startPeriod}-${session.endPeriod}节`}
                          onPress={() => {
                            setSelectedCourse(course);
                            setSelectedSessionIdx(sIdx);
                          }}
                          style={[
                            styles.courseBlock,
                            {
                              top,
                              left,
                              width,
                              height,
                              backgroundColor: bg,
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={3}
                            style={[styles.courseBlockTitle, { color: fg }]}
                          >
                            {course.name}
                          </Text>
                          {Boolean(subInfo) && (
                            <Text
                              numberOfLines={1}
                              style={[styles.courseBlockSub, { color: fg }]}
                            >
                              {subInfo}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    });
                  })
                )
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top || SAFE_TOP_DP,
          paddingBottom:
            mode === 'tab'
              ? TAB_BAR_CLEARANCE + (insets.bottom || SAFE_BOTTOM_DP)
              : insets.bottom || SAFE_BOTTOM_DP,
        },
      ]}
    >
      {/* 6.1 顶部信息条：左侧课表名与周次，右侧依次为：翻页键 (‹ ›)、+（添加课程）、...（三个点上下居中）、设置键 */}
      <View style={styles.topInfoBar}>
        {mode === 'page' ? (
          <TouchableOpacity
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="返回"
            onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.topTitleArea}
          activeOpacity={0.7}
          accessibilityLabel="切换课表"
          onPress={() => setShowScheduleMenu(true)}
        >
          <View style={styles.scheduleNameRow}>
            <Text style={styles.scheduleNameText} numberOfLines={1}>
              {activeSchedule.name}
            </Text>
            <Text style={styles.dropdownChevron}>▾</Text>
          </View>
          <View style={styles.weekSubRow}>
            <Text style={styles.weekSubText}>
              第 {viewingWeek} 周 · {weekRangeLabel(activeSchedule.startDate, viewingWeek)}
            </Text>
            {!isViewingCurrentWeek && (
              <TouchableOpacity
                onPress={() => handleJumpWeek(currentWeek)}
                accessibilityLabel="回到本周"
              >
                <Text style={styles.backToCurrentText}>回到本周</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* 右侧四个控件依次排列：1.翻页键  2.+  3....  4.设置键 */}
        <View style={styles.topRightActions}>
          {/* 1. 翻页键 */}
          <View style={styles.pageTurnPill}>
            <TouchableOpacity
              style={styles.pageTurnBtn}
              accessibilityLabel="上一周"
              onPress={() => handleJumpWeek(viewingWeek - 1)}
            >
              <Text style={styles.pageTurnText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.pageTurnDivider} />
            <TouchableOpacity
              style={styles.pageTurnBtn}
              accessibilityLabel="下一周"
              onPress={() => handleJumpWeek(viewingWeek + 1)}
            >
              <Text style={styles.pageTurnText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 2. +（添加课程） */}
          <TouchableOpacity
            style={styles.navIconBtn}
            accessibilityLabel="添加课程"
            onPress={() =>
              router.push({
                pathname: '/timetable/course',
                params: { day: String(todayDayOfWeek), period: '1' },
              })
            }
          >
            <Text style={styles.plusIconText}>＋</Text>
          </TouchableOpacity>

          {/* 3. ...（三个点上下居中） */}
          <TouchableOpacity
            style={styles.navIconBtn}
            accessibilityLabel="更多操作"
            onPress={() => setShowMoreMenu(true)}
          >
            <View style={styles.threeDotsRow}>
              <View style={styles.dotCircle} />
              <View style={styles.dotCircle} />
              <View style={styles.dotCircle} />
            </View>
          </TouchableOpacity>

          {/* 4. 设置键 */}
          <TouchableOpacity
            style={styles.navIconBtn}
            accessibilityLabel="课表设置"
            onPress={() => router.push('/timetable/settings')}
          >
            <Text style={styles.settingsIconText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 6.7 横向翻周分页容器（FlatList + getItemLayout） */}
      <FlatList
        ref={flatListRef}
        data={weeksArray}
        keyExtractor={(w) => String(w)}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.max(0, viewingWeek - 1)}
        // 只渲染可视区附近的页：默认一次渲染 10 页（每页 7 列 × 十几行），进课表时会明显卡一下。
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        scrollEventThrottle={16}
        onScroll={(e) => {
          handleHorizontalScroll(e.nativeEvent.contentOffset.x);
        }}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        // 实测容器宽度：真正决定每页宽度的就是它，窗口宽度只是拿不到布局时的兜底
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0 && w !== listWidth) setListWidth(w);
        }}
        onMomentumScrollEnd={(e) => {
          const x = e.nativeEvent.contentOffset.x;
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
        onEdit={(c) => {
          setSelectedCourse(null);
          router.push({ pathname: '/timetable/course', params: { id: c.id } });
        }}
        onCopy={async (c) => {
          try {
            await duplicateCourse(c);
          } catch (err) {
            // 写库失败要就地提示，绝不能让 Promise 拒绝逃出去（原生端会整页崩回首页）
            showNotice(`复制失败：${err instanceof Error ? err.message : '未知错误'}`);
          } finally {
            setSelectedCourse(null);
          }
        }}
        onDelete={(c) => {
          void askConfirm({
            title: '确认删除',
            message: `确定删除「${c.name}」吗？`,
            confirmLabel: '删除',
            danger: true,
          })
            .then(async (ok) => {
              if (!ok) return;
              try {
                await deleteCourse(c.id);
              } catch (err) {
                showNotice(`删除失败：${err instanceof Error ? err.message : '未知错误'}`);
              }
              setSelectedCourse(null);
            })
            .catch(() => undefined);
        }}
      />

      {/* 切换课表下拉菜单 */}
      <Modal visible={showScheduleMenu} transparent animationType="fade">
        <Pressable style={styles.menuBackdrop} onPress={() => setShowScheduleMenu(false)}>
          <View style={styles.schedulePopupCard}>
            {schedules.map((s) => {
              const isCurrent = s.id === activeSchedule.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.popupItemRow}
                  onPress={async () => {
                    try {
                      await switchSchedule(s.id);
                      setShowScheduleMenu(false);
                    } catch (err) {
                      showNotice(`切换失败：${err instanceof Error ? err.message : '未知错误'}`);
                    }
                  }}
                >
                  <Text style={[styles.popupItemText, isCurrent && styles.popupItemTextActive]}>
                    {s.name}
                  </Text>
                  {isCurrent && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            <View style={styles.popupDivider} />
            <TouchableOpacity
              style={styles.popupItemRow}
              onPress={() => {
                setShowScheduleMenu(false);
                router.push('/timetable/schedules');
              }}
            >
              <Text style={styles.popupManageText}>管理课表…</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 顶栏「...」更多快捷菜单 */}
      <Modal visible={showMoreMenu} transparent animationType="fade">
        <Pressable style={styles.menuBackdrop} onPress={() => setShowMoreMenu(false)}>
          <View style={styles.morePopupCard}>
            <TouchableOpacity
              style={styles.popupItemRow}
              onPress={() => {
                setShowMoreMenu(false);
                handleJumpWeek(currentWeek);
              }}
            >
              <Text style={styles.popupItemText}>📍 回到本周（第 {currentWeek} 周）</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popupItemRow}
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/timetable/import');
              }}
            >
              <Text style={styles.popupItemText}>📥 导入课表</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popupItemRow}
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/timetable/courses');
              }}
            >
              <Text style={styles.popupItemText}>📚 全部课程</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popupItemRow}
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/timetable/periods');
              }}
            >
              <Text style={styles.popupItemText}>⏰ 节次设置</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popupItemRow}
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/timetable/appearance');
              }}
            >
              <Text style={styles.popupItemText}>🎨 外观预览</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  topInfoBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
  },
  topTitleArea: { flex: 1, marginRight: 8 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#111113',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 25,
    lineHeight: 27,
    color: '#111113',
    marginTop: -2,
  },
  scheduleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scheduleNameText: { fontSize: 17, fontWeight: '600', color: '#111113' },
  dropdownChevron: { fontSize: 13, color: 'rgba(0,0,0,0.5)' },
  weekSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  weekSubText: { fontSize: 12, fontWeight: '400', color: 'rgba(0,0,0,0.6)' },
  backToCurrentText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pageTurnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    marginRight: 2,
  },
  pageTurnBtn: {
    width: 26,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTurnText: { fontSize: 18, fontWeight: '500', color: '#111113', lineHeight: 20 },
  pageTurnDivider: { width: 1, height: 12, backgroundColor: 'rgba(0,0,0,0.1)' },
  navIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconText: { fontSize: 20, fontWeight: '500', color: '#111113', lineHeight: 22 },
  threeDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dotCircle: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#111113',
  },
  settingsIconText: { fontSize: 18, color: '#111113' },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  cornerCell: { alignItems: 'center', justifyContent: 'center' },
  cornerText: { fontSize: 9, fontWeight: '600', color: 'rgba(0,0,0,0.4)' },
  dayHeaderCell: { alignItems: 'center', justifyContent: 'center' },
  todayHeaderBg: { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
  dayHeaderTitle: { fontSize: 10, fontWeight: '600', color: '#111113' },
  todayHeaderText: { color: '#3B82F6', fontWeight: '700' },
  dayHeaderDate: { fontSize: 8, fontWeight: '400', color: 'rgba(0,0,0,0.6)', marginTop: 1 },
  todayHeaderDateText: { color: '#3B82F6', fontWeight: '600' },
  gridBodyRow: { flexDirection: 'row' },
  timeColumn: {
    backgroundColor: '#F5F5F7',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(0,0,0,0.08)',
  },
  timeCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  periodNumText: { fontSize: 10, fontWeight: '600', color: '#111113' },
  periodStartText: { fontSize: 8, fontWeight: '400', color: 'rgba(0,0,0,0.6)', marginTop: 1 },
  lunchTimeCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  lunchText: { fontSize: 9, fontWeight: '500', color: 'rgba(0,0,0,0.5)' },
  daysGridContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(0,0,0,0.08)',
  },
  gridRowLine: { flexDirection: 'row' },
  hairlineBottom: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  lunchRowBanner: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  courseBlock: {
    position: 'absolute',
    borderRadius: 6,
    padding: 3,
    overflow: 'hidden',
    zIndex: 10,
  },
  courseBlockTitle: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13.2,
  },
  courseBlockSub: {
    fontSize: 9,
    fontWeight: '400',
    lineHeight: 9.9,
    opacity: 0.85,
    marginTop: 2,
  },
  emptyStateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111113' },
  emptySub: { fontSize: 13, fontWeight: '400', color: 'rgba(0,0,0,0.6)', marginTop: 4 },
  emptyBtn: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 12 },
  emptyBtnText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  schedulePopupCard: {
    marginTop: 64,
    marginLeft: 14,
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
  },
  morePopupCard: {
    marginTop: 64,
    alignSelf: 'flex-end',
    marginRight: 14,
    width: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
  },
  popupItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  popupItemText: { fontSize: 13, fontWeight: '500', color: '#111113' },
  popupItemTextActive: { color: '#3B82F6', fontWeight: '700' },
  checkMark: { fontSize: 14, color: '#3B82F6', fontWeight: '700' },
  popupDivider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4,
  },
  popupManageText: { fontSize: 12, fontWeight: '500', color: 'rgba(0,0,0,0.6)' },
});
