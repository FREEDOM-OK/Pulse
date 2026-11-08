import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { TaskRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

interface TaskRowItemProps {
  task: TaskRow;
  /** 点击任务本体或勾选框：切换完成状态。 */
  onToggle: () => void;
  /** 从长按菜单进入编辑。 */
  onEdit: () => void;
  /** 长按任务打开「编辑 / 删除」菜单。 */
  onMenu: () => void;
}

/** 计划条：方形勾选框 + 标题 + 右侧时间，长按出菜单。 */
export function TaskRowItem({ task, onToggle, onMenu }: TaskRowItemProps) {
  const theme = useTheme();
  const done = task.done === 1;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? '标记为未完成' : '标记为完成'}
        onPress={onToggle}
        hitSlop={10}
        style={({ pressed }) => [
          styles.checkbox,
          {
            borderColor: done ? theme.text : theme.textSecondary,
            backgroundColor: done ? theme.text : 'transparent',
          },
          pressed && styles.pressed,
        ]}>
        {done ? (
          <ThemedText style={[styles.check, { color: theme.background }]}>✓</ThemedText>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityHint="点击标记完成或取消，长按可编辑或删除"
        style={styles.body}
        onPress={onToggle}
        delayLongPress={400}
        onLongPress={onMenu}>
        <ThemedText
          style={[styles.title, done && styles.doneTitle]}
          themeColor={done ? 'textSecondary' : 'text'}
          numberOfLines={2}>
          {task.title}
        </ThemedText>
        {task.note ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {task.note}
          </ThemedText>
        ) : null}
      </Pressable>

      {task.time ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
          {task.time}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  check: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  doneTitle: {
    textDecorationLine: 'line-through',
  },
  time: {
    marginTop: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});