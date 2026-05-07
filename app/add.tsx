import { useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Icon } from '../components/ui';
import { useInventoryStore } from '../lib/store/inventoryStore';
import { useAppStore } from '../lib/store/appStore';
import { colors, type, shadow } from '../lib/tokens';
import { ItemCategory, ItemLocation } from '../types';

type Mode = 'scan' | 'manual';

const MODES = [
  { id: 'scan' as Mode,   label: '영수증', icon: 'scan' },
  { id: 'manual' as Mode, label: '직접',   icon: 'edit' },
];

const CATEGORIES: ItemCategory[] = ['채소', '과일', '육류', '단백질', '유제품', '소스', '곡물'];
const LOCATIONS: ItemLocation[]  = ['냉장', '냉동', '실온'];
const LOC_ICONS: Record<ItemLocation, string> = { '냉장': 'fridge', '냉동': 'snow', '실온': 'sun' };

export default function AddScreen() {
  const router = useRouter();
  const { addItem } = useInventoryStore();
  const { currentFridgeId, showToast } = useAppStore();
  const [mode, setMode] = useState<Mode>('scan');

  const [name, setName]         = useState('');
  const [amount, setAmount]     = useState('1');
  const [loc, setLoc]           = useState<ItemLocation>('냉장');
  const [category, setCategory] = useState<ItemCategory>('채소');
  const defaultExp = new Date();
  defaultExp.setDate(defaultExp.getDate() + 7);
  const [expDate, setExpDate]   = useState(defaultExp);
  const [showPicker, setShowPicker] = useState(false);

  const handleManualAdd = async () => {
    if (!name.trim()) return;
    await addItem({
      name: name.trim(),
      category,
      amount: amount || '1',
      loc,
      exp: expDate.toISOString().slice(0, 10),
      fridgeId: currentFridgeId,
    });
    showToast(`${name} 추가 완료`);
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
        >
          <Icon name="x" size={20} color={colors.ink700} />
        </Pressable>
        <Text style={[type.titleMd, { color: colors.ink900 }]}>식재료 추가</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.modeSel}>
        {MODES.map(m => (
          <Pressable
            key={m.id}
            onPress={() => setMode(m.id)}
            style={({ pressed }) => [
              styles.modeBtn,
              mode === m.id && styles.modeBtnActive,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Icon name={m.icon} size={18} color={mode === m.id ? colors.ink900 : colors.ink500} />
            <Text style={[styles.modeBtnText, mode === m.id && { color: colors.ink900 }]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modeBody} showsVerticalScrollIndicator={false}>
        {mode === 'scan' && (
          <ReceiptMode
            addItem={addItem}
            currentFridgeId={currentFridgeId}
            showToast={showToast}
            onDone={() => router.back()}
          />
        )}
        {mode === 'manual' && (
          <ManualMode
            name={name} setName={setName}
            amount={amount} setAmount={setAmount}
            loc={loc} setLoc={setLoc}
            category={category} setCategory={setCategory}
            expDate={expDate}
            showPicker={showPicker}
            setShowPicker={setShowPicker}
            onDateChange={(date: Date) => setExpDate(date)}
          />
        )}
      </ScrollView>

      {mode === 'manual' && (
        <View style={styles.cta}>
          <Pressable
            onPress={handleManualAdd}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
          >
            <Icon name="check" size={18} color="#fff" stroke={2.4} />
            <Text style={styles.ctaBtnText}>냉장고에 넣기</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ───────── Gemini receipt analysis ───────── */

interface DetectedItem {
  name: string;
  amount: string;
  category: ItemCategory;
  loc: ItemLocation;
  selected: boolean;
}

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

async function analyzeReceipt(base64: string): Promise<DetectedItem[]> {
  const prompt =
    '이 영수증 이미지에서 식재료 또는 음식 항목만 찾아주세요.\n' +
    '다음 JSON 배열 형식으로만 응답해주세요 (마크다운, 설명 없이 순수 JSON만):\n' +
    '[{"name":"식재료명","amount":"수량(예:1개,500g)","category":"채소|과일|육류|단백질|유제품|소스|곡물 중 하나","loc":"냉장|냉동|실온 중 하나"}]\n' +
    '식재료가 없으면 []';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { data: base64, mimeType: 'image/jpeg' } },
          { text: prompt },
        ]}],
      }),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? '영수증 분석 실패');
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const match = text.match(/\[[\s\S]*\]/);
  const raw = JSON.parse(match ? match[0] : '[]') as Array<{ name: string; amount: string; category: string; loc: string }>;

  const validCategories = new Set<string>(['채소', '과일', '육류', '단백질', '유제품', '소스', '곡물']);
  const validLocations  = new Set<string>(['냉장', '냉동', '실온']);

  return raw.map(it => ({
    name:     it.name,
    amount:   it.amount || '1개',
    category: (validCategories.has(it.category) ? it.category : '채소') as ItemCategory,
    loc:      (validLocations.has(it.loc)  ? it.loc  : '냉장') as ItemLocation,
    selected: true,
  }));
}

/* ───────── ReceiptMode ───────── */

function ReceiptMode({
  addItem,
  currentFridgeId,
  showToast,
  onDone,
}: {
  addItem: any;
  currentFridgeId: string | null;
  showToast: (msg: string) => void;
  onDone: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase]   = useState<'camera' | 'loading' | 'review'>('camera');
  const [items, setItems]   = useState<DetectedItem[]>([]);
  const [error, setError]   = useState('');
  const [adding, setAdding] = useState(false);

  const capture = async () => {
    if (!cameraRef.current) return;
    setError('');
    setPhase('loading');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo?.base64) throw new Error('사진 촬영에 실패했어요.');
      const detected = await analyzeReceipt(photo.base64);
      if (detected.length === 0) {
        setError('식재료를 찾지 못했어요. 영수증이 잘 보이게 다시 찍어주세요.');
        setPhase('camera');
      } else {
        setItems(detected);
        setPhase('review');
      }
    } catch (e: any) {
      setError(e?.message ?? '오류가 발생했어요. 다시 시도해주세요.');
      setPhase('camera');
    }
  };

  const toggle = (idx: number) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it)));

  const handleAdd = async () => {
    const selected = items.filter(it => it.selected);
    if (!selected.length) return;
    setAdding(true);
    const exp = new Date();
    exp.setDate(exp.getDate() + 7);
    for (const it of selected) {
      await addItem({
        name:     it.name,
        category: it.category,
        amount:   it.amount,
        loc:      it.loc,
        exp:      exp.toISOString().slice(0, 10),
        fridgeId: currentFridgeId,
      });
    }
    showToast(`${selected.length}개 추가 완료`);
    onDone();
  };

  if (!permission) {
    return (
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
        <ActivityIndicator color={colors.mint500} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permBox}>
        <View style={styles.permIconWrap}>
          <Icon name="camera" size={32} color={colors.mint600} />
        </View>
        <Text style={[type.titleMd, { color: colors.ink900, marginTop: 16 }]}>카메라 권한 필요</Text>
        <Text style={{ fontSize: 14, color: colors.ink500, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          {'영수증을 스캔하려면\n카메라 접근 권한이 필요해요.'}
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [styles.permBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.permBtnText}>권한 허용</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'loading') {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={colors.mint500} />
        <Text style={[type.titleSm, { color: colors.ink900, marginTop: 20 }]}>영수증 분석 중...</Text>
        <Text style={{ fontSize: 13, color: colors.ink500, marginTop: 6 }}>AI가 식재료를 찾고 있어요</Text>
      </View>
    );
  }

  if (phase === 'review') {
    const selectedCount = items.filter(it => it.selected).length;
    return (
      <View style={{ gap: 10 }}>
        <View style={styles.reviewHeader}>
          <Text style={[type.titleMd, { color: colors.ink900 }]}>{items.length}개 감지됨</Text>
          <Text style={{ fontSize: 13, color: colors.ink500, marginTop: 2 }}>추가할 항목을 선택해주세요</Text>
        </View>

        {items.map((it, i) => (
          <Pressable
            key={i}
            onPress={() => toggle(i)}
            style={[styles.detectedItem, !it.selected && styles.detectedItemOff]}
          >
            <View style={[styles.checkBox, it.selected && styles.checkBoxOn]}>
              {it.selected && <Icon name="check" size={11} color="#fff" stroke={2.5} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.ink900 }, !it.selected && { color: colors.ink400 }]}>
                {it.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.ink400, marginTop: 1 }}>{it.amount} · {it.loc}</Text>
            </View>
            <View style={[styles.catBadge, !it.selected && { backgroundColor: colors.bgSunken }]}>
              <Text style={[styles.catBadgeText, !it.selected && { color: colors.ink400 }]}>{it.category}</Text>
            </View>
          </Pressable>
        ))}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Pressable
            onPress={() => { setPhase('camera'); setError(''); }}
            style={({ pressed }) => [styles.retakeBtn, pressed && { opacity: 0.8 }]}
          >
            <Icon name="scan" size={14} color={colors.ink700} />
            <Text style={styles.retakeBtnText}>다시 찍기</Text>
          </Pressable>
          <Pressable
            onPress={handleAdd}
            disabled={adding || selectedCount === 0}
            style={[styles.addAllBtn, (adding || selectedCount === 0) && { opacity: 0.5 }]}
          >
            {adding
              ? <ActivityIndicator size="small" color="#fff" />
              : (
                <>
                  <Icon name="check" size={14} color="#fff" stroke={2.4} />
                  <Text style={styles.addAllBtnText}>{selectedCount}개 냉장고에 넣기</Text>
                </>
              )
            }
          </Pressable>
        </View>
      </View>
    );
  }

  /* camera phase */
  return (
    <View style={{ gap: 14 }}>
      {!!error && (
        <View style={styles.errorBox}>
          <Icon name="bell" size={14} color={colors.danger} />
          <Text style={{ fontSize: 13, color: colors.danger, flex: 1 }}>{error}</Text>
        </View>
      )}

      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.scanOverlay}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </CameraView>
        <Text style={styles.cameraHint}>영수증 전체가 보이도록 맞춰주세요</Text>
      </View>

      <Pressable
        onPress={capture}
        style={({ pressed }) => [styles.captureBtn, pressed && { opacity: 0.85 }]}
      >
        <Icon name="scan" size={18} color="#fff" />
        <Text style={styles.captureBtnText}>스캔하기</Text>
      </Pressable>
    </View>
  );
}

