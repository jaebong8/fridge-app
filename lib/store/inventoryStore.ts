import { create } from 'zustand';
import { Item, ItemCategory, ItemLocation } from '../../types';
import { supabase } from '../supabase';

const CATEGORY_COLORS: Record<ItemCategory, string> = {
  '채소':   '#7fc89c',
  '과일':   '#e35e6b',
  '육류':   '#df8a8a',
  '단백질': '#f0d57a',
  '유제품': '#e8eef0',
  '소스':   '#c84a3a',
  '곡물':   '#f1eadc',
};

interface NewItem {
  name: string;
  category: ItemCategory;
  amount: string;
  loc: ItemLocation;
  exp: string;
  fridgeId: string;
}

interface UpdateItem {
  name?: string;
  amount?: string;
  loc?: ItemLocation;
  category?: ItemCategory;
  exp?: string;
}

interface InventoryStore {
  items: Item[];
  loading: boolean;
  currentFridgeId: string;
  setItems: (items: Item[]) => void;
  addItem: (item: NewItem) => Promise<void>;
  updateItem: (id: string, updates: UpdateItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  discardItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  fetchItems: (fridgeId: string) => Promise<void>;
  subscribeRealtime: (fridgeId: string) => () => void;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  loading: false,
  currentFridgeId: '',

  setItems: (items) => set({ items }),

  addItem: async (newItem) => {
    const color = CATEGORY_COLORS[newItem.category] ?? '#7fc89c';
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        fridge_id: newItem.fridgeId,
        added_by: user.id,
        name: newItem.name,
        category: newItem.category,
        amount: newItem.amount,
        loc: newItem.loc,
        exp: newItem.exp,
        color,
      })
      .select()
      .single();

    if (!error && data) {
      set(s => ({ items: [...s.items, mapRow(data)] }));
      await supabase.from('activities').insert({
        fridge_id: newItem.fridgeId,
        user_id: user.id,
        action: 'add',
        item_name: newItem.name,
        item_amount: newItem.amount,
      });
    }
  },

  updateItem: async (id, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined)     dbUpdates.name = updates.name;
    if (updates.amount !== undefined)   dbUpdates.amount = updates.amount;
    if (updates.loc !== undefined)      dbUpdates.loc = updates.loc;
    if (updates.exp !== undefined)      dbUpdates.exp = updates.exp;
    if (updates.category !== undefined) {
      dbUpdates.category = updates.category;
      dbUpdates.color = CATEGORY_COLORS[updates.category];
    }

    const { error } = await supabase.from('inventory_items').update(dbUpdates).eq('id', id);
    if (!error) {
      set(s => ({
        items: s.items.map(i => {
          if (i.id !== id) return i;
          const next = { ...i, ...updates };
          if (updates.category) next.color = CATEGORY_COLORS[updates.category];
          return next;
        }),
      }));
    }
  },

  removeItem: async (id) => {
    const item = get().items.find(i => i.id === id);
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
    if (!item) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('inventory_items').delete().eq('id', id);
    if (user) {
      await supabase.from('activities').insert({
        fridge_id: item.fridgeId,
        user_id: user.id,
        action: 'consume',
        item_name: item.name,
        item_amount: item.amount,
      });
    }
  },

  discardItem: async (id) => {
    const item = get().items.find(i => i.id === id);
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
    if (!item) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('inventory_items').delete().eq('id', id);
    if (user) {
      await supabase.from('activities').insert({
        fridge_id: item.fridgeId,
        user_id: user.id,
        action: 'discard',
        item_name: item.name,
        item_amount: item.amount,
      });
    }
  },

  deleteItem: async (id) => {
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
    await supabase.from('inventory_items').delete().eq('id', id);
  },

  fetchItems: async (fridgeId) => {
    set({ loading: true, currentFridgeId: fridgeId });
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('fridge_id', fridgeId)
      .order('exp', { ascending: true });

    if (!error && data) {
      set({ items: data.map(mapRow), loading: false });
    } else {
      set({ loading: false });
    }
  },

  subscribeRealtime: (fridgeId) => {
    const channel = supabase
      .channel(`inventory:${fridgeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_items',
        filter: `fridge_id=eq.${fridgeId}`,
      }, () => {
        get().fetchItems(fridgeId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));

function mapRow(row: any): Item {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: row.amount,
    loc: row.loc,
    exp: row.exp,
    added: row.added,
    color: row.color,
    fridgeId: row.fridge_id,
  };
}
