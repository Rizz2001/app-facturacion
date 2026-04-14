import React, { useMemo } from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { Producto } from '@/lib/types';
import { useTasa } from '@/context/TasaContext';
import { useAuth } from '@/context/AuthContext';
import { ProfileAvatar } from '@/components/ProfileAvatar';

export default function ProductosScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const Colors = colors;
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const router = useRouter();
  const { profile, empleado, tenant_id } = useAuth();
  const { formatUSD, formatBs } = useTasa();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtered, setFiltered] = useState<Producto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Productos con stock bajo
  const stockBajo = productos.filter(p => (p.stock ?? 0) <= (p.stock_minimo ?? 0) && p.stock_minimo > 0);

  const loadProductos = useCallback(async () => {
    const { data } = await supabase
      .from('productos')
      .select('*, categorias(nombre)')
      .eq('activo', true)
      .order('nombre');
    if (data) setProductos(data as Producto[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { 
    loadProductos(); 

    if (!tenant_id) return;
    const channel = supabase.channel('realtime-productos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos', filter: `user_id=eq.${tenant_id}` }, () => {
         loadProductos();
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadProductos, tenant_id]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? productos.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      ) : productos
    );
  }, [productos, search]);

  const deleteProducto = (id: string, nombre: string) => {
    Alert.alert('Eliminar producto', `¿Eliminar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('productos').update({ activo: false }).eq('id', id);
          loadProductos();
        },
      },
    ]);
  };

  const renderItem = ({ item: p }: { item: Producto }) => (
    <TouchableOpacity style={[styles.card, (p.stock ?? 0) <= (p.stock_minimo ?? 0) && p.stock_minimo > 0 && { borderLeftColor: Colors.error, borderLeftWidth: 3 }]} activeOpacity={0.8}>
      <View style={styles.iconWrap}>
        <Ionicons name="cube" size={22} color={Colors.info} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.nombre}>{p.nombre}</Text>
        {p.descripcion && <Text style={styles.desc} numberOfLines={1}>{p.descripcion}</Text>}
        <View style={styles.metaRow}>
          {p.categorias && (
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{p.categorias.nombre}</Text>
            </View>
          )}
          <Text style={styles.unidad}>{p.unidad}</Text>
          <Text style={[styles.stock, (p.stock ?? 0) <= 0 && styles.stockEmpty]}>
            Stock: {p.stock ?? 0}
          </Text>
          {p.stock_minimo > 0 && (
            <Text style={[styles.stockMin, (p.stock ?? 0) <= p.stock_minimo && { color: Colors.error, fontWeight: '700' }]}>
              Min: {p.stock_minimo}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.precio}>{formatUSD(p.precio)}</Text>
        <Text style={styles.precioBs}>{formatBs(p.precio)}</Text>
        {(!empleado || empleado.permiso_productos) && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/producto/editar/[id]', params: { id: p.id } })}>
              <Ionicons name="pencil-outline" size={16} color={Colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => deleteProducto(p.id, p.nombre)}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Productos</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {(!empleado || empleado.permiso_productos) && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/producto/nuevo')}>
              <Ionicons name="add" size={22} color={Colors.white} />
            </TouchableOpacity>
          )}
          <ProfileAvatar size={36} />
        </View>
      </View>

      {/* Banner alerta de stock bajo */}
      {stockBajo.length > 0 && (
        <TouchableOpacity
          style={[styles.alertBanner, { backgroundColor: Colors.errorBg, borderColor: Colors.error + '55' }]}
          onPress={() => setSearch(stockBajo[0].nombre)}
          activeOpacity={0.8}
        >
          <Ionicons name="warning" size={16} color={Colors.error} />
          <Text style={[styles.alertBannerText, { color: Colors.error }]}>
            {stockBajo.length} producto{stockBajo.length !== 1 ? 's' : ''} con stock bajo o agotado
          </Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.error} />
        </TouchableOpacity>
      )}

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={17} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.count}>{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProductos(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No hay productos</Text>
              {(!empleado || empleado.permiso_productos) && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/producto/nuevo')}>
                  <Text style={styles.emptyBtnText}>Agregar producto</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 24, marginBottom: 10, padding: 12,
    borderRadius: 12, borderWidth: 1,
  },
  alertBannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, marginHorizontal: 24,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, height: 44, marginBottom: 8,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  count: { fontSize: 12, color: Colors.textMuted, paddingHorizontal: 24, marginBottom: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 24, paddingBottom: 20, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: Colors.infoBg, justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  cardBody: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '700', color: Colors.text },
  desc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  catBadge: { backgroundColor: Colors.primaryBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  catText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  unidad: { fontSize: 11, color: Colors.textMuted },
  stock: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  stockEmpty: { color: Colors.error },
  stockMin: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 6 },
  precio: { fontSize: 16, fontWeight: '800', color: Colors.text },
  precioBs: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
  emptyBtn: { marginTop: 16, backgroundColor: Colors.primaryBg, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: Colors.primary, fontWeight: '600' },
});
