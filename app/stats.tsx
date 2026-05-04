import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon, Card, Divider, RingChart, MiniBars, SectionHeader } from '../components/ui';
import { useInventoryStore } from '../lib/store/inventoryStore';
import { useAppStore } from '../lib/store/appStore';
import { useStatsStore } from '../lib/store/statsStore';
import { dayDiff } from '../lib/date';
import { colors, type, shadow, spacing } from '../lib/tokens';

export default function StatsScreen() {
  const router = useRouter();
  const { items } = useInventoryStore();
  const { currentFridgeId, currentFridge } = useAppStore();
  const { consumedCount, discardedCount, consumeRate, topItems, wastedItems, daily, loading, fetchStats } = useStatsStore();

  useEffect(() => {
    if (currentFridgeId) fetchStats(currentFridgeId);
  }, [currentFridgeId]);

  // 현재 재고 기반 통계
  const total = items.length;
  const freshCount  = items.filter(i => dayDiff(i.exp) > 5).length;
  const warnCount   = items.filter(i => { const n = dayDiff(i.exp); return n > 2 && n <= 5; }).length;
  const dangerCount = items.filter(i => dayDiff(i.exp) <= 2).length;

  const topCount = Math.max(...(topItems.map(x => x.count)), 1);
  const hasData = consumedCount + discardedCount > 0;

  const today = new Date();
  const monthStart = `${today.getMonth() + 1}월 1일`;
  const monthEnd = '오늘';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
            <Icon name="arrow-l" size={18} color={colors.ink700} />
          </Pressable>
          <View>
            <Text style={[type.titleXl, { color: colors.ink900 }]}>인사이트</Text>
            <Text style={{ fontSize: 13, color: colors.ink500, marginTop: 2 }}>
              지난 30일 · {currentFridge?.name ?? '냉장고'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <ActivityIndicator color={colors.mint500} />
          </View>
        ) : (
          <>
            {/* 현재 재고 현황 */}
            <View style={styles.sectionPad}>
              <Card padding={20}>
                <Text style={[type.caption, { color: colors.mint700 }]}>현재 재고 현황</Text>
                <Text style={[type.display, { color: colors.ink900, marginTop: 6 }]}>{total}개</Text>
                <Text style={{ fontSize: 14, color: colors.ink500, marginTop: 4 }}>등록된 식재료</Text>
                <View style={{ flexDirection: 'row', gap: 20, marginTop: 16 }}>
                  <StatBadge value={freshCount}  label="신선" color={colors.mint600} />
                  <StatBadge value={warnCount}   label="주의" color={colors.warn} />
                  <StatBadge value={dangerCount} label="임박" color={colors.danger} />
                </View>
                {daily.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <MiniBars
                      values={daily}
                      height={48}
                      color={colors.mint200}
                      activeColor={colors.mint600}
                      activeIdx={daily.length - 1}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={{ fontSize: 10, color: colors.ink400 }}>{monthStart}</Text>
                      <Text style={{ fontSize: 10, color: colors.ink400 }}>{monthEnd}</Text>
                    </View>
                  </View>
                )}
              </Card>
            </View>

            {/* 소비율 + 폐기 */}
            {hasData && (
              <View style={styles.twoCol}>
                <Card padding={16} style={{ flex: 1 }}>
                  <RingChart value={consumeRate} size={72} stroke={9} color={colors.mint500} track={colors.mint100}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink900 }}>{consumeRate}%</Text>
                  </RingChart>
                  <Text style={[type.titleSm, { marginTop: 10, color: colors.ink900 }]}>소비율</Text>
                  <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 2 }}>
                    {consumedCount}개 소비 · {discardedCount}개 폐기
                  </Text>
                </Card>
                <Card padding={16} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Icon name="trash" size={18} color={colors.danger} />
                    <Text style={{ fontSize: 26, fontWeight: '700', color: colors.danger, letterSpacing: -0.5 }}>
                      {discardedCount}개
                    </Text>
                  </View>
                  <Text style={[type.titleSm, { marginTop: 14, color: colors.ink900 }]}>버린 식재료</Text>
                  <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 2 }}>이번 달 폐기</Text>
                </Card>
              </View>
            )}

            {/* 자주 소비한 재료 */}
            {topItems.length > 0 && (
              <View style={styles.sectionPad}>
                <SectionHeader title="자주 소비한 식재료" style={{ paddingHorizontal: 0, marginBottom: 12 }} />
                <Card padding={16}>
                  <View style={{ gap: 12 }}>
                    {topItems.map(it => (
                      <View key={it.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: it.color }} />
                        <Text style={{ fontSize: 13, fontWeight: '600', width: 64, color: colors.ink900 }}>{it.name}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${(it.count / topCount) * 100}%` as any }]} />
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right', color: colors.ink700 }}>
                          {it.count}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </View>
            )}

            {/* 폐기 목록 */}
            {wastedItems.length > 0 && (
              <View style={styles.sectionPad}>
                <SectionHeader title="이번 달 폐기" style={{ paddingHorizontal: 0, marginBottom: 12 }} />
                <Card padding={0}>
                  {wastedItems.map((w, i) => (
                    <View key={`${w.name}-${i}`}>
                      {i > 0 && <Divider />}
                      <View style={styles.wasteRow}>
                        <View style={styles.wasteIcon}>
                          <Icon name="trash" size={16} color={colors.danger} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[type.titleSm, { fontSize: 14, color: colors.ink900 }]}>{w.name}</Text>
                          <Text style={{ fontSize: 11, color: colors.ink500 }}>유통기한 경과</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: colors.ink400 }}>{w.date}</Text>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* 데이터 없을 때 */}
            {!hasData && (
              <View style={{ alignItems: 'center', paddingTop: 48 }}>
                <Text style={{ fontSize: 44 }}>📊</Text>
                <Text style={[type.titleMd, { color: colors.ink900, marginTop: 14 }]}>아직 데이터가 없어요</Text>
                <Text style={[type.body, { color: colors.ink500, marginTop: 6 }]}>
                  식재료를 추가하고 소비하면 통계가 쌓여요.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View>
      <Text style={{ fontSize: 22, fontWeight: '700', color, lineHeight: 22 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.bg },
  sectionPad: { paddingHorizontal: spacing.xl, marginTop: 8 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgElev,
    alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  twoCol: { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.xl, marginTop: 8 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.ink100, overflow: 'hidden' },
  barFill:  { height: '100%', backgroundColor: colors.ink700, borderRadius: 4 },
  wasteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, paddingHorizontal: 16,
  },
  wasteIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center',
  },
});
