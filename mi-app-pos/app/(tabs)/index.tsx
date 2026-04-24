import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTasa } from '@/context/TasaContext';
import { EstadoBadge } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { Factura, DashboardStats } from '@/lib/types';


// ─── Module card en el grid ────────────────────────────────────────────────────
function ModuleCard({ icon, label, sub, color, bg, onPress, badge }: any) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  return (
    <TouchableOpacity style={s.moduleCard} onPress={onPress} activeOpacity={0.78}>
      <View style={[s.moduleIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      {badge != null && badge > 0 && (
        <View style={[s.moduleBadge, { backgroundColor: color }]}>
          <Text style={s.moduleBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
      <Text style={s.moduleLabel} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={[s.moduleSub, { color }]} numberOfLines={1}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

// ─── Stat Row Card ─────────────────────────────────────────────────────────────
function StatRow({ label, value, sub, icon, color, bg, onPress }: any) {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  return (
    <TouchableOpacity style={[s.statRow, { shadowColor: color }]} onPress={onPress} activeOpacity={0.78} disabled={!onPress}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.statLabel}>{label}</Text>
        {sub ? <Text style={[s.statSub, { color }]}>{sub}</Text> : null}
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { profile, empleado, isSuperAdmin } = useAuth();
  const router = useRouter();
  const { formatUSD, formatBs } = useTasa();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVentas, setRecentVentas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalDeuda, setTotalDeuda] = useState(0);
  const [totalDeudaProveedores, setTotalDeudaProveedores] = useState(0);
  const [stockBajoCount, setStockBajoCount] = useState(0);
  const [vencimientosCerca, setVencimientosCerca] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      // 1. Ventas
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
        setRecentVentas(facturas.slice(0, 4) as Factura[]);
        setTotalDeuda(pendientes.reduce((s, f) => s + Number(f.total), 0));
      }

      // 2. Compras / Cuentas por Pagar
      const { data: comps } = await supabase
        .from('compras')
        .select('*, proveedores(nombre)')
        .in('estado', ['pendiente', 'parcial']);
      
      if (comps) {
        const deuda = comps.reduce((s, c) => s + (Number(c.total) - Number(c.monto_pagado)), 0);
        setTotalDeudaProveedores(deuda);

        // Alerta de vencimientos (5 días)
        const hoy = new Date();
        const cerca = comps.filter(c => {
          if (!c.fecha_vencimiento) return false;
          const fv = new Date(c.fecha_vencimiento);
          const diff = (fv.getTime() - hoy.getTime()) / (1000 * 3600 * 24);
          return diff >= -1 && diff <= 5; // -1 por si ya venció hoy
        });
        setVencimientosCerca(cerca);
      }

      // 3. Stock Bajo
      const { data: prods } = await supabase
        .from('productos').select('stock, stock_minimo').eq('activo', true).gt('stock_minimo', 0);
      if (prods) setStockBajoCount(prods.filter(p => (p.stock ?? 0) <= (p.stock_minimo ?? 0)).length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = empleado
    ? (empleado as any).nombre || empleado.email?.split('@')[0]
    : profile?.nombre || 'Usuario';

  // Módulos disponibles según el rol
  const modulos = [
    ...((!empleado || empleado.permiso_productos) ? [{
      icon: 'cube', label: 'Productos', sub: stockBajoCount > 0 ? `${stockBajoCount} bajo stock` : undefined,
      color: C.info, bg: C.infoBg, badge: stockBajoCount,
      route: '/(tabs)/productos',
    }] : []),
    {
      icon: 'people', label: 'Clientes', color: C.primary, bg: C.primaryBg,
      route: '/(tabs)/clientes',
    },
    {
      icon: 'receipt', label: 'Historial', color: C.success, bg: C.successBg,
      route: '/(tabs)/ventas',
    },
    ...(!empleado ? [
      {
        icon: 'bag-handle', label: 'Compras', color: '#A78BFA', bg: '#1E1B4B',
        route: '/compras',
      },
      {
        icon: 'wallet', label: 'Cuentas x Pagar', sub: totalDeudaProveedores > 0 ? formatUSD(totalDeudaProveedores) : undefined,
        color: '#EC4899', bg: '#2D1B24', badge: vencimientosCerca.length,
        route: '/compras/cuentas-por-pagar',
      },
      {
        icon: 'business', label: 'Proveedores', color: C.info, bg: C.infoBg,
        route: '/proveedores',
      },
      {
        icon: 'cash', label: 'Caja', color: C.success, bg: C.successBg,
        route: '/(tabs)/caja',
      },
      {
        icon: 'alert-circle', label: 'Cobros', sub: totalDeuda > 0 ? formatUSD(totalDeuda) : undefined,
        color: C.error, bg: C.errorBg, badge: stats?.facturasPendientes,
        route: '/(tabs)/deudas',
      },
      {
        icon: 'people-circle', label: 'Equipo', color: C.warning, bg: C.warningBg,
        route: '/empleados',
      },
    ] : [
      {
        icon: 'receipt', label: 'Mis Ventas', color: C.success, bg: C.successBg,
        route: '/mis-ventas',
      },
    ]),
    ...(isSuperAdmin ? [{
      icon: 'shield-checkmark', label: 'SuperAdmin', color: '#F59E0B', bg: '#FEF3C7',
      route: '/(tabs)/superadmin',
    }] : []),
  ];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={C.primary} />}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerBg} />
        <View style={s.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{saludo} 👋</Text>
            <Text style={s.userName} numberOfLines={1}>{nombre}</Text>
            {!empleado && profile?.empresa && (
              <View style={s.chipRow}>
                <Ionicons name="business-outline" size={11} color={C.primary} />
                <Text style={[s.chip, { color: C.primary }]}>{profile.empresa}</Text>
              </View>
            )}
            {empleado && (
              <View style={s.chipRow}>
                <Ionicons name="briefcase-outline" size={11} color={C.warning} />
                <Text style={[s.chip, { color: C.warning }]}>Empleado</Text>
              </View>
            )}
          </View>
        </View>

        {/* Mini stats en header */}
        <View style={s.miniStats}>
          <View style={s.miniStatItem}>
            <Text style={s.miniStatNum}>{stats?.totalFacturas ?? 0}</Text>
            <Text style={s.miniStatLabel}>Ventas</Text>
          </View>
          <View style={[s.miniDivider, { backgroundColor: C.border }]} />
          <View style={s.miniStatItem}>
            <Text style={[s.miniStatNum, { color: C.success }]}>{formatUSD(stats?.totalCobrado ?? 0)}</Text>
            <Text style={s.miniStatLabel}>Cobrado</Text>
          </View>
          <View style={[s.miniDivider, { backgroundColor: C.border }]} />
          <View style={s.miniStatItem}>
            <Text style={[s.miniStatNum, { color: C.error }]}>{stats?.facturasPendientes ?? 0}</Text>
            <Text style={s.miniStatLabel}>Pendientes</Text>
          </View>
        </View>
      </View>

      {/* ── Alerta de Vencimientos (Cuentas por Pagar) ── */}
      {vencimientosCerca.length > 0 && (
        <TouchableOpacity 
          style={s.vencimientoAlert} 
          onPress={() => router.push('/compras/cuentas-por-pagar')}
          activeOpacity={0.8}
        >
          <View style={s.alertIconWrap}>
            <Ionicons name="time" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>¡Atención! {vencimientosCerca.length} pago(s) cerca de vencer</Text>
            <Text style={s.alertSub}>Hay facturas de proveedores por pagar en los próximos 5 días.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fff" style={{ opacity: 0.7 }} />
        </TouchableOpacity>
      )}

      {/* ── Acceso Rápido al POS ─────────────────────────────── */}
      {(!empleado || empleado.permiso_ventas) && (
        <TouchableOpacity style={s.posBtn} onPress={() => router.push('/(tabs)/pos')} activeOpacity={0.85}>
          <View style={[s.posIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="cart" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.posBtnTitle}>Punto de Venta</Text>
            <Text style={s.posBtnSub}>Registrar nueva venta</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      )}

      {/* ── Módulos ──────────────────────────────────────────── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Módulos</Text>
      </View>
      <View style={s.modulesGrid}>
        {modulos.map((m, i) => (
          <ModuleCard
            key={i}
            icon={m.icon}
            label={m.label}
            sub={(m as any).sub}
            color={m.color}
            bg={m.bg}
            badge={(m as any).badge}
            onPress={() => router.push(m.route as any)}
          />
        ))}
      </View>

      {/* ── Ventas Recientes ─────────────────────────────────── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Recientes</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/ventas')}>
          <Text style={s.seeAll}>Ver todas →</Text>
        </TouchableOpacity>
      </View>

      {recentVentas.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="cart-outline" size={36} color={C.textMuted} />
          <Text style={s.emptyTitle}>Sin ventas aún</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/pos')}>
            <Text style={s.emptyBtnText}>Ir al POS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentVentas.map((venta, idx) => {
          const badge = EstadoBadge[venta.estado];
          return (
            <TouchableOpacity
              key={venta.id}
              style={[s.ventaRow, idx === recentVentas.length - 1 && { marginBottom: 0 }]}
              onPress={() => router.push(`/venta/${venta.id}` as any)}
              activeOpacity={0.78}
            >
              <View style={[s.ventaAvatar, { backgroundColor: C.primaryBg }]}>
                <Text style={[s.ventaAvatarTxt, { color: C.primary }]}>
                  {venta.numero?.charAt(0) ?? 'V'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ventaNum}>{venta.numero}</Text>
                <Text style={s.ventaCli} numberOfLines={1}>
                  {(venta as any).clientes?.nombre ?? 'Sin cliente'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={s.ventaTotal}>{formatUSD(Number(venta.total))}</Text>
                <View style={[s.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[s.badgeTxt, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  content: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },

  // Header
  header: { marginBottom: 20, overflow: 'hidden' },
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: C.surface,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 52 : 58,
    paddingHorizontal: 22, paddingBottom: 16, gap: 14,
  },
  greeting: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  userName: { fontSize: 21, fontWeight: '800', color: C.text, marginTop: 2 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  chip: { fontSize: 12, fontWeight: '600' },

  // Mini stats strip
  miniStats: {
    flexDirection: 'row', paddingHorizontal: 22, paddingBottom: 20,
    justifyContent: 'space-around',
  },
  miniStatItem: { alignItems: 'center', flex: 1 },
  miniStatNum: { fontSize: 16, fontWeight: '800', color: C.text },
  miniStatLabel: { fontSize: 11, color: C.textMuted, marginTop: 2, fontWeight: '500' },
  miniDivider: { width: 1, height: 28, alignSelf: 'center' },

  // POS Button — destacado
  posBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.primary, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 16,
    marginHorizontal: 20, marginBottom: 24,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14,
    elevation: 6,
  },
  posIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  posBtnTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  posBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  // Alerta de vencimientos
  vencimientoAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#EC4899', borderRadius: 16,
    padding: 14, marginHorizontal: 20, marginBottom: 16,
    shadowColor: '#EC4899', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  alertIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  alertTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
  alertSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  seeAll: { fontSize: 13, color: C.primary, fontWeight: '600' },

  // Modules grid — 4 columnas
  modulesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10, marginBottom: 28,
  },
  moduleCard: {
    width: '22.5%',
    backgroundColor: C.surface, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 6,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.border,
    position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  moduleIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  moduleLabel: { fontSize: 11, fontWeight: '700', color: C.text, textAlign: 'center' },
  moduleSub: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  moduleBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  moduleBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Recent ventas
  ventaRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 10, marginHorizontal: 20,
    borderWidth: 1, borderColor: C.border,
  },
  ventaAvatar: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  ventaAvatarTxt: { fontSize: 15, fontWeight: '800' },
  ventaNum: { fontSize: 13, fontWeight: '700', color: C.text },
  ventaCli: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  ventaTotal: { fontSize: 13, fontWeight: '800', color: C.text },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeTxt: { fontSize: 9, fontWeight: '700' },

  // Empty state
  emptyCard: {
    backgroundColor: C.surface, borderRadius: 18,
    padding: 28, alignItems: 'center',
    marginHorizontal: 20, gap: 10,
    borderWidth: 1, borderColor: C.border,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.textMuted },
  emptyBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Stat row (unused here but exported for consistency)
  statRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  statSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  statValue: { fontSize: 18, fontWeight: '800' },
});
