import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';

// Genera iniciales a partir de un nombre completo
function getInitials(nombre?: string | null): string {
  if (!nombre) return '?';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface PermisoBadgeProps {
  label: string;
  icon: any;
  activo: boolean;
  descripcion: string;
}

function PermisoBadge({ label, icon, activo, descripcion }: PermisoBadgeProps) {
  const { colors } = useTheme();
  return (
    <View style={[
      styles.permisoBadge,
      {
        backgroundColor: activo ? colors.successBg : colors.surface,
        borderColor: activo ? colors.success : colors.border,
      }
    ]}>
      <View style={[
        styles.permisoIconWrap,
        { backgroundColor: activo ? colors.success + '22' : colors.border }
      ]}>
        <Ionicons
          name={icon}
          size={16}
          color={activo ? colors.success : colors.textMuted}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.permisoLabel, { color: activo ? colors.text : colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.permisoDesc, { color: colors.textMuted }]}>
          {descripcion}
        </Text>
      </View>
      <Ionicons
        name={activo ? 'checkmark-circle' : 'close-circle'}
        size={20}
        color={activo ? colors.success : colors.border}
      />
    </View>
  );
}

interface ProfileAvatarProps {
  size?: number;
}

export function ProfileAvatar({ size = 38 }: ProfileAvatarProps) {
  const { profile, empleado, isSuperAdmin, signOut, user } = useAuth();
  const { colors, isDark, setTheme } = useTheme();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const nombre = profile?.nombre || empleado?.nombre || user?.email?.split('@')[0] || 'Usuario';
  const email = user?.email || profile?.email || '';
  const initials = getInitials(nombre);

  // Determinar rol
  let rolLabel = 'Propietario';
  let rolColor = colors.primary;
  let rolBg = colors.primaryBg;
  let rolIcon: any = 'business-outline';

  if (isSuperAdmin) {
    rolLabel = 'Super Admin';
    rolColor = '#F59E0B';
    rolBg = '#FEF3C7';
    rolIcon = 'shield-checkmark';
  } else if (empleado) {
    rolLabel = 'Empleado';
    rolColor = colors.info;
    rolBg = colors.infoBg;
    rolIcon = 'person-outline';
  }

  const handleSignOut = async () => {
    setVisible(false);
    setTimeout(() => signOut(), 300);
  };

  return (
    <>
      {/* Avatar Touch */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
        style={[
          styles.avatarBtn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: rolColor,
          },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
        {/* Badge de rol en esquina */}
        <View style={[
          styles.rolDot,
          { backgroundColor: rolColor, borderColor: colors.background }
        ]}>
          <Ionicons name={rolIcon} size={8} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Modal Sheet */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Header de perfil */}
            <View style={[styles.profileHeader, { borderBottomColor: colors.border }]}>
              {/* Avatar grande */}
              <View style={[
                styles.avatarLg,
                { backgroundColor: rolColor }
              ]}>
                <Text style={styles.avatarLgText}>{initials}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.nombreText, { color: colors.text }]} numberOfLines={1}>
                  {nombre}
                </Text>
                <Text style={[styles.emailText, { color: colors.textMuted }]} numberOfLines={1}>
                  {email}
                </Text>
                {/* Badge de rol */}
                <View style={[styles.rolBadge, { backgroundColor: rolBg }]}>
                  <Ionicons name={rolIcon} size={12} color={rolColor} />
                  <Text style={[styles.rolText, { color: rolColor }]}>{rolLabel}</Text>
                </View>
              </View>

              {/* Botón cerrar */}
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}
            >
              {/* Sección: Empresa (si aplica) */}
              {profile?.empresa && !empleado && (
                <View style={[styles.empresaRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="business" size={16} color={colors.primary} />
                  <Text style={[styles.empresaText, { color: colors.textSecondary }]}>
                    {profile.empresa}
                  </Text>
                </View>
              )}

              {/* Sección: Permisos (solo visible para empleados) */}
              {empleado ? (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Mis Permisos
                  </Text>
                  <View style={styles.permisosContainer}>
                    <PermisoBadge
                      label="Punto de Venta"
                      icon="cart-outline"
                      activo={empleado.permiso_ventas}
                      descripcion="Puede realizar ventas y cobros"
                    />
                    <PermisoBadge
                      label="Productos / Precios"
                      icon="cube-outline"
                      activo={empleado.permiso_productos}
                      descripcion="Puede crear y editar productos"
                    />
                    <PermisoBadge
                      label="Eliminar Ventas"
                      icon="trash-outline"
                      activo={empleado.permiso_eliminar_facturas}
                      descripcion="Puede anular y eliminar ventas"
                    />
                    <PermisoBadge
                      label="Cambiar Tasa BCV"
                      icon="trending-up-outline"
                      activo={empleado.permiso_modificar_tasa}
                      descripcion="Puede actualizar la tasa de cambio"
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Acceso
                  </Text>
                  <View style={styles.permisosContainer}>
                    <PermisoBadge
                      label="Acceso completo"
                      icon="shield-checkmark-outline"
                      activo={true}
                      descripcion="Propietario — control total de la cuenta"
                    />
                    {isSuperAdmin && (
                      <PermisoBadge
                        label="Panel SuperAdmin"
                        icon="star-outline"
                        activo={true}
                        descripcion="Acceso al panel de administración global"
                      />
                    )}
                  </View>
                </>
              )}

              {/* Separador */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Acciones */}
              <View style={styles.actionsContainer}>
                {/* Mis Ventas (empleados) */}
                {empleado && (
                  <TouchableOpacity
                    style={[styles.actionRow, { borderColor: colors.border }]}
                    onPress={() => { setVisible(false); setTimeout(() => router.push('/mis-ventas'), 300); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: colors.successBg }]}>
                      <Ionicons name="receipt-outline" size={18} color={colors.success} />
                    </View>
                    <Text style={[styles.actionLabel, { color: colors.text }]}>Mis Ventas</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}

                {/* Sucursales (propietarios) */}
                {!empleado && (
                  <TouchableOpacity
                    style={[styles.actionRow, { borderColor: colors.border }]}
                    onPress={() => { setVisible(false); setTimeout(() => router.push('/sucursales'), 300); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: colors.primaryBg }]}>
                      <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.actionLabel, { color: colors.text }]}>Sucursales</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}

                {/* Toggle tema */}
                <TouchableOpacity
                  style={[styles.actionRow, { borderColor: colors.border }]}
                  onPress={() => setTheme(isDark ? 'light' : 'dark')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons
                      name={isDark ? 'sunny-outline' : 'moon-outline'}
                      size={18}
                      color="#F59E0B"
                    />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>
                    {isDark ? 'Modo Claro' : 'Modo Oscuro'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Cerrar Sesión */}
                <TouchableOpacity
                  style={[styles.logoutBtn, { borderColor: colors.error + '44', backgroundColor: colors.errorBg }]}
                  onPress={handleSignOut}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={18} color={colors.error} />
                  <Text style={[styles.logoutText, { color: colors.error }]}>
                    Cerrar Sesión
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Avatar circular
  avatarBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rolDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Header de perfil
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  avatarLg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLgText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  nombreText: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  emailText: {
    fontSize: 12,
    marginBottom: 6,
  },
  rolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  rolText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },

  // Empresa
  empresaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  empresaText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Sección
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Permisos
  permisosContainer: {
    gap: 8,
    marginBottom: 20,
  },
  permisoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  permisoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permisoLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  permisoDesc: {
    fontSize: 11,
  },

  // Divisor
  divider: {
    height: 1,
    marginBottom: 16,
  },

  // Acciones
  actionsContainer: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
