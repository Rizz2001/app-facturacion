import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(nombre?: string | null): string {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Row de acción ────────────────────────────────────────────────────────────
function ActionRow({ icon, label, desc, color, bg, onPress, rightEl }: any) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  return (
    <TouchableOpacity style={s.actionRow} onPress={onPress} activeOpacity={0.75} disabled={!onPress && !rightEl}>
      <View style={[s.actionIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.actionLabel}>{label}</Text>
        {desc && <Text style={s.actionDesc}>{desc}</Text>}
      </View>
      {rightEl ?? <Ionicons name="chevron-forward" size={15} color={C.textMuted} />}
    </TouchableOpacity>
  );
}

// ─── Badge de permiso ─────────────────────────────────────────────────────────
function PermRow({ label, activo }: { label: string; activo: boolean }) {
  const { colors: C } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    }}>
      <Ionicons
        name={activo ? 'checkmark-circle' : 'close-circle'}
        size={18}
        color={activo ? C.success : C.textMuted}
      />
      <Text style={{ flex: 1, marginLeft: 10, fontSize: 14, color: activo ? C.text : C.textMuted, fontWeight: '500' }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const { colors: C } = useTheme();
  return (
    <Text style={{
      fontSize: 11, fontWeight: '700', color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: 1,
      paddingHorizontal: 22, marginTop: 24, marginBottom: 8,
    }}>
      {title}
    </Text>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PerfilScreen() {
  const { colors: C, isDark, setTheme } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { profile, empleado, isSuperAdmin, user, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const nombre = profile?.nombre || empleado?.nombre || user?.email?.split('@')[0] || 'Usuario';
  const email  = user?.email || profile?.email || '';
  const initials = getInitials(nombre);

  let rolLabel = 'Propietario';
  let rolColor = C.primary;
  let rolBg    = C.primaryBg;
  let rolIcon: any = 'business-outline';

  if (isSuperAdmin) {
    rolLabel = 'Super Admin'; rolColor = '#F59E0B'; rolBg = '#FEF3C7'; rolIcon = 'shield-checkmark';
  } else if (empleado) {
    rolLabel = 'Empleado'; rolColor = C.info; rolBg = C.infoBg; rolIcon = 'person-outline';
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Avatar Hero ──────────────────────────────────────── */}
      <View style={s.hero}>
        <View style={s.heroBg} />
        <View style={[s.avatarWrap, { backgroundColor: rolColor }]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.heroName}>{nombre}</Text>
        <Text style={s.heroEmail}>{email}</Text>
        <View style={[s.rolBadge, { backgroundColor: rolBg }]}>
          <Ionicons name={rolIcon} size={12} color={rolColor} />
          <Text style={[s.rolText, { color: rolColor }]}>{rolLabel}</Text>
        </View>
        {!empleado && profile?.empresa && (
          <View style={[s.empresaBadge, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="business" size={13} color={C.primary} />
            <Text style={[s.empresaText, { color: C.text }]}>{profile.empresa}</Text>
          </View>
        )}
      </View>

      {/* ── Permisos (empleado) ──────────────────────────────── */}
      {empleado && (
        <>
          <SectionHeader title="Mis Permisos" />
          <View style={s.card}>
            <PermRow label="Punto de Venta"    activo={empleado.permiso_ventas} />
            <PermRow label="Productos / Precios" activo={empleado.permiso_productos} />
            <PermRow label="Eliminar Ventas"   activo={empleado.permiso_eliminar_facturas} />
            <PermRow label="Cambiar Tasa BCV"  activo={empleado.permiso_modificar_tasa} />
          </View>
        </>
      )}

      {/* ── Acciones rápidas ─────────────────────────────────── */}
      <SectionHeader title="Accesos" />
      <View style={s.card}>
        {empleado ? (
          <ActionRow
            icon="receipt-outline" label="Mis Ventas" desc="Historial de mis transacciones"
            color={C.success} bg={C.successBg}
            onPress={() => router.push('/mis-ventas')}
          />
        ) : (
          <>
            <ActionRow
              icon="storefront-outline" label="Sucursales" desc="Administrar puntos de venta"
              color={C.primary} bg={C.primaryBg}
              onPress={() => router.push('/sucursales')}
            />
            <ActionRow
              icon="people-outline" label="Equipo" desc="Gestionar empleados y permisos"
              color={C.warning} bg={C.warningBg}
              onPress={() => router.push('/empleados')}
            />
          </>
        )}
        {isSuperAdmin && (
          <ActionRow
            icon="shield-checkmark-outline" label="Panel SuperAdmin" desc="Administración global del sistema"
            color="#F59E0B" bg="#FEF3C7"
            onPress={() => router.push('/(tabs)/superadmin')}
          />
        )}
      </View>

      {/* ── Preferencias ─────────────────────────────────────── */}
      <SectionHeader title="Preferencias" />
      <View style={s.card}>
        <ActionRow
          icon={isDark ? 'sunny-outline' : 'moon-outline'}
          label={isDark ? 'Modo Claro' : 'Modo Oscuro'}
          desc={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          color="#F59E0B" bg="#FEF3C7"
          rightEl={
            <Switch
              value={isDark}
              onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor={isDark ? '#fff' : '#fff'}
            />
          }
        />
      </View>

      {/* ── Cuenta ───────────────────────────────────────────── */}
      <SectionHeader title="Cuenta" />
      <View style={s.card}>
        <View style={[s.infoRow, { borderBottomColor: C.border }]}>
          <Text style={s.infoLabel}>Correo</Text>
          <Text style={s.infoValue} numberOfLines={1}>{email}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Tipo de cuenta</Text>
          <Text style={[s.infoValue, { color: rolColor }]}>{rolLabel}</Text>
        </View>
      </View>

      {/* ── Cerrar sesión ─────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 8 }}>
        <TouchableOpacity
          style={[s.signOutBtn, { borderColor: C.error + '55', backgroundColor: C.errorBg }]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.82}
        >
          <Ionicons name="log-out-outline" size={20} color={C.error} />
          <Text style={[s.signOutText, { color: C.error }]}>
            {signingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={s.version}>System RISAN · Expo + Supabase</Text>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (C: any) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.background },
  content: { paddingBottom: 50 },

  // Hero
  hero:   { alignItems: 'center', paddingBottom: 28, marginBottom: 4, overflow: 'hidden' },
  heroBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: C.surface,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 56 : 62, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  heroName:   { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 4 },
  heroEmail:  { fontSize: 13, color: C.textMuted, marginBottom: 10 },
  rolBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 8 },
  rolText:    { fontSize: 12, fontWeight: '700' },
  empresaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  empresaText:  { fontSize: 12, fontWeight: '600' },

  // Card
  card: {
    marginHorizontal: 20, backgroundColor: C.surface,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  actionIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  actionDesc:  { fontSize: 12, color: C.textMuted, marginTop: 1 },

  // Info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 13, fontWeight: '700', color: C.text, maxWidth: '60%', textAlign: 'right' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 15, borderRadius: 16, borderWidth: 1,
  },
  signOutText: { fontSize: 15, fontWeight: '700' },

  version: { textAlign: 'center', color: C.textMuted, fontSize: 11, marginTop: 16 },
});
