import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';

interface NegocioInfo {
  id: string;
  nombre: string;
  email: string;
  empresa?: string;
  created_at: string;
  is_superadmin?: boolean;
  empleados_count?: number;
  facturas_count?: number;
}

interface EmpleadoInfo {
  id: string;
  email: string;
  activo: boolean;
  permiso_ventas: boolean;
  permiso_productos: boolean;
  permiso_eliminar_facturas: boolean;
  permiso_modificar_tasa: boolean;
  auth_id: string | null;
}

export default function SuperAdminScreen() {
  const { isSuperAdmin } = useAuth();
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const router = useRouter();

  const [negocios, setNegocios] = useState<NegocioInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNegocio, setSelectedNegocio] = useState<NegocioInfo | null>(null);
  const [empleadosNegocio, setEmpleadosNegocio] = useState<EmpleadoInfo[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);

  // Bloquear acceso a no-superadmins
  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/(tabs)');
    }
  }, [isSuperAdmin]);

  const loadNegocios = useCallback(async () => {
    try {
      setLoading(true);
      // Usamos la service role vía RPC para bypassear RLS y ver todos los perfiles
      const { data, error } = await supabase.rpc('get_all_profiles_for_admin');
      if (error) {
        // Si no existe el RPC, lo manejamos con un fetch normal (solo verá lo que la RLS permita)
        console.warn('RPC no disponible, usando fallback');
        const { data: fallback } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        setNegocios((fallback || []) as NegocioInfo[]);
      } else {
        setNegocios((data || []) as NegocioInfo[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNegocios(); }, [loadNegocios]);

  const loadEmpleadosDeNegocio = async (negocio: NegocioInfo) => {
    setSelectedNegocio(negocio);
    setLoadingEmpleados(true);
    const { data } = await supabase
      .from('empleados')
      .select('*')
      .eq('owner_id', negocio.id)
      .order('created_at', { ascending: false });
    setEmpleadosNegocio((data || []) as EmpleadoInfo[]);
    setLoadingEmpleados(false);
  };

  const toggleSuspendNegocio = async (negocio: NegocioInfo) => {
    // Implementamos suspendiendo/activando todos sus empleados de golpe y marcando el perfil
    const esSuspendido = !!(negocio as any).suspendido;
    Alert.alert(
      esSuspendido ? 'Activar Negocio' : 'Suspender Negocio',
      `¿${esSuspendido ? 'Activar' : 'Suspender'} el negocio de "${negocio.nombre}"?\n${!esSuspendido ? 'Sus empleados perderán acceso inmediatamente.' : ''}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: esSuspendido ? 'Activar' : 'Suspender',
          style: esSuspendido ? 'default' : 'destructive',
          onPress: async () => {
            await supabase.from('profiles').update({ suspendido: !esSuspendido }).eq('id', negocio.id);
            // También suspender todos sus empleados
            await supabase.from('empleados').update({ activo: esSuspendido }).eq('owner_id', negocio.id);
            loadNegocios();
          },
        },
      ]
    );
  };

  const toggleSuspendEmpleado = async (emp: EmpleadoInfo) => {
    await supabase.from('empleados').update({ activo: !emp.activo }).eq('id', emp.id);
    if (selectedNegocio) loadEmpleadosDeNegocio(selectedNegocio);
  };

  const negociosFiltrados = negocios.filter(n =>
    n.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    n.email?.toLowerCase().includes(search.toLowerCase()) ||
    n.empresa?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isSuperAdmin) return null;

  // DETALLE DE NEGOCIO
  if (selectedNegocio) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedNegocio(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{selectedNegocio.empresa || selectedNegocio.nombre}</Text>
            <Text style={styles.subtitle}>{selectedNegocio.email}</Text>
          </View>
          <TouchableOpacity
            style={[styles.suspendBtn, (selectedNegocio as any).suspendido && styles.activateBtn]}
            onPress={() => toggleSuspendNegocio(selectedNegocio)}
          >
            <Ionicons name={(selectedNegocio as any).suspendido ? 'play' : 'pause'} size={14} color={Colors.white} />
            <Text style={styles.suspendBtnText}>{(selectedNegocio as any).suspendido ? 'Activar' : 'Suspender'}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats del negocio */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.statChipText}>Desde {new Date(selectedNegocio.created_at).toLocaleDateString('es-VE')}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: Colors.primaryBg }]}>
            <Ionicons name="people-outline" size={13} color={Colors.primary} />
            <Text style={[styles.statChipText, { color: Colors.primary }]}>{empleadosNegocio.length} empleados</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Empleados del Negocio</Text>

        {loadingEmpleados ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={empleadosNegocio}
            keyExtractor={e => e.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Sin empleados registrados</Text>
              </View>
            }
            renderItem={({ item: emp }) => (
              <View style={styles.empCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.empEmail}>{emp.email}</Text>
                  <View style={styles.permsRow}>
                    {emp.permiso_ventas && <View style={[styles.badge, { backgroundColor: Colors.successBg }]}><Text style={[styles.badgeText, { color: Colors.success }]}>Ventas</Text></View>}
                    {emp.permiso_productos && <View style={[styles.badge, { backgroundColor: Colors.infoBg }]}><Text style={[styles.badgeText, { color: Colors.info }]}>Productos</Text></View>}
                    {emp.permiso_eliminar_facturas && <View style={[styles.badge, { backgroundColor: Colors.errorBg }]}><Text style={[styles.badgeText, { color: Colors.error }]}>Eliminar Ventas</Text></View>}
                    {emp.permiso_modificar_tasa && <View style={[styles.badge, { backgroundColor: Colors.warning + '22' }]}><Text style={[styles.badgeText, { color: Colors.warning }]}>Tasa</Text></View>}
                  </View>
                  <Text style={[styles.empStatus, { color: emp.activo ? Colors.success : Colors.error }]}>
                    {emp.activo ? '● Activo' : '● Suspendido'}
                    {!emp.auth_id && '  (sin registrar)'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.empToggleBtn, emp.activo ? styles.empBtnSuspend : styles.empBtnActivate]}
                  onPress={() => toggleSuspendEmpleado(emp)}
                >
                  <Ionicons name={emp.activo ? 'pause' : 'play'} size={16} color={Colors.white} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // LISTADO DE NEGOCIOS
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Super Admin</Text>
          <Text style={styles.subtitle}>{negocios.length} negocios registrados</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar negocio o correo..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={negociosFiltrados}
          keyExtractor={n => n.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No hay negocios registrados</Text>
            </View>
          }
          renderItem={({ item: neg }) => (
            <TouchableOpacity style={[styles.card, (neg as any).suspendido && styles.cardSuspendido]} onPress={() => loadEmpleadosDeNegocio(neg)} activeOpacity={0.75}>
              <View style={styles.cardAvatar}>
                <Text style={styles.cardAvatarText}>{(neg.empresa || neg.nombre || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardNombre}>{neg.empresa || neg.nombre}</Text>
                <Text style={styles.cardEmail}>{neg.email}</Text>
                <Text style={styles.cardDate}>Registro: {new Date(neg.created_at).toLocaleDateString('es-VE')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                {(neg as any).suspendido && (
                  <View style={styles.suspendedChip}>
                    <Text style={styles.suspendedChipText}>SUSPENDIDO</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.iconBtn, (neg as any).suspendido ? styles.iconBtnActivate : styles.iconBtnSuspend]}
                  onPress={() => toggleSuspendNegocio(neg)}
                >
                  <Ionicons name={(neg as any).suspendido ? 'play' : 'pause'} size={14} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  adminBadge: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtn: { marginRight: 4 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  suspendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.error, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
  },
  activateBtn: { backgroundColor: Colors.success },
  suspendBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },

  list: { padding: 16, gap: 12 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  cardSuspendido: { opacity: 0.6, borderColor: Colors.error + '44' },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#6366F122',
    justifyContent: 'center', alignItems: 'center',
  },
  cardAvatarText: { fontSize: 20, fontWeight: '800', color: '#6366F1' },
  cardNombre: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardDate: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },

  iconBtn: { padding: 6, borderRadius: 8 },
  iconBtnSuspend: { backgroundColor: Colors.error },
  iconBtnActivate: { backgroundColor: Colors.success },

  suspendedChip: {
    backgroundColor: Colors.errorBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  suspendedChipText: { fontSize: 9, fontWeight: '800', color: Colors.error },

  statsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 12,
  },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  statChipText: { fontSize: 12, color: Colors.textSecondary },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: Colors.textSecondary,
    paddingHorizontal: 20, paddingBottom: 6,
  },

  empCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  empEmail: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  permsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  empStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  empToggleBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  empBtnSuspend: { backgroundColor: Colors.error },
  empBtnActivate: { backgroundColor: Colors.success },

  emptyBox: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
