import { StyleSheet, View } from 'react-native';

interface StatusDotProps {
  /** 有记录时传入颜色；没有记录时传 undefined，只占位不画点。 */
  color?: string;
  /** 直径，默认 4。 */
  size?: number;
}

/**
 * 日期下面的「有记录」小圆点。
 *
 * 注意：必须在有颜色时**首次挂载**。先渲染透明、再改 backgroundColor 的写法，
 * 部分机型（Android）会把圆角背景更新成直角，表现就是「第一次进去是小方块，
 * 刷新一下才变回小圆点」。所以这里用固定尺寸的占位容器，点本身按需挂载 / 卸载。
 */
export function StatusDot({ color, size = 4 }: StatusDotProps) {
  return (
    <View style={[styles.slot, { width: size, height: size }]}>
      {color ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: color,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});