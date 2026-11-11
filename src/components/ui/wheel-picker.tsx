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
      {/* 选中高亮固定钉在中间行（第 3 行），不再画在列表项上 —— 否则一滚就跟着内容走。 */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          { backgroundColor: highlightColor, top: WHEEL_ITEM_HEIGHT * 2 },
        ]}
      />
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
            style={styles.item}>
            <ThemedText
              style={[
                styles.itemText,
                // 离中间行越远越淡，做出滚轮上下渐隐的效果。
                // 用文字透明度而不是遮罩层，是因为不知道外面容器的底色，遮罩容易露出色差。
                { color: item.value === selected ? textColor : mutedColor, opacity: fadeFor(itemIndex, index) },
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

/** 中间行 1.0，每远一行减 0.3，最淡 0.28。 */
function fadeFor(itemIndex: number, centerIndex: number): number {
  return Math.max(0.28, 1 - Math.abs(itemIndex - centerIndex) * 0.3);
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
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
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