/* ───────── ManualMode ───────── */

function ManualMode({ name, setName, amount, setAmount, loc, setLoc, category, setCategory, expDate, showPicker, setShowPicker, onDateChange }: any) {
  const formatDate = (d: Date) =>
    `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

  const diffDays = Math.round((expDate.getTime() - Date.now()) / 86400000);
  const diffLabel = diffDays === 0 ? '오늘' : diffDays > 0 ? `${diffDays}일 후` : `${Math.abs(diffDays)}일 전`;

  return (
    <View style={{ gap: 12 }}>
      <Field label="이름">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="예: 양파"
          placeholderTextColor={colors.ink300}
          style={styles.input}
        />
      </Field>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="수량">
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="1개"
              placeholderTextColor={colors.ink300}
              style={styles.input}
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="카테고리">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {CATEGORIES.map(c => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.catChip, category === c && styles.catChipActive]}
                  >
                    <Text style={[styles.catText, category === c && { color: '#fff' }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Field>
        </View>
      </View>

      <Field label="보관 위치">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {LOCATIONS.map(l => (
            <Pressable
              key={l}
              onPress={() => setLoc(l)}
              style={({ pressed }) => [styles.locBtn, loc === l && styles.locBtnActive, pressed && { opacity: 0.8 }]}
            >
              <Icon name={LOC_ICONS[l]} size={14} color={loc === l ? '#fff' : colors.ink700} />
              <Text style={[styles.locBtnText, loc === l && { color: '#fff' }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="유통기한">
        <Pressable
          onPress={() => setShowPicker(true)}
          style={({ pressed }) => [styles.dateBtn, pressed && { opacity: 0.8 }]}
        >
          <Icon name="clock" size={16} color={colors.mint600} />
          <Text style={styles.dateBtnText}>{formatDate(expDate)}</Text>
          <Text style={styles.dateBtnSub}>{diffLabel}</Text>
        </Pressable>

        {showPicker && (
          <DateTimePicker
            value={expDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowPicker(Platform.OS === 'ios');
              if (date) onDateChange(date);
            }}
          />
        )}
      </Field>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_THICK = 3;
const CORNER_COLOR = '#fff';

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgElev,
    alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  modeSel: {
    flexDirection: 'row', gap: 4, backgroundColor: colors.bgSunken,
    borderRadius: 14, padding: 4, marginHorizontal: 16,
  },
  modeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', gap: 3, backgroundColor: 'transparent',
  },
  modeBtnActive: { backgroundColor: colors.bgElev, ...shadow.sm },
  modeBtnText: { fontSize: 11, fontWeight: '700', color: colors.ink500 },
  modeBody: { padding: 16, paddingBottom: 8 },

  cta: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.ink100, backgroundColor: colors.bg,
  },
  ctaBtn: {
    height: 52, borderRadius: 16, backgroundColor: colors.ink900,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* receipt mode */
  permBox: {
    backgroundColor: colors.bgElev, borderRadius: 22, padding: 36,
    alignItems: 'center', ...shadow.sm,
  },
  permIconWrap: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: colors.mint50,
    alignItems: 'center', justifyContent: 'center',
  },
  permBtn: {
    marginTop: 20, height: 48, paddingHorizontal: 32, borderRadius: 14,
    backgroundColor: colors.ink900, alignItems: 'center', justifyContent: 'center',
  },
  permBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  loadingBox: {
    backgroundColor: colors.bgElev, borderRadius: 22, padding: 48,
    alignItems: 'center', ...shadow.sm,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.dangerSoft, borderRadius: 12, padding: 12,
  },

  cameraWrap: {
    borderRadius: 18, overflow: 'hidden', backgroundColor: colors.ink900,
    ...shadow.sm,
  },
  camera: { height: 340, width: '100%' },
  cameraHint: {
    textAlign: 'center', fontSize: 13, color: colors.ink400,
    marginTop: 10, marginBottom: 2,
  },
  scanOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    margin: 28,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderBottomRightRadius: 4 },

  captureBtn: {
    height: 52, borderRadius: 16, backgroundColor: colors.mint600,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  captureBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  reviewHeader: {
    backgroundColor: colors.bgElev, borderRadius: 16, padding: 16, ...shadow.sm,
  },
  detectedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgElev, borderRadius: 14, padding: 14, ...shadow.sm,
  },
  detectedItemOff: { opacity: 0.5 },
  checkBox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.ink300,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: colors.mint600, borderColor: colors.mint600 },
  catBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, backgroundColor: colors.mint50,
  },
  catBadgeText: { fontSize: 11, fontWeight: '600', color: colors.mint700 },

  retakeBtn: {
    flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.bgElev,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    ...shadow.sm,
  },
  retakeBtnText: { fontSize: 14, fontWeight: '700', color: colors.ink700 },
  addAllBtn: {
    flex: 2, height: 48, borderRadius: 14, backgroundColor: colors.ink900,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  addAllBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* manual mode */
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.ink500, marginBottom: 6, paddingLeft: 4 },
  input: {
    height: 48, paddingHorizontal: 14, backgroundColor: colors.bgElev,
    borderRadius: 14, fontSize: 15, color: colors.ink900, ...shadow.sm,
  },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.bgElev, ...shadow.sm,
  },
  catChipActive: { backgroundColor: colors.mint600 },
  catText: { fontSize: 12, fontWeight: '600', color: colors.ink700 },
  locBtn: {
    flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.bgElev,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, ...shadow.sm,
  },
  locBtnActive: { backgroundColor: colors.mint600 },
  locBtnText: { fontSize: 13, fontWeight: '700', color: colors.ink700 },
  dateBtn: {
    height: 52, paddingHorizontal: 16, backgroundColor: colors.bgElev,
    borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.sm,
  },
  dateBtnText: { fontSize: 15, fontWeight: '600', color: colors.ink900, flex: 1 },
  dateBtnSub: { fontSize: 12, color: colors.mint600, fontWeight: '600' },
});
