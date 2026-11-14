import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
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
  /** 选中行底色，默认取主题的 backgroundElement；时间弹窗可传透明。 */
  highlightColor?: string;
  /** 选中行上下各画一条 0.5 极细分隔线（时间弹窗的样式）。 */
  separators?: boolean;
  /** 行高，默认 WHEEL_ITEM_HEIGHT(40)；课表里的三列节次滚轮用 44。 */
  itemHeight?: number;
}

/**
 * 通用滚轮：每列固定 40pt 行高、可见 5 行、选中行加粗；点选项也能选中（方便 Web / E2E）。
 *
 * 丝滑度上有两个关键点（见下方 WheelColumnView 注释）：
 * 1. 用户手势结束回写选中项时**不能**再 `scrollToOffset`，否则停下的瞬间会闪一下；
 * 2. 居中高亮跟随 `onScroll` 实时更新，而不是等松手才变。
 */
export function WheelPicker({
  columns,
  value,
  onChange,
  highlightColor,
  separators = false,
  itemHeight,
}: WheelPickerProps) {
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
          highlightColor={highlightColor ?? theme.backgroundElement}
          separators={separators}
          itemHeight={itemHeight}
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
  separators,
  itemHeight,
  onSelect,
}: {
  column: WheelColumn;
  selected: string;
  textColor: string;
  mutedColor: string;
  highlightColor: string;
  separators: boolean;
  itemHeight?: number;
  onSelect: (value: string) => void;
}) {
  /** 行高：默认 40；课表三列滚轮传 44，整体高 220。 */
  const rowHeight = itemHeight ?? WHEEL_ITEM_HEIGHT;
  const listRef = useRef<FlatList<WheelOption>>(null);
  const index = Math.max(
    0,
    column.options.findIndex((option) => option.value === selected)
  );

  /** 最新值放 ref，供滚动回调读取，避免闭包拿到旧的 selected。 */
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  /** 实时居中高亮：拖动过程中就跟手，松手后再对齐到最终值。 */
  const [activeIndex, setActiveIndex] = useState(index);
  const activeRef = useRef(index);

  /** 手势刚回写过的下标；等于它说明这次 index 变化来自滚动，不该再定位。 */
  const reportedRef = useRef(-1);

  useEffect(() => {
    setActiveIndex(index);
    activeRef.current = index;

    // 用户滚动引发的 index 变化：位置本来就在那一行，再 scrollToOffset 会闪一下。
    if (reportedRef.current === index) {
      reportedRef.current = -1;
      return;
    }

    // 外部改值（打开弹窗、点击选项、重置）才需要定位。
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: index * rowHeight, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [index, rowHeight]);

  const commit = (offsetY: number) => {
    const nextIndex = clampIndex(
      Math.round(offsetY / rowHeight),
      column.options.length
    );
    const option = column.options[nextIndex];
    if (!option) return;
    reportedRef.current = nextIndex;
    if (option.value !== selectedRef.current) onSelect(option.value);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const nextIndex = clampIndex(
      Math.round(offsetY / rowHeight),
      column.options.length
    );
    if (nextIndex !== activeRef.current) {
      activeRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }
  };

  return (
    <View style={styles.column}>
      {/* 选中高亮固定钉在中间行（第 3 行），不再画在列表项上 —— 否则一滚就跟着内容走。 */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          { backgroundColor: highlightColor },
          itemHeight ? { top: itemHeight * 2, height: itemHeight } : null,
        ]}>
        {separators ? (
          <>
            <View style={styles.separatorTop} />
            <View style={styles.separatorBottom} />
          </>
        ) : null}
      </View>
      <FlatList
        ref={listRef}
        data={column.options}
        keyExtractor={(item) => item.value}
        showsVerticalScrollIndicator={false}
        snapToInterval={rowHeight}
        decelerationRate="fast"
        // 抽屉里再套滚轮：安卓不开启这个，纵向手势会被外层抢走。
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        getItemLayout={(_, itemIndex) => ({
          length: rowHeight,
          offset: rowHeight * itemIndex,
          index: itemIndex,
        })}
        contentContainerStyle={{ paddingVertical: rowHeight * 2 }}
        style={{ height: rowHeight * VISIBLE_ROWS }}
        onMomentumScrollEnd={(event) => commit(event.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(event) => commit(event.nativeEvent.contentOffset.y)}
        renderItem={({ item, index: itemIndex }) => {
          const distance = Math.abs(itemIndex - activeIndex);
          const isActive = distance === 0;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item.value === selected }}
              accessibilityLabel={`选择 ${item.label}`}
              onPress={() => onSelect(item.value)}
              style={[styles.item, { height: rowHeight }]}>
              <ThemedText
                style={[
                  styles.itemText,
                  // 离中间行越远越淡，做出滚轮上下渐隐的效果。
                  // 用文字透明度而不是遮罩层，是因为不知道外面容器的底色，遮罩容易露出色差。
                  { color: isActive ? textColor : mutedColor, opacity: fadeFor(distance) },
                  isActive && styles.itemTextActive,
                ]}>
                {item.label}
              </ThemedText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

/** 中线 1.0，每远一行减 0.3，最淡 0.28。 */
function fadeFor(distance: number): number {
  return Math.max(0.28, 1 - distance * 0.3);
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
    // 默认行高 40 时高亮钉在第 3 行；传了 itemHeight 会在行内样式里覆盖 top。
    top: WHEEL_ITEM_HEIGHT * 2,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
  },
  separatorTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 0.5,
    backgroundColor: '#E5E7EB',
  },
  separatorBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 0.5,
    backgroundColor: '#E5E7EB',
  },
  item: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  itemTextActive: {
    fontSize: 18,
    fontWeight: '700',
  },
});