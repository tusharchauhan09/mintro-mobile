import { ImageSourcePropType } from 'react-native';

/**
 * Maps image_url strings (from DB / preview data) to image sources.
 * Supports both local require() assets and remote Cloudinary URLs.
 */
const LOCAL_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  'assets/cards/f1.png': require('@/assets/cards/f1.png'),
  'assets/cards/f2.png': require('@/assets/cards/f2.png'),
  'assets/cards/f3.png': require('@/assets/cards/f3.png'),
  'assets/cards/little_wyrm.png': require('@/assets/cards/little_wyrm.png'),
  'assets/cards/neptunes_wrath.png': require('@/assets/cards/neptunes_wrath.png'),
  'assets/cards/valor_knight.png': require('@/assets/cards/valor_knight.png'),
  'assets/cards/the_rougue.png': require('@/assets/cards/the_rougue.png'),
  'assets/cards/the_paladin.png': require('@/assets/cards/the_paladin.png'),
  'assets/cards/the_ice_mage.png': require('@/assets/cards/the_ice_mage.png'),
};

const FALLBACK = require('@/assets/cards/f1.png');

export function getCardImage(imageUrl: string | null | undefined): ImageSourcePropType {
  if (!imageUrl) return FALLBACK;

  // Check local assets first
  if (LOCAL_IMAGE_MAP[imageUrl]) return LOCAL_IMAGE_MAP[imageUrl];

  // Remote URL (Cloudinary etc.) — return as { uri } source
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return { uri: imageUrl };
  }

  return FALLBACK;
}
