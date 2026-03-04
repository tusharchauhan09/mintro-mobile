import CardDetailModal from "@/components/inventory/CardDetailModal";
import DragOverlay from "@/components/inventory/DragOverlay";
import { getCardImage } from "@/constants/card-images";
import { PREVIEW_CARDS } from "@/constants/preview-cards";
import { colors, fonts, radii, spacing } from "@/constants/theme";
import { useCardStore } from "@/stores/card-store";
import { useWalletStore } from "@/stores/wallet-store";
import type { CardWithTemplate } from "@/types/database";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const GRID_GAP = 10;
const LONG_PRESS_MS = 300;

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function DeckSlot({
  card,
  onRemove,
  isDragTarget,
}: {
  card?: CardWithTemplate;
  onRemove?: () => void;
  isDragTarget: boolean;
}) {
  if (!card) {
    return (
      <View
        style={[
          styles.deckSlotEmpty,
          isDragTarget && styles.deckSlotDropTarget,
        ]}
      >
        <Feather
          name={isDragTarget ? "download" : "plus"}
          size={24}
          color={isDragTarget ? colors.accentPrimary : colors.textTertiary}
        />
      </View>
    );
  }

  return (
    <View style={[styles.deckSlot, isDragTarget && styles.deckSlotDropTarget]}>
      <Image
        source={getCardImage(card.card_templates.image_url)}
        style={styles.deckSlotImage}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={styles.deckSlotRemove}
        activeOpacity={0.7}
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={12} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function CardGridItemContent({
  card,
  inDeck,
  onInfoPress,
  width,
}: {
  card: CardWithTemplate;
  inDeck: boolean;
  onInfoPress: () => void;
  width: number;
}) {
  return (
    <View
      style={[styles.gridCard, inDeck && styles.gridCardSelected, { width }]}
    >
      {/* Card image fills container */}
      <View style={styles.gridCardInner}>
        <Image
          source={getCardImage(card.card_templates.image_url)}
          style={styles.gridCardImage}
          resizeMode="contain"
        />
      </View>
      {/* Deck checkmark badge — top-left */}
      {inDeck && (
        <View style={styles.checkOverlay}>
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={colors.accentPrimary}
          />
        </View>
      )}
      {/* Info button — bottom-right */}
      <TouchableOpacity
        style={styles.infoBtn}
        activeOpacity={0.7}
        onPress={(e) => {
          e.stopPropagation();
          onInfoPress();
        }}
      >
        <Ionicons name="information-circle" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

type SlotRect = { x: number; y: number; width: number; height: number };

export default function InventoryScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - spacing.sm * 2 - GRID_GAP) / 2;

  // ── Stores ──
  const connectedPublicKey = useWalletStore((s) => s.connectedPublicKey);
  const storeCards = useCardStore((s) => s.myCards);
  const cardsLoading = useCardStore((s) => s.cardsLoading);
  const deck = useCardStore((s) => s.deck);
  const toggleDeckCard = useCardStore((s) => s.toggleDeckCard);
  const setDeckSlot = useCardStore((s) => s.setDeckSlot);
  const fetchMyCards = useCardStore((s) => s.fetchMyCards);

  // Preview mode — only when no wallet connected
  const isPreview = !connectedPublicKey;
  const myCards = isPreview ? PREVIEW_CARDS : storeCards;

  useEffect(() => {
    if (connectedPublicKey) {
      fetchMyCards(connectedPublicKey);
    }
  }, [connectedPublicKey, fetchMyCards]);

  // ── Deck data ──
  const deckCards = deck
    .map((id) => myCards.find((c) => c.id === id))
    .filter(Boolean) as CardWithTemplate[];

  const deckSlots: (CardWithTemplate | undefined)[] = [
    deckCards[0],
    deckCards[1],
    deckCards[2],
  ];

  // ── Modal state ──
  const [selectedCard, setSelectedCard] = useState<CardWithTemplate | null>(
    null,
  );

  // ── Save deck feedback state ──
  const [deckSaved, setDeckSaved] = useState(false);

  const handleSaveDeck = useCallback(() => {
    // Deck is already persisted via Zustand + AsyncStorage.
    // Show a brief confirmation so user knows it's saved.
    setDeckSaved(true);
    const t = setTimeout(() => setDeckSaved(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // ── Drag state ──
  const [draggedCard, setDraggedCard] = useState<CardWithTemplate | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragScale = useSharedValue(0);
  const dragOpacity = useSharedValue(0);

  // Deck slot positions (measured via onLayout + measureInWindow)
  const deckSlotRects = useRef<(SlotRect | null)[]>([null, null, null]);
  const deckSlotRefs = useRef<(View | null)[]>([null, null, null]);

  const measureDeckSlots = useCallback(() => {
    deckSlotRefs.current.forEach((ref, i) => {
      ref?.measureInWindow((x, y, width, height) => {
        deckSlotRects.current[i] = { x, y, width, height };
      });
    });
  }, []);

  // ── Drag handlers (called from UI thread via runOnJS) ──
  const onDragStart = useCallback(
    (card: CardWithTemplate) => {
      setDraggedCard(card);
      setIsDragging(true);
      measureDeckSlots();
    },
    [measureDeckSlots],
  );

  const onDragEnd = useCallback(
    (absX: number, absY: number) => {
      if (!draggedCard) {
        setIsDragging(false);
        return;
      }

      const slotIdx = deckSlotRects.current.findIndex((rect) => {
        if (!rect) return false;
        return (
          absX >= rect.x &&
          absX <= rect.x + rect.width &&
          absY >= rect.y &&
          absY <= rect.y + rect.height
        );
      });

      if (slotIdx !== -1) {
        setDeckSlot(slotIdx, draggedCard.id);
      }

      setDraggedCard(null);
      setIsDragging(false);
    },
    [draggedCard, setDeckSlot],
  );

  const onDragCancel = useCallback(() => {
    setDraggedCard(null);
    setIsDragging(false);
  }, []);

  // ── Render card with gesture ──
  const renderCard = useCallback(
    ({ item }: { item: CardWithTemplate }) => {
      const halfW = cardWidth / 2;

      const pan = Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        // Yield to vertical scroll immediately — only activate for horizontal drag
        .failOffsetY([-8, 8])
        .activeOffsetX([-10, 10])
        .onStart((e) => {
          dragX.value = e.absoluteX - halfW;
          dragY.value = e.absoluteY - 60;
          dragScale.value = withTiming(1.05, { duration: 150 });
          dragOpacity.value = withTiming(1, { duration: 100 });
          runOnJS(onDragStart)(item);
        })
        .onUpdate((e) => {
          dragX.value = e.absoluteX - halfW;
          dragY.value = e.absoluteY - 60;
        })
        .onEnd((e) => {
          dragScale.value = withTiming(0, { duration: 100 });
          dragOpacity.value = withTiming(0, { duration: 100 });
          runOnJS(onDragEnd)(e.absoluteX, e.absoluteY);
        })
        .onFinalize(() => {
          dragScale.value = 0;
          dragOpacity.value = 0;
          runOnJS(onDragCancel)();
        });

      return (
        <GestureDetector gesture={pan}>
          <Animated.View style={{ width: cardWidth }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleDeckCard(item.id)}
            >
              <CardGridItemContent
                card={item}
                inDeck={deck.includes(item.id)}
                onInfoPress={() => setSelectedCard(item)}
                width={cardWidth}
              />
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      );
    },
    [
      deck,
      cardWidth,
      dragX,
      dragY,
      dragScale,
      dragOpacity,
      onDragStart,
      onDragEnd,
      onDragCancel,
      toggleDeckCard,
    ],
  );

  // ── List header ──
  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        {/* Deck section */}
        <View style={styles.deckSection}>
          <View style={styles.deckHeader}>
            <Text style={styles.sectionTitle}>Battle Deck</Text>
            <View style={styles.deckHeaderRight}>
              <View style={styles.deckBadge}>
                <Text style={styles.deckBadgeText}>{deckCards.length}/3</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.saveDeckBtn,
                  deckSaved && styles.saveDeckBtnSaved,
                ]}
                activeOpacity={0.75}
                onPress={handleSaveDeck}
                disabled={deckCards.length === 0}
              >
                <Ionicons
                  name={deckSaved ? "checkmark-circle" : "save-outline"}
                  size={14}
                  color={deckSaved ? "#000" : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.saveDeckText,
                    deckSaved && styles.saveDeckTextSaved,
                  ]}
                >
                  {deckSaved ? "Saved!" : "Save Deck"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.deckRow}>
            {deckSlots.map((card, i) => (
              <View
                key={card?.id ?? `empty-${i}`}
                style={{ flex: 1 }}
                ref={(ref) => {
                  deckSlotRefs.current[i] = ref;
                }}
                onLayout={measureDeckSlots}
              >
                <DeckSlot
                  card={card}
                  onRemove={card ? () => toggleDeckCard(card.id) : undefined}
                  isDragTarget={isDragging}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Preview banner */}
        {isPreview && (
          <View style={styles.previewBanner}>
            <Ionicons
              name="eye-outline"
              size={16}
              color={colors.accentPrimary}
            />
            <Text style={styles.previewText}>
              Preview Mode — Connect wallet to see your cards
            </Text>
          </View>
        )}

        {/* All cards header */}
        <View style={styles.allCardsHeader}>
          <Text style={styles.sectionTitle}>All Cards</Text>
          <Text style={styles.cardCount}>{myCards.length} cards</Text>
        </View>
      </View>
    ),
    [
      deckCards.length,
      deckSlots,
      isDragging,
      isPreview,
      myCards.length,
      measureDeckSlots,
      toggleDeckCard,
      deckSaved,
      handleSaveDeck,
    ],
  );

  const EmptyState = useCallback(
    () => (
      <View style={styles.emptyCard}>
        <Ionicons name="layers-outline" size={36} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No cards yet</Text>
        <Text style={styles.emptyText}>
          Open a pack to get your first cards!
        </Text>
      </View>
    ),
    [],
  );

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {cardsLoading && !isPreview && myCards.length === 0 ? (
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
          scrollEnabled={!isDragging}
          decelerationRate="normal"
          overScrollMode="never"
          scrollEventThrottle={16}
          removeClippedSubviews
          windowSize={5}
          maxToRenderPerBatch={6}
          initialNumToRender={8}
          updateCellsBatchingPeriod={30}
        />
      )}

      {/* Drag ghost overlay */}
      <DragOverlay
        card={draggedCard}
        translateX={dragX}
        translateY={dragY}
        scale={dragScale}
        opacity={dragOpacity}
        width={cardWidth}
      />

      {/* Card detail modal */}
      <CardDetailModal
        card={selectedCard}
        visible={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

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
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deckHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    gap: GRID_GAP,
  },
  saveDeckBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgSurface,
  },
  saveDeckBtnSaved: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
  },
  saveDeckText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  saveDeckTextSaved: {
    color: "#000",
  },
  deckSlotEmpty: {
    flex: 1,
    height: 120,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  deckSlot: {
    flex: 1,
    height: 120,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accentPrimary,
    overflow: "hidden",
  },
  deckSlotDropTarget: {
    borderColor: colors.accentPrimary,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  deckSlotImage: {
    width: "100%",
    height: "100%",
    borderRadius: radii.sm - 1,
  },
  deckSlotRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // -- Preview banner --
  previewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(204, 255, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(204, 255, 0, 0.15)",
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },

  // -- All cards header --
  allCardsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardCount: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },

  // -- Card grid --
  gridRow: {
    gap: GRID_GAP,
    justifyContent: "flex-start",
  },
  gridCard: {
    borderRadius: radii.sm,
    overflow: "hidden",
    marginBottom: GRID_GAP,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#0d0d0d",
  },
  gridCardSelected: {
    borderColor: colors.accentPrimary,
    borderWidth: 2,
  },
  gridCardInner: {
    width: "100%",
    aspectRatio: 0.95,
    backgroundColor: "#0d0d0d",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardImage: {
    width: "100%",
    height: "100%",
  },
  checkOverlay: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 5,
  },

  // -- Empty state --
  emptyCard: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
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
