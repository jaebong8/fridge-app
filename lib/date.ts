import { ExpiryTone } from '../types';

export const dayDiff = (iso: string): number => {
  const now = new Date();
  const exp = new Date(iso);
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - now.getTime()) / 86400000);
};

export const dDay = (iso: string): string => {
  const n = dayDiff(iso);
  if (n < 0) return `D+${Math.abs(n)}`;
  if (n === 0) return 'D-day';
  return `D-${n}`;
};

export const expiryStatus = (iso: string): { label: string; tone: ExpiryTone; n: number } => {
  const n = dayDiff(iso);
  if (n < 0)  return { label: '만료됨', tone: 'danger', n };
  if (n <= 2) return { label: '임박',   tone: 'danger', n };
  if (n <= 5) return { label: '주의',   tone: 'warn',   n };
  return { label: '신선', tone: 'ok', n };
};

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const todayLabel = (): string => {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
};
