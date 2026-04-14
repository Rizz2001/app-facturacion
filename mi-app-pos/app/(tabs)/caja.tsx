import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTasa } from '@/context/TasaContext';
import { useTheme } from '@/context/ThemeContext';
import { CierreCaja } from '@/lib/types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CajaScreen() {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const { tenant_id, empleado, profile } = useAuth();
  const { tasa, formatUSD, formatBs } = useTasa();

  const [cierres, setCierres] = useState<CierreCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [notas, setNotas] = useState('');
  const [showNotas, setShowNotas] = useState(false);

  // Resumen del día de hoy
  const [hoyStats, setHoyStats] = useState({
    total_usd: 0,
    total_bs: 0,
    num_facturas: 0,
    yaCerrado: false,
    cierreHoyId: null as string | null,
  });

  const hoy = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    if (!tenant_id) return;
    try {
      // Facturas del día (pagadas)
      const { data: facturas } = await supabase
        .from('facturas')
        .select('total, estado, fecha')
        .eq('user_id', tenant_id)
        .eq('fecha', hoy)
        .eq('estado', 'pagada');

      const total_usd = (facturas || []).reduce((s, f) => s + Number(f.total), 0);
      const total_bs = total_usd * tasa;

      // Cierre de hoy (si existe)
      const { data: cierreHoy } = await supabase
        .from('cierres_caja')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('fecha', hoy)
        .maybeSingle();

      setHoyStats({
        total_usd,
        total_bs,
        num_facturas: (facturas || []).length,
        yaCerrado: !!cierreHoy,
        cierreHoyId: cierreHoy?.id ?? null,
      });

      // Historial de cierres
      const { data: hist } = await supabase
        .from('cierres_caja')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('fecha', { ascending: false })
        .limit(30);
      setCierres((hist || []) as CierreCaja[]);
    } finally {
      setLoading(false);
    }
  }, [tenant_id, tasa, hoy]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCerrarCaja = async () => {
    if (hoyStats.yaCerrado) {
      Alert.alert('Ya cerrado', 'La caja de hoy ya fue cerrada.');
      return;
    }
    Alert.alert(
      'Cerrar Caja',
      `¿Confirmar cierre de caja del día?\n\nTotal vendido: ${formatUSD(hoyStats.total_usd)}\nEn Bs: ${formatBs(hoyStats.total_usd)}\nVentas pagadas: ${hoyStats.num_facturas}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Caja', onPress: async () => {
            setCerrando(true);
            try {
              const { error } = await supabase.from('cierres_caja').insert({
                tenant_id,
                empleado_id: empleado?.id ?? null,
                fecha: hoy,
                total_ventas_usd: hoyStats.total_usd,
                total_ventas_bs: hoyStats.total_bs,
                num_facturas: hoyStats.num_facturas,
                tasa_bcv: tasa,
                notas: notas.trim() || null,
              });
              if (error) throw error;
              setNotas('');
              setShowNotas(false);
              Alert.alert('✅ Caja Cerrada', 'El cierre del día fue guardado exitosamente.');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setCerrando(false);
            }
          }
        },
      ]
    );
  };

  const handleReopenCaja = (cierreId?: string | null) => {
    const id = cierreId ?? hoyStats.cierreHoyId;
    if (!id) return;
    Alert.alert(
      'Reabrir Caja',
      '¿Seguro que quieres reabrir la caja?\nEsto eliminará el cierre registrado y podrás seguir registrando ventas y volver a cerrar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reabrir', style: 'destructive',
          onPress: async () => {
            setReabriendo(true);
            try {
              const { error } = await supabase
                .from('cierres_caja')
                .delete()
                .eq('id', id);
              if (error) throw error;
              Alert.alert('🟢 Caja Reabierta', 'La caja está abierta nuevamente. Puedes seguir registrando ventas.');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setReabriendo(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: Colors.warningBg }]}>
          <Ionicons name="cash" size={22} color={Colors.warning} />
        </View>
        <View>
          <Text style={styles.title}>Caja</Text>
          <Text style={styles.subtitle}>{formatDate(hoy)}</Text>
        </View>
      </View>

      {/* Card resumen del día */}
      <View style={[styles.card, hoyStats.yaCerrado && { borderColor: Colors.success, borderWidth: 1.5 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {hoyStats.yaCerrado ? '✅ Caja Cerrada' : '🟢 Turno Actual'}
          </Text>
          <View style={[styles.chip, { backgroundColor: hoyStats.yaCerrado ? Colors.successBg : Colors.warningBg }]}>
            <Text style={[styles.chipText, { color: hoyStats.yaCerrado ? Colors.success : Colors.warning }]}>
              {hoyStats.yaCerrado ? 'Cerrado' : 'Abierto'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Ventas (USD)</Text>
            <Text style={styles.statValue}>{formatUSD(hoyStats.total_usd)}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
            <Text style={styles.statLabel}>Ventas (Bs)</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{formatBs(hoyStats.total_usd)}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
            <Text style={styles.statLabel}>Ventas</Text>
            <Text style={styles.statValue}>{hoyStats.num_facturas}</Text>
          </View>
        </View>

        <View style={styles.tasaRow}>
          <Ionicons name="trending-up-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.tasaText}>Tasa BCV: {tasa.toFixed(2)} Bs/$</Text>
        </View>
      </View>

      {/* Botón Reabrir / Boton Cerrar */}
      {hoyStats.yaCerrado ? (
        <TouchableOpacity
          style={[styles.reabrirBtn, reabriendo && { opacity: 0.7 }]}
          onPress={() => handleReopenCaja()}
          disabled={reabriendo}
          activeOpacity={0.85}
        >
          {reabriendo
            ? <ActivityIndicator color={Colors.warning} />
            : <>
                <Ionicons name="lock-open" size={20} color={Colors.warning} />
                <Text style={styles.reabrirBtnText}>Reabrir Caja del Día</Text>
              </>
          }
        </TouchableOpacity>
      ) : (
        /* Notas + Cerrar */
        <>
          <TouchableOpacity
            style={styles.notasToggle}
            onPress={() => setShowNotas(!showNotas)}
          >
            <Ionicons name={showNotas ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
            <Text style={styles.notasToggleText}>Agregar nota al cierre</Text>
          </TouchableOpacity>

          {showNotas && (
            <TextInput
              style={[styles.notasInput, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.surface }]}
              placeholder="Ej: Faltante de caja, incidente, observación..."
              placeholderTextColor={Colors.textMuted}
              value={notas}
              onChangeText={setNotas}
              multiline
              numberOfLines={3}
            />
          )}

          <TouchableOpacity
            style={[styles.cerrarBtn, cerrando && { opacity: 0.7 }]}
            onPress={handleCerrarCaja}
            disabled={cerrando}
            activeOpacity={0.85}
          >
            {cerrando
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="lock-closed" size={20} color="#fff" />
                  <Text style={styles.cerrarBtnText}>Cerrar Caja del Día</Text>
                </>
            }
          </TouchableOpacity>
        </>
      )}

      {/* Historial */}
      <Text style={styles.sectionTitle}>Historial de Cierres</Text>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
      ) : cierres.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Sin cierres anteriores</Text>
        </View>
      ) : (
        cierres.map((c) => (
          <View key={c.id} style={styles.histCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.histFecha}>{formatDate(c.fecha)}</Text>
              <Text style={styles.histSub}>{c.num_facturas} venta{c.num_facturas !== 1 ? 's' : ''} · Tasa {c.tasa_bcv} Bs/$</Text>
              {c.notas && <Text style={styles.histNotas}>📝 {c.notas}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Text style={styles.histTotal}>{formatUSD(c.total_ventas_usd)}</Text>
              <Text style={styles.histTotalBs}>{formatBs(c.total_ventas_usd)}</Text>
              {/* Boton reabrir en historial */}
              <TouchableOpacity
                style={[styles.histReopenBtn, { borderColor: Colors.warning + '55', backgroundColor: Colors.warningBg }]}
                onPress={() => handleReopenCaja(c.id)}
              >
                <Ionicons name="lock-open-outline" size={13} color={Colors.warning} />
                <Text style={[styles.histReopenText, { color: Colors.warning }]}>Reabrir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { padding: 24, paddingTop: 56, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 1 },

  card: {
    backgroundColor: C.surface, borderRadius: 20,
    padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 0, marginBottom: 12 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statLabel: { fontSize: 11, color: C.textMuted, marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: '800', color: C.text },

  tasaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tasaText: { fontSize: 12, color: C.textMuted },

  notasToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginBottom: 8 },
  notasToggleText: { fontSize: 13, color: C.textMuted },
  notasInput: {
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16,
    fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },

  cerrarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.warning, borderRadius: 16, paddingVertical: 16,
    marginBottom: 28,
    shadowColor: C.warning, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  cerrarBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  reabrirBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: 16, paddingVertical: 16,
    marginBottom: 28, borderWidth: 2, borderColor: C.warning,
  },
  reabrirBtnText: { color: C.warning, fontSize: 16, fontWeight: '800' },

  histReopenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  histReopenText: { fontSize: 11, fontWeight: '700' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { color: C.textMuted, fontSize: 14 },

  histCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  histFecha: { fontSize: 15, fontWeight: '700', color: C.text },
  histSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  histNotas: { fontSize: 11, color: C.textSecondary, marginTop: 4, fontStyle: 'italic' },
  histTotal: { fontSize: 16, fontWeight: '800', color: C.text },
  histTotalBs: { fontSize: 12, color: C.success, fontWeight: '600', marginTop: 2 },
});
