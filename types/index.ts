export type ItemCategory = '채소' | '과일' | '육류' | '단백질' | '유제품' | '소스' | '곡물';
export type ItemLocation = '냉장' | '냉동' | '실온';
export type ExpiryTone = 'danger' | 'warn' | 'ok';
export type NotifKind = 'expire' | 'recipe' | 'shop' | 'family';
export type NotifTone = 'danger' | 'warn' | 'info' | 'ok' | 'muted';
export type RecipeLevel = '쉬움' | '보통' | '어려움';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  amount: string;
  loc: ItemLocation;
  exp: string;      // ISO date "2026-05-02"
  added: string;    // ISO date
  color: string;    // hex
  fridgeId: string;
}

export interface Recipe {
  id: string;
  name: string;
  minutes: number;
  level: RecipeLevel;
  matchIds: string[];
  missing: string[];
  accent: string;
  why: string;
  steps: string[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  qty: string;
  from: string;
  done: boolean;
  urgent: boolean;
}

export interface FridgeMember {
  id: string;
  name: string;
}

export interface Fridge {
  id: string;
  name: string;
  members: FridgeMember[];
  color: string;
  items?: number;
}

export interface Notification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: string;
  tone: NotifTone;
  new: boolean;
}

export interface StatsData {
  saved: number;
  wasted: number;
  consumedRate: number;
  topCategory: string;
  weekly: number[];
  topItems: { name: string; count: number; color: string }[];
  wastedItems: { name: string; date: string; reason: string }[];
}

export interface ActivityEntry {
  who: string;
  what: string;
  when: string;
  tone: 'ok' | 'info' | 'muted';
  action: 'add' | 'consume' | 'discard';
  itemName: string;
}
