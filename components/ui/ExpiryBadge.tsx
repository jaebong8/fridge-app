import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { dDay, expiryStatus } from '../../lib/date';
import { colors } from '../../lib/tokens';

interface ExpiryBadgeProps {
  exp: string;
  compact?: boolean;
}

export function ExpiryBadge({ exp, compact = false }: ExpiryBadgeProps) {
  const s = expiryStatus(exp);
  const colorMap = {
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warn:   { bg: colors.warnSoft,   fg: colors.warn   },
    ok:     { bg: colors.mint100,    fg: colors.mint700 },
  };
  const c = colorMap[s.tone];
  const text = compact ? dDay(exp) : `${dDay(exp)} · ${s.label}`;

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
