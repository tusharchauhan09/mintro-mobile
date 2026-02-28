import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { colors, spacing, fonts, radii } from '@/constants/theme';
import { useWalletStore, type SolanaCluster } from '@/stores/wallet-store';

function CustomDrawerContent(_props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const cluster = useWalletStore((s) => s.cluster);
  const setCluster = useWalletStore((s) => s.setCluster);

  const handleClusterChange = useCallback(
    (next: SolanaCluster) => {
      if (next !== cluster) {
        setCluster(next);
      }
    },
    [cluster, setCluster],
  );

  return (
    <View style={[styles.drawerContainer, { paddingTop: insets.top + spacing.md }]}>
      {/* App title */}
      <Text style={styles.title}>CyberCard Arena</Text>

      {/* Network section */}
      <Text style={styles.sectionLabel}>NETWORK</Text>

      <View style={styles.clusterRow}>
        <ClusterButton
          label="Devnet"
          active={cluster === 'devnet'}
          onPress={() => handleClusterChange('devnet')}
        />
        <ClusterButton
          label="Mainnet"
          active={cluster === 'mainnet-beta'}
          onPress={() => handleClusterChange('mainnet-beta')}
        />
      </View>

      <Text style={styles.clusterHint}>
        {cluster === 'devnet'
          ? 'Using Devnet — test tokens only'
          : 'Using Mainnet — real SOL'}
      </Text>
    </View>
  );
}

function ClusterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.clusterBtn, active && styles.clusterBtnActive]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.radioDot, active && styles.radioDotActive]} />
      <Text style={[styles.clusterBtnText, active && styles.clusterBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Drawer
        id={"drawer" as any}
        screenOptions={{
          headerShown: false,
          drawerStyle: styles.drawerStyle,
          drawerType: 'front',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          swipeEnabled: true,
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen name="(tabs)" />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  drawerStyle: {
    backgroundColor: colors.bgSurface,
    width: 280,
  },
  drawerContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSurface,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  clusterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xs,
  },
  clusterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgVoid,
  },
  clusterBtnActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: 'rgba(204, 255, 0, 0.06)',
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textTertiary,
  },
  radioDotActive: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.accentPrimary,
  },
  clusterBtnText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  clusterBtnTextActive: {
    color: colors.textPrimary,
  },
  clusterHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginTop: 4,
  },
});
