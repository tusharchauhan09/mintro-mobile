import { ScrollView, StyleSheet, View } from 'react-native';
import HeroCard from '@/components/home/HeroCard';
import StatsGrid from '@/components/home/StatsGrid';
import RosterSection from '@/components/home/RosterSection';
import { colors, spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HeroCard />
        <StatsGrid />
        <RosterSection />
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
