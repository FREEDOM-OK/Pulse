import { useCallback, useMemo, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PlayForm, savePlayedEdit, type PlayedDraft } from '@/components/games/play-form';
import { StarRating } from '@/components/games/star-rating';
import { WishForm } from '@/components/games/wish-form';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SwipeRow } from '@/components/ui/swipe-row';
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
import { clearRowGesture, isRowGestureActive } from '@/lib/gesture';
import { useTheme } from '@/hooks/use-theme';

type TabKey = 'want' | 'played';

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

  const load = useCallback(async () => {
    const [wishes, records] = await Promise.all([listWishlist(), listPlayed()]);
    setWishlist(wishes);
    setPlayed(records);
  }, []);

  /** 在列表空白区域左右滑动，切换想玩 / 已玩页签。 */
  const tabSwipe = useMemo(
    () =>
      PanResponder.create({
        // 每次触摸开始先清掉上一次的「行内手势」标记；
        // 若这一下其实落在某一行上，行会在冒泡阶段重新打上标记。
        onStartShouldSetPanResponderCapture: () => {
          clearRowGesture();
          return false;
        },
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isRowGestureActive() && isTabSwipe(gesture.dx, gesture.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, gesture) => {
          setTab((current) => tabAfterSwipe(current, gesture.dx, gesture.dy));
        },
      }),
    []
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

        <View style={[styles.segments, { backgroundColor: theme.backgroundElement }]}>
          {(
            [
              { key: 'want' as TabKey, label: '想玩清单' },
              { key: 'played' as TabKey, label: '已玩记录' },
            ] as const
          ).map((segment) => {
            const active = tab === segment.key;
            return (
              <Pressable
                key={segment.key}
                onPress={() => setTab(segment.key)}
                style={({ pressed }) => [
                  styles.segment,
                  active && { backgroundColor: theme.background },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                  {segment.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View accessibilityLabel="游戏列表区域" style={styles.swipeArea} {...tabSwipe.panHandlers}>
          <ScrollView contentContainerStyle={styles.content}>
            {tab === 'want' ? (
              wishlist.length === 0 ? (
                <EmptyState text="想玩清单是空的" hint="点右下角「＋」添加想玩的游戏" />
              ) : (
                <View style={styles.list}>
                  {wishlist.map((wish) => (
                    <SwipeRow
                      key={wish.id}
                      actions={[
                        {
                          label: '编辑',
                          color: theme.backgroundElement,
                          textColor: theme.text,
                          onPress: () => {
                            setEditingWish(wish);
                            setWishFormOpen(true);
                          },
                        },
                        {
                          label: '删除',
                          color: '#D64545',
                          onPress: () => setDeletingWish(wish),
                        },
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
                    </SwipeRow>
                  ))}
                </View>
              )
            ) : played.length === 0 ? (
              <EmptyState text="还没有游玩记录" hint="在「想玩清单」里点「玩了」记录一次" />
            ) : (
              <View style={styles.list}>
                {played.map((record) => (
                  <SwipeRow
                    key={record.id}
                    actions={[
                      {
                        label: '编辑',
                        color: theme.backgroundElement,
                        textColor: theme.text,
                        accessibilityLabel: '编辑',
                        onPress: () => setEditingPlayed(record),
                      },
                      {
                        label: '删除',
                        color: '#D64545',
                        accessibilityLabel: '删除',
                        onPress: () => setDeletingPlayed(record),
                      },
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
                  </SwipeRow>
                ))}
              </View>
            )}
          </ScrollView>
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
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  swipeArea: {
    flex: 1,
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
