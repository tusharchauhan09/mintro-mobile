import { Image, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { colors, radii } from '@/constants/theme';
import { getCardImage } from '@/constants/card-images';
import type { CardWithTemplate } from '@/types/database';

interface Props {
  card: CardWithTemplate | null;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  width: number;
}

export default function DragOverlay({ card, translateX, translateY, scale, opacity, width }: Props) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!card) return null;

  const imageSource = getCardImage(card.card_templates.image_url);

  return (
    <Animated.View style={[styles.ghost, { width }, animatedStyle]} pointerEvents="none">
      <Image
        source={imageSource}
        style={styles.ghostImage}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    top: 0,
    left: 0,
    aspectRatio: 0.7,
    borderRadius: radii.sm,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  ghostImage: {
    width: '100%',
    height: '100%',
  },
});
