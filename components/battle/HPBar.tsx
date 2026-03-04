import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';

interface HPBarProps {
  current: number;
  max: number;
  showLabel?: boolean;
  height?: number;
}

function getHpColor(pct: number): string {
  if (pct > 0.5) return colors.battleHpGreen;
  if (pct > 0.25) return colors.battleHpYellow;
  return colors.battleHpRed;
}

export default function HPBar({ current, max, showLabel = true, height = 8 }: HPBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const widthAnim = useSharedValue(pct);
  const color = getHpColor(pct);

  useEffect(() => {
    widthAnim.value = withTiming(pct, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [pct]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${widthAnim.value * 100}%` as any,
  }));

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={styles.label}>
          {current}/{max}
        </Text>
      )}
      <View style={[styles.track, { height }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, animStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    marginBottom: 2,
    textAlign: 'right',
  },
  track: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
