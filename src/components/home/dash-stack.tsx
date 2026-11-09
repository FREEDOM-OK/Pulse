import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import type { CardStyle, HomeCardId } from '@/db/types';
import { DashCard } from './dash-card';
import type { DashCardModel } from './dash-carousel';

export interface DashStackProps {
  cards: DashCardModel[];
  style: CardStyle;
  color: string;
  width: number;
  height: number;
}

const FLY_OUT = 250;

/**
 * Dash 卡片堆叠模式（PRDv1.2.2 第 3.6 节）：
 * 顶层卡可左右拖，超过 1/3 宽度松手飞出，然后追加到队尾。
 */
export function DashStack({ cards, style, color, width, height }: DashStackProps) {
  const [order, setOrder] = useState<HomeCardId[]>(() => cards.map((card) => card.id));
  const translateX = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState(false);

  // 卡片列表可能变化（开关卡片），按 order 过滤后再补新出现的卡片。
  const ordered = useMemo(() => {
    const byId = new Map(cards.map((card) => [card.id, card]));
    const known = order.filter((id) => byId.has(id));
    const fresh = cards.map((card) => card.id).filter((id) => !known.includes(id));
    return [...known, ...fresh].map((id) => byId.get(id)!).filter(Boolean);
  }, [cards, order]);

  const orderRef = useRef(ordered);
  orderRef.current = ordered;

  const responder = useMemo(() => {
    const sendToBack = (id: HomeCardId) => {
      setOrder((current) => {
        const next = current.filter((item) => item !== id);
        return [...next, id];
      });
      translateX.setValue(0);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        setDragging(true);
      },
      onPanResponderMove: (_event, gesture) => {
        translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_event, gesture) => {
        setDragging(false);
        const currentTop = orderRef.current[0];
        if (!currentTop) {
          translateX.setValue(0);
          return;
        }
        if (Math.abs(gesture.dx) > width / 3) {
          const direction = gesture.dx > 0 ? 1 : -1;
          Animated.timing(translateX, {
            toValue: direction * width * 1.2,
            duration: FLY_OUT,
            useNativeDriver: true,
          }).start(() => sendToBack(currentTop.id));
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
            speed: 18,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    });
  }, [translateX, width]);

  if (ordered.length === 0) {
    return null;
  }

  return (
    <View style={[styles.wrap, { height: height + 48 }]}>
      {ordered
        .slice(0, 4)
        .map((card, index) => {
          const isTop = index === 0;
          const depth = Math.min(index, 3);
          return (
            <Animated.View
              key={card.id}
              style={[
                styles.layer,
                {
                  width,
                  height,
                  transform: isTop
                    ? [{ translateX }, { rotate: translateX.interpolate({ inputRange: [-width, 0, width], outputRange: ['-8deg', '0deg', '8deg'] }) }]
                    : [{ translateY: depth * 24 }, { scale: 1 - depth * 0.04 }],
                  zIndex: 10 - index,
                  opacity: isTop && dragging ? 0.96 : 1,
                },
              ]}
              {...(isTop ? responder.panHandlers : {})}>
              <DashCard
                title={card.title}
                subtitle={card.subtitle}
                icon={card.icon}
                style={style}
                color={color}
                kind={card.id}
                tone={index === 0 ? 'primary' : 'plain'}
                width={width}
                height={height}
                onPress={isTop ? card.onPress : () => undefined}
              />
            </Animated.View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

