import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, fonts } from '@/constants/theme';

export default function HeroCard() {
  return (
    <LinearGradient
      colors={[colors.bgSurfaceElevated, colors.bgSurface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Glow effect */}
      <View style={styles.glow} />

      <View style={styles.content}>
        {/* Live event tag */}
        <View style={styles.tag}>
          <View style={styles.statusDot} />
          <Text style={styles.tagText}>LIVE EVENT</Text>
        </View>

        <Text style={styles.title}>Cyber Arena Finals</Text>
        <Text style={styles.description}>
          Top 100 players compete for the genesis artifact pack.
        </Text>

        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>ENDS IN 04:22:10</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 200,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -100,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accentPrimary,
    opacity: 0.15,
    // Simulating blur with shadow on Android
    elevation: 80,
  },
  content: {
    zIndex: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentPrimary,
    shadowColor: colors.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  tagText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.accentPrimary,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#ccc',
    lineHeight: 21,
  },
  timerRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.accentPrimary,
  },
});
