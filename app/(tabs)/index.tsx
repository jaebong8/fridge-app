import { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Icon, FoodGlyph, Card, Divider, RingChart, SectionHeader, ExpiryBadge } from '../../components/ui';
import { useInventoryStore } from '../../lib/store/inventoryStore';
import { useAppStore } from '../../lib/store/appStore';
import { dayDiff, dDay, expiryStatus, todayLabel } from '../../lib/date';
import { colors, type, shadow, spacing } from '../../lib/tokens';
import { Item } from '../../types';

const ACTIVITY_COLORS: Record<string, string> = {
  ok:    colors.mint600,
  info:  colors.info,
  muted: colors.ink400,
};

export default function HomeScreen() {
  const router = useRouter();
  const { items } = useInventoryStore();
  const { currentFridge, fridges, setCurrentFridge, createFridge, userName, showToast, activities } = useAppStore();

  const fridgeSheetRef = useRef<BottomSheet>(null);
  const [fridgeOpen, setFridgeOpen] = useState(false);
  const [newFridgeName, setNewFridgeName] = useState('');
  const [showNewFridgeInput, setShowNewFridgeInput] = useState(false);
  const [creatingFridge, setCreatingFridge] = useState(false);

  const expiringSoon = items
    .map(i => ({ ...i, n: dayDiff(i.exp) }))
    .filter(i => i.n <= 3)
    .sort((a, b) => a.n - b.n);

  const total      = items.length;
  const freshCount = items.filter(i => dayDiff(i.exp) > 5).length;
  const warnCount  = items.filter(i => { const n = dayDiff(i.exp); return n > 2 && n <= 5; }).length;
  const dangerCount = expiringSoon.length;
  const consumeRate = total > 0 ? Math.round((freshCount + warnCount) / total * 100) : 100;

  const topExpiring = expiringSoon.slice(0, 4);

  const openFridgeSheet = () => {
    setFridgeOpen(true);
    setShowNewFridgeInput(false);
    setNewFridgeName('');
    fridgeSheetRef.current?.expand();
  };
  const closeFridgeSheet = () => {
    setFridgeOpen(false);
    setShowNewFridgeInput(false);
    fridgeSheetRef.current?.close();
  };

  const handleCreateFridge = async () => {
    if (!newFridgeName.trim()) return;
    setCreatingFridge(true);
    await createFridge(newFridgeName.trim());
    setCreatingFridge(false);
    setNewFridgeName('');
    setShowNewFridgeInput(false);
    showToast(`${newFridgeName.trim()} 냉장고 추가됨`);
    closeFridgeSheet();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* Greeting */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dateText}>{todayLabel()}</Text>
            <Text style={styles.greetText}>안녕, {userName} 👋</Text>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          >
            <Icon name="bell" size={20} color={colors.ink700} />
            <View style={styles.notifDot} />
          </Pressable>
        </View>

        {/* Fridge picker pill */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: 14 }}>
          <Pressable
            onPress={openFridgeSheet}
            style={({ pressed }) => [styles.fridgePill, pressed && { opacity: 0.75 }]}
          >
            <View style={[styles.fridgeDot, { backgroundColor: currentFridge?.color ?? colors.mint500 }]}>
              <Text style={styles.fridgeDotText}>{(currentFridge?.name ?? '냉장고')[0]}</Text>
            </View>
            <Text style={[type.titleSm, { color: colors.ink900 }]}>{currentFridge?.name ?? '냉장고'}</Text>
            <Icon name="chevron-d" size={16} color={colors.ink500} />
          </Pressable>
        </View>

        {/* Hero ring card */}
        <View style={styles.sectionPad}>
          <Card padding={20}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <RingChart value={consumeRate} size={104} stroke={12} color={colors.mint500} track={colors.mint100}>
                <Text style={styles.ringNum}>{consumeRate}%</Text>
                <Text style={styles.ringSub}>신선</Text>
              </RingChart>
              <View style={{ flex: 1 }}>
                <Text style={[type.caption, { color: colors.mint700 }]}>오늘의 냉장고</Text>
                <Text style={[type.titleMd, { marginTop: 4, lineHeight: 22 }]}>
                  전체 {total}개 중{'\n'}
                  <Text style={{ color: colors.danger }}>{dangerCount}개</Text>가 임박해요
                </Text>
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
                  <StatBadge n={freshCount}  label="신선" color={colors.mint600} />
                  <StatBadge n={warnCount}   label="주의" color={colors.warn} />
                  <StatBadge n={dangerCount} label="임박" color={colors.danger} />
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          <QuickAction icon="scan" label="영수증 스캔" sub="자동 등록" onPress={() => router.push('/add')} />
        </View>

        {/* Expiring soon */}
        <View style={{ marginTop: 16 }}>
          <SectionHeader title="유통기한 임박" action="모두 보기" onAction={() => router.push('/(tabs)/inventory')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
            {expiringSoon.slice(0, 6).map(item => (
              <ExpiringCard key={item.id} item={item} />
            ))}
            {expiringSoon.length === 0 && (
              <View style={styles.emptyExpiring}>
                <Text style={{ fontSize: 14, color: colors.ink400 }}>임박한 재료가 없어요 🎉</Text>
              </View>
            )}
            <View style={{ width: 8 }} />
          </ScrollView>
        </View>

        {/* Recipe */}
        <View style={{ marginTop: 22 }}>
          <SectionHeader title="오늘의 레시피" action="더 보기" onAction={() => router.push('/(tabs)/recipes')} />
          <View style={styles.sectionPad}>
            <Card padding={0} onPress={() => router.push('/(tabs)/recipes')}>
              <View style={[styles.recipeHero, { backgroundColor: '#bfe3c8' }]}>
                <View style={styles.recipeAiBadge}>
                  <Icon name="sparkle" size={11} color={colors.ink900} stroke={2.4} />
                  <Text style={styles.recipeAiText}>AI 추천</Text>
                </View>
                {topExpiring.length > 0 && (
                  <View style={styles.recipeChips}>
                    {topExpiring.map(item => (
                      <View key={item.id} style={styles.recipeChip}>
                        <Text style={styles.recipeChipText}>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ padding: 16 }}>
                <Text style={[type.caption, { color: colors.mint700 }]}>
                  {topExpiring.length > 0 ? `${topExpiring[0].name} 등 임박 재료 활용` : '재료를 추가하면 레시피를 추천해드려요'}
                </Text>
                <Text style={[type.titleMd, { marginTop: 4 }]}>레시피 추천 받기</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <View style={styles.recipeMeta}>
                    <Icon name="sparkle" size={14} color={colors.ink500} />
                    <Text style={styles.recipeMetaText}>AI 기반</Text>
                  </View>
                  <View style={styles.recipeMeta}>
                    <Icon name="leaf" size={14} color={colors.ink500} />
                    <Text style={styles.recipeMetaText}>냉장고 재료 활용</Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        </View>

        {/* Family activity */}
        {activities.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <SectionHeader title="가족 활동" />
            <View style={styles.sectionPad}>
              <Card padding={0}>
                {activities.slice(0, 5).map((a, i) => (
                  <View key={i}>
                    {i > 0 && <Divider />}
                    <ActivityRow {...a} />
                  </View>
                ))}
              </Card>
            </View>
          </View>
        )}

        {/* Stats quick link */}
        <View style={[styles.sectionPad, { marginTop: 16 }]}>
          <Pressable
            onPress={() => router.push('/stats')}
            style={({ pressed }) => [styles.statsCard, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.statsIcon}>
              <Icon name="chart" size={20} color={colors.mint700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.titleSm, { color: colors.ink900 }]}>이번 달 인사이트</Text>
              <Text style={{ fontSize: 12, color: colors.ink500, marginTop: 2 }}>절약 금액 · 소비율 · 폐기 통계</Text>
            </View>
            <Icon name="chevron-r" size={18} color={colors.ink400} />
          </Pressable>
        </View>

      </ScrollView>

      {/* Fridge picker bottom sheet */}
      {fridgeOpen && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFridgeSheet} />
      )}
      <BottomSheet
        ref={fridgeSheetRef}
        index={-1}
        snapPoints={['55%']}
        enablePanDownToClose
        onClose={() => setFridgeOpen(false)}
        backgroundStyle={{ borderRadius: 28 }}
        handleIndicatorStyle={{ backgroundColor: colors.ink200 }}
      >
        <BottomSheetView style={{ flex: 1, padding: 20 }}>
          <Text style={[type.titleMd, { marginBottom: 16 }]}>냉장고 선택</Text>
          {fridges.map(f => (
            <Pressable
              key={f.id}
              onPress={() => { setCurrentFridge(f.id); closeFridgeSheet(); }}
              style={({ pressed }) => [
                styles.fridgeRow,
                currentFridge?.id === f.id && styles.fridgeRowActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={[styles.fridgeAvatar, { backgroundColor: f.color ?? colors.mint500 }]}>
                <Text style={styles.fridgeAvatarText}>{f.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.titleSm, { color: colors.ink900 }]}>{f.name}</Text>
                <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 2 }}>
                  {currentFridge?.id === f.id ? `${items.length}개` : '—'} · {f.members.map(m => m.name).join(', ')}
                </Text>
              </View>
              {currentFridge?.id === f.id && (
                <Icon name="check" size={20} color={colors.mint600} stroke={2.4} />
              )}
            </Pressable>
          ))}

          {/* New fridge */}
          {showNewFridgeInput ? (
            <View style={styles.newFridgeInputRow}>
              <TextInput
                value={newFridgeName}
                onChangeText={setNewFridgeName}
                placeholder="냉장고 이름"
                placeholderTextColor={colors.ink300}
                style={styles.newFridgeInput}
                autoFocus
                onSubmitEditing={handleCreateFridge}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleCreateFridge}
                disabled={creatingFridge || !newFridgeName.trim()}
                style={[styles.newFridgeConfirmBtn, (!newFridgeName.trim() || creatingFridge) && { opacity: 0.5 }]}
              >
                <Text style={styles.newFridgeConfirmText}>만들기</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowNewFridgeInput(true)}
              style={({ pressed }) => [styles.newFridgeBtn, pressed && { opacity: 0.75 }]}
            >
              <Icon name="plus" size={16} color={colors.ink500} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink500 }}>새 냉장고 만들기</Text>
            </Pressable>
          )}
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function StatBadge({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: '700', color, lineHeight: 18 }}>{n}</Text>
      <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 3 }}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, sub, onPress }: { icon: string; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
    >
      <View style={styles.quickIcon}>
        <Icon name={icon} size={20} color={colors.mint700} />
      </View>
      <View>
        <Text style={[type.titleSm, { color: colors.ink900 }]}>{label}</Text>
        <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 1 }}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function ExpiringCard({ item }: { item: Item & { n: number } }) {
  const s = expiryStatus(item.exp);
  const bg = s.tone === 'danger' ? colors.dangerSoft : colors.warnSoft;
  const fg = s.tone === 'danger' ? colors.danger : colors.warn;
  return (
    <View style={styles.expiringCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <FoodGlyph item={item} size={42} radius={12} />
        <View style={[styles.dDayBadge, { backgroundColor: bg }]}>
          <Text style={[styles.dDayText, { color: fg }]}>{dDay(item.exp)}</Text>
        </View>
      </View>
      <Text style={[type.titleSm, { marginTop: 10, color: colors.ink900 }]}>{item.name}</Text>
      <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 2 }}>{item.amount} · {item.loc}</Text>
    </View>
  );
}

