import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { CalendarPanel } from '@/components/calendar/calendar-panel';

export default function CalendarScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const initialDate = typeof params.date === 'string' && params.date ? params.date : undefined;

  return (
    <ThemedView style={styles.container}>
      <CalendarPanel initialDate={initialDate} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});