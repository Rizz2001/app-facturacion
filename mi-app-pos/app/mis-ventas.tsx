import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTasa } from '@/context/TasaContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { EstadoBadge } from '@/constants/Colors';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function MisVentasScreen() {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const { empleado, profile } = useAuth();
  const { formatUSD, formatBs } = useTasa();
  const router = useRouter();

  const [ventas, setVentas] = useState<any[]>([]);
  const [totalHoy, setTotalHoy] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hoy = new Date().toISOString().slice(0, 10);

  const loadVentas = useCallback(async () => {
    try {
      let query = supabase
        .from('facturas')
        .select('*, clientes(nombre)')
        .order('created_at', { ascending: false });

      // Si es empleado, filtra solo sus ventas
      if (empleado?.id) {
        query = query.eq('generada_por', empleado.id);
      }

      const { data } = await query;
      const all = data || [];
      setVentas(all);
      const hoyVentas = all.filter(f => f.fecha === hoy && f.estado === 'pagada');
      setTotalHoy(hoyVentas.reduce((s: number, f: any) => s + Number(f.total), 0));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [empleado?.id, hoy]);

  useEffect(() => { loadVentas(); }, [loadVentas]);

  const onRefresh = () => { setRefreshing(true); loadVentas(); };

  const renderItem = ({ item: f }: { item: any }) => {
    const badge = EstadoBadge[f.estado as keyof typeof EstadoBadge];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/venta/${f.id}`)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.numero}>{f.numero}</Text>
          <Text style={styles.cliente}>{f.clientes?.nombre ?? '—'}</Text>
          <Text style={styles.fecha}>{formatDate(f.fecha)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={styles.total}>{formatUSD(Number(f.total))}</Text>
          <View style={[styles.badge, { backgroundColor: badge?.bg }]}>
            <Text style={[styles.badgeText, { color: badge?.text }]}>{badge?.label}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={15} color={Colors.textMuted} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  const nombre = empleado?.nombre || profile?.nombre || 'Tú';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Mis Ventas</Text>
          <Text style={styles.subtitle}>{nombre}</Text>
        </View>
      </View>

      {/* Resumen del día */}
      <View style={[styles.hoyCard, { backgroundColor: Colors.primaryBg, borderColor: Colors.primary + '44' }]}>
        <View>
          <Text style={[styles.hoyLabel, { color: Colors.primary }]}>Vendido hoy</Text>
          <Text style={[styles.hoyTotal, { color: Colors.primary }]}>{formatUSD(totalHoy)}</Text>
          <Text style={[styles.hoyBs, { color: Colors.primary + 'AA' }]}>{formatBs(totalHoy)}</Text>
        </View>
        <View style={[styles.hoyIcon, { backgroundColor: Colors.primary + '22' }]}>
          <Ionicons name="trending-up" size={28} color={Colors.primary} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={ventas}
          keyExtractor={f => f.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Sin ventas registradas</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 24 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 1 },

  hoyCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 16, padding: 18, borderRadius: 16, borderWidth: 1,
  },
  hoyLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  hoyTotal: { fontSize: 26, fontWeight: '900' },
  hoyBs: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  hoyIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  list: { paddingHorizontal: 24, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border,
  },
  numero: { fontSize: 14, fontWeight: '700', color: C.text },
  cliente: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  fecha: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  total: { fontSize: 16, fontWeight: '800', color: C.text },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: C.textMuted, fontSize: 14 },
});
