import React, { useMemo } from 'react';
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';

const UNIDADES = ['Und'];

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

export default function EditarProductoScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const Colors = colors;
  const styles = React.useMemo(() => getStyles(Colors), [Colors]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [nombre, setNombre] = useState('');
  const [costo, setCosto] = useState('');
  const [venta, setVenta] = useState('');
  const [unidad, setUnidad] = useState('Und');
  const [stock, setStock] = useState('0');
  const [vendePorCaja, setVendePorCaja] = useState(false);
  const [unidadesPorCaja, setUnidadesPorCaja] = useState('24');
  const [precioCaja, setPrecioCaja] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase.from('productos').select('*').eq('id', id).single();
      if (data) {
        setNombre(data.nombre);
        setVenta(data.precio ? data.precio.toString() : '');
        setUnidad(data.unidad || 'Und');
        setStock(data.stock ? data.stock.toString() : '0');
        setVendePorCaja(data.vende_por_caja || false);
        setUnidadesPorCaja(data.unidades_por_caja ? data.unidades_por_caja.toString() : '24');
        setPrecioCaja(data.precio_caja ? data.precio_caja.toString() : '');
        
        // Intentar recuperar el costo de la descripción del formato "Costo: $XX.XX | Unidad..."
        if (data.descripcion) {
          const match = data.descripcion.match(/Costo:\s*\$([0-9.]+)/);
          if (match && match[1]) {
            setCosto(match[1]);
          }
        }
      } else if (error) {
        Alert.alert('Error', 'No se pudo cargar el producto');
        router.back();
      }
      setInitialLoading(false);
    }
    loadData();
  }, [id]);

  const costoNum = parseFloat(costo.replace(',', '.')) || 0;
  const ventaNum = parseFloat(venta.replace(',', '.')) || 0;

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
      const { error } = await supabase.from('productos').update({
        nombre: nombre.trim(),
        precio: ventaNum,
        descripcion: `Costo: $${costoNum.toFixed(2)} | Unidad: ${unidad}`,
        unidad,
        stock: parseInt(stock, 10) || 0,
        vende_por_caja: vendePorCaja,
        unidades_por_caja: parseInt(unidadesPorCaja, 10) || 1,
        precio_caja: parseFloat(precioCaja.replace(',', '.')) || 0,
      }).eq('id', id);
      
      if (error) throw error;
      Alert.alert('¡Listo!', 'Producto actualizado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.iconHeader}>
          <View style={styles.iconWrap}>
            <Ionicons name="pencil" size={28} color={Colors.warning} />
          </View>
          <View>
            <Text style={styles.headerText}>Editar Producto</Text>
            <Text style={styles.headerSub}>Actualizar precios y detalles</Text>
          </View>
        </View>

        {/* Nombre */}
        <View style={styles.group}>
          <Text style={styles.label}>Nombre del producto <Text style={{ color: Colors.error }}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Refresco 600ml..."
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

        {/* Utilidad */}
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
          <Text style={styles.label}>Inventario / Stock Actual</Text>
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
              trackColor={{ false: Colors.border, true: Colors.warning }}
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
                <Ionicons name="save" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Actualizar producto</Text>
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
    backgroundColor: Colors.warningBg, justifyContent: 'center', alignItems: 'center', marginRight: 14,
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

  utilidadCard: {
    borderRadius: 14, borderWidth: 1.5,
    padding: 14, marginBottom: 18,
    backgroundColor: Colors.surface,
  },
  utilidadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  utilidadLabel: { fontSize: 13, color: Colors.textSecondary },
  utilidadValor: { fontSize: 18, fontWeight: '800' },
  utilidadPct: { fontSize: 15, fontWeight: '700' },

  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  optionActive: { backgroundColor: Colors.warningBg, borderColor: Colors.warning },
  optionText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  optionTextActive: { color: Colors.warning, fontWeight: '700' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  cajaContainer: { backgroundColor: Colors.warningBg, padding: 14, borderRadius: 14, marginBottom: 18, borderWidth: 1, borderColor: Colors.warning },

  btn: {
    flexDirection: 'row', backgroundColor: Colors.warning,
    borderRadius: 14, height: 54,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
