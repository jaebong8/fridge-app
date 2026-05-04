import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { colors } from '../../lib/tokens';

interface PillProps {
  active?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  count?: number;
}

export function Pill({ active = false, onPress, children, count }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active ? styles.active : styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>
        {children}
      </Text>
      {count !== undefined && (
        <Text style={[styles.count, active ? styles.textActive : styles.textInactive]}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  active:   { backgroundColor: colors.ink900 },
  inactive: { backgroundColor: colors.bgChip },
  pressed:  { opacity: 0.75 },
  text:     { fontSize: 13, fontWeight: '600' },
  textActive:   { color: '#fff' },
  textInactive: { color: colors.ink700 },
  count: { fontSize: 11, fontWeight: '600', opacity: 0.7 },
});
