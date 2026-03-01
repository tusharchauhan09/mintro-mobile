import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

export default function ConnectScreen() {
  const insets = useSafeAreaInsets();
  const authLoading = useAuthStore((s) => s.authLoading);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setError(null);
    try {
      await useAuthStore.getState().authenticateWithWallet();
      // Route guard in _layout.tsx handles redirect to (drawer)
    } catch (e: any) {
      const msg = (e?.message ?? '').toLowerCase();

      if (
        msg.includes('mwa not available') ||
        msg.includes('could not be found') ||
        msg.includes('turbomoduleregistry') ||
        msg.includes('no activities') ||
        msg.includes('activity not found')
      ) {
        Alert.alert(
          'Wallet Not Found',
          'Please install Phantom or another Solana wallet app and use a dev client build.',
          [{ text: 'OK' }],
        );
      } else if (msg.includes('user reject') || msg.includes('cancel')) {
        // User cancelled — don't show error
      } else {
        setError(e?.message ?? 'Connection failed. Please try again.');
      }
    }
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {/* Branding */}
      <View style={styles.brandSection}>
        <View style={styles.logoCircle}>
          <Ionicons name="flash" size={40} color={colors.accentPrimary} />
        </View>
        <Text style={styles.title}>CyberCard Arena</Text>
        <Text style={styles.subtitle}>
          Connect your Solana wallet to enter the arena
        </Text>
      </View>

      {/* Connect */}
      <View style={styles.bottomSection}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.connectBtn, authLoading && styles.connectBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleConnect}
          disabled={authLoading}
        >
          {authLoading ? (
            <ActivityIndicator size="small" color={colors.textOnAccent} />
          ) : (
            <Ionicons
              name="wallet-outline"
              size={20}
              color={colors.textOnAccent}
            />
          )}
          <Text style={styles.connectText}>
            {authLoading ? 'Connecting...' : 'Connect Wallet'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Solana Devnet</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgVoid,
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  brandSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  bottomSection: {
    gap: 16,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 77, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 0, 0.2)',
    borderRadius: radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.accentSecondary,
    textAlign: 'center',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accentPrimary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: radii.pill,
    width: '100%',
  },
  connectBtnDisabled: {
    opacity: 0.7,
  },
  connectText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.textOnAccent,
  },
  footerText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
  },
});
