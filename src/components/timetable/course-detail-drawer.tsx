import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { CourseEntity, SessionEntity } from '@/features/timetable/repository';
import { PeriodTime, formatWeeks } from '@/lib/timetable-core';

interface CourseDetailDrawerProps {
  visible: boolean;
  course: CourseEntity | null;
  sessionIndex?: number;
  periodTimes: PeriodTime[];
  onClose: () => void;
  onEdit: (course: CourseEntity) => void;
  onCopy: (course: CourseEntity) => void;
  onDelete: (course: CourseEntity) => void;
}

const DAYS_NAME = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/**
 * 课程详情抽屉。
 *
 * 必须复用 BottomSheet 的原生 `<Modal>`：页面内的绝对定位 View 在 Tab 模式下
 * 永远压在 AppTabBar（zIndex 999）下面，底部的编辑/删除按钮会被导航栏挡住。
 * 统一走 Modal 后，遮罩和卡片处于系统最高层级，同时底部只需避让系统手势条。
 */
export const CourseDetailDrawer: React.FC<CourseDetailDrawerProps> = ({
  visible,
  course,
  sessionIndex = 0,
  periodTimes,
  onClose,
  onEdit,
  onCopy,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();
  // 关闭时父组件会立刻把 course 置空。缓存最后一份数据，让退场动画期间
  // 卡片仍然有内容，而不是「啪」一下变空白。
  const [displayCourse, setDisplayCourse] = useState<CourseEntity | null>(course);

  useEffect(() => {
    if (course) setDisplayCourse(course);
  }, [course]);

  const activeCourse = course ?? displayCourse;
  if (!activeCourse) return null;

  const session: SessionEntity =
    activeCourse.sessions[sessionIndex] ||
    activeCourse.sessions[0] || {
      id: '',
      courseId: activeCourse.id,
      dayOfWeek: 1,
      startPeriod: 1,
      endPeriod: 2,
      weeks: [1],
      teacher: '',
      location: '',
      remark: '',
    };

  const defaultStart = periodTimes[session.startPeriod - 1]?.start || '08:00';
  const defaultEnd = periodTimes[session.endPeriod - 1]?.end || '09:40';

  const periodTimeText = session.customTime?.enabled
    ? `${DAYS_NAME[session.dayOfWeek - 1]} 第 ${session.startPeriod} - ${session.endPeriod} 节   ${session.customTime.startTime} - ${session.customTime.endTime}`
    : `${DAYS_NAME[session.dayOfWeek - 1]} 第 ${session.startPeriod} - ${session.endPeriod} 节   ${defaultStart} - ${defaultEnd}`;

  const weeksLabel =
    session.weeks && session.weeks.length > 0
      ? `第 ${formatWeeks(session.weeks)} 周`
      : '每周';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      closeLabel="关闭详情"
      autoHeight
      showHandle={false}
      sheetStyle={styles.sheet}
      bodyStyle={[styles.body, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      {/* 顶部居中把手条（BottomSheet 的默认把手已关闭，避免出现两条） */}
      <View style={styles.dragHandle} />

      {/* 课程名称与标志性竖色条 */}
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <View style={[styles.verticalColorBar, { backgroundColor: activeCourse.color }]} />
          <Text style={styles.courseTitleText}>{activeCourse.name}</Text>
        </View>
        {Boolean(activeCourse.credits && activeCourse.credits !== '选填') && (
          <View style={styles.creditBadge}>
            <Text style={styles.creditBadgeText}>{activeCourse.credits} 学分</Text>
          </View>
        )}
      </View>

      {/* 详细信息行列表 */}
      <View style={styles.infoList}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📅</Text>
          <Text style={styles.infoText}>{weeksLabel}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>⏰</Text>
          <Text style={styles.infoText}>{periodTimeText}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText}>{session.location || '未填教室'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>👤</Text>
          <Text style={styles.infoText}>{session.teacher || '未填老师'}</Text>
        </View>

        <View style={[styles.infoRow, styles.remarkRow]}>
          <View style={styles.flexRowCenter}>
            <Text style={styles.infoIcon}>📝</Text>
            <Text style={session.remark ? styles.infoText : styles.placeholderText}>
              {session.remark || '备注 (可不填)'}
            </Text>
          </View>
        </View>
      </View>

      {/* 底部动作条：编辑大按钮 + 复制 + 删除 */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.editMainBtn}
          activeOpacity={0.8}
          accessibilityLabel="编辑课程"
          onPress={() => onEdit(activeCourse)}>
          <Text style={styles.editMainBtnText}>编辑</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconSquareBtn}
          activeOpacity={0.7}
          accessibilityLabel="复制课程"
          onPress={() => onCopy(activeCourse)}>
          <Text style={styles.iconSquareText}>📄</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconSquareBtn}
          activeOpacity={0.7}
          accessibilityLabel="删除课程"
          onPress={() => onDelete(activeCourse)}>
          <Text style={styles.iconSquareText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 0,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  verticalColorBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  courseTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  creditBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  creditBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  infoList: {
    gap: 15,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  remarkRow: {
    justifyContent: 'space-between',
  },
  flexRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  infoIcon: {
    fontSize: 15,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flexShrink: 1,
  },
  placeholderText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editMainBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editMainBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  iconSquareBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSquareText: {
    fontSize: 16,
  },
});