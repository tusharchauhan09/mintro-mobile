import { Tabs } from 'expo-router';
import BottomTabBar from '@/components/navigation/BottomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rank" />
      <Tabs.Screen name="shop" />
    </Tabs>
  );
}
