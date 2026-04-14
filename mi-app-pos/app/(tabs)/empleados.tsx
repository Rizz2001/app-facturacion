import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, Switch } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Empleado } from '@/lib/types';
import { useRouter } from 'expo-router';

export default function EmpleadosScreen() {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const { profile, empleado } = useAuth();
  const router = useRouter();

  const [empleadosList, setEmpleadosList] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for Quick Add Modal/Form
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Default new permissions
  const [p_ventas, setP_ventas] = useState(true);
  const [p_productos, setP_productos] = useState(false);
  const [p_eliminar, setP_eliminar] = useState(false);
  const [p_tasa, setP_tasa] = useState(false);

  useEffect(() => {
    if (empleado) {
      // Si un empleado logra entrar a esta ruta, lo sacamos
      router.replace('/(tabs)');
      return;
    }
    loadEmpleados();
  }, [profile, empleado]);

  const loadEmpleados = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEmpleadosList(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Error', 'Ingrese un correo válido');
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from('empleados').insert({
        owner_id: profile!.id,
        email: newEmail.trim().toLowerCase(),
        permiso_ventas: p_ventas,
        permiso_productos: p_productos,
        permiso_eliminar_facturas: p_eliminar,
        permiso_modificar_tasa: p_tasa,
        activo: true
      });
      if (error) {
        if (error.code === '23505') throw new Error('Este correo ya está registrado en tu equipo.');
        throw error;
      }
      
      Alert.alert('Éxito', `Invitación/Permiso creado para ${newEmail}.\nEllos deben descargar la app y registrarse con este correo para unirse a tu negocio.`);
      setShowAdd(false);
      setNewEmail('');
      loadEmpleados();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (emp: Empleado) => {
    try {
      const { error } = await supabase.from('empleados')
        .update({ activo: !emp.activo })
        .eq('id', emp.id);
      if (error) throw error;
      loadEmpleados();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const togglePermission = async (emp: Empleado, field: keyof Empleado) => {
    try {
      const { error } = await supabase.from('empleados')
        .update({ [field]: !emp[field] })
        .eq('id', emp.id);
      if (error) throw error;
      loadEmpleados();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const deleteEmpleado = async (id: string, email: string) => {
    Alert.alert('Eliminar Empleado', `¿Estás seguro de quitar el acceso a ${email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.from('empleados').delete().eq('id', id);
          loadEmpleados();
      }}
    ]);
  };

  const renderItem = ({ item }: { item: Empleado }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.emailText}>{item.email}</Text>
        <Text style={styles.statusText}>
          Estado: <Text style={{ color: item.auth_id ? Colors.success : Colors.warning }}>
            {item.auth_id ? 'Conectado (Registrado)' : 'Pendiente por registrarse'}
          </Text>
        </Text>
        <Text style={styles.statusText}>
          Status Acceso: <Text style={{ color: item.activo ? Colors.success : Colors.error }}>{item.activo ? 'Activo' : 'Suspendido'}</Text>
        </Text>

        <View style={styles.permsRow}>
          <TouchableOpacity onPress={() => togglePermission(item, 'permiso_ventas')}>
            <View style={[styles.badge, !item.permiso_ventas && styles.badgeOff]}>
              <Text style={[styles.badgeText, !item.permiso_ventas && styles.badgeTextOff]}>Ventas</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => togglePermission(item, 'permiso_productos')}>
            <View style={[styles.badge, item.permiso_productos ? { backgroundColor: Colors.infoBg } : styles.badgeOff]}>
              <Text style={[styles.badgeText, item.permiso_productos ? { color: Colors.info } : styles.badgeTextOff]}>Productos/Precios</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => togglePermission(item, 'permiso_eliminar_facturas')}>
            <View style={[styles.badge, item.permiso_eliminar_facturas ? { backgroundColor: Colors.errorBg } : styles.badgeOff]}>
              <Text style={[styles.badgeText, item.permiso_eliminar_facturas ? { color: Colors.error } : styles.badgeTextOff]}>Eliminar Ventas</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => togglePermission(item, 'permiso_modificar_tasa')}>
            <View style={[styles.badge, item.permiso_modificar_tasa ? { backgroundColor: Colors.warning + '22' } : styles.badgeOff]}>
              <Text style={[styles.badgeText, item.permiso_modificar_tasa ? { color: Colors.warning } : styles.badgeTextOff]}>Cambiar Tasa</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 12 }}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus(item)}>
          <Ionicons name={item.activo ? "pause" : "play"} size={20} color={Colors.warning} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => deleteEmpleado(item.id, item.email)}>
          <Ionicons name="trash" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Equipo</Text>
        <TouchableOpacity style={styles.addIcon} onPress={() => setShowAdd(!showAdd)}>
          <Ionicons name={showAdd ? "close" : "add"} size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View style={styles.addWrapper}>
          <Text style={styles.addTitle}>Invitar/Asignar usuario</Text>
          <Text style={styles.addSubtitle}>Ingresa el correo del empleado que usará en la App.</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={Colors.textMuted}
            value={newEmail}
            autoCapitalize="none"
            onChangeText={setNewEmail}
            keyboardType="email-address"
          />
          
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Ventas</Text>
              <Text style={styles.switchDesc}>Puede usar el Punto de Venta</Text>
            </View>
            <Switch value={p_ventas} onValueChange={setP_ventas} />
          </View>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Modificar Productos</Text>
              <Text style={styles.switchDesc}>Puede crear y editar precios</Text>
            </View>
            <Switch value={p_productos} onValueChange={setP_productos} />
          </View>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Eliminación</Text>
              <Text style={styles.switchDesc}>Puede eliminar ventas del sistema</Text>
            </View>
            <Switch value={p_eliminar} onValueChange={setP_eliminar} />
          </View>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Tasa de Cambio</Text>
              <Text style={styles.switchDesc}>Puede modificar la tasa en vivo</Text>
            </View>
            <Switch value={p_tasa} onValueChange={setP_tasa} />
          </View>

          <TouchableOpacity style={styles.btnSave} onPress={handleAdd} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnSaveText}>Crear Acceso</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={empleadosList}
          keyExtractor={e => e.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={{ marginTop: 16, color: Colors.textSecondary }}>No tienes empleados configurados.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  backBtn: { marginRight: 16 },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: Colors.text },
  addIcon: { padding: 8, backgroundColor: Colors.primaryBg, borderRadius: 12 },
  
  addWrapper: {
    marginHorizontal: 20, marginBottom: 20, padding: 16,
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border
  },
  addTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  addSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  input: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, height: 44, color: Colors.text, marginBottom: 16
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  switchDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  btnSave: {
    backgroundColor: Colors.primary, height: 44, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginTop: 8
  },
  btnSaveText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  
  list: { padding: 20, paddingTop: 10, gap: 12 },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start'
  },
  emailText: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  statusText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  permsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: { backgroundColor: Colors.successBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.success },
  badgeOff: { backgroundColor: Colors.border },
  badgeTextOff: { color: Colors.textMuted },
  actionBtn: { padding: 8, backgroundColor: Colors.background, borderRadius: 8 }
});
