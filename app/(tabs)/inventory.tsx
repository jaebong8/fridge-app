import { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Icon, FoodGlyph, Pill, Card, Divider, ExpiryBadge, LocationBadge } from '../../components/ui';
import { useInventoryStore } from '../../lib/store/inventoryStore';
import { useAppStore } from '../../lib/store/appStore';
import { dayDiff } from '../../lib/date';
import { colors, type, shadow, spacing } from '../../lib/tokens';
import { ItemCategory, ItemLocation, Item } from '../../types';

const CATEGORIES: (ItemCategory | '전체')[] = ['전체', '채소', '과일', '육류', '단백질', '유제품', '소스', '곡물'];
const ALL_CATEGORIES: ItemCategory[] = ['채소', '과일', '육류', '단백질', '유제품', '소스', '곡물'];
const LOCATIONS: (ItemLocation | '전체')[] = ['전체', '냉장', '냉동', '실온'];
const ALL_LOCATIONS: ItemLocation[] = ['냉장', '냉동', '실온'];
const LOC_ICONS: Record<ItemLocation, string> = { '냉장': 'fridge', '냉동': 'snow', '실온': 'sun' };
const EXP_DAYS = [1, 3, 5, 7, 10, 14, 30];
const SORTS = ['expiry', 'name', 'recent'] as const;
const SORT_LABELS: Record<string, string> = { expiry: '유통기한순', name: '이름순', recent: '최근 추가순' };

