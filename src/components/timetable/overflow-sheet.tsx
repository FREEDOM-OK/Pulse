import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useTheme } from '@/hooks/use-theme';

type IconName = NonNullable<SymbolViewProps['name']>;

interface OverflowSheetProps {
  visible: boolean;
  courseCount: number;
  onClose: () => void;
  onPeriods: () => void;
  onSettings: () => void;
  onCourses: () => void;
}

/** 「…」抽屉：上课时间 / 课表设置 / 已填课程。 */
export function OverflowSheet({
  visible,
  courseCount,
  onClose,
  onPeriods,
  onSettings,
  onCourses,
}: OverflowSheetProps) {
  return (
    <BottomSheet visible={visible} heightRatio={0.46} onClose={onClose}>
      <View style={styles.list}>
        <Row
          icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
          label="上课时间"
          hint="改每节课的开始与结束时间"
          onPress={onPeriods}
        />
        <Row
          icon={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
          label="课表设置"
          hint="学期、总周数、节数、显示周末、格子高度、导入"
          onPress={onSettings}
        />
        <Row
          icon={{ ios: 'list.bullet', android: 'list', web: 'list' }}
          label="已填课程"
          hint={`共 ${courseCount} 门，点进去可查看与编辑`}
          onPress={onCourses}
        />
      </View>
    </BottomSheet>
  );
}

function Row({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${hint}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <SymbolView name={icon} size={20} tintColor={theme.text} style={styles.icon} />
      <View style={styles.texts}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {hint}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        ›
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  icon: {
    width: 24,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});