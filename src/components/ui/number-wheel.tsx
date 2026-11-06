import { useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  buildWheelValues,
  WHEEL_ITEM_HEIGHT,
  wheelIndexForOffset,
} from '@/lib/duration-wheel';

const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * VISIBLE_ITEMS;

interface NumberWheelProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** 纵向数字滚轮：默认停在 value，向下滚动数值递增。 */
export function NumberWheel({ label, unit, value, min, max, onChange }: NumberWheelProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const values = buildWheelValues(min, max);
  const selectedIndex = Math.min(max - min, Math.max(0, Math.round(value) - min));

  const scrollToSelected = useCallback(
    (animated: boolean) => {
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated });
    },
    [selectedIndex]
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollToSelected(false));
    return () => cancelAnimationFrame(frame);
  }, [scrollToSelected]);

  const selectFromOffset = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = wheelIndexForOffset(event.nativeEvent.contentOffset.y, min, max);
    const nextValue = min + nextIndex;
    if (nextValue !== value) onChange(nextValue);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        accessibilityLabel={`${label}滚动选择`}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={styles.content}
        onContentSizeChange={() => scrollToSelected(false)}
        onMomentumScrollEnd={selectFromOffset}
        onScrollEndDrag={selectFromOffset}
        style={[styles.scroll, { backgroundColor: theme.backgroundElement }]}>
        {values.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${option}`}
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(option);
                scrollRef.current?.scrollTo({
                  y: (option - min) * WHEEL_ITEM_HEIGHT,
                  animated: true,
                });
              }}
              style={[
                styles.option,
                selected && { backgroundColor: theme.backgroundSelected },
              ]}>
              <ThemedText
                type={selected ? 'smallBold' : 'small'}
                themeColor={selected ? 'text' : 'textSecondary'}>
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      <View
        pointerEvents="none"
        style={[styles.selectionBand, { borderColor: theme.textSecondary }]}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.unit}>
        {unit}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  scroll: {
    width: 88,
    height: WHEEL_HEIGHT,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  content: {
    paddingVertical: WHEEL_ITEM_HEIGHT,
  },
  option: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBand: {
    position: 'absolute',
    top: WHEEL_ITEM_HEIGHT + 20,
    width: 94,
    height: WHEEL_ITEM_HEIGHT,
    marginTop: -WHEEL_ITEM_HEIGHT / 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unit: {
    fontSize: 12,
  },
});
