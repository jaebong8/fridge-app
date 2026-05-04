import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../lib/tokens';

interface MiniBarsProps {
  values: number[];
  height?: number;
  color?: string;
  activeColor?: string;
  activeIdx?: number;
  max?: number;
}

export function MiniBars({
  values,
  height = 56,
  color = colors.mint300,
  activeColor = colors.mint600,
  activeIdx,
  max,
}: MiniBarsProps) {
  const m = max ?? Math.max(...values, 1);
  return (
    <View style={[styles.container, { height }]}>
      {values.map((v, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: Math.max((v / m) * height, 4),
              backgroundColor: i === activeIdx ? activeColor : color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 4,
  },
});
