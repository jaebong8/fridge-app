import { create } from 'zustand';
import { supabase } from '../supabase';

interface StatsData {
  consumedCount: number;
  discardedCount: number;
  consumeRate: number;
  topItems: { name: string; count: number; color: string }[];
  wastedItems: { name: string; date: string }[];
  daily: number[];       // 마지막 30일 활동 수
  loading: boolean;
}

interface StatsStore extends StatsData {
  fetchStats: (fridgeId: string) => Promise<void>;
}

const ITEM_COLORS: Record<string, string> = {
  '채소': '#7fc89c', '과일': '#e35e6b', '육류': '#df8a8a',
  '단백질': '#f0d57a', '유제품': '#e8eef0', '소스': '#c84a3a', '곡물': '#f1eadc',
};

export const useStatsStore = create<StatsStore>((set) => ({
  consumedCount: 0,
  discardedCount: 0,
  consumeRate: 0,
  topItems: [],
  wastedItems: [],
  daily: [],
  loading: false,

  fetchStats: async (fridgeId) => {
    set({ loading: true });

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data } = await supabase
      .from('activities')
      .select('action, item_name, created_at')
      .eq('fridge_id', fridgeId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (!data) { set({ loading: false }); return; }

    const consumed  = data.filter(r => r.action === 'consume');
    const discarded = data.filter(r => r.action === 'discard');

    const total = consumed.length + discarded.length;
    const consumeRate = total > 0 ? Math.round((consumed.length / total) * 100) : 0;

    // 자주 소비된 재료 TOP 5
    const nameCount: Record<string, number> = {};
    consumed.forEach(r => { nameCount[r.item_name] = (nameCount[r.item_name] ?? 0) + 1; });
    const topItems = Object.entries(nameCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, color: ITEM_COLORS[name] ?? '#7fc89c' }));

    // 폐기 목록
    const wastedItems = discarded.slice(-10).reverse().map(r => ({
      name: r.item_name,
      date: `${new Date(r.created_at).getMonth() + 1}/${new Date(r.created_at).getDate()}`,
    }));

    // 최근 30일 일별 활동 수
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return data.filter(r => r.created_at.slice(0, 10) === key).length;
    });

    set({ consumedCount: consumed.length, discardedCount: discarded.length, consumeRate, topItems, wastedItems, daily, loading: false });
  },
}));
