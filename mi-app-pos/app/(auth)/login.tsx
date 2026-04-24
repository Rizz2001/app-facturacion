import React from 'react';
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const STORAGE_CREDS = '@saved_credentials';

export default function LoginScreen() {
  const { colors: C } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_CREDS).then((raw) => {
      if (raw) {
        const { email: e, password: p } = JSON.parse(raw);
        setEmail(e); setPassword(p); setRecordar(true);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Por favor completa tu correo y contraseña.');
      return;
    }
    try {
      setLoading(true);
      if (recordar) {
        await AsyncStorage.setItem(STORAGE_CREDS, JSON.stringify({ email: email.trim(), password }));
      } else {
        await AsyncStorage.removeItem(STORAGE_CREDS);
      }
      await signIn(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Error al iniciar sesión', error.message || 'Comprueba tus credenciales');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Logo / Brand ─────────────────── */}
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <Ionicons name="cart" size={38} color={C.primary} />
          </View>
          <Text style={styles.appName}>System RISAN</Text>
          <Text style={styles.tagline}>Punto de Venta · Venezuela</Text>
        </View>

        {/* ── Card ─────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bienvenido 👋</Text>
          <Text style={styles.cardSubtitle}>Inicia sesión para continuar</Text>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
              <Ionicons name="mail-outline" size={17} color={focusedField === 'email' ? C.primary : C.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={C.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.inputWrap, focusedField === 'pass' && styles.inputWrapFocused]}>
              <Ionicons name="lock-closed-outline" size={17} color={focusedField === 'pass' ? C.primary : C.textMuted} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedField('pass')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={17}
                  color={C.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recordarme */}
          <TouchableOpacity style={styles.recordarRow} onPress={() => setRecordar(!recordar)} activeOpacity={0.7}>
            <View style={[styles.checkbox, recordar && { backgroundColor: C.primary, borderColor: C.primary }]}>
              {recordar && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={styles.recordarText}>Recordar mis credenciales</Text>
          </TouchableOpacity>

          {/* Botón */}
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.65 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={styles.btnText}>Iniciar sesión</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
            }
          </TouchableOpacity>

          {/* Link a registro */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿Sin cuenta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Regístrate</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* ── Powered by ───────────────────── */}
        <Text style={styles.powered}>Powered by Supabase · Expo</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },

  // Brand
  brand:    { alignItems: 'center', marginBottom: 28 },
  logoWrap: {
    width: 84, height: 84, borderRadius: 26,
    backgroundColor: C.primaryBg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  appName: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: C.textMuted, marginTop: 5, fontWeight: '500' },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 24 },

  // Inputs
  inputGroup: { marginBottom: 16 },
  label:      { fontSize: 13, color: C.textSecondary, marginBottom: 7, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.background,
    borderRadius: 13, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, height: 50,
  },
  inputWrapFocused: { borderColor: C.primary, backgroundColor: C.primaryBg },
  input:  { flex: 1, color: C.text, fontSize: 15 },

  // Checkbox
  recordarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  checkbox:    {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.background,
    justifyContent: 'center', alignItems: 'center',
  },
  recordarText: { fontSize: 13, color: C.textSecondary },

  // Button
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 14,
    height: 52,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Footer
  footerRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: C.textSecondary, fontSize: 14 },
  footerLink: { color: C.primary, fontSize: 14, fontWeight: '700' },

  powered: { textAlign: 'center', color: C.textMuted, fontSize: 11, marginTop: 24 },
});
