import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import type { TabIcon } from '@/constants/tabs';

type HeaderMode = 'tab' | 'page';

interface WeekHeaderProps {
  mode: HeaderMode;
  /** 主标题，如「第 2 周 周四」。 */
  title: string;
  /** 副标题，如「2026/11/12」。 */
  subtitle: string;
  onBack: () => void;
  onAdd: () => void;
  onImport: () => void;
  onMore: () => void;
}

const PLUS_ICON: TabIcon = { ios: 'plus', android: 'add', web: 'add' };
const IMPORT_ICON: TabIcon = {
  ios: 'square.and.arrow.down',
  android: 'file_download',
  web: 'file_download',
};
const MORE_ICON: TabIcon = { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' };

/**
 * 课表顶部栏：左侧静态周次/日期，右侧只有「＋ / 导入 / ⋯」。
 *
 * 翻周只认网格横滑和底部抽屉里的周数滑条，这里刻意不再提供 ‹ › 胶囊；
 * 左上标题也不再是切换课表的入口。
 */
export function WeekHeader({
  mode,
  title,
  subtitle,
  onBack,
  onAdd,
  onImport,
  onMore,
}: WeekHeaderProps) {
  return (
    <View style={styles.header}>
      {mode === 'page' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
      ) : null}

      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.actions}>
        <HeaderIconButton icon={PLUS_ICON} label="添加课程" onPress={onAdd} />
        <HeaderIconButton icon={IMPORT_ICON} label="导入课表" onPress={onImport} />
        <HeaderIconButton icon={MORE_ICON} label="更多操作" onPress={onMore} />
      </View>
    </View>
  );
}

function HeaderIconButton({
  icon,
  label,
  onPress,
}: {
  icon: TabIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
      <SymbolView name={icon} size={20} tintColor="#1C1C1E" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F5F7',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: '#111113', lineHeight: 24, marginTop: -2 },
  pressed: { opacity: 0.55 },
  titleBlock: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});