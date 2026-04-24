import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTasa } from '@/context/TasaContext';
import { Compra } from '@/lib/types';

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente',    color: '#F59E0B', bg: '#291A00' },
  parcial:   { label: 'Pago Parcial', color: '#60A5FA', bg: '#0C1E40' },
};

export default function CuentasPorPagarScreen() {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { tenant_id } = useAuth();
  const { formatUSD } = useTasa();
  const router = useRouter();

  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal Pago Rápido
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [montoStr, setMontoStr] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [savingPago, setSavingPago] = useState(false);

  const load = useCallback(async () => {
    if (!tenant_id) return;
    setLoading(true);
    // Solo compras pendientes o parciales
    const { data } = await supabase
      .from('compras')
      .select('*, proveedores(nombre)')
      .eq('owner_id', tenant_id)
      .in('estado', ['pendiente', 'parcial'])
      .order('fecha_vencimiento', { ascending: true });
    
    setCompras((data ?? []) as Compra[]);
    setLoading(false);
  }, [tenant_id]);

  useEffect(() => { load(); }, [load]);

  const handleQuickPago = async () => {
    const monto = parseFloat(montoStr);
    if (!monto || monto <= 0 || !selectedCompra) return;
    const saldo = Number(selectedCompra.total) - Number(selectedCompra.monto_pagado);
    if (monto > saldo + 0.01) {
      Alert.alert('Monto inválido', 'El monto no puede superar el saldo pendiente.');
      return;
    }

    setSavingPago(true);
    try {
      // 1. Registrar pago
      await supabase.from('pagos_compras').insert({
        compra_id: selectedCompra.id,
        fecha: new Date().toISOString().slice(0, 10),
        monto,
        metodo,
        referencia: referencia.trim() || null,
      });

      // 2. Actualizar compra
      const nuevoMonto = Number(selectedCompra.monto_pagado) + monto;
      const nuevoEstado = nuevoMonto >= Number(selectedCompra.total) - 0.01 ? 'pagada' : 'parcial';
      
      await supabase.from('compras')
        .update({ monto_pagado: nuevoMonto, estado: nuevoEstado })
        .eq('id', selectedCompra.id);

      setShowPagoModal(false);
      setMontoStr(''); setReferencia('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingPago(false);
    }
  };

  const displayed = compras.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      c.numero.toLowerCase().includes(q) ||
      (c.proveedores?.nombre ?? '').toLowerCase().includes(q);
  });

  const totalDeuda = compras.reduce((s, c) => s + (Number(c.total) - Number(c.monto_pagado)), 0);

  const renderItem = ({ item: c }: { item: Compra }) => {
    const cfg = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.pendiente;
    const saldo = Number(c.total) - Number(c.monto_pagado);
    const hoy = new Date();
    const fv = c.fecha_vencimiento ? new Date(c.fecha_vencimiento) : null;
    const esCritico = fv && (fv.getTime() - hoy.getTime()) / (1000 * 3600 * 24) <= 5;

    return (
      <View style={[s.card, esCritico && { borderColor: C.error, borderWidth: 1.5 }]}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          onPress={() => router.push(`/compras/${c.id}` as any)}
          activeOpacity={0.7}
        >
          <View style={[s.cardLeft, { backgroundColor: esCritico ? C.errorBg : C.infoBg }]}>
            <Ionicons name="wallet" size={20} color={esCritico ? C.error : C.info} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.cardNum}>{c.numero}</Text>
              {esCritico && (
                <View style={s.criticoBadge}>
                  <Text style={s.criticoText}>VENCE PRONTO</Text>
                </View>
              )}
            </View>
            <Text style={s.cardProv} numberOfLines={1}>
              {c.proveedores?.nombre ?? 'Sin proveedor'}
            </Text>
            <Text style={[s.cardFecha, esCritico && { color: C.error, fontWeight: '700' }]}>
              Vence: {c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-VE') : 'Sin fecha'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={s.cardTotal}>{formatUSD(saldo)}</Text>
            <Text style={s.cardSubtotal}>de {formatUSD(Number(c.total))}</Text>
            <View style={[s.badge, { backgroundColor: cfg.bg }]}>
              <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Acción Rápida */}
        <TouchableOpacity 
          style={s.abonarBtn} 
          onPress={() => { setSelectedCompra(c); setMontoStr(saldo.toString()); setShowPagoModal(true); }}
        >
          <Text style={s.abonarBtnText}>Abonar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Cuentas por Pagar</Text>
          <Text style={s.subtitle}>{compras.length} facturas pendientes</Text>
        </View>
      </View>

      {/* Summary Card */}
      <View style={s.summaryBox}>
        <Text style={s.summaryLabel}>Total Deuda a Proveedores</Text>
        <Text style={s.summaryVal}>{formatUSD(totalDeuda)}</Text>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar factura o proveedor..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
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
              <Ionicons name="checkmark-circle-outline" size={48} color={C.success} />
              <Text style={s.emptyTitle}>¡Todo al día!</Text>
              <Text style={s.emptySub}>No tienes cuentas pendientes por pagar.</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      {/* Modal Pago Rápido */}
      <Modal visible={showPagoModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: C.surface }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Registrar Abono</Text>
              <TouchableOpacity onPress={() => setShowPagoModal(false)}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, color: C.textMuted }}>Factura: {selectedCompra?.numero}</Text>
              <Text style={{ fontSize: 13, color: C.textMuted }}>Proveedor: {selectedCompra?.proveedores?.nombre}</Text>
            </View>

            <Text style={s.label}>Monto a pagar $</Text>
            <TextInput
              style={s.input}
              value={montoStr}
              onChangeText={setMontoStr}
              keyboardType="decimal-pad"
              autoFocus
            />

            <Text style={[s.label, { marginTop: 16 }]}>Método de pago</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 16 }}>
              {['efectivo', 'pago_movil', 'transferencia'].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[s.metodoBadge, metodo === m && { backgroundColor: C.primary, borderColor: C.primary }]}
                  onPress={() => setMetodo(m)}
                >
                  <Text style={[{ fontSize: 12, fontWeight: '600', color: C.textSecondary }, metodo === m && { color: '#fff' }]}>
                    {m.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[s.saveBtnModal, savingPago && { opacity: 0.7 }]} 
              onPress={handleQuickPago}
              disabled={savingPago}
            >
              {savingPago ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Confirmar Abono</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  summaryBox: {
    margin: 20, padding: 20, borderRadius: 20,
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  summaryVal: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12, backgroundColor: C.surface,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },

  list: { padding: 20, paddingTop: 4, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 18,
    padding: 14, borderWidth: 1, borderColor: C.border,
  },
  cardLeft:  { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardNum:   { fontSize: 14, fontWeight: '700', color: C.text },
  cardProv:  { fontSize: 12, color: C.textSecondary, marginTop: 1 },
  cardFecha: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  cardTotal: { fontSize: 16, fontWeight: '800', color: C.text },
  cardSubtotal: { fontSize: 10, color: C.textMuted },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  criticoBadge: { backgroundColor: C.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  criticoText: { color: '#fff', fontSize: 8, fontWeight: '900' },

  abonarBtn: {
    backgroundColor: C.success, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-end', marginTop: 10,
  },
  abonarBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  metodoBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
  saveBtnModal: { backgroundColor: C.primary, borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: C.text },
  label: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 8 },
  input: { backgroundColor: C.background, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, marginBottom: 16 },

  empty:     { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle:{ fontSize: 18, fontWeight: '800', color: C.text },
  emptySub:  { fontSize: 14, color: C.textMuted, textAlign: 'center' },
});
