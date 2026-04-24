import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform, Modal, FlatList, KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTasa } from '@/context/TasaContext';
import { Proveedor, Producto } from '@/lib/types';

import * as ImagePicker from 'expo-image-picker';

interface ItemLinea {
  producto_id: string | null;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
}

const METODOS = ['efectivo', 'transferencia', 'tarjeta', 'otro'];

export default function NuevaCompraScreen() {
  const { colors: C } = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { tenant_id } = useAuth();
  const { formatUSD } = useTasa();
  const router = useRouter();
  const { proveedor_id: prov_param } = useLocalSearchParams<{ proveedor_id?: string }>();

  const [saving,          setSaving]          = useState(false);
  const [scanning,        setScanning]        = useState(false);
  const [proveedores,     setProveedores]     = useState<Proveedor[]>([]);
  const [productos,       setProductos]       = useState<Producto[]>([]);
  const [showProvPicker,  setShowProvPicker]  = useState(false);
  const [showProdPicker,  setShowProdPicker]  = useState(false);
  const [itemEditIdx,     setItemEditIdx]     = useState<number | null>(null);
  const [prodSearch,      setProdSearch]      = useState('');
  const [provSearch,      setProvSearch]      = useState('');

  // Form fields
  const [proveedorId,    setProveedorId]    = useState<string | null>(prov_param ?? null);
  const [numero,         setNumero]         = useState('');
  const [fecha,          setFecha]          = useState(new Date().toISOString().slice(0, 10));
  const [fechaVence,     setFechaVence]     = useState('');
  const [notas,          setNotas]          = useState('');
  const [pagarAlContado, setPagarAlContado] = useState(false);
  const [metodoPago,     setMetodoPago]     = useState('efectivo');
  const [items,          setItems]          = useState<ItemLinea[]>([
    { producto_id: null, descripcion: '', cantidad: '1', precio_unitario: '0' },
  ]);

  useEffect(() => {
    if (!tenant_id) return;
    Promise.all([
      supabase.from('proveedores').select('id,nombre,rif').eq('owner_id', tenant_id).eq('activo', true).order('nombre'),
      supabase.from('productos').select('id,nombre,precio,stock').eq('activo', true).order('nombre'),
    ]).then(([{ data: p }, { data: pr }]) => {
      setProveedores((p ?? []) as Proveedor[]);
      setProductos((pr ?? []) as Producto[]);
    });
  }, [tenant_id]);

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      handleScanInvoice(result.assets[0].base64);
    }
  };

  const handleScanInvoice = async (base64: string) => {
    setScanning(true);
    try {
      // NOTA: Aquí se llamaría a tu API de IA (Gemini, Google Vision, etc.)
      // Simularemos la respuesta de una IA analizando la factura
      Alert.alert(
        "Lector IA", 
        "En un entorno real, aquí enviamos la imagen a la IA. ¿Deseas simular una detección de prueba?",
        [
          { text: "Cancelar", style: "cancel", onPress: () => setScanning(false) },
          { text: "Simular Detección", onPress: () => simulateAIDetection() }
        ]
      );
    } catch (err) {
      setScanning(false);
    }
  };

  const simulateAIDetection = async () => {
    // Ejemplo de lo que devolvería la IA
    const mockExtracted = [
      { nombre: "Harina PAN", cantidad: 20, precio: 1.10 },
      { nombre: "Aceite 1L", cantidad: 12, precio: 3.50 },
      { nombre: "Arroz Primor", cantidad: 24, precio: 0.95 }
    ];

    await processExtractedData(mockExtracted);
    setScanning(false);
  };

  const processExtractedData = async (extractedItems: any[]) => {
    const processedItems: ItemLinea[] = [];
    
    for (const ext of extractedItems) {
      // 1. Buscar si existe el producto por nombre (aproximado o exacto)
      let prod = productos.find(p => p.nombre.toLowerCase().trim() === ext.nombre.toLowerCase().trim());
      
      if (!prod) {
        // 2. Si no existe, crear el producto nuevo
        const { data: newProd, error } = await supabase
          .from('productos')
          .insert({
            user_id: tenant_id,
            nombre: ext.nombre,
            precio: ext.precio * 1.3, // Margen de ganancia sugerido del 30%
            stock: 0,
            activo: true,
            unidad: 'und'
          })
          .select()
          .single();
        
        if (newProd) {
          prod = newProd as Producto;
          // Actualizar lista local de productos para futuros matches
          setProductos(prev => [...prev, prod!]);
        }
      }

      processedItems.push({
        producto_id: prod?.id ?? null,
        descripcion: prod?.nombre ?? ext.nombre,
        cantidad: ext.cantidad.toString(),
        precio_unitario: ext.precio.toString()
      });
    }

    setItems(processedItems);
    Alert.alert("Éxito", "Se han cargado los artículos detectados. Por favor verifica los montos.");
  };

  const proveedorNombre = proveedores.find(p => p.id === proveedorId)?.nombre ?? null;

  const addItem = () => setItems(prev => [...prev, { producto_id: null, descripcion: '', cantidad: '1', precio_unitario: '0' }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ItemLinea, val: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const selectProducto = (prod: Producto) => {
    if (itemEditIdx === null) return;
    updateItem(itemEditIdx, 'producto_id', prod.id);
    updateItem(itemEditIdx, 'descripcion', prod.nombre);
    updateItem(itemEditIdx, 'precio_unitario', prod.precio.toString());
    setShowProdPicker(false);
    setItemEditIdx(null);
    setProdSearch('');
  };

  const total = items.reduce((sum, it) => {
    const q = parseFloat(it.cantidad) || 0;
    const p = parseFloat(it.precio_unitario) || 0;
    return sum + q * p;
  }, 0);

  const handleSave = async () => {
    if (items.some(it => !it.descripcion.trim())) {
      Alert.alert('Items incompletos', 'Todos los artículos deben tener descripción.');
      return;
    }
    if (!numero.trim()) {
      Alert.alert('Número requerido', 'Ingresa el número de factura del proveedor.');
      return;
    }
    if (!tenant_id) return;
    setSaving(true);
    try {
      const estadoInicial = pagarAlContado ? 'pagada' : 'pendiente';
      const { data: compra, error } = await supabase
        .from('compras')
        .insert({
          owner_id:         tenant_id,
          proveedor_id:     proveedorId,
          numero:           numero.trim(),
          fecha,
          fecha_vencimiento: fechaVence || null,
          estado:           estadoInicial,
          subtotal:         total,
          total,
          monto_pagado:     pagarAlContado ? total : 0,
          notas:            notas.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Items
      await supabase.from('compra_items').insert(
        items.map((it, i) => ({
          compra_id:      compra.id,
          producto_id:    it.producto_id || null,
          descripcion:    it.descripcion.trim(),
          cantidad:       parseFloat(it.cantidad) || 1,
          precio_unitario:parseFloat(it.precio_unitario) || 0,
          subtotal:       (parseFloat(it.cantidad) || 1) * (parseFloat(it.precio_unitario) || 0),
          orden:          i,
        }))
      );

      // Actualizar stock
      for (const it of items) {
        if (it.producto_id) {
          const qty = parseFloat(it.cantidad) || 0;
          const { data: prod } = await supabase.from('productos').select('stock,precio').eq('id', it.producto_id).single();
          if (prod) {
            await supabase.from('productos')
              .update({ stock: (prod.stock ?? 0) + qty, precio_unitario_compra: parseFloat(it.precio_unitario) || 0 })
              .eq('id', it.producto_id);
          }
        }
      }

      // Pago contado
      if (pagarAlContado) {
        await supabase.from('pagos_compras').insert({
          compra_id: compra.id,
          fecha,
          monto: total,
          metodo: metodoPago,
        });
      }

      router.replace(`/compras/${compra.id}` as any);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProvs  = proveedores.filter(p => p.nombre.toLowerCase().includes(provSearch.toLowerCase()));
  const filteredProds  = productos.filter(p => p.nombre.toLowerCase().includes(prodSearch.toLowerCase()));

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>Nueva Compra</Text>
        
        <TouchableOpacity style={s.scanBtn} onPress={pickImage} disabled={scanning}>
          {scanning ? <ActivityIndicator size="small" color={C.primary} /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="scan" size={18} color={C.primary} />
              <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>Escanear IA</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Proveedor */}
        <View style={s.card}>
          <Text style={s.cardSection}>Proveedor</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowProvPicker(true)}>
            <Ionicons name="business-outline" size={18} color={proveedorId ? C.primary : C.textMuted} />
            <Text style={[s.pickerBtnText, proveedorId && { color: C.text, fontWeight: '700' }]}>
              {proveedorNombre ?? 'Seleccionar proveedor (opcional)'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </TouchableOpacity>
          {proveedorId && (
            <TouchableOpacity onPress={() => setProveedorId(null)}>
              <Text style={{ color: C.error, fontSize: 12, marginTop: 4 }}>Quitar proveedor</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Datos factura */}
        <View style={s.card}>
          <Text style={s.cardSection}>Datos de la Factura</Text>
          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Nº Factura *</Text>
              <TextInput style={s.input} value={numero} onChangeText={setNumero} placeholder="001-0001" placeholderTextColor={C.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Fecha</Text>
              <TextInput style={s.input} value={fecha} onChangeText={setFecha} placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} />
            </View>
          </View>
          <View>
            <Text style={s.label}>Fecha de vencimiento</Text>
            <TextInput style={s.input} value={fechaVence} onChangeText={setFechaVence} placeholder="YYYY-MM-DD (opcional)" placeholderTextColor={C.textMuted} />
          </View>
          <View>
            <Text style={s.label}>Notas</Text>
            <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]} value={notas} onChangeText={setNotas} placeholder="Observaciones..." placeholderTextColor={C.textMuted} multiline />
          </View>
        </View>

        {/* Items */}
        <View style={s.card}>
          <Text style={s.cardSection}>Artículos</Text>
          {items.map((it, idx) => (
            <View key={idx} style={s.itemBlock}>
              {/* Seleccionar producto */}
              <TouchableOpacity
                style={s.pickerBtn}
                onPress={() => { setItemEditIdx(idx); setShowProdPicker(true); }}
              >
                <Ionicons name="cube-outline" size={16} color={it.producto_id ? C.primary : C.textMuted} />
                <Text style={[s.pickerBtnText, { fontSize: 13 }, it.descripcion && { color: C.text }]} numberOfLines={1}>
                  {it.descripcion || 'Seleccionar o describir artículo'}
                </Text>
              </TouchableOpacity>
              {/* Si no hay producto, campo libre */}
              {!it.producto_id && (
                <TextInput
                  style={s.input}
                  value={it.descripcion}
                  onChangeText={v => updateItem(idx, 'descripcion', v)}
                  placeholder="Descripción del artículo"
                  placeholderTextColor={C.textMuted}
                />
              )}
              <View style={s.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Cantidad</Text>
                  <TextInput style={s.input} value={it.cantidad} onChangeText={v => updateItem(idx, 'cantidad', v)} keyboardType="decimal-pad" placeholderTextColor={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Precio Unit. $</Text>
                  <TextInput style={s.input} value={it.precio_unitario} onChangeText={v => updateItem(idx, 'precio_unitario', v)} keyboardType="decimal-pad" placeholderTextColor={C.textMuted} />
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <Text style={[s.label, { textAlign: 'right' }]}>Subtotal</Text>
                  <Text style={[s.input, { borderWidth: 0, backgroundColor: 'transparent', color: C.primary, fontWeight: '800', fontSize: 14 }]}>
                    {formatUSD((parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0))}
                  </Text>
                </View>
              </View>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(idx)} style={s.removeItemBtn}>
                  <Ionicons name="trash-outline" size={14} color={C.error} />
                  <Text style={{ color: C.error, fontSize: 12 }}>Eliminar</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={s.addItemBtn} onPress={addItem}>
            <Ionicons name="add-circle-outline" size={18} color={C.primary} />
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 14 }}>Agregar Artículo</Text>
          </TouchableOpacity>
        </View>

        {/* Total */}
        <View style={[s.card, { backgroundColor: C.primaryBg, borderColor: C.primary + '44' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>Total a Pagar</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: C.primary }}>{formatUSD(total)}</Text>
          </View>
        </View>

        {/* Pago al contado */}
        <View style={s.card}>
          <Text style={s.cardSection}>Pago</Text>
          <TouchableOpacity
            style={[s.toggleRow, pagarAlContado && { backgroundColor: C.successBg, borderColor: C.success }]}
            onPress={() => setPagarAlContado(!pagarAlContado)}
          >
            <Ionicons name={pagarAlContado ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={pagarAlContado ? C.success : C.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[s.toggleLabel, pagarAlContado && { color: C.success }]}>Pagado al contado</Text>
              <Text style={{ fontSize: 12, color: C.textMuted }}>Marca si ya pagaste esta factura</Text>
            </View>
          </TouchableOpacity>
          {pagarAlContado && (
            <View>
              <Text style={s.label}>Método de pago</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {METODOS.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.metodoBadge, metodoPago === m && { backgroundColor: C.primary, borderColor: C.primary }]}
                    onPress={() => setMetodoPago(m)}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '600', color: C.textSecondary }, metodoPago === m && { color: '#fff' }]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Botón guardar */}
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.65 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={s.saveBtnText}>Registrar Compra</Text></>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Proveedor Picker Modal */}
      <Modal visible={showProvPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: C.surface }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Seleccionar Proveedor</Text>
              <TouchableOpacity onPress={() => setShowProvPicker(false)}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <TextInput style={[s.input, { marginBottom: 12 }]} value={provSearch} onChangeText={setProvSearch} placeholder="Buscar..." placeholderTextColor={C.textMuted} />
            <FlatList
              data={filteredProvs}
              keyExtractor={p => p.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.pickerRow} onPress={() => { setProveedorId(item.id); setShowProvPicker(false); setProvSearch(''); }}>
                  <Text style={s.pickerRowText}>{item.nombre}</Text>
                  {item.rif && <Text style={{ color: C.textMuted, fontSize: 12 }}>{item.rif}</Text>}
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <TouchableOpacity style={s.pickerRow} onPress={() => router.push('/proveedores/nuevo')}>
                  <Ionicons name="add-circle-outline" size={18} color={C.primary} />
                  <Text style={{ color: C.primary, fontWeight: '700', marginLeft: 8 }}>Crear nuevo proveedor</Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Producto Picker Modal */}
      <Modal visible={showProdPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: C.surface }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Seleccionar Producto</Text>
              <TouchableOpacity onPress={() => { setShowProdPicker(false); setItemEditIdx(null); setProdSearch(''); }}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <TextInput style={[s.input, { marginBottom: 12 }]} value={prodSearch} onChangeText={setProdSearch} placeholder="Buscar producto..." placeholderTextColor={C.textMuted} />
            <FlatList
              data={filteredProds}
              keyExtractor={p => p.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.pickerRow} onPress={() => selectProducto(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerRowText}>{item.nombre}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>Stock actual: {item.stock} u.</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <TouchableOpacity style={s.pickerRow} onPress={() => { setShowProdPicker(false); setItemEditIdx(null); }}>
                  <Ionicons name="pencil-outline" size={18} color={C.primary} />
                  <Text style={{ color: C.primary, fontWeight: '700', marginLeft: 8 }}>Escribir descripción libre</Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'android' ? 52 : 58,
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 4 },
  title:   { fontSize: 18, fontWeight: '800', color: C.text, flex: 1 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.primary,
  },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  card:    { backgroundColor: C.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border, gap: 12 },
  cardSection: { fontSize: 12, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  label:   { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 4 },
  input:   { backgroundColor: C.background, borderRadius: 11, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text },
  fieldRow:{ flexDirection: 'row', gap: 10 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.background, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11 },
  pickerBtnText: { flex: 1, fontSize: 14, color: C.textMuted },
  itemBlock: { backgroundColor: C.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, gap: 8 },
  removeItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: C.primary, borderStyle: 'dashed' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.background },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  metodoBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 16, height: 54, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: C.text },
  pickerRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  pickerRowText:{ fontSize: 15, fontWeight: '600', color: C.text, flex: 1 },
});
