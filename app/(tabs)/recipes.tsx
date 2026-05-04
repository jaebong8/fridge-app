import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Icon, Pill, Card } from '../../components/ui';
import { useInventoryStore } from '../../lib/store/inventoryStore';
import { useShoppingStore } from '../../lib/store/shoppingStore';
import { useAppStore } from '../../lib/store/appStore';
import { useRecipeStore, GeneratedRecipe } from '../../lib/store/recipeStore';
import { colors, type, shadow, spacing } from '../../lib/tokens';
import { useState } from 'react';

export default function RecipesScreen() {
  const { items } = useInventoryStore();
  const { addItem: addShoppingItem } = useShoppingStore();
  const { currentFridgeId } = useAppStore();
  const { recipes, loading, error, fetchRecipes, reset } = useRecipeStore();

  const [activeTab, setActiveTab] = useState('match');
  const [selected, setSelected] = useState<GeneratedRecipe | null>(null);
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (currentFridgeId) fetchRecipes(items, currentFridgeId);
  }, [items, currentFridgeId]);

  const visible = activeTab === 'quick'
    ? recipes.filter(r => r.minutes <= 10)
    : recipes;

  const hero = recipes[0] ?? null;
  const fullCount = recipes.filter(r => r.pct === 100).length;

  const openRecipe = (r: GeneratedRecipe) => {
    setSelected(r);
    sheetRef.current?.expand();
  };
  const closeRecipe = () => {
    sheetRef.current?.close();
    setTimeout(() => setSelected(null), 300);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[type.titleXl, { color: colors.ink900 }]}>레시피</Text>
            <Text style={[type.bodySm, { color: colors.ink500, marginTop: 4 }]}>
              {loading ? 'AI가 레시피를 추천 중...' : `재료 100% 보유 ${fullCount}개`}
            </Text>
          </View>
          <Pressable
            onPress={() => { reset(); fetchRecipes(items, currentFridgeId); }}
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          >
            <Icon name="sparkle" size={18} color={colors.mint600} />
          </Pressable>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.mint500} />
            <Text style={[type.titleSm, { color: colors.ink900, marginTop: 16 }]}>
              냉장고 재료 분석 중
            </Text>
            <Text style={{ fontSize: 13, color: colors.ink500, marginTop: 6 }}>
              AI가 최적의 레시피를 찾고 있어요
            </Text>
          </View>
        )}

        {/* Error */}
        {!loading && !!error && (
          <View style={[styles.loadingBox, { gap: 12 }]}>
            <Icon name="bell" size={28} color={colors.danger} />
            <Text style={[type.titleSm, { color: colors.ink900 }]}>레시피를 불러오지 못했어요</Text>
            <Pressable
              onPress={() => { reset(); fetchRecipes(items, currentFridgeId); }}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </Pressable>
          </View>
        )}

        {/* Empty inventory */}
        {!loading && !error && items.length === 0 && (
          <View style={styles.loadingBox}>
            <Text style={{ fontSize: 44 }}>🥬</Text>
            <Text style={[type.titleMd, { color: colors.ink900, marginTop: 14 }]}>재료를 추가해보세요</Text>
            <Text style={{ fontSize: 14, color: colors.ink500, marginTop: 6, textAlign: 'center' }}>
              냉장고에 재료를 넣으면{'\n'}AI가 레시피를 추천해드려요
            </Text>
          </View>
        )}

        {/* Content */}
        {!loading && !error && recipes.length > 0 && (
          <>
            {/* Hero */}
            {hero && (
              <View style={{ paddingHorizontal: spacing.xl, marginBottom: 4 }}>
                <Pressable
                  onPress={() => openRecipe(hero)}
                  style={({ pressed }) => [
                    styles.heroCard,
                    { backgroundColor: hero.accent || '#bfe3c8' },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.heroBadge}>
                    <Icon name="sparkle" size={11} color={colors.mint800} stroke={2.4} />
                    <Text style={styles.heroBadgeText}>
                      {hero.matchedItems.some(i => {
                        const { dayDiff } = require('../../lib/date');
                        return dayDiff(i.exp) <= 3;
                      }) ? '임박 식재료 활용' : 'AI 추천 1위'}
                    </Text>
                  </View>
                  <Text style={[type.titleLg, { marginTop: 10, color: colors.ink900 }]}>{hero.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.mint800, fontWeight: '600', marginTop: 4 }}>
                    {hero.whyText}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <Text style={styles.heroMeta}>{hero.minutes}분</Text>
                    <Text style={styles.heroMeta}>·</Text>
                    <Text style={styles.heroMeta}>{hero.haveCount}/{hero.needs.length} 재료 보유</Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsContent}
            >
              <Pill active={activeTab === 'match'} onPress={() => setActiveTab('match')}>재료 매치순</Pill>
              <Pill active={activeTab === 'quick'} onPress={() => setActiveTab('quick')}>10분 이내</Pill>
            </ScrollView>

            {/* List */}
            <View style={{ paddingHorizontal: spacing.xl, marginTop: 12, gap: 12 }}>
              {visible.map(r => (
                <RecipeCard key={r.id} r={r} onPress={() => openRecipe(r)} />
              ))}
              {visible.length === 0 && (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ color: colors.ink400, fontSize: 14 }}>10분 이내 레시피가 없어요</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['85%']}
        enablePanDownToClose
        onClose={() => setSelected(null)}
        backgroundStyle={{ borderRadius: 28 }}
        handleIndicatorStyle={{ backgroundColor: colors.ink200 }}
      >
        {selected && (
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <RecipeDetail
              r={selected}
              onClose={closeRecipe}
              onAddShopping={(name) =>
                addShoppingItem(name, '1개', currentFridgeId, '레시피 · ' + selected.name)
              }
            />
          </BottomSheetScrollView>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

function RecipeCard({ r, onPress }: { r: GeneratedRecipe; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.recipeCard, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.recipeThumb, { backgroundColor: r.accent || '#e8f4ec' }]}>
        <View style={styles.minBadge}>
          <Text style={styles.minBadgeText}>{r.minutes}분</Text>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.titleSm, { fontSize: 15, color: colors.ink900 }]}>{r.name}</Text>
        <Text style={{ fontSize: 11, color: colors.mint700, fontWeight: '600', marginTop: 2 }}>
          {r.whyText}
        </Text>
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.matchBar}>
            <View style={[styles.matchFill, { width: `${r.pct}%` as any }]} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink500 }}>
            {r.haveCount}/{r.needs.length}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function RecipeDetail({ r, onClose, onAddShopping }: {
  r: GeneratedRecipe;
  onClose: () => void;
  onAddShopping: (name: string) => void;
}) {
  return (
    <View style={{ paddingHorizontal: spacing.xl }}>
      <View style={[styles.detailHero, { backgroundColor: r.accent || '#e8f4ec' }]}>
        <View style={styles.detailLevelBadge}>
          <Text style={styles.detailLevelText}>{r.level} · {r.minutes}분</Text>
        </View>
        <View style={styles.aiTag}>
          <Icon name="sparkle" size={10} color={colors.mint700} stroke={2.4} />
          <Text style={styles.aiTagText}>AI 추천</Text>
        </View>
      </View>
      <Text style={[type.titleLg, { color: colors.ink900 }]}>{r.name}</Text>
      <Text style={[type.bodySm, { color: colors.ink500, marginTop: 4 }]}>{r.whyText}</Text>

      <Text style={[type.caption, { marginTop: 18, color: colors.ink400 }]}>
        재료 ({r.needs.length + r.extras.length})
      </Text>
      <View style={{ gap: 6, marginTop: 8 }}>
        {r.matchedItems.map(item => (
          <View key={item.id} style={styles.ingredientHave}>
            <Icon name="check" size={16} color={colors.mint600} stroke={2.4} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink900 }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.ink500 }}>{item.amount} 보유</Text>
          </View>
        ))}
        {r.missingNeeds.map(m => (
          <Pressable
            key={m}
            onPress={() => onAddShopping(m)}
            style={({ pressed }) => [styles.ingredientMiss, pressed && { opacity: 0.75 }]}
          >
            <Icon name="cart" size={16} color={colors.info} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink900 }}>{m}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.info }}>+ 쇼핑 추가</Text>
          </Pressable>
        ))}
        {r.extras.map(m => (
          <Pressable
            key={m}
            onPress={() => onAddShopping(m)}
            style={({ pressed }) => [styles.ingredientExtra, pressed && { opacity: 0.75 }]}
          >
            <Icon name="cart" size={16} color={colors.ink400} />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink700 }}>{m}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink400 }}>있으면 좋아요</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[type.caption, { marginTop: 22, color: colors.ink400 }]}>조리 순서</Text>
      <View style={{ gap: 12, marginTop: 10 }}>
        {r.steps.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 21, paddingTop: 2, color: colors.ink700 }}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
        onPress={onClose}
      >
        <Text style={styles.startBtnText}>요리 시작하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 8,
  },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.mint50,
    alignItems: 'center', justifyContent: 'center',
  },
  pillsContent: { paddingHorizontal: spacing.xl, gap: 8, paddingTop: 14, paddingBottom: 4 },

  loadingBox: {
    backgroundColor: colors.bgElev, borderRadius: 22, padding: 48,
    marginHorizontal: spacing.xl, marginTop: 12,
    alignItems: 'center', ...shadow.sm,
  },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 12, backgroundColor: colors.ink900,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  heroCard: { borderRadius: 22, padding: 18, overflow: 'hidden' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, alignSelf: 'flex-start',
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: colors.mint800 },
  heroMeta: { fontSize: 12, fontWeight: '600', color: colors.mint800 },

  recipeCard: {
    backgroundColor: colors.bgElev, borderRadius: 18, padding: 14,
    flexDirection: 'row', gap: 14, alignItems: 'center', ...shadow.sm,
  },
  recipeThumb: {
    width: 72, height: 72, borderRadius: 14, overflow: 'hidden',
    justifyContent: 'flex-end', alignItems: 'flex-end', padding: 4,
  },
  minBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  minBadgeText: { fontSize: 10, fontWeight: '700', color: colors.ink700 },
  matchBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.ink100, overflow: 'hidden' },
  matchFill: { height: '100%', backgroundColor: colors.mint500 },

  detailHero: {
    height: 160, borderRadius: 18, marginVertical: 8, overflow: 'hidden',
    justifyContent: 'space-between', alignItems: 'flex-end',
    padding: 12, flexDirection: 'row',
  },
  detailLevelBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    alignSelf: 'flex-start',
  },
  detailLevelText: { fontSize: 11, fontWeight: '700', color: colors.ink700 },
  aiTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    alignSelf: 'flex-start',
  },
  aiTagText: { fontSize: 10, fontWeight: '700', color: colors.mint700 },

  ingredientHave: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 8, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: colors.mint50,
  },
  ingredientMiss: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 8, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: colors.infoSoft,
  },
  ingredientExtra: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 8, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: colors.bgSunken,
  },

  stepNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.ink900,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  startBtn: {
    marginTop: 20, height: 52, borderRadius: 16, backgroundColor: colors.ink900,
    alignItems: 'center', justifyContent: 'center',
  },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
