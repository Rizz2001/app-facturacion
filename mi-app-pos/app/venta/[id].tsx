import React, { useMemo } from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { EstadoBadge } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Factura, EstadoFactura } from '@/lib/types';
import { useTasa } from '@/context/TasaContext';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

const ESTADOS_OPCIONES: EstadoFactura[] = ['borrador', 'emitida', 'pagada', 'vencida', 'cancelada'];

export default function VentaDetailScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const Colors = colors;
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { empleado } = useAuth();
  const { formatUSD } = useTasa();
  const [venta, setVenta] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const loadVenta = useCallback(async () => {
    const { data } = await supabase
      .from('facturas')
      .select('*, clientes(*), factura_items(*)')
      .eq('id', id)
      .single();
    if (data) {
      // Sort items by order
      data.factura_items = (data.factura_items || []).sort((a: any, b: any) => a.orden - b.orden);
      setVenta(data as Factura);
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => { loadVenta(); }, [loadVenta]);

  const changeEstado = (newEstado: EstadoFactura) => {
    Alert.alert(
      'Cambiar estado',
      `¿Cambiar estado a "${EstadoBadge[newEstado].label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setChangingStatus(true);
            await supabase.from('facturas').update({ estado: newEstado }).eq('id', id);
            await loadVenta();
            setChangingStatus(false);
          },
        },
      ]
    );
  };

  const deleteVenta = () => {
    Alert.alert('Eliminar venta', '¿Seguro que quieres eliminar esta venta? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('facturas').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!venta) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: Colors.textMuted }}>Venta no encontrada</Text>
      </View>
    );
  }

  const badge = EstadoBadge[venta.estado];
  const cliente = venta.clientes!;
  const items = venta.factura_items || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadVenta(); }} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.facturaHeader}>
        <View>
          <Text style={styles.numero}>{venta.numero}</Text>
          <Text style={styles.fecha}>{formatDate(venta.fecha)}</Text>
        </View>
        <View style={[styles.badgeLarge, { backgroundColor: badge.bg, borderColor: badge.text + '44' }]}>
          <Text style={[styles.badgeLargeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Cambiar estado */}
      {(!empleado || empleado.permiso_eliminar_facturas) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado de la venta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ESTADOS_OPCIONES.map(e => {
                const b = EstadoBadge[e];
                const active = venta.estado === e;
                return (
                  <TouchableOpacity
                    key={e}
                    style={[styles.estadoBtn, active && { backgroundColor: b.bg, borderColor: b.text }]}
                    onPress={() => { if (!active) changeEstado(e); }}
                    disabled={changingStatus}
                  >
                    <Text style={[styles.estadoBtnText, active && { color: b.text, fontWeight: '700' }]}>
                      {b.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Cliente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cliente</Text>
        <View style={styles.card}>
          <Text style={styles.clienteNombre}>{cliente.nombre}</Text>
          {cliente.nif && <InfoRow icon="card-outline" text={cliente.nif} />}
          {cliente.email && <InfoRow icon="mail-outline" text={cliente.email} />}
          {cliente.telefono && <InfoRow icon="call-outline" text={cliente.telefono} />}
          {cliente.direccion && (
            <InfoRow icon="location-outline" text={[cliente.direccion, cliente.ciudad, cliente.codigo_postal].filter(Boolean).join(', ')} />
          )}
        </View>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalle de ítems</Text>
        <View style={styles.card}>
          {items.map((item, idx) => (
            <View key={item.id || idx} style={[styles.itemRow, idx < items.length - 1 && styles.itemDivider]}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemDesc}>{item.descripcion}</Text>
                <Text style={styles.itemMeta}>
                  {item.cantidad} × {formatUSD(Number(item.precio_unitario))} · IVA {item.iva}%
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatUSD(Number(item.total))}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Totals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Totales</Text>
        <View style={styles.card}>
          <TotalRow label="Base imponible" value={formatUSD(Number(venta.subtotal))} />
          <TotalRow label="Total IVA" value={formatUSD(Number(venta.total_iva))} />
          <View style={styles.divider} />
          <TotalRow
            label="TOTAL VENTA"
            value={formatUSD(Number(venta.total))}
            bold accent
          />
        </View>
      </View>

      {/* Notas */}
      {venta.notas && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <View style={styles.card}>
            <Text style={styles.notas}>{venta.notas}</Text>
          </View>
        </View>
      )}

      {/* Vencimiento */}
      {venta.fecha_vencimiento && (
        <View style={styles.section}>
          <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <Ionicons name="time-outline" size={18} color={Colors.warning} />
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
              Vence el <Text style={{ color: Colors.text, fontWeight: '600' }}>{formatDate(venta.fecha_vencimiento)}</Text>
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      {(!empleado || empleado.permiso_eliminar_facturas) && (
        <View style={styles.actionsBox}>
          <TouchableOpacity style={styles.deleteBtn} onPress={deleteVenta}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={styles.deleteBtnText}>Eliminar venta</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ icon, text }: { icon: any; text: string }) {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <Ionicons name={icon} size={14} color={Colors.textMuted} />
      <Text style={{ fontSize: 13, color: Colors.textSecondary, flex: 1 }}>{text}</Text>
    </View>
  );
}

function TotalRow({ label, value, bold = false, accent = false }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  const { colors: Colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontSize: bold ? 15 : 13, color: bold ? Colors.text : Colors.textSecondary, fontWeight: bold ? '700' : '400' }}>
        {label}
      </Text>
      <Text style={{ fontSize: bold ? 17 : 14, color: accent ? Colors.primary : Colors.text, fontWeight: bold ? '800' : '500' }}>
        {value}
      </Text>
    </View>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  facturaHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20,
  },
  numero: { fontSize: 24, fontWeight: '800', color: Colors.text },
  fecha: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  badgeLarge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1,
  },
  badgeLargeText: { fontSize: 13, fontWeight: '700' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },

  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },

  estadoBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  estadoBtnText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  clienteNombre: { fontSize: 17, fontWeight: '700', color: Colors.text },

  itemRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start' },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemLeft: { flex: 1 },
  itemDesc: { fontSize: 14, fontWeight: '600', color: Colors.text },
  itemMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  itemTotal: { fontSize: 15, fontWeight: '700', color: Colors.text, marginLeft: 12 },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },

  notas: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  actionsBox: { marginTop: 8 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.errorBg, borderRadius: 14, height: 50,
    borderWidth: 1, borderColor: Colors.error + '44',
  },
  deleteBtnText: { color: Colors.error, fontSize: 15, fontWeight: '600' },
});
