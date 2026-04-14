import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { Sucursal } from '@/lib/types';

export default function SucursalesScreen() {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const { profile, empleado } = useAuth();
  const router = useRouter();

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (empleado) { router.replace('/(tabs)'); return; }
    loadSucursales();
  }, [empleado]);

  const loadSucursales = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('sucursales')
      .select('*')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });
    setSucursales((data || []) as Sucursal[]);
    setLoading(false);
  }, [profile]);

  const handleCreate = async () => {
    if (!nombre.trim()) { Alert.alert('Error', 'El nombre es requerido'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('sucursales').insert({
        owner_id: profile!.id,
        nombre: nombre.trim(),
        direccion: direccion.trim() || null,
        activa: true,
      });
      if (error) throw error;
      setNombre(''); setDireccion(''); setShowForm(false);
      loadSucursales();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActiva = async (s: Sucursal) => {
    await supabase.from('sucursales').update({ activa: !s.activa }).eq('id', s.id);
    loadSucursales();
  };

  const deleteSucursal = (s: Sucursal) => {
    Alert.alert('Eliminar Sucursal', `¿Eliminar "${s.nombre}"? Los empleados asignados quedarán sin sucursal.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.from('sucursales').delete().eq('id', s.id);
          loadSucursales();
        }
      },
    ]);
  };

  const renderItem = ({ item: s }: { item: Sucursal }) => (
    <View style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: s.activa ? Colors.successBg : Colors.border }]}>
        <Ionicons name="storefront" size={20} color={s.activa ? Colors.success : Colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sucNombre}>{s.nombre}</Text>
        {s.direccion && <Text style={styles.sucDir}>{s.direccion}</Text>}
        <Text style={[styles.sucStatus, { color: s.activa ? Colors.success : Colors.error }]}>
          {s.activa ? '● Activa' : '● Inactiva'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 10 }}>
        <Switch
          value={s.activa}
          onValueChange={() => toggleActiva(s)}
          trackColor={{ true: Colors.success, false: Colors.border }}
        />
        <TouchableOpacity onPress={() => deleteSucursal(s)}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Sucursales</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addBtn}>
          <Ionicons name={showForm ? 'close' : 'add'} size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Formulario */}
      {showForm && (
        <View style={[styles.formCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.formTitle, { color: Colors.text }]}>Nueva Sucursal</Text>
          <TextInput
            style={[styles.input, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.background }]}
            placeholder="Nombre de la sucursal *"
            placeholderTextColor={Colors.textMuted}
            value={nombre}
            onChangeText={setNombre}
          />
          <TextInput
            style={[styles.input, { color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.background }]}
            placeholder="Dirección (opcional)"
            placeholderTextColor={Colors.textMuted}
            value={direccion}
            onChangeText={setDireccion}
          />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Crear Sucursal</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sucursales}
          keyExtractor={s => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Sin sucursales registradas</Text>
              <Text style={styles.emptyHint}>Toca + para agregar tu primera sucursal</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  backBtn: { marginRight: 16 },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: C.text },
  addBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },

  formCard: { marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  formTitle: { fontSize: 15, fontWeight: '700' },
  input: { height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 14 },
  saveBtn: { height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  list: { padding: 20, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  cardIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sucNombre: { fontSize: 15, fontWeight: '700', color: C.text },
  sucDir: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  sucStatus: { fontSize: 11, fontWeight: '600', marginTop: 4 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, color: C.textMuted, fontWeight: '600' },
  emptyHint: { fontSize: 13, color: C.textMuted },
});
