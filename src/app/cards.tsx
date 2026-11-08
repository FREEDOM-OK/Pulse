import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { TabIcon } from '@/constants/tabs';
import { getHomeCards, setHomeCards } from '@/db/repositories/settings';
import {
  DEFAULT_ENABLED_CARDS,
  DEFAULT_HOME_CARDS,
  type HomeCardId,
} from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { bumpDataVersion } from '@/lib/data-version';

const ROW_HEIGHT = 76;

const CARD_META: Record<HomeCardId, { title: string; hint: string; icon: TabIcon }> = {
  fitness: {
    title: '健身',
    hint: '今天练了没有、本周练了几次',
    icon: {
      ios: 'figure.strengthtraining.traditional',
      android: 'fitness_center',
      web: 'fitness_center',
    },
  },
  games: {
    title: '游戏',
    hint: '想玩清单与最近在玩的游戏',
    icon: { ios: 'gamecontroller.fill', android: 'sports_esports', web: 'sports_esports' },
  },
  calendar: {
    title: '日历回顾',
    hint: '本月记录了几条、今天几条',
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  },
  timetable: {
    title: '课表',
    hint: '今天有几节课、下一节是什么',
    icon: { ios: 'calendar.badge.clock', android: 'schedule', web: 'schedule' },
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface CardRowProps {
  id: HomeCardId;
  index: number;
  enabled: boolean;
  primary: boolean;
  dragging: boolean;
  dragY: Animated.Value;
  onToggle: (id: HomeCardId) => void;
  onDragStart: (id: HomeCardId) => void;
  onDragMove: (dy: number) => void;
  onDragEnd: (dy: number) => void;
}

function CardRow({
  id,
  index,
  enabled,
  primary,
  dragging,
  dragY,
  onToggle,
  onDragStart,
  onDragMove,
  onDragEnd,
}: CardRowProps) {
  const theme = useTheme();
  const meta = CARD_META[id];

  const dragStartRef = useRef(onDragStart);
  const dragMoveRef = useRef(onDragMove);
  const dragEndRef = useRef(onDragEnd);
  dragStartRef.current = onDragStart;
  dragMoveRef.current = onDragMove;
  dragEndRef.current = onDragEnd;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStartRef.current(id);
        },
        onPanResponderMove: (_event, gesture) => {
          dragMoveRef.current(gesture.dy);
        },
        onPanResponderRelease: (_event, gesture) => {
          dragEndRef.current(gesture.dy);
        },
        onPanResponderTerminate: (_event, gesture) => {
          dragEndRef.current(gesture.dy);
        },
      }),
    [id]
  );

  const translateY = dragging ? dragY : 0;

  return (
    <Animated.View
      style={[
        styles.row,
        {
          backgroundColor: theme.background,
          borderColor: theme.backgroundElement,
          transform: [{ translateY }],
          zIndex: dragging ? 10 : 0,
          opacity: enabled ? 1 : 0.45,
        },
        dragging && styles.rowLifted,
      ]}>
      <View style={styles.grip} {...pan.panHandlers}>
        <View style={[styles.gripDot, { backgroundColor: theme.textSecondary }]} />
        <View style={[styles.gripDot, { backgroundColor: theme.textSecondary }]} />
        <View style={[styles.gripDot, { backgroundColor: theme.textSecondary }]} />
      </View>

      <View style={[styles.iconChip, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView name={meta.icon} tintColor={theme.text} size={20} />
      </View>

      <View style={styles.rowText}>
        <View style={styles.rowTitleLine}>
          <ThemedText style={styles.rowTitle}>{meta.title}</ThemedText>
          {primary ? (
            <View style={[styles.badge, { backgroundColor: theme.text }]}>
              <ThemedText style={[styles.badgeText, { color: theme.background }]} type="small">
                主卡
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {meta.hint}
        </ThemedText>
      </View>

      <Switch
        value={enabled}
        onValueChange={() => onToggle(id)}
        trackColor={{ true: theme.text, false: theme.backgroundElement }}
        thumbColor={theme.background}
      />
      <View style={styles.indexHint}>
        <ThemedText type="small" themeColor="textSecondary">
          {index + 1}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

export default function CardsScreen() {
  const theme = useTheme();
  const [order, setOrder] = useState<HomeCardId[]>(() => [...DEFAULT_HOME_CARDS]);
  const [enabled, setEnabled] = useState<HomeCardId[]>(() => [...DEFAULT_ENABLED_CARDS]);
  const [dragging, setDragging] = useState<HomeCardId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const orderRef = useRef(order);
  const enabledRef = useRef(enabled);
  const dragIndexRef = useRef(0);
  const dragY = useRef(new Animated.Value(0)).current;

  orderRef.current = order;
  enabledRef.current = enabled;

  useEffect(() => {
    let alive = true;
    getHomeCards().then((cards) => {
      if (!alive) return;
      const on = cards.filter((id) => CARD_META[id]);
      const off = DEFAULT_HOME_CARDS.filter((id) => !on.includes(id));
      setEnabled(on);
      setOrder([...on, ...off]);
      orderRef.current = [...on, ...off];
      enabledRef.current = on;
    });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (cards: HomeCardId[], nextOrder: HomeCardId[]) => {
    orderRef.current = nextOrder;
    enabledRef.current = cards;
    setOrder(nextOrder);
    setEnabled(cards);
    await setHomeCards(cards);
    bumpDataVersion();
  }, []);

  const visible = order.filter((id) => enabled.includes(id));
  const hidden = order.filter((id) => !enabled.includes(id));

  const toggle = useCallback(
    (id: HomeCardId) => {
      const on = enabledRef.current;
      const isOn = on.includes(id);
      if (isOn && on.length <= 1) {
        setNotice('至少保留一张卡片');
        return;
      }
      setNotice(null);
      const nextOn = isOn ? on.filter((item) => item !== id) : [...on, id];
      const nextOrder = [
        ...orderRef.current.filter((item) => nextOn.includes(item)),
        ...orderRef.current.filter((item) => !nextOn.includes(item)),
      ];
      persist(nextOn, nextOrder);
    },
    [persist]
  );

  const startDrag = useCallback(
    (id: HomeCardId) => {
      const list = orderRef.current.filter((item) => enabledRef.current.includes(item));
      dragIndexRef.current = list.indexOf(id);
      dragY.setValue(0);
      setDragging(id);
    },
    [dragY]
  );

  const moveDrag = useCallback(
    (dy: number) => {
      dragY.setValue(dy);
    },
    [dragY]
  );

  const endDrag = useCallback(
    (dy: number) => {
      const on = enabledRef.current;
      const list = orderRef.current.filter((item) => on.includes(item));
      const from = dragIndexRef.current;
      const to = clamp(from + Math.round(dy / ROW_HEIGHT), 0, list.length - 1);
      const id = list[from];
      dragY.setValue(0);
      setDragging(null);
      if (!id || to === from) return;
      const nextVisible = [...list];
      nextVisible.splice(from, 1);
      nextVisible.splice(to, 0, id);
      persist(nextVisible, [...nextVisible, ...orderRef.current.filter((x) => !on.includes(x))]);
    },
    [dragY, persist]
  );

  const restoreDefaults = useCallback(() => {
    setNotice(null);
    persist([...DEFAULT_ENABLED_CARDS], [...DEFAULT_HOME_CARDS]);
  }, [persist]);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      scrollEnabled={dragging === null}>
      <ThemedText style={styles.intro} themeColor="textSecondary" type="small">
        长按左侧圆点拖动排序。排在第一位的卡片是首页的深色主卡，其余依次向右排列。
      </ThemedText>

      {notice ? (
        <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">{notice}</ThemedText>
        </View>
      ) : null}

      <ThemedText style={styles.sectionTitle}>首页显示</ThemedText>
      {visible.map((id, index) => (
        <CardRow
          key={id}
          id={id}
          index={index}
          enabled
          primary={index === 0}
          dragging={dragging === id}
          dragY={dragY}
          onToggle={toggle}
          onDragStart={startDrag}
          onDragMove={moveDrag}
          onDragEnd={endDrag}
        />
      ))}

      {hidden.length > 0 ? (
        <>
          <ThemedText style={styles.sectionTitle}>未显示</ThemedText>
          {hidden.map((id, index) => (
            <CardRow
              key={id}
              id={id}
              index={visible.length + index}
              enabled={false}
              primary={false}
              dragging={false}
              dragY={dragY}
              onToggle={toggle}
              onDragStart={startDrag}
              onDragMove={moveDrag}
              onDragEnd={endDrag}
            />
          ))}
        </>
      ) : null}

      <Pressable
        onPress={restoreDefaults}
        style={({ pressed }) => [
          styles.restore,
          { borderColor: theme.backgroundElement, opacity: pressed ? 0.6 : 1 },
        ]}>
        <ThemedText type="smallBold">恢复默认</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 10,
  },
  intro: {
    lineHeight: 20,
  },
  notice: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    height: 68,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLifted: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  grip: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 10,
  },
  gripDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.7,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  indexHint: {
    width: 14,
    alignItems: 'flex-end',
  },
  restore: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
  },
});