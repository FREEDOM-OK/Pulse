import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { CourseEntity } from '@/features/timetable/repository';
import { useGlass, useGlassMaterial, useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/theme/theme-context';
import {
  HEADER_H,
  LUNCH_H,
  ROW_H,
  TIME_COL,
  blocksOf,
  foregroundFor,
  formatMD,
  isActiveOn,
  rowBottom,
  rowTop,
  softenColor,
  timeToGridY,
  timeToMinutes,
  weekDateFor,
  type PeriodTime,
} from '@/lib/timetable-core';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const HAIRLINE = 0.5;

interface WeekGridProps {
  weekNum: number;
  /** 单页宽度（含左侧时间列），由外层 FlatList 实测后传入。 */
  width: number;
  dayColWidth: number;
  periods: PeriodTime[];
  lunchAfter: number;
  courses: CourseEntity[];
  currentWeek: number;
  todayDayOfWeek: number;
  startDate: string;
  saturation: number;
  /** 课程格高度 dp（settings.cellHeight）。 */
  cellHeight: number;
  /** 课程格圆角 dp（settings.cellRadius）。 */
  cellRadius: number;
  /** 课表背景色（settings.gridBackgroundColor），已被上层按深浅色解析。 */
  gridBackgroundColor: string;
  /** 空白格子底色：深色默认网格下比容器浅一档（theme.backgroundElement）。 */
  cellBackgroundColor: string;
  /** 可见星期序列（1=周一…7=周日），由 weekStartDay / showSaturday / showSunday 决定。 */
  visibleDays: number[];
  /** ScrollView 内部底部留白：tab 模式 100（避让悬浮底栏），page 模式 32。 */
  bottomPadding: number;
  /** 仅作为新建课程页的默认跨度（settings.defaultSpan），预览块固定单节。 */
  defaultSpan?: number;
  onAddCourse: (day: number, period: number, endPeriod?: number) => void;
  onPressCourse: (course: CourseEntity, sessionIndex: number) => void;
  onImport: () => void;
}

/**
 * 单周网格：左侧节次时间列 + 右侧 7 天课程格。
 *
 * 横向分页由外层 FlatList 负责，这里只负责：
 * - 表头星期/日期固定不滚动；
 * - 每一行用 rowTop(k) 绝对定位，行底 hairline 严格落在 rowTop(k) + ROW_H，
 *   午休条只占 rowTop(lunchAfter) + ROW_H 起的 LUNCH_H 高度，不再靠顺序流里
 *   临时隐藏 border 来避让（那正是第 6/7 节分界线丢失的根因）。
 */
export function WeekGrid({
  weekNum,
  width,
  dayColWidth,
  periods,
  lunchAfter,
  courses,
  currentWeek,
  todayDayOfWeek,
  startDate,
  saturation,
  cellHeight,
  cellRadius,
  gridBackgroundColor,
  cellBackgroundColor,
  visibleDays,
  bottomPadding,
  onAddCourse,
  onPressCourse,
  onImport,
}: WeekGridProps) {
  const theme = useTheme();
  const { scheme } = useThemePreference();
  const glass = useGlass();
  const material = useGlassMaterial();
  const isDark = scheme === 'dark';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const cellDividerColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E5EA';
  const lunchColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const lunchBannerColor = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
  const totalPeriods = periods.length;
  const isThisWeek = weekNum === currentWeek;
  /** 行高由「课程格子高度」设置驱动，44~90 dp。 */
  const rowH = cellHeight > 0 ? cellHeight : ROW_H;
  const colCount = Math.max(1, visibleDays.length);
  const gridHeight = rowBottom(totalPeriods, rowH, LUNCH_H, lunchAfter);

  /**
   * 两段式添加：第一次点空白格只放一个粉色 ＋ 预览块，点它才真正跳去新建页。
   * 换周或课程数据变化时清空，避免预览块停在一个已经不该显示的位置。
   */
  const [pendingSlot, setPendingSlot] = useState<{ day: number; period: number } | null>(null);
  useEffect(() => {
    setPendingSlot(null);
  }, [weekNum, courses]);

  const periodTop = (period: number) => rowTop(period, rowH, LUNCH_H, lunchAfter);
  const lunchTop = lunchAfter > 0 ? periodTop(lunchAfter) + rowH : 0;
  const monday = weekDateFor(startDate, weekNum, 1);

  /**
   * 预览块固定只占所点的这一节：第一次点空白格出现一个单节高的粉色 ＋，
   * 第二次点它时带着同一节（起始 = 结束）跳去新建课程页。
   */
  const preview = (() => {
    if (!pendingSlot) return null;
    const day = pendingSlot.day;
    const startP = pendingSlot.period;
    if (startP < 1 || startP > totalPeriods) return null;

    const endP = startP;
    const top = periodTop(startP) + 1;
    const colIdx = visibleDays.indexOf(day);
    if (colIdx < 0) return null;
    return {
      day,
      startP,
      endP,
      top,
      height: rowH - 2,
      left: colIdx * dayColWidth + 1,
      width: dayColWidth - 2,
    };
  })();

  return (
    <View style={[styles.page, { width }]}>
      {/* 表头固定：左侧月份角标 + 7 天星期/日期 */}
      <View
        style={[styles.headerRow, { height: HEADER_H, backgroundColor: gridBackgroundColor, borderBottomColor: dividerColor }]}
        onTouchStart={() => {
          if (pendingSlot !== null) setPendingSlot(null);
        }}>
        <View style={[styles.cornerCell, { width: TIME_COL }]}>
          <Text style={[styles.cornerText, { color: theme.textSecondary }]}>{monday.getMonth() + 1}月</Text>
        </View>

        {visibleDays.map((day) => {
          const dayName = DAYS[day - 1];
          const isTodayCol = isThisWeek && day === todayDayOfWeek;
          const dateObj = weekDateFor(startDate, weekNum, day);

          return (
            <View
              key={day}
              style={[
                styles.dayHeaderCell,
                { width: dayColWidth },
                isTodayCol && styles.todayHeaderBg,
              ]}>
              <Text style={[styles.dayHeaderTitle, { color: theme.text }, isTodayCol && styles.todayHeaderText]}>
                {dayName}
              </Text>
              <Text style={[styles.dayHeaderDate, { color: theme.textSecondary }, isTodayCol && styles.todayHeaderDateText]}>
                {formatMD(dateObj)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 纵向网格区：高度占满到底，底部留白放进 contentContainerStyle */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          minHeight: gridHeight + bottomPadding,
          paddingBottom: bottomPadding,
        }}>
        <View style={[styles.gridBodyRow, { height: gridHeight }]}>
          {/* 左列：节次序号 / 开始时间 / 结束时间，三行垂直居中 */}
          <View
            style={[styles.timeColumn, { width: TIME_COL, height: gridHeight, backgroundColor: gridBackgroundColor, borderRightColor: dividerColor }]}
            onTouchStart={() => {
              if (pendingSlot !== null) setPendingSlot(null);
            }}>
            {periods.map((periodTime, idx) => {
              const period = idx + 1;
              return (
                <View
                  key={period}
                  style={[
                    styles.timeCell,
                    {
                      top: periodTop(period),
                      height: rowH,
                      width: TIME_COL,
                      borderBottomColor: cellDividerColor,
                    },
                  ]}>
                  <Text style={[styles.periodNumText, { color: theme.text }]}>{period}</Text>
                  <Text style={[styles.periodTimeText, { color: theme.textSecondary }]}>{periodTime.start}</Text>
                  <Text style={[styles.periodTimeText, { color: theme.textSecondary }]}>{periodTime.end}</Text>
                </View>
              );
            })}

            {lunchAfter > 0 ? (
              <View style={[styles.lunchTimeCell, { top: lunchTop, height: LUNCH_H, backgroundColor: lunchColor }]}>
                <Text style={[styles.lunchText, { color: theme.textSecondary }]}>午休</Text>
              </View>
            ) : null}
          </View>

          {/* 右侧可见天数列：每节一行，行底 hairline 位置由 rowTop 公式统一决定 */}
          <View
            style={[
              styles.daysGridContainer,
              {
                width: dayColWidth * colCount,
                height: gridHeight,
                backgroundColor: cellBackgroundColor,
              },
            ]}>
            {periods.map((_, idx) => {
              const period = idx + 1;
              return (
                <View
                  key={period}
                  style={[
                    styles.gridRow,
                    { top: periodTop(period), height: rowH, width: dayColWidth * colCount },
                  ]}>
                  {visibleDays.map((day) => {
                    const dayName = DAYS[day - 1];
                    return (
                      <TouchableOpacity
                        key={day}
                        activeOpacity={0.6}
                        accessibilityLabel={`${dayName}第${period}节 添加课程`}
                        style={{ width: dayColWidth, height: rowH }}
                        onPress={() => {
                          // 严格两态：已有预览框时，点任何空白格只负责取消，不瞬移过去。
                          if (pendingSlot !== null) {
                            setPendingSlot(null);
                            return;
                          }
                          setPendingSlot({ day, period });
                        }}
                      />
                    );
                  })}
                  <View style={[styles.hairline, { backgroundColor: cellDividerColor }]} />
                </View>
              );
            })}

            {lunchAfter > 0 ? (
              <View
                style={[
                  styles.lunchRowBanner,
                  {
                    top: lunchTop,
                    height: LUNCH_H,
                    width: dayColWidth * colCount,
                    backgroundColor: lunchBannerColor,
                    borderBottomColor: cellDividerColor,
                  },
                ]}
              />
            ) : null}

            {/* 第一次点空白格后出现的 ＋ 预览块：点它才跳去新建课程页 */}
            {preview ? (
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityLabel={`${DAYS[preview.day - 1]}第${preview.startP}-${preview.endP}节 点击添加课程`}
                onPress={() => {
                  setPendingSlot(null);
                  onAddCourse(preview.day, preview.startP, preview.endP);
                }}
                style={[
                  styles.previewBlock,
                  {
                    top: preview.top,
                    left: preview.left,
                    width: preview.width,
                    height: preview.height,
                    borderRadius: cellRadius,
                  },
                ]}>
                <Text style={styles.previewPlus}>＋</Text>
              </TouchableOpacity>
            ) : null}

            {courses.length === 0 ? (
              // box-none：空态只拦截中间按钮区域，网格空白格仍能点击添加课程
              <View pointerEvents="box-none" style={styles.emptyStateOverlay}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>还没有课程</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>点右上角 ＋ 手动添加，或直接导入课表</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  accessibilityLabel="去导入课表"
                  onPress={onImport}>
                  <Text style={styles.emptyBtnText}>去导入课表</Text>
                </TouchableOpacity>
              </View>
            ) : (
              courses.map((course) =>
                course.sessions.map((session, sessionIndex) => {
                  if (!isActiveOn(session.weeks, weekNum)) return null;
                  // 该课落在被隐藏的星期（如关掉周六）时整块不渲染。
                  const colIdx = visibleDays.indexOf(session.dayOfWeek);
                  if (colIdx === -1) return null;
                  const bg = softenColor(course.color, saturation);
                  const fg = foregroundFor(bg);
                  const subInfo = session.location || session.teacher || '';
                  const left = colIdx * dayColWidth + 1;
                  const blockWidth = dayColWidth - 2;

                  const renderBlock = (key: string, top: number, height: number) => (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.75}
                      accessibilityLabel={`${course.name} ${DAYS[session.dayOfWeek - 1]}第${session.startPeriod}-${session.endPeriod}节`}
                      onPress={() => {
                        setPendingSlot(null);
                        onPressCourse(course, sessionIndex);
                      }}
                      style={[
                        styles.courseBlock,
                        {
                          top,
                          left,
                          width: blockWidth,
                          height,
                          backgroundColor: bg,
                          borderRadius: cellRadius,
                          // 毛玻璃皮肤：课程色块自带一层半透明白边，像果冻玻璃块。
                          ...(glass
                            ? { borderWidth: 0.8, borderColor: material.blockBorder }
                            : null),
                        },
                      ]}>
                      <Text numberOfLines={3} style={[styles.courseBlockTitle, { color: fg }]}>
                        {course.name}
                      </Text>
                      {Boolean(subInfo) && (
                        <Text numberOfLines={1} style={[styles.courseBlockSub, { color: fg }]}>
                          {subInfo}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );

                  const custom = session.customTime;
                  const hasCustom = Boolean(
                    custom?.enabled && custom.startTime && custom.endTime
                  );

                  // 自定义时间：按真实时间比例定位到像素，跨午休/课间也只画一整块。
                  if (hasCustom) {
                    const customTop =
                      timeToGridY(
                        timeToMinutes(custom!.startTime),
                        periods,
                        rowH,
                        LUNCH_H,
                        lunchAfter
                      ) + 1;
                    const customBottom =
                      timeToGridY(
                        timeToMinutes(custom!.endTime),
                        periods,
                        rowH,
                        LUNCH_H,
                        lunchAfter
                      ) - 1;
                    return renderBlock(
                      `${session.id}_custom`,
                      customTop,
                      Math.max(24, customBottom - customTop)
                    );
                  }

                  const blocks = blocksOf(session.startPeriod, session.endPeriod, lunchAfter);

                  return blocks.map(([blockStart, blockEnd], blockIndex) => {
                    if (blockStart > totalPeriods) return null;
                    const boundedEnd = Math.min(blockEnd, totalPeriods);

                    const top = periodTop(blockStart) + 1;
                    const bottom = rowBottom(boundedEnd, rowH, LUNCH_H, lunchAfter) - 1;

                    return renderBlock(`${session.id}_${blockIndex}`, top, bottom - top - 1);
                  });
                }),
              )
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderBottomWidth: HAIRLINE,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  cornerCell: { alignItems: 'center', justifyContent: 'center' },
  cornerText: { fontSize: 9, fontWeight: '600', color: 'rgba(0,0,0,0.4)' },
  dayHeaderCell: { alignItems: 'center', justifyContent: 'center' },
  todayHeaderBg: { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
  dayHeaderTitle: { fontSize: 10, fontWeight: '600', color: '#111113' },
  todayHeaderText: { color: '#3B82F6', fontWeight: '700' },
  dayHeaderDate: {
    fontSize: 8,
    fontWeight: '400',
    color: 'rgba(0,0,0,0.6)',
    marginTop: 1,
  },
  todayHeaderDateText: { color: '#3B82F6', fontWeight: '600' },
  gridBodyRow: { flexDirection: 'row' },
  timeColumn: {
    position: 'relative',
    backgroundColor: '#F5F5F7',
    borderRightWidth: HAIRLINE,
    borderRightColor: 'rgba(0,0,0,0.08)',
  },
  timeCell: {
    position: 'absolute',
    left: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: HAIRLINE,
    borderBottomColor: '#E5E5EA',
  },
  periodNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  periodTimeText: {
    fontSize: 9.5,
    color: '#8E8E93',
    lineHeight: 11,
    fontVariant: ['tabular-nums'],
  },
  lunchTimeCell: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  lunchText: { fontSize: 9, fontWeight: '500', color: 'rgba(0,0,0,0.5)' },
  daysGridContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  gridRow: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HAIRLINE,
    backgroundColor: '#E5E5EA',
  },
  lunchRowBanner: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.02)',
    // 午休条自身的下边界线：保证第 5 节（或午休后第一节）顶部仍有贯穿线
    borderBottomWidth: HAIRLINE,
    borderBottomColor: '#E5E5EA',
  },
  courseBlock: {
    position: 'absolute',
    borderRadius: 6,
    padding: 3,
    overflow: 'hidden',
    zIndex: 10,
  },
  /** 空白格第一次点击后的 ＋ 预览块（珊瑚粉），比课程块高一层的待确认态。 */
  previewBlock: {
    position: 'absolute',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F472B6',
    overflow: 'hidden',
    zIndex: 15,
  },
  previewPlus: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 28,
  },
  courseBlockTitle: { fontSize: 11, fontWeight: '700', lineHeight: 13.2 },
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
    zIndex: 20,
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111113' },
  emptySub: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(0,0,0,0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyBtn: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 12 },
  emptyBtnText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
});