function ActivityRow({ who, what, when, tone }: { who: string; what: string; when: string; tone: 'ok' | 'info' | 'muted' }) {
  const c = ACTIVITY_COLORS[tone];
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityAvatar, { backgroundColor: c + '20' }]}>
        <Text style={[styles.activityAvatarText, { color: c }]}>{who[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13 }}>
          <Text style={{ fontWeight: '700', color: colors.ink900 }}>{who}</Text>
          <Text style={{ color: colors.ink500 }}> · {what}</Text>
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.ink400 }}>{when}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  sectionPad: { paddingHorizontal: spacing.xl, marginTop: 0 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 8,
  },
  dateText:  { fontSize: 13, color: colors.ink500 },
  greetText: { ...type.titleXl, color: colors.ink900, marginTop: 2 },

  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgElev,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.sm, position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 10, right: 12,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 2, borderColor: colors.bgElev,
  },

  fridgePill: {
    height: 36, paddingLeft: 4, paddingRight: 14,
    backgroundColor: colors.bgElev, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center',
    gap: 8, alignSelf: 'flex-start', ...shadow.sm,
  },
  fridgeDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fridgeDotText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  ringNum: { fontSize: 26, fontWeight: '700', color: colors.ink900, letterSpacing: -0.5 },
  ringSub: { fontSize: 12, color: colors.ink500, marginTop: -2 },

  quickGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.xl, marginTop: 8 },
  quickCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgElev, borderRadius: 18, padding: 14, ...shadow.sm,
  },
  quickIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center',
  },

  hScrollContent: { paddingLeft: spacing.xl, gap: 10 },
  emptyExpiring: {
    width: 200, height: 96,
    alignItems: 'center', justifyContent: 'center',
  },
  expiringCard: {
    width: 132, backgroundColor: colors.bgElev,
    borderRadius: 18, padding: 12, ...shadow.sm,
  },
  dDayBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  dDayText: { fontSize: 10, fontWeight: '700' },

  recipeHero: {
    height: 132, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 16, justifyContent: 'flex-end',
  },
  recipeAiBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  recipeAiText: { fontSize: 11, fontWeight: '700', color: colors.ink900 },
  recipeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recipeChip:  { backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  recipeChipText: { fontSize: 11, fontWeight: '600', color: colors.ink700 },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recipeMetaText: { fontSize: 13, color: colors.ink500 },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, paddingHorizontal: 16,
  },
  activityAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activityAvatarText: { fontSize: 12, fontWeight: '700' },

  statsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgElev, borderRadius: 18, padding: 14, ...shadow.sm,
  },
  statsIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.mint50, alignItems: 'center', justifyContent: 'center',
  },

  fridgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, backgroundColor: colors.bgElev,
    marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent', ...shadow.sm,
  },
  fridgeRowActive: { backgroundColor: colors.mint50, borderColor: colors.mint300 },
  fridgeAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fridgeAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  newFridgeBtn: {
    height: 50, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.ink200, borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  newFridgeInputRow: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    height: 50,
  },
  newFridgeInput: {
    flex: 1, height: 50, paddingHorizontal: 14,
    backgroundColor: colors.bgElev, borderRadius: 14,
    fontSize: 14, color: colors.ink900, ...shadow.sm,
  },
  newFridgeConfirmBtn: {
    height: 50, paddingHorizontal: 18, borderRadius: 14,
    backgroundColor: colors.ink900, alignItems: 'center', justifyContent: 'center',
  },
  newFridgeConfirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
