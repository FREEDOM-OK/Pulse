import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { TabIcon } from '@/constants/tabs';
import { CourseEntity, SessionEntity } from '@/features/timetable/repository';
import { writeClipboard } from '@/lib/clipboard';
import { PeriodTime, formatWeeks } from '@/lib/timetable-core';
import { useTheme } from '@/hooks/use-theme';

interface CourseDetailDrawerProps {
  visible: boolean;
  course: CourseEntity | null;
  sessionIndex?: number;
  periodTimes: PeriodTime[];
  onClose: () => void;
  onEdit: (course: CourseEntity) => void;
  onDelete: (course: CourseEntity) => void;
}

const DAYS_NAME = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 单色线性图标（与 `week-header.tsx` 同一套 SymbolView 写法）。 */
const CALENDAR_ICON: TabIcon = { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' };
const CLOCK_ICON: TabIcon = { ios: 'clock', android: 'schedule', web: 'schedule' };
const PLACE_ICON: TabIcon = { ios: 'location', android: 'place', web: 'place' };
const PERSON_ICON: TabIcon = {
  ios: 'person',
  android: 'person_outline',
  web: 'person_outline',
};
const NOTES_ICON: TabIcon = { ios: 'doc.text', android: 'notes', web: 'notes' };
const COPY_ICON: TabIcon = {
  ios: 'doc.on.doc',
  android: 'content_copy',
  web: 'content_copy',
};
const TRASH_ICON: TabIcon = {
  ios: 'trash',
  android: 'delete_outline',
  web: 'delete_outline',
};

function InfoIcon({ icon }: { icon: TabIcon }) {
  const theme = useTheme();
  return <SymbolView name={icon} size={18} tintColor={theme.textSecondary} />;
}

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
  onDelete,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  // 关闭时父组件会立刻把 course 置空。缓存最后一份数据，让退场动画期间
  // 卡片仍然有内容，而不是「啪」一下变空白。
  const [displayCourse, setDisplayCourse] = useState<CourseEntity | null>(course);

  useEffect(() => {
    if (course) setDisplayCourse(course);
  }, [course]);

  /**
   * 复制提示：抽屉继续保持展开，所以这条 Toast 必须渲染在 Modal 内部
   * （BottomSheet 的 `overlay`），否则会被 Modal 的遮罩层压住看不见。
   */
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );
  const showCopyToast = (message: string) => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopyToast(message);
    copyTimerRef.current = setTimeout(() => {
      copyTimerRef.current = null;
      setCopyToast(null);
    }, 1800);
  };

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

  // 复制的内容：课程名 → 周数 → 节次时间 → 教室 / 教师 / 备注，逐段用 · 连接。
  const copyText = [
    activeCourse.name,
    weeksLabel,
    periodTimeText,
    session.location ? `教室：${session.location}` : '',
    session.teacher ? `教师：${session.teacher}` : '',
    session.remark ? `备注：${session.remark}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const handleCopy = () => {
    // 只把文本写进剪贴板，不克隆课程、也不关闭抽屉。
    void writeClipboard(copyText).then((ok) => {
      showCopyToast(ok ? '复制成功' : '复制失败，请重试');
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      closeLabel="关闭详情"
      autoHeight
      showHandle={false}
      sheetStyle={[styles.sheet, { backgroundColor: theme.background }]}
      overlay={
        copyToast ? (
          <View
            pointerEvents="none"
            style={[styles.toast, { top: (insets.top || 24) + 16, backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.toastText, { color: theme.text }]}>{copyToast}</Text>
          </View>
        ) : null
      }
      bodyStyle={[styles.body, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      {/* 顶部居中把手条（BottomSheet 的默认把手已关闭，避免出现两条） */}
      <View style={[styles.dragHandle, { backgroundColor: theme.backgroundSelected }]} />

      {/* 课程名称与标志性竖色条；下方一条贯穿细分割线 */}
      <View style={[styles.titleDivider, { borderBottomColor: theme.backgroundSelected }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <View style={[styles.verticalColorBar, { backgroundColor: activeCourse.color }]} />
            <Text style={[styles.courseTitleText, { color: theme.text }]}>{activeCourse.name}</Text>
          </View>
          {Boolean(activeCourse.credits && activeCourse.credits !== '选填') && (
            <View style={[styles.creditBadge, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.creditBadgeText, { color: theme.textSecondary }]}>{activeCourse.credits} 学分</Text>
            </View>
          )}
        </View>
      </View>

      {/* 详细信息行列表 */}
      <View style={styles.infoList}>
        <View style={styles.infoRow}>
          <InfoIcon icon={CALENDAR_ICON} />
          <Text style={[styles.infoText, { color: theme.text }]}>{weeksLabel}</Text>
        </View>

        <View style={styles.infoRow}>
          <InfoIcon icon={CLOCK_ICON} />
          <Text style={[styles.infoText, { color: theme.text }]}>{periodTimeText}</Text>
        </View>

        <View style={styles.infoRow}>
          <InfoIcon icon={PLACE_ICON} />
          <Text style={[styles.infoText, { color: theme.text }]}>{session.location || '未填教室'}</Text>
        </View>

        <View style={styles.infoRow}>
          <InfoIcon icon={PERSON_ICON} />
          <Text style={[styles.infoText, { color: theme.text }]}>{session.teacher || '未填老师'}</Text>
        </View>

        <View style={[styles.infoRow, styles.remarkRow]}>
          <View style={styles.flexRowCenter}>
            <InfoIcon icon={NOTES_ICON} />
            <Text style={session.remark ? [styles.infoText, { color: theme.text }] : [styles.placeholderText, { color: theme.textSecondary }]}>
              {session.remark || '备注 (可不填)'}
            </Text>
          </View>
        </View>
      </View>

      {/* 底部动作条：编辑大按钮 + 复制 + 删除 */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.editMainBtn, { backgroundColor: theme.backgroundElement }]}
          activeOpacity={0.8}
          accessibilityLabel="编辑课程"
          onPress={() => onEdit(activeCourse)}>
          <Text style={[styles.editMainBtnText, { color: theme.text }]}>编辑</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconSquareBtn, { backgroundColor: theme.backgroundElement }]}
          activeOpacity={0.7}
          accessibilityLabel="复制课程"
          onPress={handleCopy}>
          <SymbolView name={COPY_ICON} size={20} tintColor={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconSquareBtn, { backgroundColor: theme.backgroundElement }]}
          activeOpacity={0.7}
          accessibilityLabel="删除课程"
          onPress={() => onDelete(activeCourse)}>
          <SymbolView name={TRASH_ICON} size={20} tintColor={theme.text} />
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
  titleDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 14,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 9999,
  },
  toastText: {
    color: '#111113',
    fontSize: 13,
    fontWeight: '600',
  },
});