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
import { Proveedor } from '@/lib/types';

export default function ProveedoresScreen() {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { tenant_id } = useAuth();
  const router = useRouter();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('proveedores')
      .select('*')
      .eq('owner_id', tenant_id)
      .eq('activo', true)
      .order('nombre');
    setProveedores((data ?? []) as Proveedor[]);
    setLoading(false);
  }, [tenant_id]);

  useEffect(() => { load(); }, [load]);

  const filtered = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.rif?.toLowerCase().includes(search.toLowerCase()) ||
    p.telefono?.includes(search)
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Proveedores</Text>
          <Text style={s.subtitle}>{proveedores.length} registrados</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/proveedores/nuevo')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por nombre, RIF o teléfono..."
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

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="business-outline" size={48} color={C.textMuted} />
              <Text style={s.emptyTitle}>Sin proveedores</Text>
              <Text style={s.emptySub}>Agrega tu primer proveedor</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/proveedores/nuevo')}>
                <Text style={s.emptyBtnText}>Nuevo Proveedor</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/proveedores/${item.id}` as any)}
              activeOpacity={0.78}
            >
              <View style={[s.cardAvatar, { backgroundColor: C.primaryBg }]}>
                <Text style={[s.cardAvatarText, { color: C.primary }]}>
                  {item.nombre[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardNombre}>{item.nombre}</Text>
                {item.rif && (
                  <Text style={s.cardSub}>RIF: {item.rif}</Text>
                )}
                {item.telefono && (
                  <Text style={s.cardSub}>{item.telefono}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'android' ? 52 : 58,
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 4 },
  title:    { fontSize: 20, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  addBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, backgroundColor: C.surface,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  list: { padding: 16, paddingTop: 0, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: C.border,
  },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardAvatarText: { fontSize: 20, fontWeight: '800' },
  cardNombre: { fontSize: 15, fontWeight: '700', color: C.text },
  cardSub:    { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 8 },
  emptySub:   { fontSize: 13, color: C.textMuted },
  emptyBtn:   { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
