import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useTasa } from '@/context/TasaContext';
import { Proveedor, Compra } from '@/lib/types';

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: '#F59E0B', bg: '#291A00' },
  parcial:   { label: 'Pago Parcial', color: '#60A5FA', bg: '#0C1E40' },
  pagada:    { label: 'Pagada', color: '#10B981', bg: '#052E20' },
  cancelada: { label: 'Cancelada', color: '#94A3B8', bg: '#1E293B' },
};

export default function ProveedorDetailScreen() {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { formatUSD } = useTasa();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [compras, setCompras]     = useState<Compra[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    const [{ data: prov }, { data: comp }] = await Promise.all([
      supabase.from('proveedores').select('*').eq('id', id).single(),
      supabase.from('compras').select('*, proveedores(nombre)').eq('proveedor_id', id).order('fecha', { ascending: false }),
    ]);
    setProveedor(prov as Proveedor);
    setCompras((comp ?? []) as Compra[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const totalDeuda = compras
    .filter(c => c.estado === 'pendiente' || c.estado === 'parcial')
    .reduce((sum, c) => sum + (Number(c.total) - Number(c.monto_pagado)), 0);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Proveedor',
      '¿Seguro que deseas desactivar este proveedor? Las compras no se eliminarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar', style: 'destructive',
          onPress: async () => {
            await supabase.from('proveedores').update({ activo: false }).eq('id', id);
            router.back();
          },
        },
      ]
    );
  };

  if (loading || !proveedor) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{proveedor.nombre}</Text>
          {proveedor.rif && <Text style={s.subtitle}>RIF: {proveedor.rif}</Text>}
        </View>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => router.push(`/proveedores/nuevo?id=${id}`)}
        >
          <Ionicons name="pencil" size={16} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color={C.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={s.card}>
          {proveedor.telefono && (
            <View style={s.infoRow}>
              <Ionicons name="call-outline" size={16} color={C.textMuted} />
              <Text style={s.infoText}>{proveedor.telefono}</Text>
            </View>
          )}
          {proveedor.email && (
            <View style={s.infoRow}>
              <Ionicons name="mail-outline" size={16} color={C.textMuted} />
              <Text style={s.infoText}>{proveedor.email}</Text>
            </View>
          )}
          {proveedor.ciudad && (
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={16} color={C.textMuted} />
              <Text style={s.infoText}>{proveedor.ciudad}{proveedor.direccion ? ` — ${proveedor.direccion}` : ''}</Text>
            </View>
          )}
          {proveedor.notas && (
            <View style={s.infoRow}>
              <Ionicons name="document-text-outline" size={16} color={C.textMuted} />
              <Text style={s.infoText}>{proveedor.notas}</Text>
            </View>
          )}
        </View>

        {/* Deuda total */}
        {totalDeuda > 0 && (
          <View style={[s.deudaCard, { borderColor: C.error + '55' }]}>
            <Ionicons name="alert-circle" size={20} color={C.error} />
            <View style={{ flex: 1 }}>
              <Text style={[s.deudaLabel, { color: C.error }]}>Deuda pendiente</Text>
              <Text style={[s.deudaValue, { color: C.error }]}>{formatUSD(totalDeuda)}</Text>
            </View>
            <TouchableOpacity
              style={[s.newCompraBtn, { backgroundColor: C.primary }]}
              onPress={() => router.push(`/compras/nueva?proveedor_id=${id}`)}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Nueva Compra</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Historial Compras */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Historial de Compras</Text>
          <TouchableOpacity
            style={[s.newCompraBtn, { backgroundColor: C.primary }]}
            onPress={() => router.push(`/compras/nueva?proveedor_id=${id}`)}
          >
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Nueva</Text>
          </TouchableOpacity>
        </View>

        {compras.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={36} color={C.textMuted} />
            <Text style={s.emptyText}>Sin compras registradas</Text>
          </View>
        ) : (
          compras.map(c => {
            const cfg = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.pendiente;
            const saldo = Number(c.total) - Number(c.monto_pagado);
            return (
              <TouchableOpacity
                key={c.id}
                style={s.compraRow}
                onPress={() => router.push(`/compras/${c.id}` as any)}
                activeOpacity={0.78}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.compraNum}>{c.numero}</Text>
                  <Text style={s.compraFecha}>{new Date(c.fecha).toLocaleDateString('es-VE')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.compraTotal}>{formatUSD(Number(c.total))}</Text>
                  {saldo > 0 && (
                    <Text style={{ fontSize: 11, color: C.error, fontWeight: '600' }}>
                      Debe: {formatUSD(saldo)}
                    </Text>
                  )}
                  <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.background },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: Platform.OS === 'android' ? 52 : 58,
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:  { padding: 4 },
  title:    { fontSize: 18, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  editBtn:  { padding: 8, backgroundColor: C.primaryBg, borderRadius: 10 },
  deleteBtn:{ padding: 8, backgroundColor: C.errorBg, borderRadius: 10 },
  card: {
    backgroundColor: C.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border, gap: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText:{ flex: 1, fontSize: 14, color: C.text, lineHeight: 20 },
  deudaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.errorBg, borderRadius: 16,
    padding: 14, borderWidth: 1,
  },
  deudaLabel: { fontSize: 12, fontWeight: '600' },
  deudaValue: { fontSize: 18, fontWeight: '800' },
  newCompraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: C.text },
  compraRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.border,
  },
  compraNum:   { fontSize: 14, fontWeight: '700', color: C.text },
  compraFecha: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  compraTotal: { fontSize: 14, fontWeight: '800', color: C.text },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  empty:     { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { color: C.textMuted, fontSize: 14 },
});
