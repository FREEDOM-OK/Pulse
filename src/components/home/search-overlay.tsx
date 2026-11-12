import { useCallback, useEffect, useRef, useState, type ElementRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { SearchResults } from '@/components/home/search-results';
import {
  clearSearchHistory,
  listSearchHistory,
  recordSearchQuery,
  searchRecords,
  type SearchHistoryEntry,
  type SearchResult,
} from '@/db/repositories/search';

export interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
}

const OPEN_DURATION = 220;
const CLOSE_DURATION = 200;
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/**
 * 根级搜索遮罩。
 *
 * 使用 RN Modal 挂到根视图，层级高于自定义 TabBar；首页本身只保留一个
 * “搜索”入口，不再自己渲染 overlay。空关键词只读 search_history，
 * 只有 onSubmitEditing 才写历史并查业务表。
 */
export function SearchOverlay({ visible, onClose, onSelectResult }: SearchOverlayProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<ElementRef<typeof TextInput>>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(12)).current;
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [searching, setSearching] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      closingRef.current = false;
      return;
    }

    setQuery('');
    setResults([]);
    setSubmitted(false);
    setSearching(false);
    listSearchHistory()
      .then(setHistory)
      .catch(() => setHistory([]));

    progress.setValue(0);
    offset.setValue(12);
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_DURATION,
        easing: EASE,
        useNativeDriver: true,
      }),
      Animated.timing(offset, {
        toValue: 0,
        duration: OPEN_DURATION,
        easing: EASE,
        useNativeDriver: true,
      }),
    ]).start();

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(focusTimer);
  }, [offset, progress, visible]);

  const close = useCallback(
    (after?: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 0,
          duration: CLOSE_DURATION,
          easing: EASE,
          useNativeDriver: true,
        }),
        Animated.timing(offset, {
          toValue: 12,
          duration: CLOSE_DURATION,
          easing: EASE,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onClose();
        after?.();
      });
    },
    [offset, onClose, progress]
  );

  const submit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setSubmitted(true);
    setSearching(true);
    try {
      await recordSearchQuery(trimmed);
      const [rows, nextHistory] = await Promise.all([
        searchRecords(trimmed),
        listSearchHistory(),
      ]);
      setResults(rows);
      setHistory(nextHistory);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleChange = (value: string) => {
    setQuery(value);
    setSubmitted(false);
    setResults([]);
  };

  const handleHistoryPress = (value: string) => {
    setQuery(value);
    setSubmitted(false);
    setResults([]);
    inputRef.current?.focus();
  };

  const handleClearHistory = () => {
    clearSearchHistory()
      .then(() => setHistory([]))
      .catch(() => undefined);
  };

  const showHistory = query.trim().length === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => close()}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: progress,
            transform: [{ translateY: offset }],
          },
        ]}>
        <View style={[styles.searchRow, { marginTop: insets.top + 8 }]}>
          <View style={styles.searchBox}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              tintColor="#8E8E93"
              size={20}
            />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={handleChange}
              onSubmitEditing={() => {
                submit().catch(() => undefined);
              }}
              returnKeyType="search"
              placeholder="搜索任务、备忘或训练"
              placeholderTextColor="#8E8E93"
              selectionColor="#000000"
              style={styles.input}
              accessibilityLabel="搜索"
              autoCorrect={false}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭搜索"
            onPress={() => close()}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor="#1C1C1E"
              size={17}
            />
          </Pressable>
        </View>

        {showHistory ? (
          <ScrollView
            style={styles.historyScroll}
            contentContainerStyle={[styles.historyContent, { paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionLabel}>最近搜索</Text>
              {history.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="清空搜索历史"
                  onPress={handleClearHistory}
                  hitSlop={8}>
                  <Text style={styles.clearText}>清空历史</Text>
                </Pressable>
              ) : null}
            </View>

            {history.length > 0 ? (
              <View style={styles.chips}>
                {history.map((item) => (
                  <Pressable
                    key={item.query}
                    accessibilityRole="button"
                    accessibilityLabel={`搜索历史 ${item.query}`}
                    onPress={() => handleHistoryPress(item.query)}
                    style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                    <SymbolView
                      name={{ ios: 'clock', android: 'history', web: 'history' }}
                      tintColor="#8E8E93"
                      size={13}
                    />
                    <Text style={styles.chipText} numberOfLines={1}>
                      {item.query}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyHistory}>暂无搜索历史</Text>
            )}
          </ScrollView>
        ) : submitted ? (
          searching ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#000000" />
            </View>
          ) : (
            <SearchResults
              results={results}
              query={query}
              onPress={(result) => close(() => onSelectResult(result))}
              bottomInset={insets.bottom}
            />
          )
        ) : (
          <View style={styles.hint}>
            <Text style={styles.hintText}>按回车搜索</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  searchRow: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 50,
    paddingVertical: 0,
    fontSize: 15,
    color: '#000000',
    outlineColor: 'transparent',
    outlineWidth: 0,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9E9EE',
  },
  historyScroll: {
    flex: 1,
  },
  historyContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  clearText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8E8E93',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    maxWidth: '100%',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    maxWidth: 220,
    fontSize: 13,
    lineHeight: 18,
    color: '#1C1C1E',
  },
  emptyHistory: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 18,
    color: '#A1A1A6',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#A1A1A6',
  },
  pressed: {
    opacity: 0.65,
  },
});