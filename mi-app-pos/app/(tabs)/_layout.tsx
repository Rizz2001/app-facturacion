import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

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
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {/* Tab principal — Punto de Venta */}
      <Tabs.Screen
        name="pos"
        options={{
          href: canSell ? '/(tabs)/pos' : null,
          title: 'Venta',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />

      {/* Productos */}
      <Tabs.Screen
        name="productos"
        options={{
          title: 'Productos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />

      {/* Clientes */}
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />

      {/* Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Caja — solo propietarios */}
      <Tabs.Screen
        name="caja"
        options={{
          href: !empleado ? '/(tabs)/caja' : null,
          title: 'Caja',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" size={size} color={color} />
          ),
        }}
      />

      {/* Deudas — solo propietarios */}
      <Tabs.Screen
        name="deudas"
        options={{
          href: !empleado ? '/(tabs)/deudas' : null,
          title: 'Cobros',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle" size={size} color={color} />
          ),
        }}
      />

      {/* Ocultar tabs auxiliares de la barra */}
      <Tabs.Screen name="ventas" options={{ href: null }} />
      <Tabs.Screen name="empleados" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />

      {/* SuperAdmin */}
      <Tabs.Screen
        name="superadmin"
        options={{
          href: isSuperAdmin ? '/(tabs)/superadmin' : null,
          title: 'Admin',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
