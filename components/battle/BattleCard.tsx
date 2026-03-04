import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import type { CardWithTemplate } from '@/types/database';
import { getCardImage } from '@/constants/card-images';
import { getElementIcon } from '@/constants/card-utils';
import { getElementColor } from '@/constants/battle-utils';
import HPBar from './HPBar';
import { colors, fonts, radii } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface BattleCardProps {
  card: CardWithTemplate;
  currentHp: number;
  maxHp: number;
  isActive?: boolean;
  isKO?: boolean;
  isPlayer?: boolean;
  size?: 'small' | 'large';
  shakeOnHit?: boolean;
}

export default function BattleCard({
  card,
  currentHp,
  maxHp,
  isActive = false,
  isKO = false,
  isPlayer = true,
  size = 'large',
  shakeOnHit = false,
}: BattleCardProps) {
  const shakeX = useSharedValue(0);
  const scaleVal = useSharedValue(1);

  useEffect(() => {
    if (shakeOnHit) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      scaleVal.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withDelay(150, withTiming(1, { duration: 200 })),
      );
    }
  }, [shakeOnHit]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: scaleVal.value }],
  }));

  const isLarge = size === 'large';
  const element = card.card_templates.element;
  const elemColor = getElementColor(element);
  const imageSource = getCardImage(card.card_templates.image_url);

  return (
    <Animated.View
      style={[
        styles.card,
        isLarge ? styles.cardLarge : styles.cardSmall,
        isActive && {
          borderColor: isPlayer ? colors.accentPrimary : colors.accentSecondary,
          borderWidth: 2,
        },
        isKO && styles.cardKO,
        animStyle,
      ]}
    >
      <Image
        source={imageSource}
        style={isLarge ? styles.imageLarge : styles.imageSmall}
        resizeMode="cover"
      />

      {/* Element badge */}
      <View style={[styles.elementBadge, { backgroundColor: elemColor }]}>
        <Ionicons
          name={getElementIcon(element) as any}
          size={isLarge ? 14 : 10}
          color="#fff"
        />
      </View>

      {/* Name */}
      {isLarge && (
        <Text style={styles.name} numberOfLines={1}>
          {card.card_templates.name}
        </Text>
      )}

      {/* HP Bar */}
      <View style={styles.hpContainer}>
        <HPBar current={currentHp} max={maxHp} showLabel={isLarge} height={isLarge ? 6 : 4} />
      </View>

      {/* Stats (large only) */}
      {isLarge && (
        <View style={styles.statsRow}>
          <Text style={styles.stat}>ATK {card.attack}</Text>
          <Text style={styles.stat}>DEF {card.defense}</Text>
        </View>
      )}

      {/* KO Overlay */}
      {isKO && (
        <View style={styles.koOverlay}>
          <Text style={styles.koText}>KO</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurfaceElevated,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardLarge: {
    width: 140,
    alignItems: 'center',
  },
  cardSmall: {
    width: 70,
    alignItems: 'center',
  },
  cardKO: {
    opacity: 0.4,
  },
  imageLarge: {
    width: 140,
    height: 100,
  },
  imageSmall: {
    width: 70,
    height: 50,
  },
  elementBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginTop: 4,
    paddingHorizontal: 6,
  },
  hpContainer: {
    width: '100%',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  stat: {
    fontSize: 9,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  koOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  koText: {
    fontSize: 20,
    fontFamily: fonts.extraBold,
    color: colors.battleHpRed,
  },
});
