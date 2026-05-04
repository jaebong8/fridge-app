import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { colors } from '../../lib/tokens';
import { ItemLocation } from '../../types';

interface LocationBadgeProps {
  loc: ItemLocation;
}

const MAP: Record<ItemLocation, { icon: string; color: string }> = {
  냉장: { icon: 'fridge', color: colors.mint700 },
  냉동: { icon: 'snow',   color: '#3a6bb3' },
  실온: { icon: 'sun',    color: '#b07530' },
};

export function LocationBadge({ loc }: LocationBadgeProps) {
  const c = MAP[loc] ?? MAP['냉장'];
  return (
    <View style={styles.row}>
      <Icon name={c.icon} size={12} color={c.color} stroke={2} />
      <Text style={[styles.text, { color: c.color }]}>{loc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
