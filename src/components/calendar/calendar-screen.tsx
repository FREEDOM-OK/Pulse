import { StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarPanel } from '@/components/calendar/calendar-panel';
import { TAB_BAR_CLEARANCE } from '@/components/nav/app-tab-bar';
import { SubPageHeader } from '@/components/nav/sub-page-header';
import { ThemedView } from '@/components/themed-view';

export interface CalendarScreenProps {
  /** tab = 底栏第三格（无返回、带底栏）；page = 二级页（圆形返回）。 */
  mode?: 'tab' | 'page';
  initialDate?: string;
}

export function CalendarScreen({ mode = 'tab', initialDate }: CalendarScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container} glow>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <SubPageHeader title="日历回顾" mode={mode} />
        <CalendarPanel
          initialDate={initialDate}
          contentContainerStyle={
            mode === 'tab' ? { paddingBottom: TAB_BAR_CLEARANCE + insets.bottom } : undefined
          }
        />
      </SafeAreaView>
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
});