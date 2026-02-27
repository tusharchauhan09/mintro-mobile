import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '@/constants/theme';

interface RosterCardProps {
  name: string;
  level: number;
  rarity: string;
  role: string;
  gradientColors: [string, string];
  highlighted?: boolean;
}

function RosterCard({ name, level, rarity, role, gradientColors, highlighted }: RosterCardProps) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardImg}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardRow}>
          <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
          <Text style={[styles.levelBadge, highlighted && styles.levelHighlighted]}>
            LVL {level}
          </Text>
        </View>
        <Text style={styles.cardMeta}>{rarity} Class &bull; {role}</Text>
      </View>
      <View style={styles.chevron}>
        <Feather name="chevron-right" size={20} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function RosterSection() {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Roster</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.seeAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        <RosterCard
          name="Neon Drifter #882"
          level={42}
          rarity="Rare"
          role="Speed Specialist"
          gradientColors={['#333', '#111']}
          highlighted
        />
        <RosterCard
          name="Cyber Punk #009"
          level={15}
          rarity="Common"
          role="Tank"
          gradientColors={['#2a2a2a', '#1a1a1a']}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.accentPrimary,
  },
  list: {
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardImg: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  cardContent: {
    flex: 1,
    paddingRight: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  levelBadge: {
    fontSize: 11,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  levelHighlighted: {
    color: colors.accentPrimary,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  chevron: {
    paddingRight: 12,
  },
});
