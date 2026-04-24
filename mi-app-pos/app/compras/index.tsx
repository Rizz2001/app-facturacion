import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTasa } from '@/context/TasaContext';
import { Compra, EstadoCompra } from '@/lib/types';

const ESTADOS: { key: EstadoCompra | 'todas'; label: string }[] = [
  { key: 'todas',    label: 'Todas'   },
  { key: 'pendiente',label: 'Pendientes' },
  { key: 'parcial',  label: 'Parciales'  },
  { key: 'pagada',   label: 'Pagadas'    },
];

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente',    color: '#F59E0B', bg: '#291A00' },
  parcial:   { label: 'Pago Parcial', color: '#60A5FA', bg: '#0C1E40' },
  pagada:    { label: 'Pagada',       color: '#10B981', bg: '#052E20' },
  cancelada: { label: 'Cancelada',    color: '#94A3B8', bg: '#1E293B' },
};

export default function ComprasScreen() {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { tenant_id } = useAuth();
  const { formatUSD } = useTasa();
  const router = useRouter();

  const [compras,  setCompras]  = useState<Compra[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filtro,   setFiltro]   = useState<EstadoCompra | 'todas'>('todas');

  const load = useCallback(async () => {
    if (!tenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('compras')
      .select('*, proveedores(nombre)')
      .eq('owner_id', tenant_id)
      .order('fecha', { ascending: false });
    setCompras((data ?? []) as Compra[]);
    setLoading(false);
  }, [tenant_id]);

  useEffect(() => { load(); }, [load]);

  const displayed = compras.filter(c => {
    const matchEstado = filtro === 'todas' || c.estado === filtro;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.numero.toLowerCase().includes(q) ||
      (c.proveedores?.nombre ?? '').toLowerCase().includes(q);
    return matchEstado && matchSearch;
  });

  const totalPendiente = compras
    .filter(c => c.estado === 'pendiente' || c.estado === 'parcial')
    .reduce((s, c) => s + (Number(c.total) - Number(c.monto_pagado)), 0);

  const totalMes = (() => {
    const hoy = new Date();
    return compras
      .filter(c => {
        const d = new Date(c.fecha);
        return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
      })
      .reduce((s, c) => s + Number(c.total), 0);
  })();

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Compras</Text>
          <Text style={s.subtitle}>{compras.length} registros</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/compras/nueva')}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={s.statsStrip}>
        <View style={s.statItem}>
          <Text style={s.statNum}>{formatUSD(totalMes)}</Text>
          <Text style={s.statLabel}>Compras del mes</Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: C.border }]} />
        <View style={s.statItem}>
          <Text style={[s.statNum, { color: totalPendiente > 0 ? C.error : C.success }]}>
            {formatUSD(totalPendiente)}
          </Text>
          <Text style={s.statLabel}>Por pagar</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por número o proveedor..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={s.filtrosRow}>
        {ESTADOS.map(e => (
          <TouchableOpacity
            key={e.key}
            style={[s.filtroBtn, filtro === e.key && { backgroundColor: C.primary, borderColor: C.primary }]}
            onPress={() => setFiltro(e.key)}
          >
            <Text style={[s.filtroBtnText, filtro === e.key && { color: '#fff' }]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={c => c.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={48} color={C.textMuted} />
              <Text style={s.emptyTitle}>Sin compras</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/compras/nueva')}>
                <Text style={s.emptyBtnText}>Registrar Compra</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: c }) => {
            const cfg = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.pendiente;
            const saldo = Number(c.total) - Number(c.monto_pagado);
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => router.push(`/compras/${c.id}` as any)}
                activeOpacity={0.78}
              >
                <View style={[s.cardLeft, { backgroundColor: C.infoBg }]}>
                  <Ionicons name="receipt" size={20} color={C.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardNum}>{c.numero}</Text>
                  <Text style={s.cardProv} numberOfLines={1}>
                    {c.proveedores?.nombre ?? 'Sin proveedor'}
                  </Text>
                  <Text style={s.cardFecha}>
                    {new Date(c.fecha).toLocaleDateString('es-VE')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.cardTotal}>{formatUSD(Number(c.total))}</Text>
                  {saldo > 0 && (
                    <Text style={{ fontSize: 11, color: C.error, fontWeight: '600' }}>
                      -{formatUSD(saldo)}
                    </Text>
                  )}
                  <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'android' ? 52 : 58,
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 4 },
  title:   { fontSize: 20, fontWeight: '800', color: C.text },
  subtitle:{ fontSize: 12, color: C.textMuted, marginTop: 1 },
  addBtn:  { width: 38, height: 38, borderRadius: 12, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  statsStrip: {
    flexDirection: 'row', backgroundColor: C.surface,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  statItem:   { flex: 1, alignItems: 'center' },
  statNum:    { fontSize: 18, fontWeight: '800', color: C.text },
  statLabel:  { fontSize: 11, color: C.textMuted, marginTop: 2 },
  statDivider:{ width: 1, height: 32, alignSelf: 'center', marginHorizontal: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginBottom: 8, backgroundColor: C.surface,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  filtrosRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  filtroBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  filtroBtnText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  list: { padding: 16, paddingTop: 4, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: C.border,
  },
  cardLeft:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardNum:   { fontSize: 14, fontWeight: '700', color: C.text },
  cardProv:  { fontSize: 12, color: C.textSecondary, marginTop: 1 },
  cardFecha: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  cardTotal: { fontSize: 15, fontWeight: '800', color: C.text },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  empty:     { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle:{ fontSize: 16, fontWeight: '700', color: C.textMuted },
  emptyBtn:  { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
