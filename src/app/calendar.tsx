import { useLocalSearchParams } from 'expo-router';
import { CalendarScreen } from '@/components/calendar/calendar-screen';

/** 日历二级页：从首页 Dash / 「我的 → 快捷入口」/ 其他页的日历按钮进来。 */
export default function CalendarPage() {
  const params = useLocalSearchParams<{ date?: string }>();
  const initialDate = typeof params.date === 'string' && params.date ? params.date : undefined;

  return <CalendarScreen mode="page" initialDate={initialDate} />;
}