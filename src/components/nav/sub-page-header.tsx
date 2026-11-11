/**
 * 二级页统一头部（PRD_module 第 8 节）：
 * - mode="page"：最左 36×36 圆形描边返回按钮，标题右移 12；
 * - mode="tab"：没有返回按钮，标题左对齐（和「我的」「首页」一致）。
 * 不画整条底部分隔线，也不额外占一整条高度；顶部安全区由外层 SafeAreaView 处理。
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SubPageHeaderProps {
  title: string;
  /** page = 二级页（带圆形返回）；tab = 第 3 页（无返回、标题左对齐）。 */
  mode?: 'page' | 'tab';
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function SubPageHeader({ title, mode = 'page', subtitle, onBack, right }: SubPageHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {mode === 'page' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={onBack ?? (() => router.back())}
          style={({ pressed }) => [
            styles.back,
            { borderColor: theme.text },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={18}
            tintColor={theme.text}
          />
        </Pressable>
      ) : null}

      <View style={[styles.texts, mode === 'page' ? styles.textsShifted : null]}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.spacer} />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    gap: 2,
  },
  textsShifted: {
    marginLeft: 4,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});