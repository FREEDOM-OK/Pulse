import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { SearchResult } from '@/db/repositories/search';
import { formatMonthDay } from '@/lib/date';

const KIND_META: Record<
  SearchResult['kind'],
  { label: string; color: string; background: string }
> = {
  task: { label: '计划', color: '#0A84FF', background: '#EAF2FF' },
  memo: { label: '备忘', color: '#636366', background: '#F2F2F7' },
  fitness: { label: '健身', color: '#FF9500', background: '#FFF3E0' },
};

export interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onPress: (result: SearchResult) => void;
  bottomInset: number;
}

/** 沉浸式搜索面板里的结果列表；每条结果固定高度、统一卡片。 */
export function SearchResults({ results, query, onPress, bottomInset }: SearchResultsProps) {
  const title = query.trim() ? '搜索结果' : '最近记录';

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.key}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={{ paddingBottom: bottomInset + 110 }}
      ListHeaderComponent={
        <View style={styles.headingRow}>
          <ThemedText style={styles.heading}>{title}</ThemedText>
          {query.trim() && results.length > 0 ? (
            <ThemedText style={styles.count}>{results.length} 条</ThemedText>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <ThemedText style={styles.emptyText}>没有找到相关内容</ThemedText>
          <ThemedText style={styles.emptyHint}>试试任务、备忘或训练动作的名称</ThemedText>
        </View>
      }
      renderItem={({ item }) => {
        const meta = KIND_META[item.kind];
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${meta.label} ${item.title} ${formatMonthDay(item.date)}`}
            onPress={() => onPress(item)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={[styles.tag, { backgroundColor: meta.background }]}>
              <View style={[styles.dot, { backgroundColor: meta.color }]} />
              <ThemedText style={[styles.tagText, { color: meta.color }]}>{meta.label}</ThemedText>
            </View>

            <View style={styles.body}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {item.title}
              </ThemedText>
              <ThemedText style={styles.subtitle} numberOfLines={1}>
                {item.subtitle}
              </ThemedText>
            </View>

            <ThemedText style={styles.date}>{formatMonthDay(item.date)}</ThemedText>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  heading: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  count: {
    fontSize: 12,
    lineHeight: 16,
    color: '#A1A1A6',
  },
  card: {
    height: 72,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  tag: {
    width: 48,
    height: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    gap: 3,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#000000',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8E8E93',
  },
  date: {
    marginLeft: 10,
    fontSize: 12,
    lineHeight: 16,
    color: '#8E8E93',
  },
  empty: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#3A3A3C',
  },
  emptyHint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8E8E93',
  },
  pressed: {
    opacity: 0.75,
  },
});