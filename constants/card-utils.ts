import { colors } from '@/constants/theme';

export function getGradientForRarity(rarity: string): readonly [string, string] {
  switch (rarity) {
    case 'LEGENDARY':
      return ['#FFD700', '#B8860B'] as const;
    case 'EPIC':
      return ['#9B59B6', '#6C3483'] as const;
    case 'RARE':
      return ['#3498DB', '#2471A3'] as const;
    default:
      return [colors.gradientCardA[0], colors.gradientCardA[1]] as const;
  }
}

export function getElementIcon(element: string): string {
  switch (element) {
    case 'FIRE': return 'flame-outline';
    case 'WATER': return 'water-outline';
    case 'EARTH': return 'leaf-outline';
    case 'AIR': return 'cloud-outline';
    case 'LIGHTNING': return 'flash-outline';
    case 'SHADOW': return 'moon-outline';
    default: return 'help-circle-outline';
  }
}
