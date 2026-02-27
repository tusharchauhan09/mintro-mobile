import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fonts } from '@/constants/theme';

export default function Header() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
        <Feather name="menu" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.actions}>
        {/* Token pill */}
        <View style={styles.tokenPill}>
          <View style={styles.tokenIcon}>
            <Feather name="zap" size={12} color="#000" />
          </View>
          <Text style={styles.tokenVal}>2,405 SOL</Text>
        </View>

        {/* Daily reward */}
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <View style={styles.badgeDot} />
          <Ionicons name="trophy-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Profile avatar */}
        <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7}>
          <Image
            source="https://ui-avatars.com/api/?name=Alex+D&background=333&color=fff"
            style={styles.profileImg}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8, 8, 8, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#000',
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tokenIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenVal: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    backgroundColor: colors.accentSecondary,
    borderWidth: 2,
    borderColor: colors.bgSurface,
    borderRadius: 5,
    zIndex: 1,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgSurfaceElevated,
  },
  profileImg: {
    width: '100%',
    height: '100%',
  },
});
