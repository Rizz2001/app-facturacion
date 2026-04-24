import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, Modal, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useTasa } from '@/context/TasaContext';
import { Compra, CompraItem, PagoCompra } from '@/lib/types';

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente',    color: '#FBBF24', bg: '#291A00' },
  parcial:   { label: 'Pago Parcial', color: '#60A5FA', bg: '#0C1E40' },
  pagada:    { label: 'Pagada',       color: '#10B981', bg: '#052E20' },
  cancelada: { label: 'Cancelada',    color: '#94A3B8', bg: '#1E293B' },
};
const METODOS = ['efectivo', 'transferencia', 'tarjeta', 'pago_movil', 'otro'];

export default function CompraDetailScreen() {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { formatUSD } = useTasa();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [compra,  setCompra]  = useState<Compra | null>(null);
  const [items,   setItems]   = useState<CompraItem[]>([]);
  const [pagos,   setPagos]   = useState<PagoCompra[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal pago
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [montoStr,  setMontoStr]  = useState('');
  const [metodo,    setMetodo]    = useState('efectivo');
  const [referencia,setReferencia]= useState('');
  const [savingPago,setSavingPago]= useState(false);

  const load = useCallback(async () => {
    const [{ data: c }, { data: ci }, { data: p }] = await Promise.all([
      supabase.from('compras').select('*, proveedores(nombre,telefono)').eq('id', id).single(),
      supabase.from('compra_items').select('*, productos(nombre)').eq('compra_id', id).order('orden'),
      supabase.from('pagos_compras').select('*').eq('compra_id', id).order('created_at'),
    ]);
    setCompra(c as Compra);
    setItems((ci ?? []) as CompraItem[]);
    setPagos((p ?? []) as PagoCompra[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saldo = compra ? Number(compra.total) - Number(compra.monto_pagado) : 0;

  const handleRegistrarPago = async () => {
    const monto = parseFloat(montoStr);
    if (!monto || monto <= 0) { Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.'); return; }
    if (monto > saldo + 0.001) { Alert.alert('Monto excede el saldo', `El saldo pendiente es ${formatUSD(saldo)}.`); return; }
    setSavingPago(true);
    try {
      await supabase.from('pagos_compras').insert({
        compra_id: id,
        fecha: new Date().toISOString().slice(0, 10),
        monto,
        metodo,
        referencia: referencia.trim() || null,
      });
      const nuevoMontoPagado = Number(compra!.monto_pagado) + monto;
      const nuevoEstado = nuevoMontoPagado >= Number(compra!.total) - 0.001 ? 'pagada' : 'parcial';
      await supabase.from('compras').update({ monto_pagado: nuevoMontoPagado, estado: nuevoEstado }).eq('id', id);
      setShowPagoModal(false);
      setMontoStr(''); setReferencia(''); setMetodo('efectivo');
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingPago(false);
    }
  };

  const handleCancelar = () => {
    Alert.alert('Cancelar Compra', '¿Seguro? Los cambios de stock no se revertirán automáticamente.', [
      { text: 'No', style: 'cancel' },
      { text: 'Cancelar Compra', style: 'destructive', onPress: async () => {
        await supabase.from('compras').update({ estado: 'cancelada' }).eq('id', id);
        load();
      }},
    ]);
  };

  if (loading || !compra) {
    return <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor: C.background }}><ActivityIndicator color={C.primary} /></View>;
  }

  const cfg = ESTADO_CONFIG[compra.estado] ?? ESTADO_CONFIG.pendiente;
  const proveedor = (compra as any).proveedores;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{compra.numero}</Text>
          <Text style={s.subtitle}>{new Date(compra.fecha).toLocaleDateString('es-VE')}</Text>
        </View>
        <View style={[s.estadoBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[s.estadoText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Proveedor */}
        {proveedor && (
          <View style={s.card}>
            <View style={s.infoRow}>
              <Ionicons name="business-outline" size={16} color={C.textMuted} />
              <Text style={s.infoText}>{proveedor.nombre}</Text>
              {proveedor.telefono && <Text style={[s.infoText, { color: C.textMuted }]}>{proveedor.telefono}</Text>}
            </View>
          </View>
        )}

        {/* Resumen financiero */}
        <View style={s.finCard}>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Total Factura</Text>
            <Text style={s.finValue}>{formatUSD(Number(compra.total))}</Text>
          </View>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Pagado</Text>
            <Text style={[s.finValue, { color: C.success }]}>{formatUSD(Number(compra.monto_pagado))}</Text>
          </View>
          {saldo > 0.001 && (
            <View style={[s.finRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 4 }]}>
              <Text style={[s.finLabel, { color: C.error, fontWeight: '700' }]}>Saldo Pendiente</Text>
              <Text style={[s.finValue, { color: C.error, fontSize: 22 }]}>{formatUSD(saldo)}</Text>
            </View>
          )}
          {compra.fecha_vencimiento && (
            <View style={s.finRow}>
              <Text style={s.finLabel}>Vence</Text>
              <Text style={[s.finValue, { fontSize: 14, color: C.warning }]}>
                {new Date(compra.fecha_vencimiento).toLocaleDateString('es-VE')}
              </Text>
            </View>
          )}
        </View>

        {/* Botón Registrar Pago */}
        {(compra.estado === 'pendiente' || compra.estado === 'parcial') && (
          <TouchableOpacity style={s.pagarBtn} onPress={() => setShowPagoModal(true)} activeOpacity={0.85}>
            <Ionicons name="cash-outline" size={20} color="#fff" />
            <Text style={s.pagarBtnText}>Registrar Pago</Text>
          </TouchableOpacity>
        )}

        {/* Items */}
        <Text style={s.sectionTitle}>Artículos</Text>
        <View style={s.card}>
          {items.map((it, i) => (
            <View key={it.id ?? i} style={[s.itemRow, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemDesc}>{it.descripcion}</Text>
                <Text style={s.itemSub}>{it.cantidad} × {formatUSD(it.precio_unitario)}</Text>
              </View>
              <Text style={s.itemTotal}>{formatUSD(it.subtotal)}</Text>
            </View>
          ))}
          <View style={[s.itemRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
            <Text style={[s.itemDesc, { color: C.primary, fontWeight: '800' }]}>Total</Text>
            <Text style={[s.itemTotal, { color: C.primary, fontSize: 18 }]}>{formatUSD(Number(compra.total))}</Text>
          </View>
        </View>

        {/* Historial Pagos */}
        {pagos.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Pagos Realizados</Text>
            <View style={s.card}>
              {pagos.map((p, i) => (
                <View key={p.id} style={[s.itemRow, i < pagos.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemDesc}>{p.metodo.charAt(0).toUpperCase() + p.metodo.slice(1)}</Text>
                    <Text style={s.itemSub}>{new Date(p.fecha).toLocaleDateString('es-VE')}</Text>
                    {p.referencia && <Text style={s.itemSub}>Ref: {p.referencia}</Text>}
                  </View>
                  <Text style={[s.itemTotal, { color: C.success }]}>{formatUSD(p.monto)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Notas */}
        {compra.notas && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Notas</Text>
            <Text style={{ color: C.textSecondary, fontSize: 14, lineHeight: 20 }}>{compra.notas}</Text>
          </View>
        )}

        {/* Cancelar */}
        {compra.estado !== 'cancelada' && compra.estado !== 'pagada' && (
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancelar}>
            <Ionicons name="close-circle-outline" size={16} color={C.error} />
            <Text style={{ color: C.error, fontWeight: '700', fontSize: 14 }}>Cancelar esta compra</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal Pago */}
      <Modal visible={showPagoModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: C.surface }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Registrar Pago</Text>
              <TouchableOpacity onPress={() => setShowPagoModal(false)}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalLabel}>Monto a pagar $</Text>
            <TextInput
              style={s.modalInput}
              value={montoStr}
              onChangeText={setMontoStr}
              keyboardType="decimal-pad"
              placeholder={`Máx: ${formatUSD(saldo)}`}
              placeholderTextColor={C.textMuted}
              autoFocus
            />

            <Text style={s.modalLabel}>Método de pago</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {METODOS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[s.metodoBadge, metodo === m && { backgroundColor: C.primary, borderColor: C.primary }]}
                  onPress={() => setMetodo(m)}
                >
                  <Text style={[{ fontSize: 12, fontWeight: '600', color: C.textSecondary }, metodo === m && { color: '#fff' }]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.modalLabel}>Referencia (opcional)</Text>
            <TextInput
              style={[s.modalInput, { marginBottom: 20 }]}
              value={referencia}
              onChangeText={setReferencia}
              placeholder="Número de transferencia..."
              placeholderTextColor={C.textMuted}
            />

            <TouchableOpacity
              style={[s.pagarBtn, savingPago && { opacity: 0.65 }]}
              onPress={handleRegistrarPago}
              disabled={savingPago}
              activeOpacity={0.85}
            >
              {savingPago
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={s.pagarBtnText}>Confirmar Pago</Text></>
              }
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
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:    { padding: 4 },
  title:      { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle:   { fontSize: 12, color: C.textMuted, marginTop: 1 },
  estadoBadge:{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  estadoText: { fontSize: 12, fontWeight: '700' },
  content:    { padding: 20, gap: 14, paddingBottom: 40 },
  card:       { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  infoRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText:   { fontSize: 14, color: C.text, fontWeight: '600' },
  finCard:    { backgroundColor: C.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border, gap: 10 },
  finRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finLabel:   { fontSize: 14, color: C.textSecondary },
  finValue:   { fontSize: 18, fontWeight: '800', color: C.text },
  pagarBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.success, borderRadius: 16, height: 52, shadowColor: C.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  pagarBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  itemRow:    { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemDesc:   { fontSize: 14, fontWeight: '600', color: C.text },
  itemSub:    { fontSize: 12, color: C.textMuted, marginTop: 2 },
  itemTotal:  { fontSize: 15, fontWeight: '800', color: C.text },
  cancelBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: C.error + '55', backgroundColor: C.errorBg },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  sheetHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  modalLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 8 },
  modalInput: { backgroundColor: C.background, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, marginBottom: 16 },
  metodoBadge:{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
});
