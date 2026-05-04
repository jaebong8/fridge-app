import { create } from 'zustand';
import { Fridge, ActivityEntry } from '../../types';
import { supabase } from '../supabase';

interface Toast {
  message: string;
  tone: 'dark' | 'success';
}

interface AppStore {
  fridges: Fridge[];
  currentFridgeId: string;
  currentFridge: Fridge | undefined;
  toast: Toast | null;
  userName: string;
  hasOnboarded: boolean;
  activities: ActivityEntry[];
  setHasOnboarded: (val: boolean) => void;
  showToast: (message: string, tone?: 'dark' | 'success') => void;
  hideToast: () => void;
  setCurrentFridge: (id: string) => void;
  setFridges: (fridges: Fridge[]) => void;
  fetchFridges: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  fetchActivities: (fridgeId: string) => Promise<void>;
  createFridge: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  fridges: [],
  currentFridgeId: '',
  currentFridge: undefined,
  toast: null,
  userName: '',
  hasOnboarded: false,
  activities: [],
  setHasOnboarded: (val) => set({ hasOnboarded: val }),

  showToast: (message, tone = 'dark') => {
    set({ toast: { message, tone } });
    setTimeout(() => set({ toast: null }), 1800);
  },

  hideToast: () => set({ toast: null }),

  setCurrentFridge: (id) => {
    const fridge = get().fridges.find(f => f.id === id);
    set({ currentFridgeId: id, currentFridge: fridge });
  },

  setFridges: (fridges) => set({ fridges }),

  fetchProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();
    if (data) set({ userName: data.nickname });
  },

  fetchFridges: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('fridges')
      .select('*, fridge_members(user_id, nickname)')
      .order('created_at', { ascending: true });

    if (error || !data) return;

    // 냉장고가 없으면 기본 냉장고 생성
    if (data.length === 0) {
      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
      const nickname = profile?.nickname || user.email?.split('@')[0] || '나';
      const { data: created } = await supabase
        .from('fridges')
        .insert({ name: '우리집 냉장고', owner_id: user.id })
        .select('*, fridge_members(user_id, nickname)')
        .single();

      if (created) {
        // 자신을 멤버로 추가
        await supabase.from('fridge_members').insert({
          fridge_id: created.id,
          user_id: user.id,
          nickname,
        });
        const fridge = mapFridge(created, [{ id: user.id, name: nickname }]);
        set({ fridges: [fridge], currentFridgeId: fridge.id, currentFridge: fridge });
      }
      return;
    }

    const fridges = data.map(row => {
      const members = (row.fridge_members ?? []).map((m: any) => ({
        id: m.user_id,
        name: m.nickname,
      }));
      return mapFridge(row, members);
    });

    const current = fridges[0];
    set({ fridges, currentFridgeId: current.id, currentFridge: current });
  },

  fetchActivities: async (fridgeId) => {
    const { data } = await supabase
      .from('activities')
      .select('*, profiles(nickname)')
      .eq('fridge_id', fridgeId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data) return;

    const ACTION_LABEL: Record<string, string> = { add: '추가', consume: '소비', discard: '폐기' };
    const ACTION_TONE: Record<string, ActivityEntry['tone']> = { add: 'ok', consume: 'info', discard: 'muted' };

    set({
      activities: data.map(r => ({
        who: (r.profiles as any)?.nickname ?? '알 수 없음',
        what: `${r.item_name}${r.item_amount ? ' ' + r.item_amount : ''} ${ACTION_LABEL[r.action] ?? r.action}`,
        when: timeAgo(r.created_at),
        tone: ACTION_TONE[r.action] ?? 'muted',
        action: r.action,
        itemName: r.item_name,
      })),
    });
  },

  createFridge: async (name) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
    const nickname = profile?.nickname || user.email?.split('@')[0] || '나';

    const { data: created } = await supabase
      .from('fridges')
      .insert({ name: name.trim(), owner_id: user.id })
      .select('id, name, color')
      .single();

    if (created) {
      await supabase.from('fridge_members').insert({
        fridge_id: created.id,
        user_id: user.id,
        nickname,
      });
      const newFridge: Fridge = {
        id: created.id,
        name: created.name,
        color: created.color,
        members: [{ id: user.id, name: nickname }],
      };
      set(s => ({
        fridges: [...s.fridges, newFridge],
        currentFridgeId: newFridge.id,
        currentFridge: newFridge,
      }));
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ fridges: [], currentFridgeId: '', currentFridge: undefined, userName: '', activities: [] });
  },
}));

function mapFridge(row: any, members: { id: string; name: string }[]): Fridge {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    members,
  };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d === 1) return '어제';
  if (d < 7)  return `${d}일 전`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
