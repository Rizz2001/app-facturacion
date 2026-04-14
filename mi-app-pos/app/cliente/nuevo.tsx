import React, { useMemo } from 'react';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

// Definido fuera del componente para evitar bug de teclado en Android
function Field({ label, value, onChangeText, placeholder, keyboard = 'default', required = false }: any) {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}{required && <Text style={{ color: Colors.error }}> *</Text>}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard}
        autoCapitalize={keyboard === 'phone-pad' ? 'none' : 'words'}
      />
    </View>
  );
}

export default function NuevoClienteScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const Colors = colors;
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const router = useRouter();
  const { profile, tenant_id } = useAuth();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('clientes').insert({
        user_id: tenant_id,
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        pais: 'Venezuela',
      });
      if (error) throw error;
      Alert.alert('¡Listo!', 'Cliente guardado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.scroll}>
        {/* Header */}
        <View style={styles.iconHeader}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-add" size={28} color={Colors.success} />
          </View>
          <View>
            <Text style={styles.headerText}>Nuevo Cliente</Text>
            <Text style={styles.headerSub}>Nombre y teléfono</Text>
          </View>
        </View>

        <Field
          label="Nombre y Apellido"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Juan Pérez"
          required
        />

        <Field
          label="Teléfono"
          value={telefono}
          onChangeText={setTelefono}
          placeholder="0414-000-0000"
          keyboard="phone-pad"
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Guardar cliente</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, padding: 24, paddingTop: 16 },
  iconHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: Colors.successBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  headerText: { fontSize: 20, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  group: { marginBottom: 20 },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 13,
    color: Colors.text, fontSize: 16,
  },
  btn: {
    flexDirection: 'row', backgroundColor: Colors.success,
    borderRadius: 14, height: 54,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
