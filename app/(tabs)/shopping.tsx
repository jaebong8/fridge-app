import { useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Card, Divider } from '../../components/ui';
import { useShoppingStore } from '../../lib/store/shoppingStore';
import { useAppStore } from '../../lib/store/appStore';
import { useInventoryStore } from '../../lib/store/inventoryStore';
import { colors, type, shadow, spacing } from '../../lib/tokens';
import { ShoppingItem } from '../../types';

const PRICE_ESTIMATES: Record<string, number> = {
  '채소': 2500, '과일': 4000, '육류': 8000,
  '단백질': 5000, '유제품': 3500, '소스': 4000, '곡물': 3000,
};
const DEFAULT_PRICE = 3500;

export default function ShoppingScreen() {
  const { items, toggleItem, addItem, removeItem } = useShoppingStore();
  const { currentFridgeId, activities } = useAppStore();
  const inventoryItems = useInventoryStore(s => s.items);

  const [showAddInput, setShowAddInput] = useState(false);
  const [newItemName, setNewItemName]   = useState('');
  const addInputRef = useRef<TextInput>(null);

  const todo = items.filter(i => !i.done);
  const done = items.filter(i =>  i.done);

  const totalEst = todo.reduce((sum, it) => {
    const matchedInv = inventoryItems.find(i => it.name.includes(i.name) || i.name.includes(it.name));
    const price = matchedInv ? (PRICE_ESTIMATES[matchedInv.category] ?? DEFAULT_PRICE) : DEFAULT_PRICE;
    return sum + price;
  }, 0);

  const smartSuggestions = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const a of activities) {
      if (a.action === 'consume') {
        freq[a.itemName] = (freq[a.itemName] ?? 0) + 1;
      }
    }
    const inList      = new Set(items.map(i => i.name));
    const inInventory = new Set(inventoryItems.map(i => i.name));

    const fromActivity = Object.entries(freq)
      .filter(([name]) => !inList.has(name) && !inInventory.has(name))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, why: `${count}번 소비한 재료` }));

    if (fromActivity.length > 0) return fromActivity;

    return [
      { name: '계란',   why: '자주 쓰는 재료' },
      { name: '우유',   why: '냉장고 필수템' },
      { name: '양파',   why: '자주 쓰는 재료' },
      { name: '두부',   why: '단백질 보충' },
    ].filter(s => !inList.has(s.name) && !inInventory.has(s.name)).slice(0, 3);
  }, [activities, items, inventoryItems]);

  const openNearbyStore = () => {
    Linking.openURL('https://map.kakao.com/link/search/마트').catch(() =>
      Linking.openURL('https://www.google.com/maps/search/마트+근처/'),
    );
  };

  const handleShowAdd = () => {
    setShowAddInput(true);
    setNewItemName('');
    setTimeout(() => addInputRef.current?.focus(), 80);
  };

  const handleConfirmAdd = async () => {
    if (!newItemName.trim()) { setShowAddInput(false); return; }
    await addItem(newItemName.trim(), '1개', currentFridgeId);
    setNewItemName('');
    setShowAddInput(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Text style={[type.titleXl, { color: colors.ink900 }]}>쇼핑 리스트</Text>
          <Text style={[type.bodySm, { color: colors.ink500, marginTop: 4 }]}>
            {todo.length}개 남음
          </Text>
        </View>

        {/* Summary card */}
        <View style={styles.sectionPad}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCircle} />
            <View style={styles.summaryContent}>
              <View>
                <Text style={styles.summaryLabel}>총 예상 금액</Text>
                <Text style={styles.summaryAmount}>₩{totalEst.toLocaleString()}</Text>
                <Text style={styles.summaryCount}>{todo.length}개 항목 기준</Text>
              </View>
              <Pressable
                onPress={openNearbyStore}
                style={({ pressed }) => [styles.martBtn, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.martBtnText}>마트 찾기</Text>
                <Icon name="arrow-r" size={12} color={colors.mint900} stroke={2.4} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Smart suggestions */}
        {smartSuggestions.length > 0 && (
          <View style={{ paddingTop: 14 }}>
            <Text style={[type.caption, { paddingHorizontal: spacing.xl, marginBottom: 8, color: colors.ink400 }]}>
              자동 추천
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestContent}>
              {smartSuggestions.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => addItem(s.name, '1개', currentFridgeId, '자동 추천')}
                  style={({ pressed }) => [styles.suggestCard, pressed && { opacity: 0.75 }]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[type.titleSm, { fontSize: 13, color: colors.ink900 }]}>{s.name}</Text>
                    <Icon name="plus" size={16} color={colors.mint500} stroke={2.4} />
                  </View>
                  <Text style={{ fontSize: 10, color: colors.ink500, marginTop: 6 }}>{s.why}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Todo list */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: 20 }}>
          <Text style={[type.caption, { color: colors.ink400, marginBottom: 10 }]}>살 것 ({todo.length})</Text>
          <Card padding={0}>
            {todo.map((it, i) => (
              <View key={it.id}>
                {i > 0 && <Divider />}
                <ShopRow it={it} onToggle={() => toggleItem(it.id)} onDelete={() => removeItem(it.id)} />
              </View>
            ))}

            {/* Inline add input */}
            {showAddInput && (
              <View>
                {todo.length > 0 && <Divider />}
                <View style={styles.inlineAddRow}>
                  <View style={[styles.checkbox, { borderColor: colors.ink200 }]} />
                  <TextInput
                    ref={addInputRef}
                    value={newItemName}
                    onChangeText={setNewItemName}
                    placeholder="항목 이름 입력"
                    placeholderTextColor={colors.ink300}
                    style={styles.inlineAddInput}
                    onSubmitEditing={handleConfirmAdd}
                    returnKeyType="done"
                    blurOnSubmit={false}
                  />
                  <Pressable onPress={handleConfirmAdd} style={styles.inlineConfirmBtn}>
                    <Icon name="check" size={14} color="#fff" stroke={2.5} />
                  </Pressable>
                  <Pressable onPress={() => setShowAddInput(false)} style={styles.inlineCancelBtn}>
                    <Icon name="x" size={14} color={colors.ink500} />
                  </Pressable>
                </View>
              </View>
            )}

            {todo.length === 0 && !showAddInput && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.ink400, fontSize: 14 }}>살 항목이 없어요 🎉</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Done list */}
        {done.length > 0 && (
          <View style={{ paddingHorizontal: spacing.xl, marginTop: 20 }}>
            <Text style={[type.caption, { color: colors.ink400, marginBottom: 10 }]}>구매 완료 ({done.length})</Text>
            <Card padding={0}>
              {done.map((it, i) => (
                <View key={it.id}>
                  {i > 0 && <Divider />}
                  <ShopRow it={it} onToggle={() => toggleItem(it.id)} onDelete={() => removeItem(it.id)} />
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Add button */}
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <Pressable
            onPress={handleShowAdd}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
          >
            <Icon name="plus" size={18} color={colors.ink700} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink700 }}>직접 추가</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShopRow({ it, onToggle, onDelete }: { it: ShoppingItem; onToggle: () => void; onDelete: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.shopRow, pressed && { backgroundColor: colors.bgSunken }]}
    >
      <View style={[styles.checkbox, it.done && styles.checkboxDone]}>
        {it.done && <Icon name="check" size={14} color="#fff" stroke={3} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.shopName, it.done && styles.shopNameDone]}>{it.name}</Text>
        <Text style={styles.shopFrom}>{it.qty} · {it.from}</Text>
      </View>
      {it.urgent && !it.done && (
        <View style={styles.urgentBadge}>
          <Text style={styles.urgentText}>긴급</Text>
        </View>
      )}
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
      >
        <Icon name="x" size={14} color={colors.ink400} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.bg },
  header:     { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 8 },
  sectionPad: { paddingHorizontal: spacing.xl, marginTop: 8 },

  summaryCard: {
    backgroundColor: colors.ink900, borderRadius: 22, padding: 18, overflow: 'hidden',
  },
  summaryCircle: {
    position: 'absolute', right: -20, top: -20,
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#1a3528',
  },
  summaryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel:  { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  summaryAmount: { fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: -0.7, marginTop: 4 },
  summaryCount:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  martBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.mint400,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  martBtnText: { fontSize: 12, fontWeight: '700', color: colors.mint900 },

  suggestContent: { paddingHorizontal: spacing.xl, gap: 10 },
  suggestCard: {
    minWidth: 144, padding: 12, borderRadius: 14,
    backgroundColor: colors.bgElev,
    borderWidth: 1, borderColor: colors.ink200, borderStyle: 'dashed',
    ...shadow.sm,
  },

  shopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, paddingHorizontal: 16,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 8,
    borderWidth: 2, borderColor: colors.ink200,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: colors.mint600, borderColor: colors.mint600 },
  shopName:     { fontSize: 15, fontWeight: '600', color: colors.ink900 },
  shopNameDone: { color: colors.ink300, textDecorationLine: 'line-through' },
  shopFrom:     { fontSize: 11, color: colors.ink400, marginTop: 2 },
  urgentBadge:  { backgroundColor: colors.dangerSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  urgentText:   { fontSize: 10, fontWeight: '700', color: colors.danger },
  deleteBtn:    { padding: 4 },

  inlineAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, paddingHorizontal: 16,
  },
  inlineAddInput: {
    flex: 1, height: 36, fontSize: 15,
    color: colors.ink900,
  },
  inlineConfirmBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.mint600,
    alignItems: 'center', justifyContent: 'center',
  },
  inlineCancelBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },

  addBtn: {
    height: 50, borderRadius: 14,
    backgroundColor: colors.bgElev,
    borderWidth: 1, borderColor: colors.ink200, borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, ...shadow.sm,
  },
});
