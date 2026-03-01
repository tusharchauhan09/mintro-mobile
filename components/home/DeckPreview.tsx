import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useCardStore } from '@/stores/card-store';
import type { CardWithTemplate } from '@/types/database';

function getGradientForRarity(rarity: string): readonly [string, string] {
  switch (rarity) {
    case 'LEGENDARY':
      return ['#FFD700', '#B8860B'] as const;
    case 'EPIC':
      return ['#9B59B6', '#6C3483'] as const;
    case 'RARE':
      return ['#3498DB', '#2471A3'] as const;
    default:
      return [colors.gradientCardA[0], colors.gradientCardA[1]] as const;
  }
}

function DeckCard({ card }: { card: CardWithTemplate }) {
  return (
    <View style={styles.deckCard}>
      <LinearGradient
        colors={getGradientForRarity(card.card_templates.rarity)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.deckCardGradient}
      />
      <View style={styles.deckCardBody}>
        <Text style={styles.deckCardName} numberOfLines={1}>
          {card.card_templates.name}
        </Text>
        <Text style={styles.deckCardElement}>{card.card_templates.element}</Text>
        <View style={styles.deckCardStats}>
          <Text style={styles.statText}>
            <Text style={styles.statLabel}>ATK </Text>{card.attack}
          </Text>
          <Text style={styles.statText}>
            <Text style={styles.statLabel}>DEF </Text>{card.defense}
          </Text>
          <Text style={styles.statText}>
            <Text style={styles.statLabel}>HP </Text>{card.hp}
          </Text>
        </View>
      </View>
    </View>
  );
}

function EmptyDeckSlot() {
  return (
    <View style={styles.emptySlot}>
      <Feather name="plus" size={20} color={colors.textTertiary} />
    </View>
  );
}

export default function DeckPreview() {
  const router = useRouter();
  const deck = useCardStore((s) => s.deck);
  const myCards = useCardStore((s) => s.myCards);

  const deckCards = deck
    .map((id) => myCards.find((c) => c.id === id))
    .filter(Boolean) as CardWithTemplate[];

  const slots: (CardWithTemplate | undefined)[] = [deckCards[0], deckCards[1], deckCards[2]];

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Your Deck</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/inventory')}
        >
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      </View>

      {deckCards.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyState}
          activeOpacity={0.7}
          onPress={() => router.push('/inventory')}
        >
          <Feather name="layers" size={24} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Select your battle deck in Inventory</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.deckRow}>
          {slots.map((card, i) =>
            card ? (
              <DeckCard key={card.id} card={card} />
            ) : (
              <EmptyDeckSlot key={`empty-${i}`} />
            ),
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  editLink: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.accentPrimary,
  },
  deckRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deckCard: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  deckCardGradient: {
    height: 48,
  },
  deckCardBody: {
    padding: 8,
    gap: 2,
  },
  deckCardName: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  deckCardElement: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deckCardStats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  statText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  statLabel: {
    color: colors.textTertiary,
    fontFamily: fonts.medium,
  },
  emptySlot: {
    flex: 1,
    height: 110,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 80,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
  },
});
