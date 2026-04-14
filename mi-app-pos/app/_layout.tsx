import { useEffect, useMemo } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TasaProvider } from '@/context/TasaContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { OfflineProvider } from '@/context/OfflineContext';
import { OfflineBanner } from '@/components/OfflineBanner';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  
  const styles = useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="venta/[id]"
          options={{
            headerShown: true,
            title: 'Detalle de Venta',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="cliente/nuevo"
          options={{
            headerShown: true,
            title: 'Nuevo Cliente',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="producto/nuevo"
          options={{
            headerShown: true,
            title: 'Nuevo Producto',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen name="mis-ventas" options={{ headerShown: false }} />
        <Stack.Screen name="sucursales" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TasaProvider>
          <OfflineProvider>
            <RootLayoutNav />
          </OfflineProvider>
        </TasaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const getStyles = (c: any) => StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
  },
});
