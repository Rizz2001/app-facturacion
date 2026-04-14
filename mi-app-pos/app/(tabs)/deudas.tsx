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

interface DeudaCliente {
  cliente_id: string;
  nombre: string;
  total_deuda: number;
  num_ventas: number;
}

export default function DeudasScreen() {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const { tenant_id } = useAuth();
  const { formatUSD, formatBs } = useTasa();
  const router = useRouter();

  const [deudas, setDeudas] = useState<DeudaCliente[]>([]);
  const [totalGlobal, setTotalGlobal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDeudas = useCallback(async () => {
    try {
      // Facturas emitidas (pendientes de pago)
      const { data } = await supabase
        .from('facturas')
        .select('cliente_id, total, clientes(nombre)')
        .in('estado', ['emitida', 'vencida']);

      if (data) {
        const map = new Map<string, DeudaCliente>();
        for (const f of data) {
          const id = f.cliente_id;
          const nombre = (f as any).clientes?.nombre ?? 'Cliente desconocido';
          const existing = map.get(id);
          if (existing) {
            existing.total_deuda += Number(f.total);
            existing.num_ventas += 1;
          } else {
            map.set(id, { cliente_id: id, nombre, total_deuda: Number(f.total), num_ventas: 1 });
          }
        }
        const list = Array.from(map.values()).sort((a, b) => b.total_deuda - a.total_deuda);
        setDeudas(list);
        setTotalGlobal(list.reduce((s, d) => s + d.total_deuda, 0));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDeudas(); }, [loadDeudas]);

  const onRefresh = () => { setRefreshing(true); loadDeudas(); };

  const renderItem = ({ item }: { item: DeudaCliente }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(tabs)/ventas', params: { cliente_id: item.cliente_id, estado: 'emitida' } })}
      activeOpacity={0.8}
    >
      <View style={[styles.avatar, { backgroundColor: Colors.errorBg }]}>
        <Text style={[styles.avatarText, { color: Colors.error }]}>
          {item.nombre[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nombre}>{item.nombre}</Text>
        <Text style={styles.factCount}>{item.num_ventas} venta{item.num_ventas !== 1 ? 's' : ''} pendiente{item.num_ventas !== 1 ? 's' : ''}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.deudaUSD}>{formatUSD(item.total_deuda)}</Text>
        <Text style={styles.deudaBs}>{formatBs(item.total_deuda)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: Colors.errorBg }]}>
          <Ionicons name="alert-circle" size={22} color={Colors.error} />
        </View>
        <View>
          <Text style={styles.title}>Cuentas por Cobrar</Text>
          <Text style={styles.subtitle}>{deudas.length} cliente{deudas.length !== 1 ? 's' : ''} con deuda</Text>
        </View>
      </View>

      {/* Total global */}
      {!loading && deudas.length > 0 && (
        <View style={[styles.totalCard, { backgroundColor: Colors.errorBg, borderColor: Colors.error + '44' }]}>
          <Text style={[styles.totalLabel, { color: Colors.error }]}>Total por cobrar</Text>
          <Text style={[styles.totalUSD, { color: Colors.error }]}>{formatUSD(totalGlobal)}</Text>
          <Text style={[styles.totalBs, { color: Colors.error + 'AA' }]}>{formatBs(totalGlobal)}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={deudas}
          keyExtractor={d => d.cliente_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
              <Text style={styles.emptyTitle}>¡Todo al día!</Text>
              <Text style={styles.emptyText}>No hay clientes con ventas pendientes.</Text>
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
  headerIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 1 },

  totalCard: {
    marginHorizontal: 24, marginBottom: 16, padding: 18,
    borderRadius: 16, borderWidth: 1, alignItems: 'center',
  },
  totalLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  totalUSD: { fontSize: 28, fontWeight: '900' },
  totalBs: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  list: { paddingHorizontal: 24, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  nombre: { fontSize: 15, fontWeight: '700', color: C.text },
  factCount: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  deudaUSD: { fontSize: 16, fontWeight: '800', color: C.error },
  deudaBs: { fontSize: 11, color: C.error + 'BB', fontWeight: '600', marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
});
