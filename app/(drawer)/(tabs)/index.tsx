import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import AnnouncementCarousel from '@/components/home/AnnouncementCarousel';
import DeckPreview from '@/components/home/DeckPreview';
import { colors, spacing } from '@/constants/theme';
import { useWalletStore } from '@/stores/wallet-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCardStore } from '@/stores/card-store';

export default function HomeScreen() {
  const connectedPublicKey = useWalletStore((s) => s.connectedPublicKey);
  const fetchMyCards = useCardStore((s) => s.fetchMyCards);
  const fetchTemplates = useCardStore((s) => s.fetchTemplates);
  const fetchUserProfile = useAuthStore((s) => s.fetchUserProfile);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (connectedPublicKey) {
      fetchMyCards(connectedPublicKey);
      fetchUserProfile();
    }
  }, [connectedPublicKey, fetchMyCards, fetchUserProfile]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnnouncementCarousel />
        <DeckPreview />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgVoid,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: 120,
    gap: spacing.md,
  },
});
