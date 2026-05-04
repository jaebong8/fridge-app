import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from '../components/ui/Icon';
import { FoodGlyph } from '../components/ui/FoodGlyph';
import { colors, type, shadow, spacing } from '../lib/tokens';
import { useAppStore } from '../lib/store/appStore';

const STEPS = [
  {
    title: '냉장고 속을\n한눈에',
    body: '집에 있는 식재료를 사진 한 장으로 등록하고, 유통기한을 자동으로 관리해요.',
    accent: 'mint' as const,
  },
  {
    title: '버리는 음식,\n절반으로',
    body: '임박한 식재료를 알려주고, 가진 재료로 만들 수 있는 레시피를 추천해요.',
    accent: 'amber' as const,
  },
  {
    title: '가족과\n함께 채워요',
    body: '여러 냉장고를 가족과 공유하고, 누가 무엇을 넣고 꺼냈는지 함께 봐요.',
    accent: 'blue' as const,
  },
];

const BG: Record<string, string> = {
  mint:  '#eaf6f1',
  amber: '#fdf5e8',
  blue:  '#eaf0fc',
};
const INK: Record<string, string> = {
  mint:  colors.mint800,
  amber: '#7a4e10',
  blue:  '#2a4080',
};

const SAMPLE_ITEMS = [
  { name: '대파',       color: '#7fc89c' }, { name: '양파',       color: '#e6c97a' },
  { name: '애호박',     color: '#9ec97a' }, { name: '딸기',       color: '#e35e6b' },
  { name: '사과',       color: '#d96a6a' }, { name: '계란',       color: '#f0d57a' },
  { name: '우유',       color: '#e8eef0' }, { name: '두부',       color: '#f3ecd6' },
  { name: '고추장',     color: '#c84a3a' },
];

function Visual0() {
  return (
    <View style={vis.card}>
      <Text style={[type.caption, { color: colors.mint700, marginBottom: 4 }]}>우리집 냉장고</Text>
      <Text style={[type.titleMd, { color: colors.ink900 }]}>32개 식재료</Text>
      <View style={vis.grid}>
        {SAMPLE_ITEMS.map((it) => (
          <FoodGlyph key={it.name} item={it} size={52} radius={14} />
        ))}
      </View>
    </View>
  );
}

function Visual1() {
  return (
    <View style={{ gap: 12, width: 260 }}>
      <View style={[vis.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={18} color="#fff" stroke={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.titleSm, { fontSize: 13, color: colors.ink900 }]}>오늘 안에 드세요</Text>
          <Text style={{ fontSize: 11, color: colors.ink500 }}>딸기 · 애호박</Text>
        </View>
      </View>
      <View style={[vis.card, { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 20 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.mint200, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chef" size={18} color={colors.mint800} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.titleSm, { fontSize: 13, color: colors.ink900 }]}>딸기 요거트 볼</Text>
          <Text style={{ fontSize: 11, color: colors.mint700 }}>5분 · 재료 100% 보유</Text>
        </View>
      </View>
    </View>
  );
}

function Visual2() {
  const members = [
    { name: '지수', color: colors.mint500 },
    { name: '민호', color: '#4a7ac8' },
    { name: '서연', color: '#c86a4a' },
  ];
  return (
    <View style={vis.card}>
      <Text style={[type.caption, { color: '#5b7fcf', marginBottom: 4 }]}>가족 공유</Text>
      <Text style={[type.titleMd, { color: colors.ink900 }]}>우리집 · 3명</Text>
      <View style={{ flexDirection: 'row', marginTop: 14 }}>
        {members.map((m, i) => (
          <View key={m.name} style={[vis.avatar, { backgroundColor: m.color, marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{m.name[0]}</Text>
          </View>
        ))}
      </View>
      <View style={vis.activityRow}>
        <Text style={{ fontSize: 12, color: colors.ink900 }}>
          <Text style={{ fontWeight: '700' }}>민호</Text>
          <Text style={{ color: colors.ink500 }}> 우유 1L 추가 · 방금</Text>
        </Text>
      </View>
    </View>
  );
}

const VISUALS = [Visual0, Visual1, Visual2];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const Visual = VISUALS[step];
  const setHasOnboarded = useAppStore(st => st.setHasOnboarded);

  const finish = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    setHasOnboarded(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: BG[s.accent] }]}>
      <View style={styles.skipRow}>
        <Pressable onPress={finish} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>
      </View>

      <View style={styles.visual}>
        <Visual />
      </View>

      <View style={styles.body}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === step ? INK[s.accent] : 'rgba(0,0,0,0.1)', flex: i === step ? 2 : 1 },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.title, { color: INK[s.accent] }]}>{s.title}</Text>
        <Text style={styles.desc}>{s.body}</Text>
      </View>

      <View style={styles.cta}>
        <Pressable
          onPress={() => step < STEPS.length - 1 ? setStep(step + 1) : finish()}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        >
          <Text style={styles.btnText}>{step < STEPS.length - 1 ? '다음' : '시작하기'}</Text>
          <Icon name="arrow-r" size={16} color="#fff" stroke={2.4} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const vis = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    ...shadow.lg,
    width: 240,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  activityRow: {
    marginTop: 16,
    padding: 10,
    backgroundColor: colors.bgSunken,
    borderRadius: 10,
  },
});

const styles = StyleSheet.create({
  root:    { flex: 1 },
  skipRow: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'flex-end' },
  skipText: { fontSize: 13, fontWeight: '600', color: colors.ink500 },
  visual:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  body:    { paddingHorizontal: 28, paddingBottom: 8 },
  dots:    { flexDirection: 'row', gap: 4, marginBottom: 18 },
  dot:     { height: 4, borderRadius: 2 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  desc: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink700,
  },
  cta: { padding: spacing.xl, paddingBottom: spacing.xxl },
  btn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.ink900,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
