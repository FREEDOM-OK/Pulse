import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { initDatabase } from '@/db';
import { DialogHost } from '@/components/ui/dialog-host';
import { TimetableProvider } from '@/features/timetable/TimetableContext';
import { Colors, GlassColors } from '@/constants/theme';
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
      <TimetableProvider>
        <AppStack />
      </TimetableProvider>
      <DialogHost />
    </ThemePreferenceProvider>
  );
}

function AppStack() {
  const { scheme, skin } = useThemePreference();
  const colors = skin === 'glass' ? GlassColors[scheme] : Colors[scheme];

  // 强制把导航主题的 background / card 同步成当前主题色：
  // React Navigation 自带的 DefaultTheme 底色是浅白，转场瞬间会从它下面漏出一层白。
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.backgroundElement,
    },
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ThemeProvider value={navTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            headerShadowVisible: false,
            // ios_from_right 在 Android 上走紧凑的 iOS 视差曲线，退场比 slide_from_right 更干脆。
            animation: 'ios_from_right',
            animationDuration: 180,
            // 页面滑出时冻结，避免退场途中重渲染把内容清空露出白板。
            freezeOnBlur: true,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            fullScreenGestureEnabled: true,
            // 转场期间沿用当前主题底色，避免瞬间闪白底 / 黑底。
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="calendar" options={{ headerShown: false }} />
          <Stack.Screen name="day/[date]" options={{ headerShown: false }} />
          <Stack.Screen name="fitness" options={{ headerShown: false }} />
          <Stack.Screen
            name="profile"
            options={{ headerShown: true, title: '个人资料', headerBackTitle: '返回' }}
          />
          <Stack.Screen
            name="games"
            options={{ headerShown: true, title: '游戏', headerBackTitle: '返回' }}
          />
          <Stack.Screen name="timetable" options={{ headerShown: false }} />
          <Stack.Screen name="personalize" options={{ headerShown: false }} />
          <Stack.Screen name="personalize/cards" options={{ headerShown: false }} />
          <Stack.Screen
            name="cards"
            options={{ headerShown: true, title: '首页卡片', headerBackTitle: '返回' }}
          />
        </Stack>
      </ThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
