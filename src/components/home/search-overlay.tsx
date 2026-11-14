import { useCallback, useEffect, useRef, useState, type ElementRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
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
import { useTheme } from '@/hooks/use-theme';
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
/** 退场必须够快：整屏 #F7F7FA 变半透明的这段时间里，会和首页文字叠出重影。 */
const CLOSE_DURATION = 120;
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
  const theme = useTheme();
  const inputRef = useRef<ElementRef<typeof TextInput>>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(12)).current;
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [searching, setSearching] = useState(false);
  const closingRef = useRef(false);
  const runningRef = useRef<Animated.CompositeAnimation | null>(null);

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
    const animation = Animated.parallel([
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
    ]);
    runningRef.current = animation;
    animation.start();

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(focusTimer);
  }, [offset, progress, visible]);

  const close = useCallback(
    (after?: () => void) => {
      // 先收焦点再退场：输入框光标和键盘都算「前景」，留着会在淡出时单独闪一下。
      inputRef.current?.blur();
      Keyboard.dismiss();
      if (closingRef.current) return;
      closingRef.current = true;
      // 开场动画还没播完就点关闭时，先停掉它，避免两条 timing 同时写同一个值而抖动。
      runningRef.current?.stop();
      const animation = Animated.parallel([
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
      ]);
      runningRef.current = animation;
      animation.start(({ finished }) => {
        // 被中途打断（例如组件已卸载）就不要再回调父级。
        if (!finished) return;
        onClose();
        after?.();
      });
    },
    [offset, onClose, progress]
  );

  // 卸载时停掉还在跑的进出场动画，避免回调落到已卸载的组件上。
  useEffect(
    () => () => {
      runningRef.current?.stop();
    },
    []
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

  // 关闭后不要把一个隐藏的 <Modal visible={false}> 一直挂在原生树上：直接不渲染。
  // 退场动画在 close() 内部播完（CLOSE_DURATION）才通知父级，因此这里不会打断淡出。
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => close()}>
      <Animated.View
        // Android 给整层先离屏合成为一张纹理再整体淡出：子视图的阴影 / 文字不会各自透出残影。
        // Web 与 iOS 不需要，透传下去反而会变成非法 DOM 属性。
        {...(Platform.OS === 'android'
          ? { renderToHardwareTextureAndroid: true, needsOffscreenAlphaCompositing: true }
          : null)}
        style={[
          styles.overlay,
          {
            backgroundColor: theme.background,
            opacity: progress,
            transform: [{ translateY: offset }],
          },
        ]}>
        <View style={[styles.searchRow, { marginTop: insets.top + 8 }]}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
            ]}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              tintColor={theme.textSecondary}
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
              placeholderTextColor={theme.textSecondary}
              selectionColor={theme.text}
              style={[styles.input, { color: theme.text }]}
              accessibilityLabel="搜索"
              autoCorrect={false}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭搜索"
            onPress={() => close()}
            style={({ pressed }) => [
              styles.close,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor={theme.text}
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
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>最近搜索</Text>
              {history.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="清空搜索历史"
                  onPress={handleClearHistory}
                  hitSlop={8}>
                  <Text style={[styles.clearText, { color: theme.textSecondary }]}>清空历史</Text>
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
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <SymbolView
                      name={{ ios: 'clock', android: 'history', web: 'history' }}
                      tintColor={theme.textSecondary}
                      size={13}
                    />
                    <Text style={[styles.chipText, { color: theme.text }]} numberOfLines={1}>
                      {item.query}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyHistory, { color: theme.textSecondary }]}>暂无搜索历史</Text>
            )}
          </ScrollView>
        ) : submitted ? (
          searching ? (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.text} />
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
            <Text style={[styles.hintText, { color: theme.textSecondary }]}>按回车搜索</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
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
    // 不用 shadow / elevation：Android 上子视图的硬件阴影不随父级 opacity 衰减，
    // 淡出时会残留一圈深灰黑框；浅灰底上的 1px 细边框已经足够分层。
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 50,
    paddingVertical: 0,
    fontSize: 15,
    outlineColor: 'transparent',
    outlineWidth: 0,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  clearText: {
    fontSize: 12,
    lineHeight: 16,
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
  },
  chipText: {
    maxWidth: 220,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyHistory: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 18,
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
  },
  pressed: {
    opacity: 0.65,
  },
});