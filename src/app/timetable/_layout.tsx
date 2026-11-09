import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

/** 课表内的二级页统一不要原生 header（页面自己画头部），也不显示分界线。 */
export default function TimetableLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}