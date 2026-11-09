import { useCallback, useMemo, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import type { CardStyle, HomeCardId } from '@/db/types';
import { DashCardSize } from '@/constants/theme';
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

const GAP = 16;
const SIDE_PAD = 24;

/**
 * Dash 横滑卡片（PRDv1.2.2 第 3.2 节）：一次只走一张，带回弹吸附。
 * 尾部留一张虚线幽灵卡，点它去管理页。
 */
export function DashCarousel({ cards, style, color, onManage }: DashCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = Math.min(DashCardSize.width, Math.max(200, screenWidth - 2 * SIDE_PAD - 48));
  const cardHeight = Math.round(cardWidth / 1.618);
  const snap = cardWidth + GAP;

  const dots = useMemo(() => cards.map((card) => card.id), [cards]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.x;
      const next = Math.round(offset / snap);
      const clamped = Math.min(Math.max(next, 0), Math.max(cards.length - 1, 0));
      setActiveIndex(clamped);
    },
    [snap, cards.length],
  );

  if (cards.length === 0) {
    return (
      <View style={styles.wrap}>
        <Pressable style={styles.emptyCard} onPress={onManage} accessibilityRole="button">
          <ThemedText style={styles.emptyText}>Dash 卡片都关掉了</ThemedText>
          <ThemedText style={styles.emptyAction}>去开启 ›</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
        disableIntervalMomentum
        decelerationRate="fast"
        contentContainerStyle={styles.content}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        accessibilityLabel="Dash 卡片">
        {cards.map((card, index) => (
          <View key={card.id} style={{ marginRight: GAP }}>
            <DashCard
              title={card.title}
              subtitle={card.subtitle}
              icon={card.icon}
              style={style}
              color={color}
              kind={card.id}
              tone={index === 0 ? 'primary' : 'plain'}
              width={cardWidth}
              height={cardHeight}
              onPress={card.onPress}
            />
          </View>
        ))}
        <Pressable
          style={[styles.ghost, { height: cardHeight }]}
          onPress={onManage}
          accessibilityRole="button"
          accessibilityLabel="添加卡片">
          <ThemedText style={styles.ghostPlus}>＋</ThemedText>
          <ThemedText style={styles.ghostText}>添加卡片</ThemedText>
        </Pressable>
      </ScrollView>

      {dots.length > 1 ? (
        <View style={styles.dots} accessibilityLabel={`第 ${activeIndex + 1} 张，共 ${dots.length} 张`}>
          {dots.map((id, index) => (
            <View key={id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  content: {
    paddingHorizontal: SIDE_PAD,
    paddingRight: SIDE_PAD - GAP,
    alignItems: 'center',
  },
  emptyCard: {
    marginHorizontal: SIDE_PAD,
    height: 132,
    borderRadius: 24,
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
  },
  ghost: {
    width: 120,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E2E6',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghostPlus: {
    fontSize: 26,
    color: '#B0B0B6',
  },
  ghostText: {
    fontSize: 12,
    color: '#8A8A90',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SIDE_PAD,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D9D9DE',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#111111',
  },
});