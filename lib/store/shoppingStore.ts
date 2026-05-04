import { create } from 'zustand';
import { ShoppingItem } from '../../types';
import { supabase } from '../supabase';

interface ShoppingStore {
  items: ShoppingItem[];
  toggleItem: (id: string) => Promise<void>;
  addItem: (name: string, qty: string, fridgeId: string, from?: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  fetchItems: (fridgeId: string) => Promise<void>;
}

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],

  toggleItem: async (id) => {
    const item = get().items.find(i => i.id === id);
    if (!item) return;
    const done = !item.done;
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, done } : i) }));
    await supabase.from('shopping_items').update({ done }).eq('id', id);
  },

  addItem: async (name, qty, fridgeId, from = '직접 추가') => {
    if (!name.trim() || !fridgeId) return;
    const { data, error } = await supabase
      .from('shopping_items')
      .insert({ fridge_id: fridgeId, name: name.trim(), qty, from_note: from })
      .select()
      .single();

    if (!error && data) {
      set(s => ({
        items: [...s.items, {
          id: data.id,
          name: data.name,
          qty: data.qty,
          from: data.from_note ?? '',
          done: data.done,
          urgent: data.urgent,
        }],
      }));
    }
  },

  removeItem: async (id) => {
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
    await supabase.from('shopping_items').delete().eq('id', id);
  },

  fetchItems: async (fridgeId) => {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('fridge_id', fridgeId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      set({
        items: data.map(r => ({
          id: r.id,
          name: r.name,
          qty: r.qty,
          from: r.from_note ?? '',
          done: r.done,
          urgent: r.urgent,
        })),
      });
    }
  },
}));
