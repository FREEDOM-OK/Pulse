import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface BreadcrumbItem {
  label: string;
  onPress?: () => void;
}

export interface BreadcrumbProps {
  /** 从根到当前页，最后一项为当前页（不可点）。 */
  trail: BreadcrumbItem[];
}

/** 二级/三级页顶部面包屑（PRDv1.2.2 第 5 节）。 */
export function Breadcrumb({ trail }: BreadcrumbProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {trail.map((item, index) => {
        const last = index === trail.length - 1;
        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <Text style={[styles.separator, { color: theme.textSecondary }]}>›</Text>
            ) : null}
            {last || !item.onPress ? (
              <Text
                style={[styles.label, { color: last ? theme.text : theme.textSecondary }]}
                numberOfLines={1}>
                {item.label}
              </Text>
            ) : (
              <Pressable onPress={item.onPress} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.label, styles.link, { color: theme.textSecondary }]}>
                  {item.label}
                </Text>
              </Pressable>
            )}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '500',
    maxWidth: 140,
  },
  link: {
    textDecorationLine: 'underline',
  },
  separator: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
  },
});