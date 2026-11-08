import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { WonderCard } from '@/components/home/wonder-card';
import type { TabIcon } from '@/constants/tabs';
import type { HomeCardId } from '@/db/types';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface WonderCardModel {
  id: HomeCardId;
  title: string;
  subtitle: string;
  icon: TabIcon;
  onPress: () => void;
}

interface WonderCarouselProps {
  cards: WonderCardModel[];
  onManage: () => void;
}

const CARD_GAP = 12;

export function WonderCarousel({ cards, onManage }: WonderCarouselProps) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = Math.min(264, Math.round(screenWidth * 0.68));
  const cardHeight = Math.round(cardWidth * 0.8);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (cardWidth + CARD_GAP));
    setActiveIndex(Math.max(0, Math.min(cards.length - 1, index)));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="smallBold">万事卡</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="管理首页卡片"
          onPress={onManage}
          hitSlop={8}
          style={({ pressed }) => [pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary">
            管理 ›
          </ThemedText>
        </Pressable>
      </View>

      {cards.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="开启首页卡片"
          onPress={onManage}
          style={({ pressed }) => [
            styles.empty,
            { borderColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            万事卡都关掉了 · 去开启
          </ThemedText>
        </Pressable>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.track}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            scrollEventThrottle={16}>
            {cards.map((card, index) => (
              <WonderCard
                key={card.id}
                title={card.title}
                subtitle={card.subtitle}
                icon={card.icon}
                isPrimary={index === 0}
                width={cardWidth}
                height={cardHeight}
                onPress={card.onPress}
              />
            ))}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="添加卡片"
              onPress={onManage}
              style={({ pressed }) => [
                styles.ghost,
                { width: cardWidth, height: cardHeight, borderColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                添加卡片
              </ThemedText>
            </Pressable>
          </ScrollView>

          <View style={styles.dots}>
            {cards.map((card, index) => (
              <View
                key={card.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === activeIndex ? theme.text : theme.backgroundElement,
                  },
                ]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  track: {
    paddingHorizontal: Spacing.four,
    gap: CARD_GAP,
  },
  ghost: {
    borderRadius: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.one,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  empty: {
    marginHorizontal: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});