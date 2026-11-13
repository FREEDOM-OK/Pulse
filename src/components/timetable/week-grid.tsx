import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { CourseEntity } from '@/features/timetable/repository';
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
  /** ScrollView 内部底部留白：tab 模式 100（避让悬浮底栏），page 模式 32。 */
  bottomPadding: number;
  onAddCourse: (day: number, period: number) => void;
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
  bottomPadding,
  onAddCourse,
  onPressCourse,
  onImport,
}: WeekGridProps) {
  const totalPeriods = periods.length;
  const isThisWeek = weekNum === currentWeek;
  const gridHeight = rowBottom(totalPeriods, ROW_H, LUNCH_H, lunchAfter);

  const periodTop = (period: number) => rowTop(period, ROW_H, LUNCH_H, lunchAfter);
  const lunchTop = lunchAfter > 0 ? periodTop(lunchAfter) + ROW_H : 0;
  const monday = weekDateFor(startDate, weekNum, 1);

  return (
    <View style={[styles.page, { width }]}>
      {/* 表头固定：左侧月份角标 + 7 天星期/日期 */}
      <View style={[styles.headerRow, { height: HEADER_H }]}>
        <View style={[styles.cornerCell, { width: TIME_COL }]}>
          <Text style={styles.cornerText}>{monday.getMonth() + 1}月</Text>
        </View>

        {DAYS.map((dayName, idx) => {
          const day = idx + 1;
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
          <View style={[styles.timeColumn, { width: TIME_COL, height: gridHeight }]}>
            {periods.map((periodTime, idx) => {
              const period = idx + 1;
              return (
                <View
                  key={period}
                  style={[
                    styles.timeCell,
                    {
                      top: periodTop(period),
                      height: ROW_H,
                      width: TIME_COL,
                    },
                  ]}>
                  <Text style={styles.periodNumText}>{period}</Text>
                  <Text style={styles.periodTimeText}>{periodTime.start}</Text>
                  <Text style={styles.periodTimeText}>{periodTime.end}</Text>
                </View>
              );
            })}

            {lunchAfter > 0 ? (
              <View style={[styles.lunchTimeCell, { top: lunchTop, height: LUNCH_H }]}>
                <Text style={styles.lunchText}>午休</Text>
              </View>
            ) : null}
          </View>

          {/* 右侧 7 天：每节一行，行底 hairline 位置由 rowTop 公式统一决定 */}
          <View
            style={[
              styles.daysGridContainer,
              { width: dayColWidth * 7, height: gridHeight },
            ]}>
            {periods.map((_, idx) => {
              const period = idx + 1;
              return (
                <View
                  key={period}
                  style={[
                    styles.gridRow,
                    { top: periodTop(period), height: ROW_H, width: dayColWidth * 7 },
                  ]}>
                  {DAYS.map((dayName, dayIdx) => {
                    const day = dayIdx + 1;
                    return (
                      <TouchableOpacity
                        key={day}
                        activeOpacity={0.6}
                        accessibilityLabel={`${dayName}第${period}节 添加课程`}
                        style={{ width: dayColWidth, height: ROW_H }}
                        onPress={() => onAddCourse(day, period)}
                      />
                    );
                  })}
                  <View style={styles.hairline} />
                </View>
              );
            })}

            {lunchAfter > 0 ? (
              <View
                style={[
                  styles.lunchRowBanner,
                  { top: lunchTop, height: LUNCH_H, width: dayColWidth * 7 },
                ]}
              />
            ) : null}

            {courses.length === 0 ? (
              // box-none：空态只拦截中间按钮区域，网格空白格仍能点击添加课程
              <View pointerEvents="box-none" style={styles.emptyStateOverlay}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>还没有课程</Text>
                <Text style={styles.emptySub}>点右上角 ＋ 手动添加，或直接导入课表</Text>
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
                  const blocks = blocksOf(session.startPeriod, session.endPeriod, lunchAfter);
                  const bg = softenColor(course.color, saturation);
                  const fg = foregroundFor(bg);
                  const subInfo = session.location || session.teacher || '';

                  return blocks.map(([blockStart, blockEnd], blockIndex) => {
                    if (blockStart > totalPeriods) return null;
                    const boundedEnd = Math.min(blockEnd, totalPeriods);

                    const top = periodTop(blockStart) + 1;
                    const bottom = rowBottom(boundedEnd, ROW_H, LUNCH_H, lunchAfter) - 1;
                    const height = bottom - top - 1;
                    const left = (session.dayOfWeek - 1) * dayColWidth + 1;
                    const blockWidth = dayColWidth - 2;

                    return (
                      <TouchableOpacity
                        key={`${session.id}_${blockIndex}`}
                        activeOpacity={0.75}
                        accessibilityLabel={`${course.name} ${DAYS[session.dayOfWeek - 1]}第${session.startPeriod}-${session.endPeriod}节`}
                        onPress={() => onPressCourse(course, sessionIndex)}
                        style={[
                          styles.courseBlock,
                          {
                            top,
                            left,
                            width: blockWidth,
                            height,
                            backgroundColor: bg,
                          },
                        ]}>
                        <Text
                          numberOfLines={3}
                          style={[styles.courseBlockTitle, { color: fg }]}>
                          {course.name}
                        </Text>
                        {Boolean(subInfo) && (
                          <Text
                            numberOfLines={1}
                            style={[styles.courseBlockSub, { color: fg }]}>
                            {subInfo}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
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