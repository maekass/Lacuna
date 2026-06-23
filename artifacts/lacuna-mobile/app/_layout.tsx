import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useColors } from "@/hooks/useColors";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

/**
 * On web, the native phone UI would otherwise stretch edge-to-edge across the
 * browser. WebFrame centers the app in a fixed phone-width column on a muted
 * page backdrop so the web export reads as an intentional phone-style site.
 * On native it renders children untouched.
 */
function WebFrame({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }
  return (
    <View style={styles.webPage}>
      <View
        style={[
          styles.webFrame,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={styles.flex}>
            <KeyboardProvider>
              <WebFrame>
                <RootLayoutNav />
              </WebFrame>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  webPage: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#e7e1ea",
  },
  webFrame: {
    flex: 1,
    width: "100%",
    maxWidth: 448,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
});
