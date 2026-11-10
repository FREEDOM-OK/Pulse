import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { CourseEntity, SessionEntity } from '@/features/timetable/repository';
import { PeriodTime, formatWeeks } from '@/lib/timetable-core';

const ABSOLUTE_FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

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
  const [mounted, setMounted] = useState(false);
  const [scopeIsThisWeek, setScopeIsThisWeek] = useState(true);

  // 遮罩 180ms 淡入，内容独立 240ms 升起（不使用 Modal animationType="slide"）
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(420);

  useEffect(() => {
    if (visible && course) {
      setScopeIsThisWeek(true);
      setMounted(true);
      backdropOpacity.value = withTiming(1, { duration: 180 });
      translateY.value = withTiming(0, { duration: 240 });
    } else if (mounted) {
      backdropOpacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(420, { duration: 240 }, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
  }, [visible, course]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted || !course) return null;

  const session: SessionEntity =
    course.sessions[sessionIndex] ||
    course.sessions[0] || {
      id: '',
      courseId: course.id,
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
    <View style={ABSOLUTE_FILL} pointerEvents="box-none">
      {/* 独立半透明遮罩 */}
      <Animated.View style={[styles.backdropOverlay, backdropStyle]}>
        <Pressable style={ABSOLUTE_FILL} onPress={onClose} />
      </Animated.View>

      {/* 底部抽屉卡片 */}
      <Animated.View style={[styles.drawerCard, cardStyle]}>
        {/* 1. 顶部居中把手条 */}
        <View style={styles.dragHandle} />

        {/* 2. 课程名称与标志性竖色条 */}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <View style={[styles.verticalColorBar, { backgroundColor: course.color }]} />
            <Text style={styles.courseTitleText}>{course.name}</Text>
          </View>
          {Boolean(course.credits && course.credits !== '选填') && (
            <View style={styles.creditBadge}>
              <Text style={styles.creditBadgeText}>{course.credits} 学分</Text>
            </View>
          )}
        </View>

        {/* 3. 详细信息行列表 */}
        <View style={styles.infoList}>
          {/* 周数 */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>{weeksLabel}</Text>
          </View>

          {/* 节数与时间 */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>⏰</Text>
            <Text style={styles.infoText}>{periodTimeText}</Text>
          </View>

          {/* 教室地点 */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>{session.location || '未填教室'}</Text>
          </View>

          {/* 任课老师 */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <Text style={styles.infoText}>{session.teacher || '未填老师'}</Text>
          </View>

          {/* 备注行与 仅本周/所有周 药丸切换器 */}
          <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
            <View style={styles.flexRowCenter}>
              <Text style={styles.infoIcon}>📝</Text>
              <Text style={session.remark ? styles.infoText : styles.placeholderText}>
                {session.remark || '备注 (可不填)'}
              </Text>
            </View>

            {/* 药丸切换 */}
            <View style={styles.scopePillContainer}>
              <TouchableOpacity
                style={[styles.scopeBtn, scopeIsThisWeek && styles.scopeBtnActive]}
                onPress={() => setScopeIsThisWeek(true)}
              >
                <Text style={[styles.scopeText, scopeIsThisWeek && styles.scopeTextActive]}>
                  仅本周
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scopeBtn, !scopeIsThisWeek && styles.scopeBtnActive]}
                onPress={() => setScopeIsThisWeek(false)}
              >
                <Text style={[styles.scopeText, !scopeIsThisWeek && styles.scopeTextActive]}>
                  所有周
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4. 底部动作条：编辑大按钮 + 复制 + 删除 */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editMainBtn}
            activeOpacity={0.8}
            onPress={() => onEdit(course)}
          >
            <Text style={styles.editMainBtnText}>编辑</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconSquareBtn}
            activeOpacity={0.7}
            onPress={() => onCopy(course)}
          >
            <Text style={styles.iconSquareText}>📄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconSquareBtn}
            activeOpacity={0.7}
            onPress={() => onDelete(course)}
          >
            <Text style={styles.iconSquareText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdropOverlay: {
    ...ABSOLUTE_FILL,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 90,
  },
  drawerCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    zIndex: 100,
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
  },
  placeholderText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  scopePillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  scopeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scopeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  scopeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  scopeTextActive: {
    color: '#0F172A',
    fontWeight: '700',
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