export default function InventoryScreen() {
  const { items, removeItem, discardItem, deleteItem, updateItem } = useInventoryStore();
  const { showToast } = useAppStore();

  const [cat, setCat]   = useState<ItemCategory | '전체'>('전체');
  const [loc, setLoc]   = useState<ItemLocation | '전체'>('전체');
  const [sort, setSort] = useState<'expiry' | 'name' | 'recent'>('expiry');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [q, setQ]       = useState('');

  // Sheet state
  const sheetRef = useRef<BottomSheet>(null);
  const [selectedItem, setSelectedItem]     = useState<Item | null>(null);
  const [editName, setEditName]             = useState('');
  const [editAmount, setEditAmount]         = useState('');
  const [editLoc, setEditLoc]               = useState<ItemLocation>('냉장');
  const [editCategory, setEditCategory]     = useState<ItemCategory>('채소');
  const [editDays, setEditDays]             = useState(7);
  const [saving, setSaving]                 = useState(false);

  const filtered = items
    .filter(i => cat === '전체' || i.category === cat)
    .filter(i => loc === '전체' || i.loc === loc)
    .filter(i => !q || i.name.includes(q))
    .sort((a, b) => {
      if (sort === 'expiry')  return dayDiff(a.exp) - dayDiff(b.exp);
      if (sort === 'name')    return a.name.localeCompare(b.name);
      if (sort === 'recent')  return new Date(b.added).getTime() - new Date(a.added).getTime();
      return 0;
    });

  const groups = [
    { key: 'danger', label: '⏰ 곧 만료', items: filtered.filter(i => dayDiff(i.exp) <= 2) },
    { key: 'warn',   label: '주의',       items: filtered.filter(i => { const n = dayDiff(i.exp); return n > 2 && n <= 5; }) },
    { key: 'ok',     label: '신선',       items: filtered.filter(i => dayDiff(i.exp) > 5) },
  ];

  const cycleLoc  = () => setLoc(LOCATIONS[(LOCATIONS.indexOf(loc) + 1) % LOCATIONS.length]);
  const cycleSort = () => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length]);

  const openItemSheet = (item: Item) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditAmount(item.amount);
    setEditLoc(item.loc);
    setEditCategory(item.category);
    setEditDays(Math.max(1, dayDiff(item.exp)));
    sheetRef.current?.expand();
  };

  const closeSheet = () => {
    sheetRef.current?.close();
    setTimeout(() => setSelectedItem(null), 300);
  };

  const handleSave = async () => {
    if (!selectedItem || !editName.trim()) return;
    setSaving(true);
    const exp = new Date();
    exp.setDate(exp.getDate() + editDays);
    await updateItem(selectedItem.id, {
      name: editName.trim(),
      amount: editAmount,
      loc: editLoc,
      category: editCategory,
      exp: exp.toISOString().slice(0, 10),
    });
    setSaving(false);
    showToast('수정 완료');
    closeSheet();
  };

  const handleConsume = async () => {
    if (!selectedItem) return;
    const name = selectedItem.name;
    closeSheet();
    await removeItem(selectedItem.id);
    showToast(`${name} 소비 완료`);
  };

  const handleDiscard = async () => {
    if (!selectedItem) return;
    const name = selectedItem.name;
    closeSheet();
    await discardItem(selectedItem.id);
    showToast(`${name} 폐기됨`);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    closeSheet();
    await deleteItem(selectedItem.id);
    showToast('삭제됨');
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />,
    [],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Text style={[type.titleXl, { color: colors.ink900 }]}>재고</Text>
          <Text style={[type.bodySm, { color: colors.ink500, marginTop: 4 }]}>
            전체 {items.length}개 · {filtered.length}개 표시 중
          </Text>
        </View>

        <View style={styles.searchRow}>
          <Icon name="search" size={18} color={colors.ink400} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="대파, 우유, 두부…"
            placeholderTextColor={colors.ink300}
            style={styles.searchInput}
          />
          <Pressable onPress={() => setView(v => v === 'list' ? 'grid' : 'list')}>
            <Icon name={view === 'list' ? 'box' : 'sort'} size={18} color={colors.ink500} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
          style={{ marginTop: 14 }}
        >
          {CATEGORIES.map(c => (
            <Pill key={c} active={cat === c} onPress={() => setCat(c)} count={c !== '전체' ? items.filter(i => i.category === c).length : undefined}>
              {c}
            </Pill>
          ))}
        </ScrollView>

        <View style={styles.filterRow}>
          <FilterChip icon="fridge" label={loc === '전체' ? '위치' : loc} onPress={cycleLoc} />
          <FilterChip icon="sort"  label={SORT_LABELS[sort]}              onPress={cycleSort} />
        </View>

        <View style={{ paddingHorizontal: spacing.xl, marginTop: 8 }}>
          {view === 'list' ? (
            <View style={{ gap: 18 }}>
              {groups.map(g => g.items.length > 0 && (
                <View key={g.key}>
                  <Text style={[type.caption, { color: colors.ink400, marginBottom: 8 }]}>
                    {g.label} · {g.items.length}
                  </Text>
                  <Card padding={0}>
                    {g.items.map((item, i) => (
                      <View key={item.id}>
                        {i > 0 && <Divider />}
                        <InvRow item={item} onPress={() => openItemSheet(item)} />
                      </View>
                    ))}
                  </Card>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map(item => (
                <InvCard key={item.id} item={item} onPress={() => openItemSheet(item)} />
              ))}
            </View>
          )}

          {filtered.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 36 }}>🥬</Text>
              <Text style={[type.titleMd, { color: colors.ink900, marginTop: 12 }]}>
                {q ? '검색 결과가 없어요' : '재고가 없어요'}
              </Text>
              <Text style={{ fontSize: 14, color: colors.ink500, marginTop: 6 }}>
                {q ? '다른 이름으로 검색해보세요' : '식재료를 추가해보세요'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Item detail / edit sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['70%', '92%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ borderRadius: 28 }}
        handleIndicatorStyle={{ backgroundColor: colors.ink200 }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
          {selectedItem && (
            <>
              {/* Sheet header */}
              <View style={styles.sheetHeader}>
                <Pressable onPress={closeSheet} style={styles.sheetCloseBtn}>
                  <Icon name="x" size={16} color={colors.ink700} />
                </Pressable>
                <Text style={[type.titleSm, { color: colors.ink900, flex: 1, textAlign: 'center' }]}>재료 수정</Text>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.sheetSaveBtn, saving && { opacity: 0.5 }]}
                >
                  <Text style={styles.sheetSaveBtnText}>저장</Text>
                </Pressable>
              </View>

              {/* Item identity */}
              <View style={styles.sheetItemRow}>
                <FoodGlyph item={selectedItem} size={56} radius={16} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SheetField label="이름">
                    <BottomSheetTextInput
                      value={editName}
                      onChangeText={setEditName}
                      style={styles.sheetInput}
                      placeholderTextColor={colors.ink300}
                    />
                  </SheetField>
                  <SheetField label="수량">
                    <BottomSheetTextInput
                      value={editAmount}
                      onChangeText={setEditAmount}
                      style={styles.sheetInput}
                      placeholderTextColor={colors.ink300}
                    />
                  </SheetField>
                </View>
              </View>

              {/* Category */}
              <SheetField label="카테고리">
                <View style={styles.chipRow}>
                  {ALL_CATEGORIES.map(c => (
                    <Pressable
                      key={c}
                      onPress={() => setEditCategory(c)}
                      style={[styles.chip, editCategory === c && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, editCategory === c && { color: '#fff' }]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </SheetField>

              {/* Location */}
              <SheetField label="보관 위치">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {ALL_LOCATIONS.map(l => (
                    <Pressable
                      key={l}
                      onPress={() => setEditLoc(l)}
                      style={[styles.locBtn, editLoc === l && styles.locBtnActive]}
                    >
                      <Icon name={LOC_ICONS[l]} size={14} color={editLoc === l ? '#fff' : colors.ink700} />
                      <Text style={[styles.locBtnText, editLoc === l && { color: '#fff' }]}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
              </SheetField>

              {/* Expiry */}
              <SheetField label={`유통기한 · ${editDays}일 후`}>
                <View style={styles.sliderCard}>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${Math.min((editDays / 30) * 100, 100)}%` as any }]} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 10 }}>
                    {EXP_DAYS.map(d => (
                      <Pressable
                        key={d}
                        onPress={() => setEditDays(d)}
                        style={[styles.dayBtn, editDays === d && styles.dayBtnActive]}
                      >
                        <Text style={[styles.dayBtnText, editDays === d && { color: '#fff' }]}>{d}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </SheetField>

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleConsume}
                  style={({ pressed }) => [styles.actionBtn, styles.actionConsume, pressed && { opacity: 0.85 }]}
                >
                  <Icon name="check" size={16} color="#fff" stroke={2.4} />
                  <Text style={styles.actionBtnText}>소비 완료</Text>
                </Pressable>
                <Pressable
                  onPress={handleDiscard}
                  style={({ pressed }) => [styles.actionBtn, styles.actionDiscard, pressed && { opacity: 0.85 }]}
                >
                  <Icon name="trash" size={16} color={colors.danger} />
                  <Text style={[styles.actionBtnText, { color: colors.danger }]}>폐기</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => [styles.actionBtn, styles.actionDelete, pressed && { opacity: 0.85 }]}
                >
                  <Icon name="x" size={16} color={colors.ink500} />
                  <Text style={[styles.actionBtnText, { color: colors.ink500 }]}>삭제</Text>
                </Pressable>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function FilterChip({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, pressed && { opacity: 0.7 }]}
    >
      <Icon name={icon} size={13} color={colors.ink700} />
      <Text style={styles.filterText}>{label}</Text>
      <Icon name="chevron-d" size={12} color={colors.ink700} />
    </Pressable>
  );
}

function InvRow({ item, onPress }: { item: Item; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.invRow, pressed && { backgroundColor: colors.bgSunken }]}
    >
      <FoodGlyph item={item} size={42} radius={12} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[type.titleSm, { color: colors.ink900 }]}>{item.name}</Text>
          <LocationBadge loc={item.loc} />
        </View>
        <Text style={{ fontSize: 12, color: colors.ink500, marginTop: 2 }}>
          {item.amount} · {item.added.slice(5).replace('-', '/')} 추가
        </Text>
      </View>
      <ExpiryBadge exp={item.exp} compact />
    </Pressable>
  );
}

function InvCard({ item, onPress }: { item: Item; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.invCard, pressed && { opacity: 0.8 }]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <FoodGlyph item={item} size={56} radius={14} />
        <ExpiryBadge exp={item.exp} compact />
      </View>
      <Text style={[type.titleSm, { fontSize: 15, marginTop: 10, color: colors.ink900 }]}>{item.name}</Text>
      <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 2 }}>{item.amount}</Text>
      <View style={{ marginTop: 8 }}>
        <LocationBadge loc={item.loc} />
      </View>
    </Pressable>
  );
}

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.sheetFieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 12 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgElev, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: spacing.xl, ...shadow.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink900 },
  pillsContent: { paddingHorizontal: spacing.xl, gap: 8 },
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: spacing.xl, paddingVertical: 8,
  },
  filterChip: {
    height: 32, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: colors.bgElev,
    flexDirection: 'row', alignItems: 'center', gap: 5, ...shadow.sm,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.ink700 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  invRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, paddingHorizontal: 14,
  },
  invCard: {
    width: '47.5%', backgroundColor: colors.bgElev,
    borderRadius: 16, padding: 12, ...shadow.sm,
  },

  /* sheet */
  sheetBody: { paddingHorizontal: 20, paddingBottom: 40 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 20,
  },
  sheetCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetSaveBtn: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 999, backgroundColor: colors.ink900,
  },
  sheetSaveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  sheetItemRow: {
    flexDirection: 'row', gap: 14,
    backgroundColor: colors.bgElev, borderRadius: 18,
    padding: 14, marginBottom: 16, ...shadow.sm,
  },
  sheetFieldLabel: {
    fontSize: 11, fontWeight: '600', color: colors.ink500,
    marginBottom: 8, paddingLeft: 2,
  },
  sheetInput: {
    height: 40, paddingHorizontal: 12,
    backgroundColor: colors.bgSunken, borderRadius: 10,
    fontSize: 14, color: colors.ink900,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, backgroundColor: colors.bgElev, ...shadow.sm,
  },
  chipActive: { backgroundColor: colors.mint600 },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.ink700 },

  locBtn: {
    flex: 1, height: 40, borderRadius: 12,
    backgroundColor: colors.bgElev,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4, ...shadow.sm,
  },
  locBtnActive: { backgroundColor: colors.mint600 },
  locBtnText: { fontSize: 13, fontWeight: '700', color: colors.ink700 },

  sliderCard: {
    backgroundColor: colors.bgElev, borderRadius: 14,
    padding: 14, ...shadow.sm,
  },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: colors.ink100, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: colors.mint600, borderRadius: 3 },
  dayBtn: {
    flex: 1, paddingVertical: 4, borderRadius: 8,
    alignItems: 'center', backgroundColor: 'transparent',
  },
  dayBtnActive: { backgroundColor: colors.mint600 },
  dayBtnText: { fontSize: 11, fontWeight: '600', color: colors.ink500 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1, height: 50, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  actionConsume: { backgroundColor: colors.mint600 },
  actionDiscard: { backgroundColor: colors.dangerSoft },
  actionDelete:  { backgroundColor: colors.bgSunken },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
