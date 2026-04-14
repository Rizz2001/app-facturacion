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
import { Cliente } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { ProfileAvatar } from '@/components/ProfileAvatar';

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Definido fuera del componente para evitar bug de Android
function ClienteCard({ cliente: c, onDelete }: { cliente: Cliente; onDelete: () => void }) {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const color = avatarColor(c.nombre);
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[styles.avatarText, { color }]}>{getInitials(c.nombre)}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.nombre}>{c.nombre}</Text>
        {c.telefono ? (
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.telefono}> {c.telefono}</Text>
          </View>
        ) : (
          <Text style={styles.noPhone}>Sin teléfono</Text>
        )}
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );
}

export default function ClientesScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const Colors = colors;
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const router = useRouter();
  const { tenant_id } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtered, setFiltered] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClientes = useCallback(async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, activo')
      .eq('activo', true)
      .order('nombre');
    if (data) setClientes(data as Cliente[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { 
    loadClientes(); 
    
    if (!tenant_id) return;
    const channel = supabase.channel('realtime-clientes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `user_id=eq.${tenant_id}` }, () => {
         loadClientes();
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadClientes, tenant_id]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono?.includes(q)
      ) : clientes
    );
  }, [clientes, search]);

  const deleteCliente = (id: string, nombre: string) => {
    Alert.alert('Eliminar cliente', `¿Eliminar a "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('clientes').update({ activo: false }).eq('id', id);
          loadClientes();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.subtitle}>{clientes.length} registrado{clientes.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/cliente/nuevo')}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
          <ProfileAvatar size={36} />
        </View>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o teléfono..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          renderItem={({ item }) => (
            <ClienteCard
              cliente={item}
              onDelete={() => deleteCliente(item.id, item.nombre)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadClientes(); }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={52} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No hay clientes aún</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/cliente/nuevo')}>
                <Text style={styles.emptyBtnText}>+ Agregar cliente</Text>
              </TouchableOpacity>
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
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, marginHorizontal: 24,
    borderRadius: 13, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, height: 44, marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 24, paddingBottom: 24, gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14, borderWidth: 1,
  },
  avatarText: { fontSize: 17, fontWeight: '800' },
  cardBody: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '700', color: Colors.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  telefono: { fontSize: 13, color: Colors.textSecondary },
  noPhone: { fontSize: 12, color: Colors.textMuted, marginTop: 3, fontStyle: 'italic' },
  deleteBtn: { padding: 8 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textMuted, marginTop: 14, fontSize: 16 },
  emptyBtn: {
    marginTop: 16, backgroundColor: Colors.primaryBg,
    paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12,
  },
  emptyBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
});
