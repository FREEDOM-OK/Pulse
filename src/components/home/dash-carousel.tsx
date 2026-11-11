import { useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import type { CardStyle, HomeCardId } from '@/db/types';
import { DashCard } from './dash-card';

export interface DashCardModel {
  id: HomeCardId;
  title: string;
  subtitle: string;
  icon: Parameters<typeof SymbolView>[0]['name'];
  onPress: () => void;
}

export interface DashCarouselProps {
  cards: DashCardModel[];
  style: CardStyle;
  color: string;
  onManage: () => void;
}

/** 竖版卡片固定 150×190，圆角由 DashCard 的 22 控制。 */
export const DASH_CARD_WIDTH = 150;
export const DASH_CARD_HEIGHT = 190;
const CARD_WIDTH = DASH_CARD_WIDTH;
const CARD_HEIGHT = DASH_CARD_HEIGHT;
/** 卡片之间的水平间距。 */
const SPACING = 10;
/** 首卡左侧 / 末卡右侧与屏幕边缘的距离。 */
const SIDE_PADDING = 20;
/** 候场卡缩到 0.9，视觉高度 171，接近 170。 */
const IDLE_SCALE = 0.9;

/**
 * Dash 横滑卡片：左侧吸附 + 视差缩放。
 *
 * 每一张卡都占满 snapToInterval，松手后由原生滚动吸附到左侧；
 * scrollX 同时驱动当前卡 1.0、左右候场卡 0.9 的缩放。
 */
export function DashCarousel({ cards, style, color, onManage }: DashCarouselProps) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const SNAP_INTERVAL = CARD_WIDTH + SPACING;

  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: Platform.OS !== 'web',
      }),
    [scrollX]
  );

  if (cards.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Pressable
          style={styles.emptyCard}
          onPress={onManage}
          accessibilityRole="button"
          accessibilityLabel="去开启 Dash 卡片">
          <ThemedText style={styles.emptyText}>Dash 卡片都关掉了</ThemedText>
          <ThemedText style={styles.emptyAction}>去开启 ›</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <Animated.FlatList
      data={cards}
      horizontal
      style={styles.list}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP_INTERVAL}
      snapToAlignment="start"
      decelerationRate="fast"
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      accessibilityLabel="Dash 卡片"
      renderItem={({ item, index }) => {
        const scale = scrollX.interpolate({
          inputRange: [
            (index - 1) * SNAP_INTERVAL,
            index * SNAP_INTERVAL,
            (index + 1) * SNAP_INTERVAL,
          ],
          outputRange: [IDLE_SCALE, 1, IDLE_SCALE],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View style={{ transform: [{ scale }] }}>
            <DashCard
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              style={style}
              color={color}
              kind={item.id}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              onPress={item.onPress}
            />
          </Animated.View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    height: CARD_HEIGHT,
  },
  content: {
    paddingHorizontal: SIDE_PADDING,
  },
  separator: {
    width: SPACING,
  },
  emptyWrap: {
    paddingHorizontal: SIDE_PADDING,
  },
  emptyCard: {
    height: CARD_HEIGHT,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E2E6',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#8A8A90',
  },
  emptyAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
});