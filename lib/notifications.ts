import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Item } from '../types';
import { dayDiff } from './date';

export function setupNotificationHandler() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: current } = await Notifications.getPermissionsAsync();
  if (current === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleExpiryNotifications(items: Item[]): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  // 기존 예약 알림 전체 취소 후 재설정
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  // 5일 이내 만료 항목만, 최대 10개
  const urgent = items
    .map(i => ({ ...i, n: dayDiff(i.exp) }))
    .filter(i => i.n >= 0 && i.n <= 5)
    .sort((a, b) => a.n - b.n)
    .slice(0, 10);

  for (const item of urgent) {
    const triggerDate = calcTriggerDate(item.n, item.exp, now);
    if (!triggerDate) continue;

    const title = item.n === 0
      ? '🚨 오늘 만료!'
      : item.n === 1
        ? '⚠️ 내일 만료 예정'
        : `📅 ${item.n}일 후 만료`;

    await Notifications.scheduleNotificationAsync({
      identifier: `expiry-${item.id}`,
      content: {
        title,
        body: `${item.name} (${item.amount}) · ${item.loc}`,
        data: { itemId: item.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}

function calcTriggerDate(n: number, exp: string, now: Date): Date | null {
  if (n === 0) {
    // 오늘 만료 → 즉시 (5초 후)
    return new Date(now.getTime() + 5_000);
  }

  if (n === 1) {
    // 내일 만료 → 오늘 오전 9시, 지났으면 즉시
    const t = new Date(now);
    t.setHours(9, 0, 0, 0);
    return t > now ? t : new Date(now.getTime() + 10_000);
  }

  // 2~5일 후 → 만료 전날 오전 9시
  const expDate = new Date(exp);
  const t = new Date(expDate);
  t.setDate(t.getDate() - 1);
  t.setHours(9, 0, 0, 0);
  return t > now ? t : null; // 이미 지났으면 스킵
}
