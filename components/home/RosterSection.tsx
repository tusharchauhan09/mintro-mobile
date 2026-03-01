import { colors, fonts, radii, spacing } from "@/constants/theme";
import { useCardStore } from "@/stores/card-store";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface RosterCardProps {
  name: string;
  level: number;
  rarity: string;
  role: string;
  gradientColors: readonly [string, string];
  highlighted?: boolean;
}

function getGradientForRarity(rarity: string): readonly [string, string] {
  switch (rarity) {
    case "LEGENDARY":
      return ["#FFD700", "#B8860B"] as const;
    case "EPIC":
      return ["#9B59B6", "#6C3483"] as const;
    case "RARE":
      return ["#3498DB", "#2471A3"] as const;
    default:
      return colors.gradientCardA;
  }
}

function RosterCard({
  name,
  level,
  rarity,
  role,
  gradientColors,
  highlighted,
}: RosterCardProps) {
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
          <Text style={styles.cardName} numberOfLines={1}>
            {name}
          </Text>
          <Text
            style={[styles.levelBadge, highlighted && styles.levelHighlighted]}
          >
            LVL {level}
          </Text>
        </View>
        <Text style={styles.cardMeta}>
          {rarity} Class &bull; {role}
        </Text>
      </View>
      <View style={styles.chevron}>
        <Feather name="chevron-right" size={20} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

function EmptyRoster() {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name="layers-outline" size={28} color={colors.textTertiary} />
      <Text style={styles.emptyText}>No cards yet — open a pack!</Text>
    </View>
  );
}

export default function RosterSection() {
  const myCards = useCardStore((s) => s.myCards);
  const cardsLoading = useCardStore((s) => s.cardsLoading);

  const displayCards = myCards.slice(0, 3);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Roster</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.seeAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {cardsLoading && myCards.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : displayCards.length === 0 ? (
          <EmptyRoster />
        ) : (
          displayCards.map((card, index) => (
            <RosterCard
              key={card.id}
              name={`${card.card_templates.name} #${card.serial_number}`}
              level={card.level}
              rarity={card.card_templates.rarity}
              role={card.card_templates.element}
              gradientColors={getGradientForRarity(card.card_templates.rarity)}
              highlighted={index === 0}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    textTransform: "uppercase",
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
  emptyCard: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 80,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
  },
  loadingWrap: {
    padding: spacing.md,
    alignItems: "center",
  },
});
