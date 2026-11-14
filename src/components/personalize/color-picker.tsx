import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { HOME_BG_PRESETS } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { hexToHsl, hslToHex, normalizeHex, readableInk } from '@/lib/color';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** 背景条上的分段色（没有 gradient 库，用分段近似彩虹）。 */
  colors: string[];
  onChange: (value: number) => void;
}

/** 一条可拖动的滑条：轨道是分段渐变，圆头滑块跟随手指。 */
function Slider({ label, value, min, max, colors, onChange }: SliderProps) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const rangeRef = useRef({ min, max });
  rangeRef.current = { min, max };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event: GestureResponderEvent) => commit(event),
      onPanResponderMove: (event: GestureResponderEvent) => commit(event),
    })
  ).current;

  /** 手指的 locationX 换算成 0~1，再映射到 min~max。 */
  function commit(event: GestureResponderEvent) {
    const trackWidth = widthRef.current;
    if (trackWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / trackWidth));
    const { min: low, max: high } = rangeRef.current;
    onChangeRef.current(low + ratio * (high - low));
  }

  const ratio = max === min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const knobLeft = Math.max(0, Math.min(width - 18, width * ratio - 9));

  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {Math.round(value)}
        </ThemedText>
      </View>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        style={styles.track}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width;
          widthRef.current = next;
          setWidth(next);
        }}
        {...responder.panHandlers}>
        <View pointerEvents="none" style={styles.trackFill}>
          {colors.map((color, index) => (
            <View key={`stop-${index}-${color}`} style={[styles.trackSegment, { backgroundColor: color }]} />
          ))}
        </View>
        {width > 0 ? (
          <View pointerEvents="none" style={[styles.knob, { left: knobLeft }]} />
        ) : null}
      </View>
    </View>
  );
}

interface ColorPickerPanelProps {
  color: string;
  onChange: (hex: string) => void;
}

/** 自由调色盘：实时色块 + Hex 输入 + 色相/饱和度/明度三条滑条 + 快捷色点。 */
export function ColorPickerPanel({ color, onChange }: ColorPickerPanelProps) {
  const theme = useTheme();
  const hsl = useMemo(() => hexToHsl(color), [color]);
  const [draft, setDraft] = useState(color.toUpperCase());

  useEffect(() => {
    setDraft(color.toUpperCase());
  }, [color]);

  const hueColors = useMemo(
    () => Array.from({ length: 24 }, (_, index) => hslToHex(index * 15, 100, 50)),
    []
  );
  const saturationColors = useMemo(
    () => Array.from({ length: 12 }, (_, index) => hslToHex(hsl.h, (index * 100) / 11, hsl.l)),
    [hsl.h, hsl.l]
  );
  const lightnessColors = useMemo(
    () => Array.from({ length: 12 }, (_, index) => hslToHex(hsl.h, hsl.s, 15 + (index * 83) / 11)),
    [hsl.h, hsl.s]
  );

  return (
    <View style={styles.panel}>
      <View style={styles.previewRow}>
        <View style={[styles.swatch, { backgroundColor: color, borderColor: theme.background }]} />
        <View style={styles.hexBox}>
          <ThemedText type="small" themeColor="textSecondary">
            HEX
          </ThemedText>
          <TextInput
            accessibilityLabel="十六进制颜色"
            value={draft}
            onChangeText={(text) => {
              const next = text.startsWith('#') ? text : `#${text}`;
              setDraft(next.toUpperCase());
              const normalized = normalizeHex(next);
              if (normalized) onChange(normalized);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            style={[styles.hexInput, { color: theme.text }]}
          />
        </View>
      </View>

      <Slider
        label="色相"
        value={hsl.h}
        min={0}
        max={360}
        colors={hueColors}
        onChange={(h) => onChange(hslToHex(h, hsl.s, hsl.l))}
      />
      <Slider
        label="饱和度"
        value={Math.round(hsl.s * 100)}
        min={0}
        max={100}
        colors={saturationColors}
        onChange={(s) => onChange(hslToHex(hsl.h, s / 100, hsl.l))}
      />
      <Slider
        label="明度"
        value={Math.round(hsl.l * 100)}
        min={15}
        max={98}
        colors={lightnessColors}
        onChange={(l) => onChange(hslToHex(hsl.h, hsl.s, l / 100))}
      />

      <View style={styles.presets}>
        {HOME_BG_PRESETS.map((preset, index) => {
          const active = preset.color.toLowerCase() === color.toLowerCase();
          return (
            <Pressable
              key={`preset-${index}-${preset.color}`}
              accessibilityRole="button"
              accessibilityLabel={`快捷颜色 ${preset.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => onChange(preset.color)}
              style={[
                styles.preset,
                {
                  backgroundColor: preset.color,
                  borderColor: active ? readableInk(preset.color) : 'rgba(0,0,0,0.12)',
                  borderWidth: active ? 2 : 1,
                },
              ]}
            />
          );
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.presetHint}>
        快捷色点：冰川蓝 · 薄荷青 · 樱花粉 · 奶油杏 · 薰衣草 · 迷雾灰 · 深空蓝 · 暗夜紫
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingVertical: Space.two,
    gap: Space.three,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.three,
  },
  swatch: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
  },
  hexBox: {
    flex: 1,
    gap: 4,
  },
  hexInput: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingVertical: 6,
  },
  sliderRow: {
    gap: 6,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  trackSegment: {
    flex: 1,
  },
  knob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.35)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.two,
  },
  preset: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  presetHint: {
    marginTop: -4,
  },
});