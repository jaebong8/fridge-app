import { create } from 'zustand';
import { Item } from '../../types';
import { dayDiff } from '../date';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

interface Ingredient {
  name: string;
  qty: string;
}

interface RawRecipe {
  name: string;
  minutes: number;
  level: '쉬움' | '보통' | '어려움';
  servings: number;
  needs: Ingredient[];
  extras: Ingredient[];
  accent: string;
  steps: string[];
}

export interface GeneratedRecipe extends RawRecipe {
  id: string;
  matchedItems: Item[];
  missingNeeds: string[];
  haveCount: number;
  pct: number;
  whyText: string;
}

interface RecipeStore {
  recipes: GeneratedRecipe[];
  loading: boolean;
  error: string;
  cachedKey: string;
  fetchRecipes: (items: Item[], fridgeId: string) => Promise<void>;
  reset: () => void;
}

function cacheKey(items: Item[], fridgeId: string): string {
  return fridgeId + ':' + items.map(i => i.id).sort().join(',');
}

function toIngredient(v: any): Ingredient {
  if (typeof v === 'string') return { name: v, qty: '' };
  return { name: v.name ?? v, qty: v.qty ?? v.amount ?? '' };
}

function enrich(raw: RawRecipe, items: Item[], idx: number): GeneratedRecipe {
  const needs = (raw.needs ?? []).map(toIngredient);
  const extras = (raw.extras ?? []).map(toIngredient);
  const normalizedRaw = { ...raw, needs, extras };

  const matchedItems = needs
    .map(need => items.find(i => i.name.includes(need.name) || need.name.includes(i.name)))
    .filter(Boolean) as Item[];

  const missingNeeds = needs
    .filter(need => !items.some(i => i.name.includes(need.name) || need.name.includes(i.name)))
    .map(need => need.name);

  const haveCount = matchedItems.length;
  const pct = Math.round((haveCount / Math.max(raw.needs.length, 1)) * 100);

  const expiring = matchedItems
    .map(i => ({ ...i, n: dayDiff(i.exp) }))
    .filter(i => i.n <= 3)
    .sort((a, b) => a.n - b.n);


  const whyText = expiring.length > 0
    ? expiring.map(i => `${i.name} D-${Math.max(i.n, 0)}`).join(', ') + ' 임박'
    : haveCount === raw.needs.length
      ? '재료 100% 보유'
      : `${haveCount}/${raw.needs.length} 재료 보유`;

  return { ...normalizedRaw, id: `ai-${idx}`, matchedItems, missingNeeds, haveCount, pct, whyText };
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  loading: false,
  error: '',
  cachedKey: '',

  fetchRecipes: async (items, fridgeId) => {
    const key = cacheKey(items, fridgeId);
    if (key === get().cachedKey && get().recipes.length > 0) return;

    if (items.length === 0) {
      set({ recipes: [], loading: false, error: '', cachedKey: key });
      return;
    }

    set({ loading: true, error: '' });
    try {
      const sorted = [...items]
        .sort((a, b) => dayDiff(a.exp) - dayDiff(b.exp))
        .slice(0, 15);

      const itemList = sorted
        .map(i => `- ${i.name} (${i.loc}, ${dayDiff(i.exp)}일 남음)`)
        .join('\n');

      const prompt =
        `현재 냉장고 재료:\n${itemList}\n\n` +
        `위 재료로 만들 수 있는 한국 가정식 레시피 6개를 추천해주세요.\n` +
        `유통기한이 임박한 재료를 우선 활용하고, 난이도는 다양하게 섞어주세요.\n\n` +
        `다음 JSON 배열만 응답하세요 (마크다운 코드블록, 설명 없이 순수 JSON):\n` +
        `[{"name":"요리명","minutes":조리분(숫자),"level":"쉬움|보통|어려움","servings":2,` +
        `"needs":[{"name":"재료명","qty":"2인분 기준 용량(예:200g, 2개, 1큰술)"}],` +
        `"extras":[{"name":"재료명","qty":"용량"}],` +
        `"accent":"파스텔 hex 색상 (예:#ffd9a3)","steps":["단계1","단계2","단계3"]}]`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '레시피 요청 실패');
      const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('유효한 레시피 데이터를 받지 못했어요.');
      const raw: RawRecipe[] = JSON.parse(match[0]);
      const recipes = raw
        .map((r, i) => enrich(r, items, i))
        .sort((a, b) => b.pct - a.pct || a.minutes - b.minutes);

      set({ recipes, loading: false, cachedKey: key });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? '레시피를 불러오지 못했어요.' });
    }
  },

  reset: () => set({ recipes: [], cachedKey: '', error: '' }),
}));
