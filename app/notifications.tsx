import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon, FoodGlyph, Pill, Card, Divider } from '../components/ui';
import { useInventoryStore } from '../lib/store/inventoryStore';
import { useAppStore } from '../lib/store/appStore';
import { dayDiff, dDay } from '../lib/date';
import { colors, type, shadow, spacing } from '../lib/tokens';

const NOTIF_ICONS: Record<string, { icon: string; color: string }> = {
  danger: { icon: 'bell',    color: colors.danger },
  warn:   { icon: 'clock',   color: colors.warn   },
  info:   { icon: 'sparkle', color: colors.info   },
  ok:     { icon: 'check',   color: colors.mint600 },
  muted:  { icon: 'trash',   color: colors.ink400  },
};

const FILTERS = [
  { id: 'all',    label: '전체'    },
  { id: 'expire', label: '유통기한' },
  { id: 'family', label: '가족'    },
];

type NotifKind = 'expire' | 'family';
type NotifTone = 'danger' | 'warn' | 'ok' | 'info' | 'muted';

interface Notif {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: string;
  tone: NotifTone;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { items } = useInventoryStore();
  const { activities } = useAppStore();
  const [filter, setFilter] = useState('all');

  const todayExpiring = items
    .filter(i => { const n = dayDiff(i.exp); return n >= 0 && n <= 1; })
    .sort((a, b) => dayDiff(a.exp) - dayDiff(b.exp));

  // 유통기한 알림 생성
  const expireNotifs: Notif[] = items
    .filter(i => dayDiff(i.exp) <= 5)
    .sort((a, b) => dayDiff(a.exp) - dayDiff(b.exp))
    .map(i => {
      const n = dayDiff(i.exp);
      return {
        id: `exp-${i.id}`,
        kind: 'expire',
        title: n <= 0 ? '오늘 만료됩니다' : n === 1 ? '내일 만료 예정' : `${n}일 후 만료`,
        body: `${i.name} · ${i.amount} · ${i.loc}`,
        time: n <= 0 ? '오늘' : `${n}일 후`,
        tone: (n <= 1 ? 'danger' : 'warn') as NotifTone,
      };
    });

  // 가족 활동 알림 생성
  const familyNotifs: Notif[] = activities.slice(0, 10).map((a, i) => ({
    id: `act-${i}`,
    kind: 'family',
    title: `${a.who}님의 활동`,
    body: a.what,
    time: a.when,
    tone: (a.tone === 'ok' ? 'ok' : a.tone === 'info' ? 'info' : 'muted') as NotifTone,
  }));

  const allNotifs: Notif[] = [...expireNotifs, ...familyNotifs];

  const filtered = allNotifs.filter(n => {
    if (filter === 'expire') return n.kind === 'expire';
    if (filter === 'family') return n.kind === 'family';
    return true;
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Icon name="arrow-l" size={18} color={colors.ink700} />
          </Pressable>
          <Text style={[type.titleLg, { flex: 1, color: colors.ink900 }]}>알림</Text>
        </View>

        {/* 오늘 만료 긴급 카드 */}
        {todayExpiring.length > 0 && (
          <View style={styles.sectionPad}>
            <View style={styles.urgentCard}>
              <View style={styles.urgentTitle}>
                <View style={styles.urgentIcon}>
                  <Icon name="bell" size={16} color="#fff" stroke={2.4} />
                </View>
                <Text style={[type.caption, { color: colors.danger }]}>오늘의 긴급</Text>
              </View>
              <Text style={[type.titleMd, { marginTop: 10, color: colors.ink900 }]}>
                오늘 안에 드세요 · {todayExpiring.length}개
              </Text>
              <View style={{ gap: 8, marginTop: 12 }}>
                {todayExpiring.map(item => (
                  <View key={item.id} style={styles.urgentItem}>
                    <FoodGlyph item={item} size={36} radius={10} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.titleSm, { color: colors.ink900 }]}>{item.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.ink500 }}>{item.amount} · {item.loc}</Text>
                    </View>
                    <View style={styles.dDayBadge}>
                      <Text style={styles.dDayText}>{dDay(item.exp)}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Pressable
                  onPress={() => router.push('/(tabs)/recipes')}
                  style={({ pressed }) => [styles.recipeBtn, pressed && { opacity: 0.85 }]}
                >
                  <Icon name="chef" size={14} color="#fff" stroke={2.2} />
                  <Text style={styles.recipeBtnText}>레시피 보기</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* 빈 상태 */}
        {allNotifs.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={[type.titleMd, { color: colors.ink900, marginTop: 12 }]}>모두 신선해요!</Text>
            <Text style={[type.body, { color: colors.ink500, marginTop: 6 }]}>임박한 식재료가 없어요.</Text>
          </View>
        )}

        {/* 필터 */}
        {allNotifs.length > 0 && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContent}>
              {FILTERS.map(f => (
                <Pill key={f.id} active={filter === f.id} onPress={() => setFilter(f.id)}>{f.label}</Pill>
              ))}
            </ScrollView>

            <View style={styles.sectionPad}>
              {filtered.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ color: colors.ink400, fontSize: 14 }}>해당 알림이 없어요.</Text>
                </View>
              ) : (
                <Card padding={0}>
                  {filtered.map((n, i) => (
                    <View key={n.id}>
                      {i > 0 && <Divider />}
                      <NotifRow n={n} />
                    </View>
                  ))}
                </Card>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotifRow({ n }: { n: Notif }) {
  const c = NOTIF_ICONS[n.tone] ?? NOTIF_ICONS.muted;
  return (
    <View style={styles.notifRow}>
      <View style={[styles.notifIcon, { backgroundColor: c.color + '18' }]}>
        <Icon name={c.icon} size={18} color={c.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.titleSm, { fontSize: 14, color: colors.ink900 }]}>{n.title}</Text>
        <Text style={{ fontSize: 13, color: colors.ink500, marginTop: 2 }}>{n.body}</Text>
        <Text style={{ fontSize: 11, color: colors.ink400, marginTop: 4 }}>{n.time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.bg },
  sectionPad: { paddingHorizontal: spacing.xl, marginTop: 8 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: spacing.lg, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgElev,
    alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  pillsContent: { paddingHorizontal: spacing.xl, gap: 8, paddingTop: 12, paddingBottom: 8 },

  urgentCard: {
    backgroundColor: '#fff5f5', borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: '#f5c5c5',
  },
  urgentTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  urgentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 10,
  },
  dDayBadge: { backgroundColor: colors.danger, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  dDayText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  recipeBtn: {
    flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.ink900,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  recipeBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52 },

  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, paddingHorizontal: 16,
  },
  notifIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
