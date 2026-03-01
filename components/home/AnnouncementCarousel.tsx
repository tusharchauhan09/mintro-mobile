import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radii, spacing } from '@/constants/theme';

interface Announcement {
  id: string;
  title: string;
  description: string;
  tag: string;
  accentColor: string;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Season 1 Launch',
    description: 'The first competitive season begins. Climb the ranks and earn exclusive rewards.',
    tag: 'NEW SEASON',
    accentColor: colors.accentPrimary,
  },
  {
    id: '2',
    title: 'New Cards Available',
    description: '12 new cards across all elements have been added to the collection.',
    tag: 'COLLECTION',
    accentColor: '#3498DB',
  },
  {
    id: '3',
    title: 'Battle Arena Open',
    description: 'Build your deck and challenge other players in real-time card battles.',
    tag: 'ARENA',
    accentColor: colors.accentSecondary,
  },
];

const CARD_PADDING = spacing.sm;

export default function AnnouncementCarousel() {
  const { width } = useWindowDimensions();
  const cardWidth = width - CARD_PADDING * 2;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const index = Math.round(offset / cardWidth);
      setActiveIndex(index);
    },
    [cardWidth],
  );

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={cardWidth}
        contentContainerStyle={{ paddingRight: 0 }}
      >
        {ANNOUNCEMENTS.map((item) => (
          <LinearGradient
            key={item.id}
            colors={[colors.bgSurfaceElevated, colors.bgSurface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, { width: cardWidth }]}
          >
            <View style={[styles.glow, { backgroundColor: item.accentColor }]} />
            <View style={styles.cardContent}>
              <View style={styles.tag}>
                <View style={[styles.tagDot, { backgroundColor: item.accentColor }]} />
                <Text style={[styles.tagText, { color: item.accentColor }]}>{item.tag}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {ANNOUNCEMENTS.map((item, i) => (
          <View
            key={item.id}
            style={[
              styles.dot,
              i === activeIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 160,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -80,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.12,
    elevation: 80,
  },
  cardContent: {
    zIndex: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
  dotActive: {
    backgroundColor: colors.accentPrimary,
    width: 18,
  },
});
