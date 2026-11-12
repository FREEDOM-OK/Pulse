import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { CalendarScreen } from '@/components/calendar/calendar-screen';
import { FitnessScreen } from '@/components/fitness/fitness-screen';
import { TimetableScreen } from '@/components/timetable/timetable-screen';
import { ThemedView } from '@/components/themed-view';
import { getMiddleTab } from '@/db/repositories/settings';
import type { MiddleTab } from '@/db/types';
import { useDataVersion } from '@/lib/data-version';

/**
 * 底栏第三个标签（PRD_module 第 8 节）：
 * - 健身 / 日历 / 课表：这里就是真正的「第 3 页」，带底栏、没有返回按钮；
 * - 课表不再重定向到 `/timetable` 全屏页，必须留在 Tab 内。
 *
 * 设置由「我的 → 第三个标签」写入并 bumpDataVersion，所以订阅 useDataVersion 即可实时切换；
 * 再加 useFocusEffect 兜一层，处理从设置页返回时的时序差。
 */
export default function MiddleScreen() {
  const version = useDataVersion();
  const [middle, setMiddle] = useState<MiddleTab | null>(null);

  const load = useCallback(() => {
    getMiddleTab()
      .then(setMiddle)
      .catch(() => setMiddle('fitness'));
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!middle) {
    return <ThemedView style={{ flex: 1 }} />;
  }
  if (middle === 'timetable') {
    return <TimetableScreen mode="tab" />;
  }
  if (middle === 'calendar') {
    return <CalendarScreen mode="tab" />;
  }
  return <FitnessScreen mode="tab" />;
}