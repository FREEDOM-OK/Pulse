import { StyleSheet, View } from 'react-native';

import type { HomeCardId } from '@/db/types';

export interface CartoonArtProps {
  kind: HomeCardId;
  /** 画布边长，内部图形按比例缩放。 */
  size?: number;
  color?: string;
}

/**
 * 卡片的卡通线性描边图案（PRDv1.2.2 第 3.7 节）。
 * 只用 View 组合，纯描边、内部透明，不依赖任何图形库。
 */
export function CartoonArt({ kind, size = 72, color = '#ffffff' }: CartoonArtProps) {
  const stroke = { borderColor: color, borderWidth: 2 } as const;
  const box = { width: size, height: size } as const;

  if (kind === 'games') {
    // 哑铃：两个圆角矩形 + 中间的横杆。
    return (
      <View style={[styles.canvas, box]}>
        <View style={styles.rowCenter}>
          <View
            style={[
              stroke,
              {
                width: size * 0.22,
                height: size * 0.52,
                borderRadius: size * 0.08,
              },
            ]}
          />
          <View style={[stroke, { width: size * 0.26, height: 2, borderWidth: 0, backgroundColor: color }]} />
          <View
            style={[
              stroke,
              {
                width: size * 0.22,
                height: size * 0.52,
                borderRadius: size * 0.08,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  if (kind === 'fitness') {
    // 手柄：圆角矩形 + 两个圆形摇杆。
    return (
      <View style={[styles.canvas, box]}>
        <View
          style={[
            stroke,
            {
              width: size * 0.9,
              height: size * 0.52,
              borderRadius: size * 0.18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: size * 0.08,
            },
          ]}>
          <View style={[stroke, { width: size * 0.18, height: size * 0.18, borderRadius: size * 0.09 }]} />
          <View style={[stroke, { width: size * 0.18, height: size * 0.18, borderRadius: size * 0.09 }]} />
        </View>
      </View>
    );
  }

  if (kind === 'calendar') {
    // 日历：矩形 + 顶条 + 三个小方块。
    return (
      <View style={[styles.canvas, box]}>
        <View
          style={[
            stroke,
            {
              width: size * 0.78,
              height: size * 0.7,
              borderRadius: size * 0.1,
              overflow: 'hidden',
            },
          ]}>
          <View style={[styles.topBar, { height: size * 0.16, backgroundColor: color }]} />
          <View style={[styles.dotsRow, { paddingTop: size * 0.12 }]}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  stroke,
                  {
                    width: size * 0.12,
                    height: size * 0.12,
                    borderRadius: size * 0.02,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // 课本：两个斜矩形 + 书脊。
  return (
    <View style={[styles.canvas, box]}>
      <View style={styles.rowCenter}>
        <View
          style={[
            stroke,
            {
              width: size * 0.34,
              height: size * 0.62,
              borderRadius: size * 0.06,
              transform: [{ rotate: '-8deg' }],
            },
          ]}
        />
        <View
          style={[
            stroke,
            {
              width: size * 0.06,
              height: size * 0.66,
              borderRadius: size * 0.03,
              marginHorizontal: size * 0.04,
            },
          ]}
        />
        <View
          style={[
            stroke,
            {
              width: size * 0.34,
              height: size * 0.62,
              borderRadius: size * 0.06,
              transform: [{ rotate: '8deg' }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});