import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useGlass, useTheme, useThemeMode } from '@/hooks/use-theme';
import { addDays, formatDay, parseDate, todayStr } from '@/lib/date';

/** 当前周前后各预加载 50 周，共 101 页。 */
const WEEKS_EACH_SIDE = 50;
const CENTER_INDEX = WEEKS_EACH_SIDE;
const PAGE_HEIGHT = 80;
const CELL_WIDTH = 40;
const CELL_HEIGHT = 60;
const PILL_WIDTH = 38;
const PILL_HEIGHT = 56;
const PILL_RADIUS = 19;

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

interface WeekDay {
  date: string;
  dayNumber: number;
  weekday: string;
}

interface WeekPage {
  monday: string;
  days: WeekDay[];
}

interface DateStripProps {
  /** 页面全局 selectedDate，受控。 */
  value: string;
  /** 翻周/点日期后立即下发，页面据此重新查询当天数据。 */
  onChange: (date: string) => void;
  /** 有记录的日子：下方显示一个小圆点。 */
  marked?: Record<string, boolean>;
}

/** 某天所在的自然周周一。 */
function mondayOf(date: string): string {
  const day = parseDate(date).getDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

function buildWeek(monday: string): WeekPage {
  return {
    monday,
    days: Array.from({ length: 7 }, (_, index) => {
      const date = addDays(monday, index);
      const parsed = parseDate(date);
      return {
        date,
        dayNumber: parsed.getDate(),
        weekday: WEEKDAY_SHORT[parsed.getDay()],
      };
    }),
  };
}

function buildWeeks(anchorMonday: string): WeekPage[] {
  return Array.from({ length: WEEKS_EACH_SIDE * 2 + 1 }, (_, index) =>
    buildWeek(addDays(anchorMonday, (index - CENTER_INDEX) * 7))
  );
}

interface DayCellProps {
  date: string;
  dayNumber: number;
  weekday: string;
  isSelected: boolean;
  isToday: boolean;
  hasRecord: boolean;
  dayColor: string;
  onSelect: (date: string) => void;
}

function DayCellBase({
  date,
  dayNumber,
  weekday,
  isSelected,
  isToday,
  hasRecord,
  dayColor,
  onSelect,
}: DayCellProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const glass = useGlass();
  const scheme = useThemeMode();

  useEffect(() => {
    if (!isSelected) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [isSelected, progress]);

  const pillScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`日期 ${date}${hasRecord ? ' 有记录' : ''}`}
      accessibilityHint={isToday ? '今天' : undefined}
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(date)}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
      {isSelected ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            glass
              ? {
                  borderWidth: 1,
                  borderColor:
                    scheme === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.35)',
                }
              : null,
            {
              opacity: progress,
              transform: [{ scale: pillScale }],
            },
          ]}
        />
      ) : null}
      <View style={styles.cellContent}>
        <ThemedText
          style={[
            styles.dayNumber,
            {
              color: isSelected ? '#FFFFFF' : dayColor,
              fontWeight: isToday ? '700' : '600',
            },
          ]}>
          {dayNumber}
        </ThemedText>
        <ThemedText
          style={[styles.weekday, { color: isSelected ? '#FFFFFF' : '#8E8E93' }]}>
          {weekday}
        </ThemedText>
        <View
          style={[
            styles.recordDot,
            {
              backgroundColor:
                !isSelected && (hasRecord || isToday)
                  ? isToday
                    ? '#1C1C1E'
                    : '#8E8E93'
                  : 'transparent',
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

/**
 * DayCell 只依赖选中态、记录点和主题色。翻周时日期/星期不变，
 * 因此 7 个格子不会因为父级页重渲染而重新渲染。
 */
const DayCell = memo(
  DayCellBase,
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.hasRecord === next.hasRecord &&
    prev.isToday === next.isToday &&
    prev.dayColor === next.dayColor
);
DayCell.displayName = 'DayCell';

/**
 * 计划/健身页顶部日期条。
 *
 * 架构：101 个自然周分页，每页固定一整屏宽；FlatList 只做横向分页，
 * selectedDate 由页面受控。翻页结束后直接 onChange(新日期)，
 * 页面 useEffect 会重新查询当天数据，不需要用户再点一次。
 */
export function DateStrip({ value, onChange, marked }: DateStripProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const pageWidth = Math.max(1, Math.round(width));
  const today = todayStr();

  const [anchorMonday, setAnchorMonday] = useState(() => mondayOf(value));
  const weeks = useMemo(() => buildWeeks(anchorMonday), [anchorMonday]);

  const listRef = useRef<FlatList<WeekPage>>(null);
  const valueRef = useRef(value);
  const currentPageRef = useRef(-1);
  const lastWidthRef = useRef(pageWidth);
  const scrollFrameRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rangeStart = weeks[0].monday;
  const rangeEnd = weeks[weeks.length - 1].days[6].date;

  const selectedIndex = useMemo(
    () => weeks.findIndex((week) => week.days.some((day) => day.date === value)),
    [value, weeks]
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // 日历跳到预加载窗口外时，围绕新日期重建 101 周窗口；普通翻周不会走这里。
  useEffect(() => {
    if (value < rangeStart || value > rangeEnd) {
      setAnchorMonday(mondayOf(value));
      currentPageRef.current = -1;
    }
  }, [rangeEnd, rangeStart, value]);

  // 页面外部的 selectedDate 变化（点日期、日历跳转、重新聚焦回到今天）时同步列表位置。
  useEffect(() => {
    if (selectedIndex < 0) return;
    const widthChanged = lastWidthRef.current !== pageWidth;
    lastWidthRef.current = pageWidth;

    if (!widthChanged && selectedIndex === currentPageRef.current) return;
    currentPageRef.current = selectedIndex;

    if (scrollFrameRef.current != null) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: selectedIndex * pageWidth,
        animated: false,
      });
    });
  }, [pageWidth, selectedIndex]);

  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (scrollFrameRef.current != null) cancelAnimationFrame(scrollFrameRef.current);
    },
    []
  );

  const selectWeekPage = useCallback(
    (rawIndex: number, snapToPage: boolean, offsetX?: number) => {
      const index = Math.min(weeks.length - 1, Math.max(0, rawIndex));
      const week = weeks[index];
      // 当前周自动回到今天；其他周保持原先的星期几（例如周三 -> 下周三）。
      const weekdayIndex = (parseDate(valueRef.current).getDay() + 6) % 7;
      const nextDate = week.days.some((day) => day.date === today)
        ? today
        : week.days[weekdayIndex].date;

      // 同一个页面、同一个日期时不再重复 onChange/滚动，避免 Web 兜底监听自触发循环。
      if (index === currentPageRef.current && nextDate === valueRef.current) {
        if (snapToPage && offsetX != null && Math.abs(offsetX - index * pageWidth) > 1) {
          listRef.current?.scrollToOffset({ offset: index * pageWidth, animated: true });
        }
        return;
      }

      currentPageRef.current = index;
      if (nextDate !== valueRef.current) {
        valueRef.current = nextDate;
        onChange(nextDate);
      }
      if (snapToPage) {
        listRef.current?.scrollToOffset({ offset: index * pageWidth, animated: true });
      }
    },
    [onChange, pageWidth, today, weeks]
  );

  const handleMomentumEnd = useCallback(
    (offsetX: number) => {
      selectWeekPage(Math.round(offsetX / pageWidth), false);
    },
    [pageWidth, selectWeekPage]
  );

  // RNW 的部分环境不派发 onMomentumScrollEnd，用滚动停止后的兜底监听补齐。
  const handleWebScroll = useCallback(
    (offsetX: number) => {
      if (Platform.OS !== 'web') return;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        selectWeekPage(Math.round(offsetX / pageWidth), true, offsetX);
      }, 140);
    },
    [pageWidth, selectWeekPage]
  );

  const handleSelectDate = useCallback(
    (date: string) => {
      onChange(date);
    },
    [onChange]
  );

  const extraData = useMemo(() => ({ value, marked }), [marked, value]);

  const renderWeek = useCallback(
    ({ item }: { item: WeekPage }) => (
      <View style={[styles.page, { width: pageWidth }]}>
        {item.days.map((day) => (
          <DayCell
            key={day.date}
            date={day.date}
            dayNumber={day.dayNumber}
            weekday={day.weekday}
            isSelected={day.date === value}
            isToday={day.date === today}
            hasRecord={Boolean(marked?.[day.date])}
            dayColor={theme.text}
            onSelect={handleSelectDate}
          />
        ))}
      </View>
    ),
    [handleSelectDate, marked, pageWidth, theme.text, today, value]
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<WeekPage> | null | undefined, index: number) => ({
      length: pageWidth,
      offset: pageWidth * index,
      index,
    }),
    [pageWidth]
  );

  return (
    <View style={styles.container}>
      <FlatList
        key={anchorMonday}
        ref={listRef}
        data={weeks}
        extraData={extraData}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        initialScrollIndex={CENTER_INDEX}
        getItemLayout={getItemLayout}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.monday}
        renderItem={renderWeek}
        onScroll={Platform.OS === 'web' ? (event) => handleWebScroll(event.nativeEvent.contentOffset.x) : undefined}
        onScrollBeginDrag={() => {
          if (settleTimerRef.current) {
            clearTimeout(settleTimerRef.current);
            settleTimerRef.current = null;
          }
        }}
        onMomentumScrollEnd={(event) => handleMomentumEnd(event.nativeEvent.contentOffset.x)}
        onScrollToIndexFailed={({ index }) => {
          listRef.current?.scrollToOffset({
            offset: index * pageWidth,
            animated: false,
          });
        }}
      />
    </View>
  );
}

/** 供页面标题使用：11月6日 周五 */
export function dateLabel(date: string): string {
  return date === todayStr() ? `今天 · ${formatDay(date)}` : formatDay(date);
}

const styles = StyleSheet.create({
  container: {
    height: PAGE_HEIGHT,
    width: '100%',
  },
  page: {
    height: PAGE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    borderWidth: 0,
    // Web 点击日期后浏览器会画焦点外框，看起来像“今天描边残留”。
    outlineWidth: 0,
    outlineColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pill: {
    position: 'absolute',
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: '#000000',
    zIndex: 0,
  },
  dayNumber: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  weekday: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '400',
  },
  recordDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.7,
  },
});