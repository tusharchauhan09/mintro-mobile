import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radii, fonts } from '@/constants/theme';

type FeatherIcon = React.ComponentProps<typeof Feather>['name'];

const TAB_CONFIG: Record<string, { label: string; icon: FeatherIcon; primary?: boolean }> = {
  friends: { label: 'Friends', icon: 'user-plus' },
  inventory: { label: 'Inv', icon: 'grid' },
  index: { label: 'BATTLE', icon: 'star', primary: true },
  rank: { label: 'Rank', icon: 'bar-chart-2' },
  shop: { label: 'Shop', icon: 'shopping-bag' },
};

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.nav}>
        {state.routes.map((route, index) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          const isFocused = state.index === index;
          const isPrimary = config.primary;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[
                styles.navItem,
                isPrimary && styles.navItemPrimary,
              ]}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Feather
                name={config.icon}
                size={isPrimary ? 28 : 24}
                color={isPrimary ? '#000' : isFocused ? colors.textPrimary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navLabel,
                  isPrimary && styles.navLabelPrimary,
                  !isPrimary && isFocused && styles.navLabelActive,
                ]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  nav: {
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 56,
    borderRadius: 24,
  },
  navItemPrimary: {
    flex: 1.3,
    backgroundColor: colors.accentPrimary,
    shadowColor: colors.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  navLabel: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  navLabelPrimary: {
    color: '#000',
    fontFamily: fonts.extraBold,
  },
  navLabelActive: {
    color: colors.textPrimary,
  },
});
