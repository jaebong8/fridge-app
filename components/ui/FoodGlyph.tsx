import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FoodGlyphProps {
  item: { name: string; color: string };
  size?: number;
  radius?: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function FoodGlyph({ item, size = 48, radius = 14 }: FoodGlyphProps) {
  const bg = hexToRgba(item.color, 0.25);
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: radius, backgroundColor: bg }]}>
      <Text style={[styles.initial, { fontSize: size * 0.42, color: item.color }]}>
        {item.name.slice(0, 1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initial: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
