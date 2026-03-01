import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [timedOut, setTimedOut] = useState(false);

  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const sessionToken = useAuthStore((s) => s.sessionToken);

  // Safety timeout — if fonts don't load within 5s, proceed anyway
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5_000);
    return () => clearTimeout(timer);
  }, []);

  const fontsReady = fontsLoaded || !!fontError || timedOut;
  const ready = fontsReady && hasHydrated;

  // Clear expired session on hydration
  useEffect(() => {
    if (!hasHydrated) return;
    const { isSessionExpired, clearAuth } = useAuthStore.getState();
    if (sessionToken && isSessionExpired()) {
      clearAuth();
    }
  }, [hasHydrated, sessionToken]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (__DEV__ && fontError) {
    console.warn("[RootLayout] Font loading error:", fontError);
  }

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(drawer)" />
      </Stack>
    </>
  );
}
