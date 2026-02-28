import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/routers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { PublicKey } from '@solana/web3.js';
import { colors, spacing, fonts, radii } from '@/constants/theme';
import { useWalletStore } from '@/stores/wallet-store';
import { APP_IDENTITY, getSolanaCluster } from '@/lib/solana';

/** Official Solana logo rendered as inline SVG. */
function SolanaLogo({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 508.07 398.17">
      <Defs>
        <LinearGradient id="sol_a" x1="463" y1="7.16" x2="182.39" y2="544.62" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00FFA3" />
          <Stop offset="1" stopColor="#DC1FFF" />
        </LinearGradient>
        <LinearGradient id="sol_b" x1="340.31" y1="-56.9" x2="59.71" y2="480.57" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00FFA3" />
          <Stop offset="1" stopColor="#DC1FFF" />
        </LinearGradient>
        <LinearGradient id="sol_c" x1="401.26" y1="-25.08" x2="120.66" y2="512.39" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00FFA3" />
          <Stop offset="1" stopColor="#DC1FFF" />
        </LinearGradient>
      </Defs>
      <Path
        d="M82.55 303.89A16.63 16.63 0 0 1 94.3 299h405.45a8.3 8.3 0 0 1 5.87 14.18l-80.09 80.09a16.61 16.61 0 0 1-11.75 4.86H8.33a8.31 8.31 0 0 1-5.88-14.18z"
        fill="url(#sol_a)"
      />
      <Path
        d="M82.55 4.85A17.08 17.08 0 0 1 94.3 0h405.45a8.3 8.3 0 0 1 5.87 14.18l-80.09 80.09a16.61 16.61 0 0 1-11.75 4.86H8.33A8.31 8.31 0 0 1 2.45 85z"
        fill="url(#sol_b)"
      />
      <Path
        d="M425.53 153.42a16.61 16.61 0 0 0-11.75-4.86H8.33a8.31 8.31 0 0 0-5.88 14.18l80.1 80.09a16.6 16.6 0 0 0 11.75 4.86h405.45a8.3 8.3 0 0 0 5.87-14.18z"
        fill="url(#sol_c)"
      />
    </Svg>
  );
}

// Safe require — MWA native module only exists in dev client builds, not Expo Go.
let transact: any = null;
try {
  transact = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js').transact;
} catch {
  // Native module not available (Expo Go) — transact stays null
}

/** Truncate a base58 public key to `Abcd…wxyz` form. */
function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Format SOL balance for display. */
function formatBalance(balance: number | null): string {
  if (balance === null) return '0.00';
  if (balance < 0.01 && balance > 0) return '<0.01';
  return balance.toFixed(2);
}

/** Decode base64 address to PublicKey (Phantom returns base64 encoded addresses). */
function decodeAddress(address: string): PublicKey {
  if (address.includes('=') || address.includes('+') || address.includes('/')) {
    const bytes = Uint8Array.from(atob(address), (c) => c.charCodeAt(0));
    return new PublicKey(bytes);
  }
  return new PublicKey(address);
}

export default function Header() {
  const insets = useSafeAreaInsets();
  const connectedPublicKey = useWalletStore((s) => s.connectedPublicKey);
  const solBalance = useWalletStore((s) => s.solBalance);
  const fetchBalance = useWalletStore((s) => s.fetchBalance);
  const navigation = useNavigation();
  const drawerNavigation = navigation.getParent('drawer' as any);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const connected = !!connectedPublicKey;
  const displayAddress = connectedPublicKey ? shortenAddress(connectedPublicKey) : '';

  // Fetch balance on connect & periodically refresh
  useEffect(() => {
    if (!connected) return;
    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [connected, fetchBalance]);

  const handleConnect = useCallback(async () => {
    if (!transact) {
      Alert.alert(
        'Wallet Not Found',
        'Unable to find a Solana wallet on this device. Please install Phantom or another Solana wallet app and make sure you are running a dev client build.',
        [{ text: 'OK' }],
      );
      return;
    }

    setConnecting(true);
    try {
      const walletAddress = await transact(async (wallet: any) => {
        const authResult = await wallet.authorize({
          cluster: getSolanaCluster(),
          identity: APP_IDENTITY,
        });

        if (!authResult.accounts || authResult.accounts.length === 0) {
          throw new Error('No accounts returned from wallet');
        }

        useWalletStore.getState().setAuthToken(authResult.auth_token);

        const pubkey = decodeAddress(authResult.accounts[0].address);
        return pubkey.toBase58();
      });

      useWalletStore.getState().setConnectedPublicKey(walletAddress);
    } catch (e: any) {
      if (__DEV__) console.error('[Header] connect failed:', e);

      const msg = (e?.message ?? '').toLowerCase();
      if (
        msg.includes('could not be found') ||
        msg.includes('turbomoduleregistry') ||
        msg.includes('no activities') ||
        msg.includes('activity not found')
      ) {
        Alert.alert(
          'Wallet Not Found',
          'Unable to find a Solana wallet on this device. Please install Phantom or another Solana wallet app and try again.',
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert(
          'Connection Failed',
          e?.message ?? 'Could not connect wallet. Please try again later.',
          [{ text: 'OK' }],
        );
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    useWalletStore.getState().clearSession();
    setDisconnecting(false);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Left: Hamburger */}
      <TouchableOpacity
        style={styles.iconBtn}
        activeOpacity={0.7}
        onPress={() => drawerNavigation?.dispatch(DrawerActions.openDrawer())}
      >
        <Feather name="menu" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Right side actions */}
      <View style={styles.actions}>
        {/* SOL balance pill */}
        <View style={styles.solPill}>
          <View style={styles.solIconWrap}>
            <SolanaLogo size={16} />
          </View>
          <Text style={styles.solValue}>
            {formatBalance(solBalance)} SOL
          </Text>
        </View>

        {/* Daily reward */}
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <View style={styles.badgeDot} />
          <Ionicons name="trophy-outline" size={19} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Wallet: connect or address+disconnect */}
        {connected ? (
          <View style={styles.walletRow}>
            <View style={styles.addressPill}>
              <View style={styles.addressDot} />
              <Text style={styles.addressText}>{displayAddress}</Text>
            </View>

            <TouchableOpacity
              style={styles.disconnectBtn}
              activeOpacity={0.7}
              onPress={handleDisconnect}
              disabled={disconnecting}
            >
              <Feather
                name="log-out"
                size={14}
                color={colors.accentSecondary}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.connectBtn}
            activeOpacity={0.8}
            onPress={handleConnect}
            disabled={connecting}
          >
            <Ionicons name="wallet-outline" size={15} color={colors.textOnAccent} />
            <Text style={styles.connectText}>
              {connecting ? 'Connecting…' : 'Connect'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8, 8, 8, 0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  solPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgSurface,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  solIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solValue: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    backgroundColor: colors.accentSecondary,
    borderWidth: 2,
    borderColor: colors.bgSurface,
    borderRadius: 5,
    zIndex: 1,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    backgroundColor: colors.bgSurface,
  },
  addressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentPrimary,
  },
  addressText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  disconnectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 77, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentPrimary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  connectText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textOnAccent,
  },
});
