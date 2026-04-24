import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Proveedor } from '@/lib/types';

// También sirve como pantalla de edición si recibe un id
export default function NuevoProveedorScreen() {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { tenant_id } = useAuth();

  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [focused, setFocused]   = useState<string | null>(null);

  const [nombre,    setNombre]    = useState('');
  const [rif,       setRif]       = useState('');
  const [telefono,  setTelefono]  = useState('');
  const [email,     setEmail]     = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad,    setCiudad]    = useState('');
  const [notas,     setNotas]     = useState('');

  const esEdicion = !!id;

  // Cargar datos si editando
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from('proveedores').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const p = data as Proveedor;
        setNombre(p.nombre);
        setRif(p.rif ?? '');
        setTelefono(p.telefono ?? '');
        setEmail(p.email ?? '');
        setDireccion(p.direccion ?? '');
        setCiudad(p.ciudad ?? '');
        setNotas(p.notas ?? '');
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre del proveedor es obligatorio.');
      return;
    }
    if (!tenant_id) return;
    setSaving(true);
    try {
      const payload = {
        owner_id: tenant_id,
        nombre: nombre.trim(),
        rif: rif.trim() || null,
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        direccion: direccion.trim() || null,
        ciudad: ciudad.trim() || null,
        notas: notas.trim() || null,
      };

      if (esEdicion) {
        const { error } = await supabase.from('proveedores').update(payload).eq('id', id);
        if (error) throw error;
        Alert.alert('✅ Guardado', 'Proveedor actualizado correctamente.');
      } else {
        const { error } = await supabase.from('proveedores').insert(payload);
        if (error) throw error;
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  const Field = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }: any) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, focused === label && s.inputFocused, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        onFocus={() => setFocused(label)}
        onBlur={() => setFocused(null)}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>{esEdicion ? 'Editar Proveedor' : 'Nuevo Proveedor'}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.cardSection}>Información Principal</Text>
          <Field label="Nombre *" value={nombre} onChangeText={setNombre} placeholder="Empresa o persona" />
          <Field label="RIF / Cédula" value={rif} onChangeText={setRif} placeholder="J-12345678-9" />
        </View>

        <View style={s.card}>
          <Text style={s.cardSection}>Contacto</Text>
          <Field label="Teléfono" value={telefono} onChangeText={setTelefono} placeholder="0412-1234567" keyboardType="phone-pad" />
          <Field label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="proveedor@email.com" keyboardType="email-address" />
        </View>

        <View style={s.card}>
          <Text style={s.cardSection}>Ubicación</Text>
          <Field label="Dirección" value={direccion} onChangeText={setDireccion} placeholder="Calle, sector..." />
          <Field label="Ciudad" value={ciudad} onChangeText={setCiudad} placeholder="Caracas, Valencia..." />
        </View>

        <View style={s.card}>
          <Text style={s.cardSection}>Notas</Text>
          <Field label="Observaciones" value={notas} onChangeText={setNotas} placeholder="Condiciones de pago, notas internas..." multiline />
        </View>

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.65 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={s.saveBtnText}>{esEdicion ? 'Guardar Cambios' : 'Crear Proveedor'}</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'android' ? 52 : 58,
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 4 },
  title:   { fontSize: 18, fontWeight: '800', color: C.text },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: C.surface, borderRadius: 18,
    padding: 18, borderWidth: 1, borderColor: C.border, gap: 14,
  },
  cardSection: { fontSize: 13, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  field:  { gap: 6 },
  label:  { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  input: {
    backgroundColor: C.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: C.text,
  },
  inputFocused: { borderColor: C.primary, backgroundColor: C.primaryBg },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 16, height: 54,
    marginTop: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
