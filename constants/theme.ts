export const colors = {
  bgVoid: '#080808',
  bgSurface: '#141414',
  bgSurfaceElevated: '#1F1F1F',

  accentPrimary: '#CCFF00',
  accentGlow: 'rgba(204, 255, 0, 0.4)',
  accentSecondary: '#FF4D00',

  textPrimary: '#FFFFFF',
  textSecondary: '#999999',
  textTertiary: '#555555',
  textOnAccent: '#000000',

  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderHighlight: 'rgba(255, 255, 255, 0.15)',

  navBarBg: 'rgba(20, 20, 20, 0.95)',
  navBarBorder: 'rgba(255, 255, 255, 0.1)',
  navTabActive: 'rgba(255, 255, 255, 0.08)',
  shadow: '#000000',

  gradientCardA: ['#333333', '#111111'] as const,
  gradientCardB: ['#2a2a2a', '#1a1a1a'] as const,
} as const;

export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
} as const;

export const radii = {
  sm: 12,
  md: 20,
  lg: 32,
  pill: 999,
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;
