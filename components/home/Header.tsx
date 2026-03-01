import { colors, fonts, radii, spacing } from "@/constants/theme";
import { useWalletStore } from "@/stores/wallet-store";
import { useAuthStore } from "@/stores/auth-store";
import { Feather, Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/routers";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

/** Official Solana logo rendered as inline SVG. */
function SolanaLogo({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 508.07 398.17">
      <Defs>
        <LinearGradient
          id="sol_a"
          x1="463"
          y1="7.16"
          x2="182.39"
          y2="544.62"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#00FFA3" />
          <Stop offset="1" stopColor="#DC1FFF" />
        </LinearGradient>
        <LinearGradient
          id="sol_b"
          x1="340.31"
          y1="-56.9"
          x2="59.71"
          y2="480.57"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#00FFA3" />
          <Stop offset="1" stopColor="#DC1FFF" />
        </LinearGradient>
        <LinearGradient
          id="sol_c"
          x1="401.26"
          y1="-25.08"
          x2="120.66"
          y2="512.39"
          gradientUnits="userSpaceOnUse"
        >
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

/** Truncate a base58 public key to `Abcd…wxyz` form. */
function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Format SOL balance for display. */
function formatBalance(balance: number | null): string {
  if (balance === null) return "0.00";
  if (balance < 0.01 && balance > 0) return "<0.01";
  return balance.toFixed(2);
}

export default function Header() {
  const insets = useSafeAreaInsets();
  const connectedPublicKey = useWalletStore((s) => s.connectedPublicKey);
  const solBalance = useWalletStore((s) => s.solBalance);
  const fetchBalance = useWalletStore((s) => s.fetchBalance);
  const authLoading = useAuthStore((s) => s.authLoading);
  const navigation = useNavigation();
  const [disconnecting, setDisconnecting] = useState(false);

  const connected = !!connectedPublicKey;
  const displayAddress = connectedPublicKey
    ? shortenAddress(connectedPublicKey)
    : "";

  // Fetch balance on connect & periodically refresh
  useEffect(() => {
    if (!connected) return;
    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [connected, fetchBalance]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await useAuthStore.getState().logout();
    } catch (e) {
      if (__DEV__) console.warn("[Header] logout failed:", e);
    } finally {
      setDisconnecting(false);
    }
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      await useAuthStore.getState().authenticateWithWallet();
    } catch (e: any) {
      const msg = (e?.message ?? "").toLowerCase();
      if (
        msg.includes("mwa not available") ||
        msg.includes("could not be found") ||
        msg.includes("turbomoduleregistry") ||
        msg.includes("no activities") ||
        msg.includes("activity not found")
      ) {
        Alert.alert(
          "Wallet Not Found",
          "Please install Phantom or another Solana wallet app and use a dev client build.",
          [{ text: "OK" }],
        );
      } else if (msg.includes("user reject") || msg.includes("cancel")) {
        // User cancelled — silent
      } else {
        Alert.alert("Connection Failed", e?.message ?? "Please try again.");
      }
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Left: Hamburger */}
      <TouchableOpacity
        style={styles.iconBtn}
        activeOpacity={0.7}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
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
          <Text style={styles.solValue}>{formatBalance(solBalance)} SOL</Text>
        </View>

        {/* Daily reward */}
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.7}
          onPress={() => Alert.alert("Coming Soon", "Daily rewards will be available in a future update.")}
        >
          <View style={styles.badgeDot} />
          <Ionicons
            name="trophy-outline"
            size={19}
            color={colors.textPrimary}
          />
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
                size={15}
                color={colors.textOnAccent}
              />
            )}
            <Text style={styles.connectText}>
              {authLoading ? "Connecting..." : "Connect"}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(8, 8, 8, 0.92)",
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
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  solPill: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "#1A1A2E",
    alignItems: "center",
    justifyContent: "center",
  },
  solValue: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  badgeDot: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addressPill: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "rgba(255, 77, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accentPrimary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  connectBtnDisabled: {
    opacity: 0.7,
  },
  connectText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textOnAccent,
  },
});
