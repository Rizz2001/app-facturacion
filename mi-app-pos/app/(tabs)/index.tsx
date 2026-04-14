import React, { useMemo } from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTasa } from '@/context/TasaContext';
import { EstadoBadge } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { Factura, DashboardStats, Producto } from '@/lib/types';
import { ProfileAvatar } from '@/components/ProfileAvatar';


function StatCard({ label, value, sub, icon, color, bg, onPress }: any) {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  return (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const Colors = colors;
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const { profile, signOut, empleado } = useAuth();
  const router = useRouter();
  const { formatUSD, formatBs } = useTasa();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVentas, setRecentVentas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalDeuda, setTotalDeuda] = useState(0);
  const [stockBajoCount, setStockBajoCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const { data: facturas } = await supabase
        .from('facturas')
        .select('*, clientes(nombre)')
        .order('created_at', { ascending: false });

      if (facturas) {
        const pendientes = facturas.filter(f => f.estado === 'emitida' || f.estado === 'vencida');
        const pagadas = facturas.filter(f => f.estado === 'pagada');
        setStats({
          totalFacturas: facturas.length,
          facturasPendientes: pendientes.length,
          facturasPagadas: pagadas.length,
          totalCobrado: pagadas.reduce((s, f) => s + Number(f.total), 0),
          totalPendiente: pendientes.reduce((s, f) => s + Number(f.total), 0),
          clientesActivos: 0,
          productosActivos: 0,
        });
        setRecentVentas(facturas.slice(0, 5) as Factura[]);
        setTotalDeuda(pendientes.reduce((s, f) => s + Number(f.total), 0));
      }

      // Stock bajo
      const { data: prods } = await supabase
        .from('productos')
        .select('stock, stock_minimo')
        .eq('activo', true)
        .gt('stock_minimo', 0);
      if (prods) {
        setStockBajoCount(prods.filter(p => (p.stock ?? 0) <= (p.stock_minimo ?? 0)).length);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{saludo},</Text>
          <Text style={styles.userName}>{profile?.nombre || 'Usuario'} 👋</Text>
          {profile?.empresa && <Text style={styles.empresa}>{profile.empresa}</Text>}
        </View>
        <ProfileAvatar size={42} />
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Resumen</Text>
      <View style={styles.statsGrid}>
        <StatCard
          label="Ventas totales" value={stats?.totalFacturas ?? 0}
          icon="cart" color={Colors.primary} bg={Colors.primaryBg}
          onPress={() => router.push('/(tabs)/ventas')}
        />
        <StatCard
          label="Pendientes" value={stats?.facturasPendientes ?? 0}
          icon="time" color={Colors.warning} bg={Colors.warningBg}
          onPress={() => router.push({ pathname: '/(tabs)/ventas', params: { estado: 'emitida' } })}
        />
        <StatCard
          label="Cobrado" value={formatUSD(stats?.totalCobrado ?? 0)}
          sub={formatBs(stats?.totalCobrado ?? 0)}
          icon="checkmark-circle" color={Colors.success} bg={Colors.successBg}
          onPress={() => router.push({ pathname: '/(tabs)/ventas', params: { estado: 'pagada' } })}
        />
        <StatCard
          label="Por cobrar" value={formatUSD(stats?.totalPendiente ?? 0)}
          sub={formatBs(stats?.totalPendiente ?? 0)}
          icon="alert-circle" color={Colors.error} bg={Colors.errorBg}
          onPress={() => router.push({ pathname: '/(tabs)/ventas', params: { estado: 'emitida' } })}
        />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Acciones rápidas</Text>
      <View style={styles.actionsRow}>
        {!empleado && (
          <TouchableOpacity style={[styles.actionBtn, { marginBottom: 12 }]} onPress={() => router.push('/empleados')} activeOpacity={0.8}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.warningBg }]}>
              <Ionicons name="people" size={24} color={Colors.warning} />
            </View>
            <Text style={styles.actionLabel}>Equipo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPOS]} onPress={() => router.push('/(tabs)/pos')} activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: Colors.successBg }]}>
            <Ionicons name="cart" size={24} color={Colors.success} />
          </View>
          <Text style={[styles.actionLabel, { color: Colors.success, fontWeight: '700' }]}>Punto{'\n'}de Venta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/cliente/nuevo')} activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: Colors.primaryBg }]}>
            <Ionicons name="person-add" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionLabel}>Nuevo{'\n'}Cliente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/producto/nuevo')} activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: Colors.infoBg }]}>
            <Ionicons name="cube" size={24} color={Colors.info} />
          </View>
          <Text style={styles.actionLabel}>Nuevo{'\n'}Producto</Text>
        </TouchableOpacity>
      </View>

      {/* Cards de alertas para propietarios */}
      {!empleado && (
        <View style={styles.alertCardsRow}>
          {totalDeuda > 0 && (
            <TouchableOpacity
              style={[styles.alertCard, { backgroundColor: Colors.errorBg, borderColor: Colors.error + '44' }]}
              onPress={() => router.push('/(tabs)/deudas')}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertCardTitle, { color: Colors.error }]}>Por cobrar</Text>
                <Text style={[styles.alertCardValue, { color: Colors.error }]}>{formatUSD(totalDeuda)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.error} />
            </TouchableOpacity>
          )}
          {stockBajoCount > 0 && (
            <TouchableOpacity
              style={[styles.alertCard, { backgroundColor: Colors.warningBg, borderColor: Colors.warning + '44' }]}
              onPress={() => router.push('/(tabs)/productos')}
              activeOpacity={0.8}
            >
              <Ionicons name="warning" size={20} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertCardTitle, { color: Colors.warning }]}>Stock bajo</Text>
                <Text style={[styles.alertCardValue, { color: Colors.warning }]}>{stockBajoCount} producto{stockBajoCount !== 1 ? 's' : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.warning} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.alertCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
            onPress={() => router.push('/(tabs)/caja')}
            activeOpacity={0.8}
          >
            <Ionicons name="cash" size={20} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertCardTitle, { color: Colors.text }]}>Caja</Text>
              <Text style={[styles.alertCardValue, { color: Colors.textSecondary, fontSize: 12 }]}>Ver cierre del día</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Recent Ventas */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ventas recientes</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/ventas')}>
          <Text style={styles.seeAll}>Ver todas</Text>
        </TouchableOpacity>
      </View>

      {recentVentas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cart-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No hay ventas aún</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/pos')}>
            <Text style={styles.emptyBtnText}>Realizar primera venta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentVentas.map(venta => {
          const badge = EstadoBadge[venta.estado];
          return (
            <TouchableOpacity
              key={venta.id}
              style={styles.facturaRow}
              onPress={() => router.push(`/venta/${venta.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.facturaLeft}>
                <Text style={styles.facturaNumero}>{venta.numero}</Text>
                <Text style={styles.facturaCliente}>{(venta as any).clientes?.nombre ?? '—'}</Text>
              </View>
              <View style={styles.facturaRight}>
                <Text style={styles.facturaTotal}>{formatUSD(Number(venta.total))}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 56 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  userName: { fontSize: 24, fontWeight: '800', color: Colors.text, marginTop: 2 },
  empresa: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  signOutBtn: { padding: 8, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statSub: { fontSize: 10, color: Colors.success, marginTop: 0 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  actionBtnPOS: { borderColor: Colors.success, borderWidth: 1.5 },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500', lineHeight: 16 },

  facturaRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  facturaLeft: { flex: 1 },
  facturaNumero: { fontSize: 14, fontWeight: '700', color: Colors.text },
  facturaCliente: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  facturaRight: { alignItems: 'flex-end', gap: 6 },
  facturaTotal: { fontSize: 15, fontWeight: '700', color: Colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 15 },
  emptyBtn: {
    marginTop: 16, backgroundColor: Colors.primaryBg,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  emptyBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },

  alertCardsRow: { gap: 10, marginBottom: 28 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  alertCardTitle: { fontSize: 13, fontWeight: '700' },
  alertCardValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
});
