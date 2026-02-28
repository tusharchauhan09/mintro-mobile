import { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import BottomTabBar from '@/components/navigation/BottomTabBar';
import Header from '@/components/home/Header';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  const [showHeader, setShowHeader] = useState(true);

  const handleRouteChange = useCallback((routeName: string) => {
    setShowHeader(routeName !== 'battle');
  }, []);

  return (
    <View style={styles.root}>
      {showHeader && <Header />}
      <Tabs
        initialRouteName="index"
        tabBar={(props) => <BottomTabBar {...props} onRouteChange={handleRouteChange} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="friends" />
        <Tabs.Screen name="inventory" />
        <Tabs.Screen name="battle" />
        <Tabs.Screen name="rank" />
        <Tabs.Screen name="shop" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgVoid,
  },
});
