import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export const WHEEL_ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;

export interface WheelOption {
  value: string;
  label: string;
}

export interface WheelColumn {
  key: string;
  options: WheelOption[];
}

interface WheelPickerProps {
  columns: WheelColumn[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

/** 通用滚轮：每列固定 40pt 行高、可见 5 行、选中行加粗；点选项也能选中（方便 Web / E2E）。 */
export function WheelPicker({ columns, value, onChange }: WheelPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {columns.map((column) => (
        <WheelColumnView
          key={column.key}
          column={column}
          selected={value[column.key] ?? column.options[0]?.value ?? ''}
          textColor={theme.text}
          mutedColor={theme.textSecondary}
          highlightColor={theme.backgroundElement}
          onSelect={(next) => onChange({ ...value, [column.key]: next })}
        />
      ))}
    </View>
  );
}

function WheelColumnView({
  column,
  selected,
  textColor,
  mutedColor,
  highlightColor,
  onSelect,
}: {
  column: WheelColumn;
  selected: string;
  textColor: string;
  mutedColor: string;
  highlightColor: string;
  onSelect: (value: string) => void;
}) {
  const listRef = useRef<FlatList<WheelOption>>(null);
  const index = Math.max(
    0,
    column.options.findIndex((option) => option.value === selected)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: index * WHEEL_ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <View style={styles.column}>
      <FlatList
        ref={listRef}
        data={column.options}
        keyExtractor={(item) => item.value}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, itemIndex) => ({
          length: WHEEL_ITEM_HEIGHT,
          offset: WHEEL_ITEM_HEIGHT * itemIndex,
          index: itemIndex,
        })}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * 2 }}
        style={{ height: WHEEL_ITEM_HEIGHT * VISIBLE_ROWS }}
        onMomentumScrollEnd={(event) => {
          const offset = event.nativeEvent.contentOffset.y;
          const nextIndex = clampIndex(Math.round(offset / WHEEL_ITEM_HEIGHT), column.options.length);
          const option = column.options[nextIndex];
          if (option && option.value !== selected) onSelect(option.value);
        }}
        onScrollEndDrag={(event) => {
          const offset = event.nativeEvent.contentOffset.y;
          const nextIndex = clampIndex(Math.round(offset / WHEEL_ITEM_HEIGHT), column.options.length);
          const option = column.options[nextIndex];
          if (option && option.value !== selected) onSelect(option.value);
        }}
        renderItem={({ item, index: itemIndex }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: item.value === selected }}
            accessibilityLabel={`选择 ${item.label}`}
            onPress={() => onSelect(item.value)}
            style={[
              styles.item,
              itemIndex === index && { backgroundColor: highlightColor, borderRadius: 10 },
            ]}>
            <ThemedText
              style={[
                styles.itemText,
                { color: item.value === selected ? textColor : mutedColor },
                item.value === selected && styles.itemTextActive,
              ]}>
              {item.label}
            </ThemedText>
          </Pressable>
        )}
      />
    </View>
  );
}

function clampIndex(value: number, length: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(length - 1, Math.max(0, value));
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  column: {
    flex: 1,
    alignItems: 'stretch',
  },
  item: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 15,
  },
  itemTextActive: {
    fontWeight: '700',
  },
});