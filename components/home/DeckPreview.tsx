import { getCardImage } from "@/constants/card-images";
import {
  PREVIEW_CARDS,
  PREVIEW_WALLET_ADDRESS,
} from "@/constants/preview-cards";
import { colors, fonts, radii, spacing } from "@/constants/theme";
import { useCardStore } from "@/stores/card-store";
import { useWalletStore } from "@/stores/wallet-store";
import type { CardWithTemplate } from "@/types/database";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const SLOT_GAP = 10;

function DeckCard({ card, width }: { card: CardWithTemplate; width: number }) {
  const cardHeight = width / 0.9;
  return (
    <View style={[styles.deckCard, { width, height: cardHeight }]}>
      <Image
        source={getCardImage(card.card_templates.image_url)}
        style={styles.deckCardImage}
        resizeMode="contain"
      />
    </View>
  );
}

function EmptyDeckSlot({ width }: { width: number }) {
  return (
    <View style={[styles.emptySlot, { width, height: width / 0.72 }]}>
      <Feather name="plus" size={20} color={colors.textTertiary} />
      <Text style={styles.emptySlotText}>Empty</Text>
    </View>
  );
}

export default function DeckPreview() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const connectedPublicKey = useWalletStore((s) => s.connectedPublicKey);
  const deck = useCardStore((s) => s.deck);
  const storeCards = useCardStore((s) => s.myCards);

  // Use preview cards when no wallet connected (same logic as inventory)
  const isPreview =
    !connectedPublicKey || connectedPublicKey === PREVIEW_WALLET_ADDRESS;
  const myCards =
    isPreview && storeCards.length === 0 ? PREVIEW_CARDS : storeCards;

  const deckCards = deck
    .map((id) => myCards.find((c) => c.id === id))
    .filter(Boolean) as CardWithTemplate[];

  const slots: (CardWithTemplate | undefined)[] = [
    deckCards[0],
    deckCards[1],
    deckCards[2],
  ];

  // Card width: 3 cards + 2 gaps + screen padding
  const cardWidth = (screenWidth - spacing.sm * 2 - SLOT_GAP * 2) / 3;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Your Deck</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/inventory")}
        >
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      </View>

      {deckCards.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyState}
          activeOpacity={0.7}
          onPress={() => router.push("/inventory")}
        >
          <Feather name="layers" size={24} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            Select your battle deck in Inventory
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.deckRow}>
          {slots.map((card, i) =>
            card ? (
              <DeckCard key={card.id} card={card} width={cardWidth} />
            ) : (
              <EmptyDeckSlot key={`empty-${i}`} width={cardWidth} />
            ),
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    gap: SLOT_GAP,
  },
  deckCard: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#111",
    overflow: "hidden",
  },
  deckCardImage: {
    width: "100%",
    flex: 1,
  },
  emptySlot: {
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emptySlotText: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
  },
  emptyState: {
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
});
