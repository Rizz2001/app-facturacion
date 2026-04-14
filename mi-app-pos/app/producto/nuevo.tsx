import React, { useMemo } from 'react';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const UNIDADES = ['Und'];

// Fuera del componente para evitar bug Android teclado
function CampoMoneda({
  label, value, onChangeText, placeholder, helper,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; helper?: string;
}) {
  const { colors: Colors } = useTheme();
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          style={styles.inputMoney}
          placeholder={placeholder ?? '0.00'}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          autoCapitalize="none"
        />
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

export default function NuevoProductoScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const Colors = colors;
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const router = useRouter();
  const { profile, tenant_id } = useAuth();
  const [nombre, setNombre] = useState('');
  const [costo, setCosto] = useState('');
  const [venta, setVenta] = useState('');
  const [unidad, setUnidad] = useState('Und');
  const [stock, setStock] = useState('0');
  const [vendePorCaja, setVendePorCaja] = useState(false);
  const [unidadesPorCaja, setUnidadesPorCaja] = useState('24');
  const [precioCaja, setPrecioCaja] = useState('');
  const [loading, setLoading] = useState(false);

  const costoNum = parseFloat(costo.replace(',', '.')) || 0;
  const ventaNum = parseFloat(venta.replace(',', '.')) || 0;

  // Utilidad y margen calculados en tiempo real
  const utilidad  = ventaNum - costoNum;
  const margen    = costoNum > 0 ? (utilidad / costoNum) * 100 : 0;
  const positivo  = utilidad >= 0;

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del producto es obligatorio');
      return;
    }
    if (ventaNum <= 0) {
      Alert.alert('Error', 'El precio de venta debe ser mayor a 0');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('productos').insert({
        user_id: tenant_id,
        nombre: nombre.trim(),
        precio: ventaNum,           // precio de venta es el precio del POS
        descripcion: `Costo: $${costoNum.toFixed(2)} | Unidad: ${unidad}`,
        iva: 0,
        unidad,
        stock: parseInt(stock, 10) || 0,
        vende_por_caja: vendePorCaja,
        unidades_por_caja: parseInt(unidadesPorCaja, 10) || 1,
        precio_caja: parseFloat(precioCaja.replace(',', '.')) || 0,
      });
      if (error) throw error;
      Alert.alert('¡Listo!', 'Producto guardado', [
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.iconHeader}>
          <View style={styles.iconWrap}>
            <Ionicons name="cube" size={28} color={Colors.info} />
          </View>
          <View>
            <Text style={styles.headerText}>Nuevo Producto</Text>
            <Text style={styles.headerSub}>Precio costo · Precio venta · Utilidad</Text>
          </View>
        </View>

        {/* Nombre */}
        <View style={styles.group}>
          <Text style={styles.label}>Nombre del producto <Text style={{ color: Colors.error }}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Refresco 600ml, Arroz Diana..."
            placeholderTextColor={Colors.textMuted}
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
        </View>

        {/* Precios */}
        <View style={styles.preciosRow}>
          <View style={{ flex: 1 }}>
            <CampoMoneda
              label="Precio Costo"
              value={costo}
              onChangeText={setCosto}
              placeholder="0.00"
            />
          </View>
          <View style={{ flex: 1 }}>
            <CampoMoneda
              label="Precio Venta"
              value={venta}
              onChangeText={setVenta}
              placeholder="0.00"
            />
          </View>
        </View>

        {/* Utilidad (calculada automáticamente) */}
        {(costoNum > 0 || ventaNum > 0) && (
          <View style={[styles.utilidadCard, { borderColor: positivo ? Colors.success : Colors.error }]}>
            <View style={styles.utilidadRow}>
              <Text style={styles.utilidadLabel}>Utilidad</Text>
              <Text style={[styles.utilidadValor, { color: positivo ? Colors.success : Colors.error }]}>
                {positivo ? '+' : ''}${utilidad.toFixed(2)}
              </Text>
            </View>
            <View style={styles.utilidadRow}>
              <Text style={styles.utilidadLabel}>Margen</Text>
              <Text style={[styles.utilidadPct, { color: positivo ? Colors.success : Colors.error }]}>
                {positivo ? '+' : ''}{margen.toFixed(1)}%
              </Text>
            </View>
            {!positivo && (
              <Text style={styles.utilidadWarning}>
                ⚠️ Estás vendiendo por debajo del costo
              </Text>
            )}
          </View>
        )}

        {/* Unidad */}
        <View style={styles.group}>
          <Text style={styles.label}>Unidad de venta</Text>
          <View style={styles.optionRow}>
            {UNIDADES.map(u => (
              <TouchableOpacity
                key={u}
                style={[styles.option, unidad === u && styles.optionActive]}
                onPress={() => setUnidad(u)}
              >
                <Text style={[styles.optionText, unidad === u && styles.optionTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stock */}
        <View style={styles.group}>
          <Text style={styles.label}>Inventario / Stock Inicial</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            value={stock}
            onChangeText={text => setStock(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
        </View>

        {/* Toggle Caja */}
        <View style={styles.group}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Habilitar venta por Caja / Paquete</Text>
              <Text style={styles.helper}>Permite elegir en el punto de venta si vender suelto o la presentación mayor</Text>
            </View>
            <Switch
              value={vendePorCaja}
              onValueChange={setVendePorCaja}
              trackColor={{ false: Colors.border, true: Colors.info }}
            />
          </View>
        </View>

        {vendePorCaja && (
          <View style={styles.cajaContainer}>
            <View style={{ flex: 1, marginBottom: 16 }}>
              <Text style={styles.label}>¿Cuántas unidades trae la caja?</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 24"
                placeholderTextColor={Colors.textMuted}
                value={unidadesPorCaja}
                onChangeText={text => setUnidadesPorCaja(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <CampoMoneda
                label="Precio de Venta (Caja Completa)"
                value={precioCaja}
                onChangeText={setPrecioCaja}
                placeholder="0.00"
              />
            </View>
          </View>
        )}

        {/* Guardar */}
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
                <Text style={styles.btnText}>Guardar producto</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 24, paddingBottom: 48 },

  iconHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: Colors.infoBg, justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  headerText: { fontSize: 20, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  group: { marginBottom: 18 },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 13,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.text, fontSize: 15,
  },

  preciosRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 13,
    borderWidth: 1, borderColor: Colors.border,
    paddingLeft: 12, paddingRight: 8,
  },
  currency: { fontSize: 16, color: Colors.textSecondary, fontWeight: '700', marginRight: 4 },
  inputMoney: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '600', paddingVertical: 12 },
  helper: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  // Utilidad card
  utilidadCard: {
    borderRadius: 14, borderWidth: 1.5,
    padding: 14, marginBottom: 18,
    backgroundColor: Colors.surface,
  },
  utilidadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  utilidadLabel: { fontSize: 13, color: Colors.textSecondary },
  utilidadValor: { fontSize: 18, fontWeight: '800' },
  utilidadPct: { fontSize: 15, fontWeight: '700' },
  utilidadWarning: { fontSize: 12, color: Colors.error, marginTop: 6 },

  // Unidad
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  optionActive: { backgroundColor: Colors.infoBg, borderColor: Colors.info },
  optionText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  optionTextActive: { color: Colors.info, fontWeight: '700' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  cajaContainer: { backgroundColor: Colors.infoBg, padding: 14, borderRadius: 14, marginBottom: 18, borderWidth: 1, borderColor: Colors.info },

  btn: {
    flexDirection: 'row', backgroundColor: Colors.info,
    borderRadius: 14, height: 54,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
