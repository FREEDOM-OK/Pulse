import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PlayForm, savePlayedEdit, type PlayedDraft } from '@/components/games/play-form';
import { StarRating } from '@/components/games/star-rating';
import { WishForm } from '@/components/games/wish-form';
import { ActionMenu } from '@/components/ui/action-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';
import {
  deletePlayed,
  deleteWish,
  listPlayed,
  listWishlist,
  markPlayed,
} from '@/db/repositories/games';
import type { PlayedGameRow, WishlistRow } from '@/db/types';
import { formatDay, formatDuration } from '@/lib/date';
import { isTabSwipe, tabAfterSwipe } from '@/lib/games-tab';
import { useTheme } from '@/hooks/use-theme';

type TabKey = 'want' | 'played';

const TAB_SEGMENTS = [
  { key: 'want' as TabKey, label: '想玩清单' },
  { key: 'played' as TabKey, label: '已玩记录' },
];

export default function GamesScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<TabKey>('want');
  const [wishlist, setWishlist] = useState<WishlistRow[]>([]);
  const [played, setPlayed] = useState<PlayedGameRow[]>([]);
  const [wishFormOpen, setWishFormOpen] = useState(false);
  const [editingWish, setEditingWish] = useState<WishlistRow | null>(null);
  const [playTarget, setPlayTarget] = useState<WishlistRow | null>(null);
  const [editingPlayed, setEditingPlayed] = useState<PlayedGameRow | null>(null);
  const [deletingWish, setDeletingWish] = useState<WishlistRow | null>(null);
  const [deletingPlayed, setDeletingPlayed] = useState<PlayedGameRow | null>(null);
  const [menuWish, setMenuWish] = useState<WishlistRow | null>(null);
  const [menuPlayed, setMenuPlayed] = useState<PlayedGameRow | null>(null);

  // 0 = 想玩清单，1 = 已玩记录；拖动时它连续变化，页面和顶部页签框都跟着手指走。
  const progress = useRef(new Animated.Value(0)).current;
  const progressRef = useRef(0);
  const startProgress = useRef(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [segmentsWidth, setSegmentsWidth] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      progressRef.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  const animateTo = useCallback(
    (index: number) => {
      setTab(index === 0 ? 'want' : 'played');
      Animated.spring(progress, {
        toValue: index,
        useNativeDriver: false,
        bounciness: 0,
        speed: 18,
      }).start();
    },
    [progress]
  );

  const load = useCallback(async () => {
    const [wishes, records] = await Promise.all([listWishlist(), listPlayed()]);
    setWishlist(wishes);
    setPlayed(records);
  }, []);

  /** 整块列表左右拖动：页面跟着手指平移，松手后吸附到最近的一页。 */
  const tabSwipe = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // 横向才接手势，纵向留给列表自己滚动。
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        // 捕获阶段优先，避免内部可点卡片/滚动容器先吃掉横移。
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          isTabSwipe(gesture.dx, gesture.dy, 10),
        onPanResponderGrant: () => {
          startProgress.current = progressRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          if (pageWidth <= 0) return;
          const raw = startProgress.current - gesture.dx / pageWidth;
          // 到了两端继续拖时加阻尼，手感更像 iOS 的分页。
          const damped = raw < 0 ? raw * 0.3 : raw > 1 ? 1 + (raw - 1) * 0.3 : raw;
          progress.setValue(damped);
        },
        onPanResponderRelease: (_, gesture) => {
          const logical = tabAfterSwipe(tab, gesture.dx, gesture.dy);
          if (logical !== tab) {
            animateTo(logical === 'played' ? 1 : 0);
            return;
          }
          animateTo(progressRef.current >= 0.5 ? 1 : 0);
        },
        onPanResponderTerminate: () => {
          animateTo(progressRef.current >= 0.5 ? 1 : 0);
        },
      }),
    [animateTo, pageWidth, progress, tab]
  );

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const handlePlayedConfirm = async (draft: PlayedDraft) => {
    if (editingPlayed) {
      await savePlayedEdit(editingPlayed.id, draft);
      setEditingPlayed(null);
    } else if (playTarget) {
      await markPlayed(playTarget.id, {
        durationMinutes: draft.durationMinutes,
        experience: draft.experience,
        rating: draft.rating,
        playedDate: draft.playedDate,
      });
      setPlayTarget(null);
    }
    await load();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            游戏
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            想玩 {wishlist.length} · 已玩 {played.length}
          </ThemedText>
        </View>

        <View
          style={[styles.segments, { backgroundColor: theme.backgroundElement }]}
          onLayout={(event) => setSegmentsWidth(event.nativeEvent.layout.width)}>
          {segmentsWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              accessibilityLabel="页签指示器"
              style={[
                styles.indicator,
                {
                  width: segmentsWidth / 2 - 3,
                  backgroundColor: theme.background,
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, segmentsWidth / 2],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : null}
          {TAB_SEGMENTS.map((segment, index) => {
            const active = tab === segment.key;
            return (
              <Pressable
                key={segment.key}
                accessibilityLabel={segment.label}
                onPress={() => animateTo(index)}
                style={({ pressed }) => [styles.segment, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                  {segment.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View
          accessibilityLabel="游戏列表区域"
          style={styles.swipeArea}
          onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}
          {...tabSwipe.panHandlers}>
          {pageWidth > 0 ? (
            <Animated.View
              style={[
                styles.pager,
                {
                  width: pageWidth * 2,
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -pageWidth],
                      }),
                    },
                  ],
                },
              ]}>
              {/* 想玩清单 */}
              <View style={[styles.page, { width: pageWidth }]}>
                <ScrollView contentContainerStyle={styles.content}>
                  {wishlist.length === 0 ? (
                    <EmptyState text="想玩清单是空的" hint="点右下角「＋」添加想玩的游戏" />
                  ) : (
                    <View style={styles.list}>
                      {wishlist.map((wish) => (
                        <Pressable
                          key={wish.id}
                          accessibilityLabel={`想玩 ${wish.name}`}
                          accessibilityHint="长按可编辑或删除"
                          delayLongPress={400}
                          onLongPress={() => setMenuWish(wish)}
                          style={({ pressed }) => [
                            styles.rowPressable,
                            pressed && styles.pressed,
                          ]}>
                          <ThemedView type="backgroundElement" style={styles.wishRow}>
                            <View style={styles.wishInfo}>
                              <ThemedText type="smallBold" style={styles.wishName}>
                                {wish.name}
                              </ThemedText>
                              {wish.note ? (
                                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                                  {wish.note}
                                </ThemedText>
                              ) : null}
                            </View>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`标记已玩 ${wish.name}`}
                              onPress={() => setPlayTarget(wish)}
                              style={({ pressed }) => [
                                styles.playButton,
                                { backgroundColor: theme.text },
                                pressed && styles.pressed,
                              ]}>
                              <ThemedText type="smallBold" style={{ color: theme.background }}>
                                玩了
                              </ThemedText>
                            </Pressable>
                          </ThemedView>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* 已玩记录 */}
              <View style={[styles.page, { width: pageWidth }]}>
                <ScrollView contentContainerStyle={styles.content}>
                  {played.length === 0 ? (
                    <EmptyState text="还没有游玩记录" hint="在「想玩清单」里点「玩了」记录一次" />
                  ) : (
                    <View style={styles.list}>
                      {played.map((record) => (
                        <Pressable
                          key={record.id}
                          accessibilityLabel={`已玩 ${record.game_name}`}
                          accessibilityHint="长按可编辑或删除"
                          delayLongPress={400}
                          onLongPress={() => setMenuPlayed(record)}
                          style={({ pressed }) => [
                            styles.rowPressable,
                            pressed && styles.pressed,
                          ]}>
                          <ThemedView type="backgroundElement" style={styles.playedCard}>
                            <View style={styles.playedHeader}>
                              <ThemedText type="smallBold" style={styles.playedName}>
                                {record.game_name}
                              </ThemedText>
                              <StarRating value={record.rating} readOnly size={15} />
                            </View>
                            <ThemedText type="small" themeColor="textSecondary">
                              {formatDay(record.played_date)} · {formatDuration(record.duration_minutes)}
                            </ThemedText>
                            {record.experience ? (
                              <ThemedText type="small" numberOfLines={3}>
                                {record.experience}
                              </ThemedText>
                            ) : null}
                          </ThemedView>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            </Animated.View>
          ) : null}
        </View>

        {tab === 'want' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="添加想玩的游戏"
            onPress={() => {
              setEditingWish(null);
              setWishFormOpen(true);
            }}
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.fabText, { color: theme.background }]}>＋</ThemedText>
          </Pressable>
        ) : null}
      </SafeAreaView>

      <WishForm
        visible={wishFormOpen}
        wish={editingWish}
        onClose={() => setWishFormOpen(false)}
        onSaved={() => {
          setWishFormOpen(false);
          load().catch(() => undefined);
        }}
      />

      <PlayForm
        visible={playTarget !== null || editingPlayed !== null}
        gameName={playTarget?.name ?? editingPlayed?.game_name ?? ''}
        played={editingPlayed}
        onClose={() => {
          setPlayTarget(null);
          setEditingPlayed(null);
        }}
        onConfirm={(draft) => {
          handlePlayedConfirm(draft).catch(() => undefined);
        }}
      />

      <ActionMenu
        visible={menuWish !== null}
        title={menuWish ? menuWish.name : undefined}
        message="长按想玩的游戏可以编辑或删除"
        items={[
          {
            key: 'edit',
            label: '编辑',
            onPress: () => {
              setEditingWish(menuWish);
              setWishFormOpen(true);
            },
          },
          {
            key: 'delete',
            label: '删除',
            danger: true,
            onPress: () => setDeletingWish(menuWish),
          },
        ]}
        onClose={() => setMenuWish(null)}
      />

      <ActionMenu
        visible={menuPlayed !== null}
        title={menuPlayed ? menuPlayed.game_name : undefined}
        message="长按游玩记录可以编辑或删除"
        items={[
          {
            key: 'edit',
            label: '编辑',
            onPress: () => setEditingPlayed(menuPlayed),
          },
          {
            key: 'delete',
            label: '删除',
            danger: true,
            onPress: () => setDeletingPlayed(menuPlayed),
          },
        ]}
        onClose={() => setMenuPlayed(null)}
      />

      <ConfirmDialog
        visible={deletingWish !== null}
        title="从想玩清单删除？"
        message={deletingWish ? `「${deletingWish.name}」将从想玩清单移除。` : undefined}
        confirmLabel="确认删除"
        danger
        onCancel={() => setDeletingWish(null)}
        onConfirm={() => {
          if (!deletingWish) return;
          deleteWish(deletingWish.id)
            .then(() => {
              setDeletingWish(null);
              return load();
            })
            .catch(() => undefined);
        }}
      />

      <ConfirmDialog
        visible={deletingPlayed !== null}
        title="删除这条游玩记录？"
        message={deletingPlayed ? `「${deletingPlayed.game_name}」的记录删除后无法恢复。` : undefined}
        confirmLabel="确认删除"
        danger
        onCancel={() => setDeletingPlayed(null)}
        onConfirm={() => {
          if (!deletingPlayed) return;
          deletePlayed(deletingPlayed.id)
            .then(() => {
              setDeletingPlayed(null);
              return load();
            })
            .catch(() => undefined);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  segments: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    padding: 3,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: Spacing.five,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  swipeArea: {
    flex: 1,
    overflow: 'hidden',
    // Web 上拖拽翻页时不要选中文字：选中会触发 selectionchange，把 PanResponder 的响应者抢走。
    userSelect: 'none',
  },
  pager: {
    flexDirection: 'row',
    height: '100%',
    userSelect: 'none',
  },
  page: {
    height: '100%',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: 96,
  },
  list: {
    gap: Spacing.two,
  },
  rowPressable: {
    borderRadius: Spacing.three,
  },
  wishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  wishInfo: {
    flex: 1,
    gap: 2,
  },
  wishName: {
    fontSize: 15,
  },
  playButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    minHeight: 34,
    justifyContent: 'center',
  },
  playedCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  playedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  playedName: {
    flex: 1,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    fontSize: 28,
    lineHeight: 32,
  },
  pressed: {
    opacity: 0.8,
  },
});