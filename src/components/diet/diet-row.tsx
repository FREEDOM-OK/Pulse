import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SwipeRow } from '@/components/ui/swipe-row';
import { Spacing } from '@/constants/theme';
import type { DietRecordRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

interface DietRowItemProps {
  record: DietRecordRow;
  onEdit: () => void;
  onDelete: () => void;
}

export function DietRowItem({ record, onEdit, onDelete }: DietRowItemProps) {
  const theme = useTheme();

  return (
    <SwipeRow
      actions={[
        { label: '编辑', color: theme.backgroundElement, textColor: theme.text, onPress: onEdit },
        { label: '删除', color: '#D64545', onPress: onDelete },
      ]}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText type="small" style={styles.content} numberOfLines={2}>
          {record.content}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {record.calories != null ? `${record.calories} kcal` : '未填热量'}
        </ThemedText>
      </ThemedView>
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  content: {
    flex: 1,
    fontSize: 14,
  },
});
