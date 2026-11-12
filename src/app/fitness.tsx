import { useLocalSearchParams } from 'expo-router';

import { FitnessScreen } from '@/components/fitness/fitness-screen';

/** 健身二级页：从首页 Dash / 「我的 → 快捷入口」进来，带圆形返回按钮。 */
export default function FitnessPage() {
  const params = useLocalSearchParams<{ date?: string }>();
  return (
    <FitnessScreen
      mode="page"
      initialDate={typeof params.date === 'string' ? params.date : undefined}
    />
  );
}