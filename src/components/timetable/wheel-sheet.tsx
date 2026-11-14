import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { WheelPicker, type WheelOption } from '@/components/ui/wheel-picker';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#F43F5E';

/** 00–23 / 00–59，两位补零，滚轮里等宽显示。 */
export const HOUR_OPTIONS: WheelOption[] = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, '0');
  return { value: v, label: v };
});

export const MINUTE_OPTIONS: WheelOption[] = Array.from({ length: 60 }, (_, i) => {
  const v = String(i).padStart(2, '0');
  return { value: v, label: v };
});

/**
 * 底部滚轮抽屉的统一外壳：顶部标题 + 右上圆形关闭、内容区、全宽红色保存键。
 *
 * 课表里所有「选时间 / 选节次」都走它，保证 periods.tsx 与 course.tsx 的手感一致：
 * autoHeight 撑开、无拖动把手、保存键 50 高圆角 25。
 */
export function WheelSheet({
  visible,
  title,
  onClose,
  onSave,
  saveLabel = '保存',
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      autoHeight
      showHandle={false}
      bodyStyle={styles.sheetBody}>
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
        <TouchableOpacity
          style={[styles.sheetClose, { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel="关闭"
          onPress={onClose}>
          <Text style={[styles.sheetCloseText, { color: theme.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {children}

      <TouchableOpacity style={styles.sheetSaveBtn} accessibilityLabel={saveLabel} onPress={onSave}>
        <Text style={styles.sheetSaveText}>{saveLabel}</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

/** 把 "HH:MM" 拆成小时/分钟；坏值一律回落到 08:00。 */
export function splitHhmm(value: string): { hour: string; minute: string } {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value || '').trim());
  if (!match) return { hour: '08', minute: '00' };
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10) || 0));
  return { hour: String(h).padStart(2, '0'), minute: String(m).padStart(2, '0') };
}

/**
 * 双列时间滚轮抽屉：左小时 / 中间冒号 / 右分钟。
 * 打开时用传入的 value 初始化草稿，点保存才把 `HH:MM` 交给调用方。
 */
export function TimeWheelSheet({
  visible,
  title,
  value,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  value: string;
  onClose: () => void;
  onSave: (next: string) => void;
}) {
  const theme = useTheme();
  const [hour, setHour] = useState(() => splitHhmm(value).hour);
  const [minute, setMinute] = useState(() => splitHhmm(value).minute);

  // 每次打开都按最新的值重置草稿，避免上次取消后残留。
  useEffect(() => {
    if (!visible) return;
    const next = splitHhmm(value);
    setHour(next.hour);
    setMinute(next.minute);
  }, [visible, value]);

  return (
    <WheelSheet
      visible={visible}
      title={title}
      onClose={onClose}
      saveLabel="保存"
      onSave={() => onSave(`${hour}:${minute}`)}>
      <View style={styles.wheelRow}>
        <View style={styles.wheelColumn}>
          <WheelPicker
            columns={[{ key: 'hour', options: HOUR_OPTIONS }]}
            value={{ hour }}
            highlightColor="transparent"
            separators
            onChange={(next) => setHour(next.hour)}
          />
        </View>
        <Text style={[styles.colon, { color: theme.text }]}>:</Text>
        <View style={styles.wheelColumn}>
          <WheelPicker
            columns={[{ key: 'minute', options: MINUTE_OPTIONS }]}
            value={{ minute }}
            highlightColor="transparent"
            separators
            onChange={(next) => setMinute(next.minute)}
          />
        </View>
      </View>
    </WheelSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: { paddingHorizontal: 20, paddingBottom: 8 },
  sheetHeader: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetClose: {
    position: 'absolute',
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: { fontSize: 13, fontWeight: '600' },
  wheelRow: { flexDirection: 'row', alignItems: 'center' },
  wheelColumn: { flex: 1 },
  colon: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 2,
    marginTop: 4,
  },
  sheetSaveBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSaveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});