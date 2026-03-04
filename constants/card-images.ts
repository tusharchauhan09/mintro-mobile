import { ImageSourcePropType } from 'react-native';

/**
 * Resolves an image_url (from DB card_templates) to a React Native image source.
 * All card images are remote Cloudinary URLs — no local assets.
 */

const FALLBACK_URI =
  'https://res.cloudinary.com/du8ekvenq/image/upload/v1772546566/little_wyrm_uqxcpq.png';

export function getCardImage(imageUrl: string | null | undefined): ImageSourcePropType {
  if (!imageUrl) return { uri: FALLBACK_URI };

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return { uri: imageUrl };
  }

  return { uri: FALLBACK_URI };
}
