import { Modal, View, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { getCardImage } from '@/constants/card-images';
import type { CardWithTemplate } from '@/types/database';

interface Props {
  card: CardWithTemplate | null;
  visible: boolean;
  onClose: () => void;
}

export default function CardDetailModal({ card, visible, onClose }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Animate card rotation on open
  const rotateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      rotateY.value = 0;
      rotateY.value = withTiming(360, { duration: 800, easing: Easing.out(Easing.cubic) });
    }
  }, [visible, rotateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotateY.value}deg` }],
  }));

  if (!card) return null;

  const imageSource = getCardImage(card.card_templates.image_url);

  // Card fills most of the screen — use portrait aspect ratio
  const cardWidth = screenWidth * 0.85;
  const cardHeight = screenHeight * 0.75;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Close button — top right */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Full-screen card image with rotation */}
        <Animated.View style={[styles.cardContainer, { width: cardWidth, height: cardHeight }, animatedStyle]}>
          <Image
            source={imageSource}
            style={styles.cardImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});
