import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { colors, type, spacing } from '../../lib/tokens';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({ title, action, onAction, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {action && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.actionText}>{action}</Text>
          <Icon name="chevron-r" size={14} color={colors.mint500} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    ...type.titleMd,
    color: colors.ink900,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mint500,
  },
});
