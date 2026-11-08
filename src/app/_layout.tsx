import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { initDatabase } from '@/db';
import { ThemePreferenceProvider, useThemePreference } from '@/theme/theme-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((reason: unknown) => setError(String(reason)))
      .finally(() => {
        SplashScreen.hideAsync();
      });
  }, []);

  if (!ready) {
    return (
      <View style={styles.center}>
        {error ? (
          <Text style={styles.error}>数据库初始化失败：{error}</Text>
        ) : (
          <ActivityIndicator size="large" />
        )}
      </View>
    );
  }

  return (
    <ThemePreferenceProvider>
      <AppStack />
    </ThemePreferenceProvider>
  );
}

function AppStack() {
  const { scheme } = useThemePreference();

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="calendar"
          options={{ headerShown: true, title: '日历回顾', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="profile"
          options={{ headerShown: true, title: '个人资料', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="games"
          options={{ headerShown: true, title: '游戏', headerBackTitle: '返回' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  error: {
    color: '#c0392b',
    fontSize: 14,
    textAlign: 'center',
  },
});
