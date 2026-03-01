import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useCardStore } from '@/stores/card-store';
import { useWalletStore } from '@/stores/wallet-store';
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

function DeckSlot({ card, onRemove }: { card?: CardWithTemplate; onRemove?: () => void }) {
  if (!card) {
    return (
      <View style={styles.deckSlotEmpty}>
        <Feather name="plus" size={24} color={colors.textTertiary} />
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.deckSlot} activeOpacity={0.7} onPress={onRemove}>
      <LinearGradient
        colors={getGradientForRarity(card.card_templates.rarity)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.deckSlotGradient}
      />
      <Text style={styles.deckSlotName} numberOfLines={1}>
        {card.card_templates.name}
      </Text>
      <Text style={styles.deckSlotStats}>
        {card.attack}/{card.defense}/{card.hp}
      </Text>
      <View style={styles.deckSlotRemove}>
        <Feather name="x" size={12} color={colors.textPrimary} />
      </View>
    </TouchableOpacity>
  );
}

function CardGridItem({
  card,
  inDeck,
  onToggle,
}: {
  card: CardWithTemplate;
  inDeck: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.gridCard} activeOpacity={0.7} onPress={onToggle}>
      <LinearGradient
        colors={getGradientForRarity(card.card_templates.rarity)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gridCardImage}
      >
        {inDeck && (
          <View style={styles.checkOverlay}>
            <Ionicons name="checkmark-circle" size={24} color={colors.accentPrimary} />
          </View>
        )}
      </LinearGradient>
      <View style={styles.gridCardContent}>
        <Text style={styles.gridCardName} numberOfLines={1}>
          {card.card_templates.name}
        </Text>
        <Text style={styles.gridCardMeta}>
          {card.card_templates.rarity} · {card.card_templates.element}
        </Text>
        <View style={styles.gridCardStats}>
          <Text style={styles.gridStatText}>
            <Text style={styles.gridStatLabel}>ATK </Text>
            {card.attack}
          </Text>
          <Text style={styles.gridStatText}>
            <Text style={styles.gridStatLabel}>DEF </Text>
            {card.defense}
          </Text>
          <Text style={styles.gridStatText}>
            <Text style={styles.gridStatLabel}>HP </Text>
            {card.hp}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function InventoryScreen() {
  const connectedPublicKey = useWalletStore((s) => s.connectedPublicKey);
  const myCards = useCardStore((s) => s.myCards);
  const cardsLoading = useCardStore((s) => s.cardsLoading);
  const deck = useCardStore((s) => s.deck);
  const toggleDeckCard = useCardStore((s) => s.toggleDeckCard);
  const fetchMyCards = useCardStore((s) => s.fetchMyCards);

  useEffect(() => {
    if (connectedPublicKey) {
      fetchMyCards(connectedPublicKey);
    }
  }, [connectedPublicKey, fetchMyCards]);

  const deckCards = deck
    .map((id) => myCards.find((c) => c.id === id))
    .filter(Boolean) as CardWithTemplate[];

  // Pad to 3 slots
  const deckSlots: (CardWithTemplate | undefined)[] = [
    deckCards[0],
    deckCards[1],
    deckCards[2],
  ];

  const renderCard = useCallback(
    ({ item }: { item: CardWithTemplate }) => (
      <CardGridItem
        card={item}
        inDeck={deck.includes(item.id)}
        onToggle={() => toggleDeckCard(item.id)}
      />
    ),
    [deck, toggleDeckCard],
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Deck section */}
      <View style={styles.deckSection}>
        <View style={styles.deckHeader}>
          <Text style={styles.sectionTitle}>Battle Deck</Text>
          <View style={styles.deckBadge}>
            <Text style={styles.deckBadgeText}>{deckCards.length}/3</Text>
          </View>
        </View>
        <View style={styles.deckRow}>
          {deckSlots.map((card, i) => (
            <DeckSlot
              key={card?.id ?? `empty-${i}`}
              card={card}
              onRemove={card ? () => toggleDeckCard(card.id) : undefined}
            />
          ))}
        </View>
      </View>

      {/* All cards header */}
      <View style={styles.allCardsHeader}>
        <Text style={styles.sectionTitle}>All Cards</Text>
        <Text style={styles.cardCount}>{myCards.length} cards</Text>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyCard}>
      <Ionicons name="layers-outline" size={36} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>No cards yet</Text>
      <Text style={styles.emptyText}>Open a pack to get your first cards!</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      {cardsLoading && myCards.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
        </View>
      ) : (
        <FlatList
          data={myCards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.content}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgVoid,
  },
  content: {
    padding: spacing.sm,
    paddingBottom: 120,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },

  // -- Deck section --
  deckSection: {
    gap: 12,
  },
  deckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  deckBadge: {
    backgroundColor: colors.accentPrimary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  deckBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textOnAccent,
  },
  deckRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deckSlotEmpty: {
    flex: 1,
    height: 120,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckSlot: {
    flex: 1,
    height: 120,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    overflow: 'hidden',
    padding: 8,
    justifyContent: 'flex-end',
  },
  deckSlotGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    opacity: 0.4,
  },
  deckSlotName: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  deckSlotStats: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deckSlotRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // -- All cards header --
  allCardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCount: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },

  // -- Card grid --
  gridRow: {
    gap: 10,
  },
  gridCard: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: 10,
  },
  gridCardImage: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardContent: {
    padding: 10,
    gap: 4,
  },
  gridCardName: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  gridCardMeta: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridCardStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  gridStatText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  gridStatLabel: {
    color: colors.textTertiary,
    fontFamily: fonts.medium,
  },

  // -- Empty state --
  emptyCard: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
});
