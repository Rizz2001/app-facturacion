import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

function TabIcon({ name, focused, color }: { name: any; focused: boolean; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: colors.primaryGlow }]}>
      <Ionicons name={focused ? name : `${name}-outline` as any} size={22} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { empleado, isSuperAdmin } = useAuth();

  const canSell = !empleado || empleado.permiso_ventas;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          paddingTop: 8,
          paddingHorizontal: 16,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginTop: 1 },
      }}
    >
      {/* ── TAB 1: Ventas (POS) ── */}
      <Tabs.Screen
        name="pos"
        options={{
          href: canSell ? '/(tabs)/pos' : null,
          title: 'Ventas',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="cart" focused={focused} color={color} />
          ),
        }}
      />

      {/* ── TAB 2: Inicio (Dashboard) ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />

      {/* ── TAB 3: Perfil ── */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="person" focused={focused} color={color} />
          ),
        }}
      />

      {/* ── Ocultos de la barra (accesibles desde Dashboard) ── */}
      <Tabs.Screen name="productos"   options={{ href: null }} />
      <Tabs.Screen name="clientes"    options={{ href: null }} />
      <Tabs.Screen name="caja"        options={{ href: null }} />
      <Tabs.Screen name="deudas"      options={{ href: null }} />
      <Tabs.Screen name="ventas"      options={{ href: null }} />
      <Tabs.Screen name="empleados"   options={{ href: null }} />
      <Tabs.Screen name="superadmin"  options={{ href: isSuperAdmin ? '/(tabs)/superadmin' : null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 48,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
