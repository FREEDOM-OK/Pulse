import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

export function TaskRowItem({ task, onToggle, onEdit, onMenu }: TaskRowItemProps) {
  const theme = useTheme();
  const done = task.done === 1;

  return (
    <Pressable
      accessibilityHint="长按可编辑或删除"
      delayLongPress={400}
      onLongPress={onMenu}
      style={({ pressed }) => [styles.pressable, pressed && styles.rowPressed]}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? '标记为未完成' : '标记为完成'}
          onPress={onToggle}
          hitSlop={8}
          style={({ pressed }) => [
            styles.checkbox,
            {
              borderColor: done ? theme.text : theme.textSecondary,
              backgroundColor: done ? theme.text : 'transparent',
            },
            pressed && styles.pressed,
          ]}>
          {done ? (
            <ThemedText type="small" style={{ color: theme.background, fontSize: 12 }}>
              ✓
            </ThemedText>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityHint="点击标记完成或取消，长按可编辑或删除"
          style={styles.body}
          onPress={onToggle}
          delayLongPress={400}
          onLongPress={onMenu}>
          <View style={styles.titleRow}>
            {task.time ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={[styles.time, done && styles.doneText]}>
                {task.time}
              </ThemedText>
            ) : null}
            <ThemedText
              style={[styles.title, done && styles.doneTitle]}
              themeColor={done ? 'textSecondary' : 'text'}>
              {task.title}
            </ThemedText>
          </View>
          {task.note ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {task.note}
            </ThemedText>
          ) : null}
        </Pressable>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Spacing.three,
  },
  rowPressed: {
    opacity: 0.92,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  time: {
    fontWeight: '700',
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
  },
  doneTitle: {
    textDecorationLine: 'line-through',
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
  pressed: {
    opacity: 0.6,
  },
});