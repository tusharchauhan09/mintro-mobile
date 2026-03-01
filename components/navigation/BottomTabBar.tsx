import { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fonts } from '@/constants/theme';

type FeatherIcon = React.ComponentProps<typeof Feather>['name'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_CONFIG: Record<string, { label: string; icon: FeatherIcon; primary?: boolean }> = {
  index: { label: 'Home', icon: 'home' },
  friends: { label: 'Friends', icon: 'users' },
  inventory: { label: 'Inventory', icon: 'grid' },
  battle: { label: 'BATTLE', icon: 'zap', primary: true },
  shop: { label: 'Shop', icon: 'shopping-bag' },
};

const SPRING = { damping: 18, stiffness: 200, mass: 0.6 };

interface Props extends BottomTabBarProps {
  onRouteChange?: (name: string) => void;
}

/* ── Regular tab ── */
function TabItem({
  route,
  isFocused,
  config,
  onPress,
}: {
  route: { key: string; name: string };
  isFocused: boolean;
  config: { label: string; icon: FeatherIcon };
  onPress: () => void;
}) {
  const focus = useSharedValue(isFocused ? 1 : 0);
  const pressed = useSharedValue(1);

  useEffect(() => {
    focus.value = withSpring(isFocused ? 1 : 0, SPRING);
  }, [isFocused, focus]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(focus.value, [0, 1], [0, -1], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(focus.value, [0, 1], [0.45, 1], Extrapolation.CLAMP),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(focus.value, [0, 1], [4, 0], Extrapolation.CLAMP) },
    ],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0, { duration: 250 }),
    transform: [
      { scaleX: withSpring(isFocused ? 1 : 0, SPRING) },
    ],
  }));

  return (
    <AnimatedPressable
      key={route.key}
      style={[styles.tab, containerStyle]}
      onPress={onPress}
      onPressIn={() => { pressed.value = withSpring(0.85, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { pressed.value = withSpring(1, SPRING); }}
    >
      <Animated.View style={iconStyle}>
        <Feather
          name={config.icon}
          size={20}
          color={isFocused ? colors.textPrimary : colors.textSecondary}
        />
      </Animated.View>

      <Animated.Text
        style={[styles.tabLabel, isFocused && styles.tabLabelActive, labelStyle]}
        numberOfLines={1}
      >
        {config.label}
      </Animated.Text>

      {/* Underline indicator */}
      <Animated.View style={[styles.indicator, dotStyle]} />
    </AnimatedPressable>
  );
}

/* ── Center battle button ── */
function BattleButton({
  isFocused,
  onPress,
}: {
  isFocused: boolean;
  onPress: () => void;
}) {
  const pressed = useSharedValue(1);
  const glow = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    glow.value = withSpring(isFocused ? 1 : 0, SPRING);
  }, [isFocused, glow]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressed.value },
      { translateY: interpolate(pressed.value, [0.88, 1], [1, 0], Extrapolation.CLAMP) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.1, 0.3], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(glow.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={styles.battleWrapper}>
      {/* Glow behind */}
      <Animated.View style={[styles.battleGlow, glowStyle]} />

      <AnimatedPressable
        style={[styles.battleBtn, buttonStyle]}
        onPress={onPress}
        onPressIn={() => { pressed.value = withSpring(0.88, { damping: 12, stiffness: 300 }); }}
        onPressOut={() => { pressed.value = withSpring(1, SPRING); }}
      >
        <Feather name="zap" size={24} color={colors.textOnAccent} />
      </AnimatedPressable>

      <Animated.Text style={styles.battleLabel}>BATTLE</Animated.Text>
    </View>
  );
}

/* ── Main bar ── */
export default function BottomTabBar({ state, navigation, onRouteChange }: Props) {
  const insets = useSafeAreaInsets();
  const currentRouteName = state.routes[state.index]?.name ?? '';

  useEffect(() => {
    onRouteChange?.(currentRouteName);
  }, [currentRouteName, onRouteChange]);

  const leftTabs = state.routes.filter((r) => ['index', 'friends'].includes(r.name));
  const rightTabs = state.routes.filter((r) => ['inventory', 'shop'].includes(r.name));
  const battleRoute = state.routes.find((r) => r.name === 'battle');

  const makeOnPress = (route: (typeof state.routes)[0]) => () => {
    const isFocused = state.routes[state.index]?.key === route.key;
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
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {/* Left group */}
        <View style={styles.group}>
          {leftTabs.map((route) => {
            const config = TAB_CONFIG[route.name];
            if (!config) return null;
            return (
              <TabItem
                key={route.key}
                route={route}
                isFocused={state.routes[state.index]?.key === route.key}
                config={config}
                onPress={makeOnPress(route)}
              />
            );
          })}
        </View>

        {/* Center battle */}
        {battleRoute && (
          <BattleButton
            isFocused={state.routes[state.index]?.key === battleRoute.key}
            onPress={makeOnPress(battleRoute)}
          />
        )}

        {/* Right group */}
        <View style={styles.group}>
          {rightTabs.map((route) => {
            const config = TAB_CONFIG[route.name];
            if (!config) return null;
            return (
              <TabItem
                key={route.key}
                route={route}
                isFocused={state.routes[state.index]?.key === route.key}
                config={config}
                onPress={makeOnPress(route)}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ── Styles ── */
const BATTLE_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  /* Glass bar */
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 28,
    height: 64,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
  },

  /* Left / Right tab groups */
  group: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
  },

  /* Single tab */
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    gap: 3,
  },

  tabLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
  },

  /* Active underline */
  indicator: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accentPrimary,
  },

  /* Center battle */
  battleWrapper: {
    alignItems: 'center',
    marginTop: -16,
    width: BATTLE_SIZE + 20,
  },

  battleGlow: {
    position: 'absolute',
    top: 0,
    width: BATTLE_SIZE + 16,
    height: BATTLE_SIZE + 16,
    borderRadius: 18,
    backgroundColor: colors.accentPrimary,
  },

  battleBtn: {
    width: BATTLE_SIZE,
    height: BATTLE_SIZE,
    borderRadius: 16,
    backgroundColor: colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgSurface,
    shadowColor: colors.accentPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  battleLabel: {
    fontSize: 9,
    fontFamily: fonts.extraBold,
    color: colors.accentPrimary,
    letterSpacing: 1,
    marginTop: 4,
  },
});
