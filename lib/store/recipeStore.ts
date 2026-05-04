import { create } from 'zustand';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Item } from '../../types';
import { dayDiff } from '../date';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

interface RawRecipe {
  name: string;
  minutes: number;
  level: '쉬움' | '보통' | '어려움';
  needs: string[];
  extras: string[];
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

function enrich(raw: RawRecipe, items: Item[], idx: number): GeneratedRecipe {
  const matchedItems = raw.needs
    .map(need => items.find(i => i.name.includes(need) || need.includes(i.name)))
    .filter(Boolean) as Item[];

  const missingNeeds = raw.needs.filter(
    need => !items.some(i => i.name.includes(need) || need.includes(i.name)),
  );

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

  return { ...raw, id: `ai-${idx}`, matchedItems, missingNeeds, haveCount, pct, whyText };
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
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
        `[{"name":"요리명","minutes":조리분(숫자),"level":"쉬움|보통|어려움",` +
        `"needs":["필수재료"],"extras":["있으면좋은재료"],` +
        `"accent":"파스텔 hex 색상 (예:#ffd9a3)","steps":["단계1","단계2","단계3"]}]`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim()
        .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

      const raw: RawRecipe[] = JSON.parse(text);
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
