import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fonts, radii } from '@/constants/theme';
import { useWalletStore } from '@/stores/wallet-store';

/** Truncate a base58 public key to `Abcd…wxyz` form. */
function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export default function Header() {
  const insets = useSafeAreaInsets();
  const connectedPublicKey = useWalletStore((s) => s.connectedPublicKey);
  const [connecting, setConnecting] = useState(false);

  const connected = !!connectedPublicKey;
  const displayAddress = connectedPublicKey ? shortenAddress(connectedPublicKey) : '';

  /** Lazy-import useWallet so the native MWA module isn't loaded at startup. */
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { transact } = await import(
        '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
      );
      const { APP_IDENTITY, SOLANA_CLUSTER } = await import('@/lib/solana');

      const walletAddress = await transact(async (wallet: any) => {
        const authResult = await wallet.authorize({
          cluster: SOLANA_CLUSTER,
          identity: APP_IDENTITY,
        });
        if (!authResult.accounts?.length) {
          throw new Error('No accounts returned by wallet');
        }
        useWalletStore.getState().setAuthToken(authResult.auth_token);
        return authResult.accounts[0].address;
      });

      // Decode address (may be base64 from Phantom)
      const { PublicKey } = await import('@solana/web3.js');
      let base58: string;
      if (/[+/=\-_]/.test(walletAddress) || walletAddress.length > 44) {
        const b64 = walletAddress
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(walletAddress.length + ((4 - (walletAddress.length % 4)) % 4), '=');
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        base58 = new PublicKey(bytes).toBase58();
      } else {
        base58 = new PublicKey(walletAddress).toBase58();
      }

      useWalletStore.getState().setConnectedPublicKey(base58);
    } catch (e: any) {
      if (__DEV__) console.error('[Header] connect failed:', e);
      Alert.alert('Connection failed', e?.message ?? 'Could not connect wallet');
    } finally {
      setConnecting(false);
    }
  };

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

        {connected ? (
          /* Profile avatar + public key */
          <View style={styles.profileRow}>
            <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7}>
              <Image
                source={`https://ui-avatars.com/api/?name=${displayAddress}&background=333&color=fff`}
                style={styles.profileImg}
              />
            </TouchableOpacity>
            <Text style={styles.addressText} numberOfLines={1}>
              {displayAddress}
            </Text>
          </View>
        ) : (
          /* Connect wallet button */
          <TouchableOpacity
            style={styles.connectBtn}
            activeOpacity={0.7}
            onPress={handleConnect}
            disabled={connecting}
          >
            <Ionicons name="wallet-outline" size={16} color="#000" />
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.accentPrimary,
    backgroundColor: colors.bgSurfaceElevated,
  },
  profileImg: {
    width: '100%',
    height: '100%',
  },
  addressText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentPrimary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  connectText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#000',
  },
});
