import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { colors } from '../lib/tokens';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store/appStore';
import { setupNotificationHandler, requestNotificationPermission } from '../lib/notifications';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const fetchFridges = useAppStore(s => s.fetchFridges);
  const fetchProfile = useAppStore(s => s.fetchProfile);
  const hasOnboarded = useAppStore(s => s.hasOnboarded);
  const setHasOnboarded = useAppStore(s => s.setHasOnboarded);

  useEffect(() => {
    setupNotificationHandler();

    Promise.all([
      supabase.auth.getSession(),
      AsyncStorage.getItem('hasOnboarded'),
    ]).then(([{ data: { session } }, onboarded]) => {
      setSession(session);
      if (onboarded === 'true') setHasOnboarded(true);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchProfile();
      fetchFridges();
      requestNotificationPermission();
    }
  }, [session]);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session) {
      if (!inAuth) router.replace('/auth');
    } else if (!hasOnboarded) {
      if (!inOnboarding) router.replace('/onboarding');
    } else {
      if (inAuth || inOnboarding) router.replace('/(tabs)');
    }
  }, [ready, session, hasOnboarded, segments]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.mint500} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="stats" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootLayoutNav />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
