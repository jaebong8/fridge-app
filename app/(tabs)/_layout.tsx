import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui/Icon';
import { colors, shadow } from '../../lib/tokens';
import { useAppStore } from '../../lib/store/appStore';
import { useInventoryStore } from '../../lib/store/inventoryStore';
import { useShoppingStore } from '../../lib/store/shoppingStore';
import { scheduleExpiryNotifications } from '../../lib/notifications';

const TABS = [
  { name: 'index',     label: '홈',     icon: 'home'  },
  { name: 'inventory', label: '재고',   icon: 'box'   },
  { name: 'add-fab',   label: '추가',   icon: 'plus', fab: true },
  { name: 'recipes',   label: '레시피', icon: 'chef'  },
  { name: 'shopping',  label: '쇼핑',   icon: 'cart'  },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
      {TABS.map((tab, index) => {
        if (tab.fab) {
          return (
            <View key="fab" style={styles.fabWrap}>
              <Pressable
                onPress={() => router.push('/add')}
                style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
              >
                <Icon name="plus" size={26} color="#fff" stroke={2.4} />
              </Pressable>
            </View>
          );
        }

        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const isActive = state.index === routeIndex;
        const isFocused = isActive;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: state.routes[routeIndex]?.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: tab.name, merge: true });
          }
        };

        return (
          <Pressable
            key={tab.name}
            onPress={onPress}
            style={({ pressed }) => [styles.tabBtn, pressed && { opacity: 0.7 }]}
          >
            <Icon
              name={tab.icon}
              size={22}
              color={isActive ? colors.ink900 : colors.ink400}
              stroke={isActive ? 2.2 : 1.7}
            />
            <Text style={[styles.tabLabel, { color: isActive ? colors.ink900 : colors.ink400, fontWeight: isActive ? '700' : '500' }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const currentFridgeId  = useAppStore(s => s.currentFridgeId);
  const fetchActivities  = useAppStore(s => s.fetchActivities);
  const fetchItems       = useInventoryStore(s => s.fetchItems);
  const subscribeRealtime = useInventoryStore(s => s.subscribeRealtime);
  const items            = useInventoryStore(s => s.items);
  const fetchShopping    = useShoppingStore(s => s.fetchItems);

  useEffect(() => {
    if (!currentFridgeId) return;
    fetchItems(currentFridgeId);
    fetchShopping(currentFridgeId);
    fetchActivities(currentFridgeId);
    return subscribeRealtime(currentFridgeId);
  }, [currentFridgeId]);

  useEffect(() => {
    scheduleExpiryNotifications(items);
  }, [items]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="recipes" />
      <Tabs.Screen name="shopping" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
  },
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    marginTop: -22,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ink900,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.lg,
  },
});
