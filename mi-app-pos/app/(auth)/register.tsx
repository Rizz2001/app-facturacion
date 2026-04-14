import React, { useMemo } from 'react';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

// ⚠️ Definido FUERA del componente padre para evitar que Android pierda
// el foco del teclado en cada keystroke (React recrearía el nodo si estuviera adentro)
function Field({
  label, icon, value, onChangeText, placeholder, keyboard = 'default',
  secure = false, extra = {},
}: any) {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboard}
          secureTextEntry={secure}
          autoCapitalize="none"
          {...extra}
        />
      </View>
    </View>
  );
}

export default function RegisterScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const Colors = colors;
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const { signUp } = useAuth();
  const [tipoRegistro, setTipoRegistro] = useState<'empresa' | 'empleado'>('empresa');
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nombre.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Nombre, email y contraseña son obligatorios');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      setLoading(true);
      await signUp(email.trim(), password, nombre.trim(), empresa.trim() || undefined);
      // Supabase automáticamente iniciará la sesión si la confirmación por email está desactivada.
      // No necesitamos redirigir a /login manualmente o mostrar una alerta obligatoria,
      // la navegación lo detectará a través del AuthContext y lo llevará a /(tabs)
    } catch (error: any) {
      Alert.alert('Error al registrarse', error.message || 'Inténtalo de nuevo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="cart" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>System RISAN</Text>
          <Text style={styles.subtitle}>Crea tu cuenta gratis</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registro</Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity 
              style={[styles.toggleBtn, tipoRegistro === 'empresa' && styles.toggleBtnActive]} 
              onPress={() => setTipoRegistro('empresa')}
            >
              <Text style={[styles.toggleText, tipoRegistro === 'empresa' && { color: Colors.primary }]}>Dueño / Empresa</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, tipoRegistro === 'empleado' && styles.toggleBtnActive]} 
              onPress={() => setTipoRegistro('empleado')}
            >
              <Text style={[styles.toggleText, tipoRegistro === 'empleado' && { color: Colors.primary }]}>Empleado</Text>
            </TouchableOpacity>
          </View>

          {tipoRegistro === 'empleado' && (
            <Text style={styles.infoText}>
              Asegúrate de usar el correo al que fuiste invitado para vincularte automáticamente.
            </Text>
          )}

          <Field label="Nombre completo *" icon="person-outline" value={nombre}
            onChangeText={setNombre} placeholder="Juan García" extra={{ autoCapitalize: 'words' }} />

          {tipoRegistro === 'empresa' && (
            <Field label="Empresa (opcional)" icon="business-outline" value={empresa}
              onChangeText={setEmpresa} placeholder="Mi Empresa S.L." extra={{ autoCapitalize: 'words' }} />
          )}

          <Field label="Correo electrónico *" icon="mail-outline" value={email}
            onChangeText={setEmail} placeholder="tu@email.com" keyboard="email-address" />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <Field label="Confirmar contraseña *" icon="lock-closed-outline" value={confirm}
            onChangeText={setConfirm} placeholder="Repite la contraseña" secure={!showPassword} />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.btnText}>Crear cuenta</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Inicia sesión</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.primaryBg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 4, marginBottom: 20
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primaryBg,
  },
  toggleText: {
    fontSize: 14, fontWeight: '600', color: Colors.textSecondary
  },
  infoText: {
    fontSize: 13, color: Colors.textSecondary, marginBottom: 16, textAlign: 'center'
  },
  appName: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, color: Colors.textSecondary, marginBottom: 7, fontWeight: '500' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: Colors.text, fontSize: 15 },
  eyeBtn: { padding: 4 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  footerText: { color: Colors.textSecondary, fontSize: 14 },
  footerLink: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
