import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { colors, shadow, radius } from '../../lib/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
}

export function Card({ children, style, onPress, padding = 16 }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { padding },
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElev,
    borderRadius: radius.xl,
    ...shadow.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.ink100,
    marginLeft: 16,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
