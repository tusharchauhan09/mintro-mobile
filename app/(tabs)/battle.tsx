import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radii, spacing } from '@/constants/theme';

const CONTAINER_SIZE = 200;
const MIN_SIZE = 40;
const MAX_SIZE = 240;

function RadarCircle({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runAnim = () => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) runAnim();
      });
    };

    const timeout = setTimeout(runAnim, delay);
    return () => clearTimeout(timeout);
  }, []);

  const size = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [MIN_SIZE, MAX_SIZE],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.8, 0],
  });

  const position = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      (CONTAINER_SIZE - MIN_SIZE) / 2,
      (CONTAINER_SIZE - MAX_SIZE) / 2,
    ],
  });

  return (
    <Animated.View
      style={[
        styles.radarCircle,
        {
          width: size,
          height: size,
          opacity,
          top: position,
          left: position,
        },
      ]}
    />
  );
}

function useTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function BattleScreen() {
  const insets = useSafeAreaInsets();
  const timer = useTimer();

  const handleCancel = () => {
    router.replace('/');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Minimal header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Arena Protocol v2.4</Text>
      </View>

      {/* Main content */}
      <View style={styles.body}>
        {/* Radar */}
        <View style={styles.radarContainer}>
          <RadarCircle delay={0} />
          <RadarCircle delay={1000} />
          <RadarCircle delay={2000} />
          <View style={styles.avatarGlow}>
            <View style={styles.avatarInner} />
          </View>
        </View>

        {/* Finding text */}
        <View style={styles.findingSection}>
          <Text style={styles.findingTitle}>Finding Opponent</Text>
          <Text style={styles.timer}>{timer}</Text>
        </View>

        {/* Fighter preview card */}
        <View style={styles.fighterCard}>
          <View style={styles.fighterHeader}>
            <View style={styles.fighterInfo}>
              <View style={styles.fighterNameRow}>
                <Text style={styles.fighterName}>Neon Drifter #882</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>LVL 42</Text>
                </View>
              </View>
              <Text style={styles.fighterClass}>Rare Class • Speed Specialist</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>ATK</Text>
              <Text style={styles.statValue}>2,450</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>SPD</Text>
              <Text style={[styles.statValue, { color: colors.accentPrimary }]}>4,100</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DEF</Text>
              <Text style={styles.statValue}>1,820</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer cancel button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + 24 }]}>
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
          onPress={handleCancel}
        >
          <Text style={styles.cancelText}>CANCEL SEARCH</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgVoid,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: 40,
  },
  radarContainer: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    borderRadius: radii.pill,
  },
  avatarGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.accentPrimary,
    shadowColor: colors.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 10,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#222',
    background: 'linear-gradient(135deg, #333, #111)',
  },
  findingSection: {
    alignItems: 'center',
    gap: 8,
  },
  findingTitle: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  timer: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.accentPrimary,
  },
  fighterCard: {
    width: '100%',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: 20,
    gap: 16,
  },
  fighterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fighterInfo: {
    flex: 1,
    gap: 4,
  },
  fighterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fighterName: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  levelBadge: {
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 11,
    fontFamily: fonts.extraBold,
    color: colors.accentPrimary,
  },
  fighterClass: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: fonts.extraBold,
    color: colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  cancelBtnPressed: {
    backgroundColor: '#2a2a2a',
    transform: [{ scale: 0.98 }],
  },
  cancelText: {
    fontSize: 15,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
});
