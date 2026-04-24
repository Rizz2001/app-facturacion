import React, { useMemo } from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTasa } from '@/context/TasaContext';
import { useTheme } from '@/context/ThemeContext';
import { useOffline } from '@/context/OfflineContext';
import { Producto, Cliente } from '@/lib/types';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import * as Haptics from 'expo-haptics';

type MetodoPago = 'efectivo_usd' | 'efectivo_bs' | 'tarjeta' | 'pago_movil';
type CartItem = { producto: Producto; cantidad: number; esCaja?: boolean };

const METODOS: { key: MetodoPago; label: string; icon: any }[] = [
  { key: 'efectivo_usd', label: 'Efectivo $', icon: 'cash-outline' },
  { key: 'efectivo_bs', label: 'Efectivo Bs', icon: 'cash' },
  { key: 'tarjeta', label: 'Tarjeta', icon: 'card-outline' },
  { key: 'pago_movil', label: 'Pago Móvil', icon: 'phone-portrait-outline' },
];

type MixedPayment = {
  id: string;
  metodo: MetodoPago;
  monto: number; // Siempre en USD
  referencia?: string;
  esBs: boolean;
  montoOriginal: number; // Monto ingresado (puede ser Bs o USD)
};

function TasaBar() {
  const { colors: Colors } = useTheme();
  const ts = React.useMemo(() => getStyles(Colors), [Colors]);
  const { tasa, setTasa, refreshTasaBCV } = useTasa();
  const { empleado } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tasa.toString());
  const [refreshing, setRefreshing] = useState(false);

  const confirm = () => {
    const v = parseFloat(draft);
    if (!isNaN(v) && v > 0) setTasa(v);
    setEditing(false);
  };

  const handleRefreshFromAPI = async () => {
    if (empleado && !empleado.permiso_modificar_tasa) return;
    setRefreshing(true);
    await refreshTasaBCV();
    setRefreshing(false);
  };

  return (
    <View style={ts.tasaBar}>
      <Ionicons name="trending-up-outline" size={14} color={Colors.success} />
      {editing ? (
        <TextInput
          style={ts.tasaInput}
          value={draft}
          onChangeText={setDraft}
          keyboardType="decimal-pad"
          autoFocus
          onBlur={confirm}
          onSubmitEditing={confirm}
          selectTextOnFocus
        />
      ) : (
        <Text style={ts.tasaText}>
          <Text style={ts.tasaFecha}>BCV · </Text>
          <Text style={ts.tasaVal}>1$ = {tasa.toFixed(2)} Bs.</Text>
        </Text>
      )}
      {(!empleado || empleado.permiso_modificar_tasa) && (
        <>
          {/* Botón sync API */}
          <TouchableOpacity onPress={handleRefreshFromAPI} style={ts.tasaEditBtn} disabled={refreshing}>
            <Ionicons
              name={refreshing ? 'sync' : 'cloud-download-outline'}
              size={13}
              color={refreshing ? Colors.textMuted : Colors.success}
            />
          </TouchableOpacity>
          {/* Botón edición manual */}
          <TouchableOpacity onPress={() => { setDraft(tasa.toString()); setEditing(!editing); }} style={ts.tasaEditBtn}>
            <Ionicons name={editing ? 'checkmark' : 'pencil'} size={13} color={Colors.primary} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function ProductoCard({ producto, onAdd }: { producto: Producto; onAdd: () => void }) {
  const { colors: Colors } = useTheme();
  const ts = React.useMemo(() => getStyles(Colors), [Colors]);
  const { formatUSD, formatBs } = useTasa();
  const stock = producto.stock ?? 0;
  return (
    <TouchableOpacity style={[ts.prodCard, stock <= 0 && { opacity: 0.6 }]} onPress={stock > 0 ? onAdd : undefined} activeOpacity={0.75}>
      <View style={ts.prodIconWrap}>
        <Ionicons name="cube" size={24} color={stock > 0 ? Colors.info : Colors.textMuted} />
        <View style={[ts.stockBadge, stock <= 0 && { backgroundColor: Colors.error }]}>
          <Text style={ts.stockText}>{stock}</Text>
        </View>
      </View>
      <Text style={ts.prodNombre} numberOfLines={2}>{producto.nombre}</Text>
      <Text style={ts.prodPrecioUsd}>{formatUSD(producto.precio)}</Text>
      <Text style={ts.prodPrecioBs}>{formatBs(producto.precio)}</Text>
      <View style={[ts.prodAddBtn, stock <= 0 && { backgroundColor: Colors.textMuted }]}>
        <Ionicons name="add" size={20} color={Colors.white} />
      </View>
    </TouchableOpacity>
  );
}

function CartRow({
  item, onInc, onDec, onRemove,
}: { item: CartItem; onInc: () => void; onDec: () => void; onRemove: () => void }) {
  const { colors: Colors } = useTheme();
  const ts = React.useMemo(() => getStyles(Colors), [Colors]);
  const { formatUSD } = useTasa();
  const precioReal = item.esCaja ? item.producto.precio_caja : item.producto.precio;
  const subtotal = precioReal * item.cantidad;
  return (
    <View style={ts.cartRow}>
      <View style={ts.cartInfo}>
        <Text style={ts.cartNombre} numberOfLines={1}>
          {item.producto.nombre}
          {item.esCaja && <Text style={{ color: Colors.warning, fontWeight: '700' }}> (Caja)</Text>}
        </Text>
        <Text style={ts.cartSub}>{formatUSD(precioReal)} c/u</Text>
      </View>
      <View style={ts.cartQty}>
        <TouchableOpacity style={ts.qtyBtn} onPress={onDec}>
          <Ionicons name="remove" size={16} color={Colors.text} />
        </TouchableOpacity>
        <Text style={ts.qtyNum}>{item.cantidad}</Text>
        <TouchableOpacity style={ts.qtyBtn} onPress={onInc}>
          <Ionicons name="add" size={16} color={Colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={ts.cartTotal}>{formatUSD(subtotal)}</Text>
      <TouchableOpacity onPress={onRemove} style={ts.cartRemove}>
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );
}

export default function POSScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const Colors = colors;
  const ts = React.useMemo(() => getStyles(Colors), [Colors]);
  const { profile, tenant_id, empleado } = useAuth();
  const { tasa, formatUSD, formatBs } = useTasa();
  const { isOnline, saveSaleOffline } = useOffline();

  if (empleado && !empleado.permiso_ventas) {
    return (
      <View style={ts.centered}>
        <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
        <Text style={{ marginTop: 16, color: Colors.textSecondary }}>No tienes permisos de ventas.</Text>
      </View>
    );
  }

  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProds, setFilteredProds] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [loadingProds, setLoadingProds] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo_usd');
  const [tipo, setTipo] = useState<'pagar' | 'fiar'>('pagar');
  const [referencia, setReferencia] = useState('');
  // Descuento
  const [descuentoPct, setDescuentoPct] = useState('');

  // Pagos Mixtos
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [payments, setPayments] = useState<MixedPayment[]>([]);

  const [showCartModal, setShowCartModal] = useState(false);
  const [showClientePicker, setShowClientePicker] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [cobrandoLoading, setCobrandoLoading] = useState(false);
  const [lastVentaNum, setLastVentaNum] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Animación de éxito
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const animateSuccess = () => {
    successScale.setValue(0);
    successOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const loadData = useCallback(async () => {
    const [{ data: prods }, { data: clis }] = await Promise.all([
      supabase.from('productos').select('*, categorias(nombre)').eq('activo', true).order('nombre'),
      supabase.from('clientes').select('*').eq('activo', true).order('nombre'),
    ]);
    if (prods) setProductos(prods as Producto[]);
    if (clis) setClientes(clis as Cliente[]);
    setLoadingProds(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredProds(q ? productos.filter(p => p.nombre.toLowerCase().includes(q)) : productos);
  }, [productos, search]);

  const handleSelectProduct = (p: Producto) => {
    if (p.vende_por_caja && p.unidades_por_caja > 1) {
      Alert.alert(
        'Presentación de Venta',
        '¿Cómo deseas agregar este producto?',
        [
          { text: `📦 Por Caja de ${p.unidades_por_caja} ($${(p.precio_caja || 0).toFixed(2)})`, onPress: () => addToCart(p, true) },
          { text: `🥤 Por Unidad suelta ($${p.precio.toFixed(2)})`, onPress: () => addToCart(p, false) },
          { text: 'Cancelar', style: 'cancel' }
        ],
        { cancelable: true }
      );
    } else {
      addToCart(p, false);
    }
  };

  const addToCart = (p: Producto, esCaja: boolean = false) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.producto.id === p.id && !!i.esCaja === esCaja);
      const cantidadAAgregar = esCaja ? (p.unidades_por_caja || 1) : 1;
      const actualEnCarritoBase = prev.filter(i => i.producto.id === p.id).reduce((sum, item) => sum + item.cantidad * (item.esCaja ? (p.unidades_por_caja || 1) : 1), 0);

      if (actualEnCarritoBase + cantidadAAgregar > (p.stock ?? 0)) {
        Alert.alert('Stock insuficiente', `Solo tienes ${p.stock ?? 0} unidades disponibles de este producto.`);
        return prev;
      }

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, { producto: p, cantidad: 1, esCaja }];
    });
  };

  const incQty = (id: string, esCaja: boolean = false) => {
    setCart(prev => {
      const itemToInc = prev.find(i => i.producto.id === id && !!i.esCaja === esCaja);
      if (!itemToInc) return prev;
      const p = itemToInc.producto;
      const cantidadAAgregar = esCaja ? (p.unidades_por_caja || 1) : 1;
      const actualEnCarritoBase = prev.filter(i => i.producto.id === p.id).reduce((sum, item) => sum + item.cantidad * (item.esCaja ? (p.unidades_por_caja || 1) : 1), 0);

      if (actualEnCarritoBase + cantidadAAgregar > (p.stock ?? 0)) {
        Alert.alert('Stock insuficiente', `Límite alcanzado (${p.stock ?? 0} unidades en stock real).`);
        return prev;
      }
      return prev.map(i => (i.producto.id === id && !!i.esCaja === esCaja) ? { ...i, cantidad: i.cantidad + 1 } : i);
    });
  };

  const decQty = (id: string, esCaja: boolean = false) =>
    setCart(prev =>
      prev.flatMap(i => (i.producto.id === id && !!i.esCaja === esCaja)
        ? i.cantidad <= 1 ? [] : [{ ...i, cantidad: i.cantidad - 1 }]
        : [i])
    );

  const removeItem = (id: string, esCaja: boolean = false) => setCart(prev => prev.filter(i => !(i.producto.id === id && !!i.esCaja === esCaja)));

  const clearCart = () => {
    setCart([]);
    setClienteId(null);
    setMetodo('efectivo_usd');
    setTipo('pagar');
    setReferencia('');
    setDescuentoPct('');
    setIsMixedPayment(false);
    setPayments([]);
  };


  const descPct = Math.max(0, Math.min(100, parseFloat(descuentoPct) || 0));
  const subtotalUSD = cart.reduce((s, i) => s + (i.esCaja ? i.producto.precio_caja : i.producto.precio) * i.cantidad, 0);
  const descuentoMonto = subtotalUSD * descPct / 100;
  const totalConDescuento = subtotalUSD - descuentoMonto;
  const subtotalBs = totalConDescuento * tasa;

  const handleToggleMixed = (val: boolean) => {
    setIsMixedPayment(val);
    if (val) {
      // Inicializar con el total actual
      setPayments([{
        id: Math.random().toString(36).slice(2, 9),
        metodo: 'efectivo_usd',
        monto: totalConDescuento,
        montoOriginal: totalConDescuento,
        esBs: false,
      }]);
    } else {
      setPayments([]);
    }
  };

  const addPaymentRow = () => {
    const totalPagado = payments.reduce((s, p) => s + p.monto, 0);
    const restante = Math.max(0, totalConDescuento - totalPagado);
    setPayments([...payments, {
      id: Math.random().toString(36).slice(2, 9),
      metodo: 'efectivo_usd',
      monto: restante,
      montoOriginal: restante,
      esBs: false,
    }]);
  };

  const removePaymentRow = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const updatePaymentRow = (id: string, field: keyof MixedPayment, value: any) => {
    setPayments(payments.map(p => {
      if (p.id !== id) return p;
      let updated = { ...p, [field]: value };

      // Auto-toggle esBs si cambia el método
      if (field === 'metodo') {
        updated.esBs = value === 'efectivo_bs' || value === 'pago_movil';
      }

      // Recalcular monto USD si cambia montoOriginal o esBs o tasa
      if (field === 'montoOriginal' || field === 'esBs' || field === 'metodo') {
        const val = parseFloat(updated.montoOriginal.toString()) || 0;
        if (updated.esBs) {
          updated.monto = val / tasa;
        } else {
          updated.monto = val;
        }
      }
      return updated;
    }));
  };

  const totalPagadoMixed = payments.reduce((s, p) => s + p.monto, 0);
  const restanteMixed = totalConDescuento - totalPagadoMixed;

  const handleClearCart = () => {
    if (cart.length === 0) return;
    Alert.alert('Vaciar Carrito', '¿Eliminar todos los productos del carrito?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: clearCart },
    ]);
  };



  const clienteSeleccionado = clientes.find(c => c.id === clienteId);
  const filteredClientes = clienteSearch
    ? clientes.filter(c => c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || c.telefono?.includes(clienteSearch))
    : clientes;

  const genNumero = async () => {
    const d = new Date();
    // Formato: V-YYYYMMDD-HHMM-SEQ
    const pad = (n: number) => String(n).padStart(2, '0');
    const hoy = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const hora = `${pad(d.getHours())}${pad(d.getMinutes())}`;

    const { count } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true })
      .like('numero', `V-${hoy}-%`);

    const seq = pad((count ?? 0) + 1).padStart(3, '0'); // Al menos 3 dígitos
    return `V-${hoy}-${hora}-${seq}`;
  };

  const handleCobrar = async () => {
    if (cart.length === 0) { Alert.alert('Carrito vacío', 'Agrega productos antes de cobrar'); return; }
    if (!clienteId) {
      Alert.alert('Cliente requerido', 'Por favor selecciona un cliente.');
      return;
    }

    setCobrandoLoading(true);
    try {
      const items = cart.map((i, idx) => {
        const precioReal = i.esCaja ? (i.producto.precio_caja || 0) : i.producto.precio;
        return {
          producto_id: i.producto.id,
          descripcion: i.producto.nombre + (i.esCaja ? ' (Caja)' : ''),
          cantidad: i.cantidad,
          cantidad_stock: i.esCaja ? (i.producto.unidades_por_caja * i.cantidad) : i.cantidad,
          precio_unitario: precioReal,
          iva: 0,
          subtotal: precioReal * i.cantidad,
          total: precioReal * i.cantidad,
          orden: idx,
        };
      });

      const estadoVenta = tipo === 'fiar' ? 'emitida' : 'pagada';

      let notasAdicionales = '';
      if (tipo === 'fiar') {
        notasAdicionales = `FIADO | Tasa: ${tasa} Bs/$ | Total Bs: ${subtotalBs.toFixed(2)}`;
      } else if (isMixedPayment) {
        const breakdown = payments.map(p => `${p.metodo} (${p.esBs ? p.montoOriginal + ' Bs' : formatUSD(p.monto)})`).join(', ');
        notasAdicionales = `PAGO MIXTO: ${breakdown} | Tasa: ${tasa} Bs/$ | Total Bs: ${subtotalBs.toFixed(2)}`;
      } else {
        notasAdicionales = `Pago: ${METODOS.find(m => m.key === metodo)?.label} ${metodo === 'pago_movil' && referencia ? `(Ref: ${referencia})` : ''} | Tasa: ${tasa} Bs/$ | Total Bs: ${subtotalBs.toFixed(2)}`;
      }

      // ── MODO OFFLINE ─────────────────────────────
      if (!isOnline) {
        await saveSaleOffline({
          tenant_id: tenant_id!,
          empleado_id: empleado?.id ?? null,
          cliente_id: clienteId!,
          numero_temp: `OFFLINE-${Date.now()}`,
          fecha: new Date().toISOString().slice(0, 10),
          estado: estadoVenta,
          subtotal: subtotalUSD,
          total: totalConDescuento,
          descuento_pct: descPct,
          descuento_monto: descuentoMonto,
          items,
          metodo: isMixedPayment ? 'mixto' : metodo,
          referencia: isMixedPayment ? 'MIXTO' : referencia,
          notas: notasAdicionales,
          tasa,
          payments: isMixedPayment ? payments.map(p => ({
            metodo: p.metodo,
            monto: p.monto,
            notas: p.esBs
              ? `Pago Mixto | Original: ${p.montoOriginal.toFixed(2)} Bs | Tasa: ${tasa} ${p.referencia ? `| Ref: ${p.referencia}` : ''}`
              : `Pago Mixto | USD ${p.referencia ? `| Ref: ${p.referencia}` : ''}`,
          })) : undefined,
        });
        setShowCartModal(false);
        setLastVentaNum('OFFLINE');
        setShowSuccess(true);
        animateSuccess();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        clearCart();
        return;
      }

      // ── MODO ONLINE (normal) ──────────────────────
      const numero = await genNumero();
      const { data: venta, error } = await supabase
        .from('facturas')
        .insert({
          user_id: tenant_id,
          cliente_id: clienteId,
          numero,
          fecha: new Date().toISOString().slice(0, 10),
          estado: estadoVenta,
          subtotal: subtotalUSD,
          total_iva: 0,
          total: totalConDescuento,
          descuento_pct: descPct,
          descuento_monto: descuentoMonto,
          generada_por: empleado?.id ?? null,
          notas: notasAdicionales,
        })
        .select()
        .single();

      if (!error && venta) {
        await supabase.from('factura_items').insert(
          items.map(i => ({ ...i, factura_id: venta.id }))
        );

        if (tipo === 'pagar') {
          if (isMixedPayment) {
            for (const p of payments) {
              await supabase.from('pagos').insert({
                factura_id: venta.id,
                monto: p.monto,
                metodo: p.metodo,
                notas: p.esBs
                  ? `Pago Mixto | Original: ${p.montoOriginal.toFixed(2)} Bs | Tasa: ${tasa} ${p.referencia ? `| Ref: ${p.referencia}` : ''}`
                  : `Pago Mixto | USD ${p.referencia ? `| Ref: ${p.referencia}` : ''}`,
              });
            }
          } else {
            await supabase.from('pagos').insert({
              factura_id: venta.id,
              monto: totalConDescuento,
              metodo,
              notas: referencia ? `Ref: ${referencia}` : null,
            });
          }
        }

        setShowCartModal(false);
        setLastVentaNum(numero);
        setShowSuccess(true);
        animateSuccess();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearCart();
      } else if (error) throw error;
    } catch (err: any) {
      Alert.alert('Error al cobrar', err.message || 'Inténtalo de nuevo');
    } finally {
      setCobrandoLoading(false);
    }
  };

  const totalItems = cart.reduce((s, c) => s + c.cantidad, 0);

  return (
    <View style={ts.root}>

      {/* ── Header Principal ── */}
      <View style={ts.header}>
        <View style={ts.headerTop}>
          <Text style={ts.headerTitle}>Catálogo</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TasaBar />
            <ProfileAvatar size={36} />
          </View>
        </View>
        <View style={ts.searchWrap}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={ts.searchInput}
            placeholder="Buscar productos..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={ts.clearSearch}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Catálogo Grid ── */}
      <View style={ts.catalogContainer}>
        {loadingProds ? (
          <View style={ts.centered}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredProds}
            keyExtractor={p => p.id}
            numColumns={2}
            columnWrapperStyle={ts.gridRow}
            contentContainerStyle={[ts.grid, { paddingBottom: cart.length > 0 ? 120 : 24 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}
            renderItem={({ item }) => (
              <ProductoCard producto={item} onAdd={() => handleSelectProduct(item)} />
            )}
            ListEmptyComponent={
              <View style={ts.empty}>
                <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                <Text style={ts.emptyText}>No hay productos</Text>
              </View>
            }
          />
        )}
      </View>

      {/* ── Botón Flotante (Ver Carrito) ── */}
      {cart.length > 0 && (
        <View style={ts.floatingCartWrap}>
          <TouchableOpacity
            style={ts.floatingCartBtn}
            activeOpacity={0.9}
            onPress={() => setShowCartModal(true)}
          >
            <View style={ts.floatingBadge}>
              <Text style={ts.floatingBadgeText}>{totalItems}</Text>
            </View>
            <Text style={ts.floatingCartLabel}>Revisar Orden</Text>
            <Text style={ts.floatingCartTotal}>{formatUSD(subtotalUSD)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── MODAL: Carrito y Checkout ── */}
      <Modal visible={showCartModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={ts.modalOverlayBottom}>
          <View style={ts.cartSheet}>
            {/* Sheet Header */}
            <View style={ts.sheetHeader}>
              <Text style={ts.sheetTitle}>Tu Orden</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {cart.length > 0 && (
                  <TouchableOpacity onPress={handleClearCart} style={[ts.closeSheetBtn, { backgroundColor: Colors.errorBg }]}>
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowCartModal(false)} style={ts.closeSheetBtn}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={ts.cartScroll} contentContainerStyle={ts.cartScrollContent}>
              {cart.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: Colors.textMuted }}>Vacío</Text>
              ) : (
                cart.map(item => (
                  <CartRow
                    key={item.producto.id + (item.esCaja ? '_caja' : '_und')}
                    item={item}
                    onInc={() => incQty(item.producto.id, !!item.esCaja)}
                    onDec={() => decQty(item.producto.id, !!item.esCaja)}
                    onRemove={() => removeItem(item.producto.id, !!item.esCaja)}
                  />
                ))
              )}

              {/* Descuento */}
              <View style={ts.discountRow}>
                <Ionicons name="pricetag-outline" size={16} color={Colors.warning} />
                <Text style={ts.discountLabel}>Descuento (%)</Text>
                <TextInput
                  style={ts.discountInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={descuentoPct}
                  onChangeText={setDescuentoPct}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={[ts.discountAmt, { color: Colors.warning }]}>
                  {descPct > 0 ? `-${formatUSD(descuentoMonto)}` : ''}
                </Text>
              </View>

              {/* Totales */}
              <View style={ts.totalsBox}>
                {descPct > 0 && (
                  <View style={[ts.totalRow, { marginBottom: 6 }]}>
                    <Text style={[ts.totalLabel, { fontSize: 13, color: Colors.textMuted }]}>Subtotal</Text>
                    <Text style={[ts.totalUSD, { fontSize: 16, color: Colors.textMuted }]}>{formatUSD(subtotalUSD)}</Text>
                  </View>
                )}
                {descPct > 0 && (
                  <View style={[ts.totalRow, { marginBottom: 6 }]}>
                    <Text style={[ts.totalLabel, { fontSize: 13, color: Colors.warning }]}>Descuento {descPct}%</Text>
                    <Text style={[ts.totalUSD, { fontSize: 16, color: Colors.warning }]}>-{formatUSD(descuentoMonto)}</Text>
                  </View>
                )}
                <View style={ts.totalRow}>
                  <Text style={ts.totalLabel}>Total a Pagar</Text>
                  <View>
                    <Text style={ts.totalUSD}>{formatUSD(totalConDescuento)}</Text>
                    <Text style={ts.totalBs}>{formatBs(totalConDescuento)}</Text>
                  </View>
                </View>
              </View>

              {/* Cliente */}
              <Text style={ts.sectionLabel}>Cliente</Text>
              <TouchableOpacity
                style={ts.clienteBtn}
                onPress={() => { setShowCartModal(false); setShowClientePicker(true); }}
              >
                <Ionicons name="person-outline" size={18} color={clienteSeleccionado ? Colors.success : Colors.error} />
                <Text style={[ts.clienteBtnText, clienteSeleccionado ? { color: Colors.text, fontWeight: '700' } : { color: Colors.error }]}>
                  {clienteSeleccionado ? clienteSeleccionado.nombre : '⚠️ Seleccionar cliente (Obligatorio)'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* Tipo de transacción */}
              <Text style={ts.sectionLabel}>Estado del cobro</Text>
              <View style={ts.tipoRow}>
                <TouchableOpacity
                  style={[ts.tipoBtn, tipo === 'pagar' && ts.tipoBtnActive]}
                  onPress={() => setTipo('pagar')}
                >
                  <Ionicons name="cash-outline" size={16} color={tipo === 'pagar' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[ts.tipoBtnText, tipo === 'pagar' && ts.tipoBtnTextActive]}>Pagar ahora</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ts.tipoBtn, tipo === 'fiar' && ts.tipoBtnActive]}
                  onPress={() => setTipo('fiar')}
                >
                  <Ionicons name="calendar-outline" size={16} color={tipo === 'fiar' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[ts.tipoBtnText, tipo === 'fiar' && ts.tipoBtnTextActive]}>Fiar (Crédito)</Text>
                </TouchableOpacity>
              </View>

              {/* Método de pago */}
              {tipo === 'pagar' && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 4 }}>
                    <Text style={[ts.sectionLabel, { marginTop: 0 }]}>Método de pago</Text>
                    <TouchableOpacity
                      style={[ts.mixedToggle, isMixedPayment && { backgroundColor: Colors.primaryBg }]}
                      onPress={() => handleToggleMixed(!isMixedPayment)}
                    >
                      <Ionicons name="shuffle-outline" size={14} color={isMixedPayment ? Colors.primary : Colors.textMuted} />
                      <Text style={[ts.mixedToggleText, isMixedPayment && { color: Colors.primary }]}>Pago Mixto</Text>
                    </TouchableOpacity>
                  </View>

                  {isMixedPayment ? (
                    <View style={ts.mixedContainer}>
                      {payments.map((p, idx) => (
                        <View key={p.id} style={ts.mixedRow}>
                          <View style={ts.mixedRowHeader}>
                            <Text style={ts.mixedRowTitle}>Pago #{idx + 1}</Text>
                            {payments.length > 1 && (
                              <TouchableOpacity onPress={() => removePaymentRow(p.id)}>
                                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                              </TouchableOpacity>
                            )}
                          </View>

                          <View style={ts.mixedInputs}>
                            <View style={ts.mixedMethodGrid}>
                              {METODOS.map(m => (
                                <TouchableOpacity
                                  key={m.key}
                                  style={[ts.mixedMethodBtn, p.metodo === m.key && ts.mixedMethodBtnActive]}
                                  onPress={() => updatePaymentRow(p.id, 'metodo', m.key)}
                                >
                                  <Ionicons name={m.icon} size={14} color={p.metodo === m.key ? Colors.white : Colors.textSecondary} />
                                  <Text style={[ts.mixedMethodLabel, p.metodo === m.key && { color: Colors.white }]}>{m.label}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            <View style={ts.mixedAmountRow}>
                              <View style={{ flex: 1 }}>
                                <TextInput
                                  style={ts.mixedInput}
                                  placeholder="Monto"
                                  placeholderTextColor={Colors.textMuted}
                                  value={p.montoOriginal.toString()}
                                  onChangeText={(v) => updatePaymentRow(p.id, 'montoOriginal', v)}
                                  keyboardType="decimal-pad"
                                />
                              </View>
                              <TouchableOpacity
                                style={[ts.currencyBtn, p.esBs && ts.currencyBtnActive]}
                                onPress={() => updatePaymentRow(p.id, 'esBs', !p.esBs)}
                              >
                                <Text style={[ts.currencyText, p.esBs && { color: Colors.white }]}>{p.esBs ? 'Bs' : '$'}</Text>
                              </TouchableOpacity>
                            </View>

                            {p.metodo === 'pago_movil' && (
                              <TextInput
                                style={[ts.mixedInput, { marginTop: 8 }]}
                                placeholder="Referencia (Ej: 58492)"
                                placeholderTextColor={Colors.textMuted}
                                value={p.referencia}
                                onChangeText={(v) => updatePaymentRow(p.id, 'referencia', v)}
                                keyboardType="number-pad"
                                maxLength={8}
                              />
                            )}

                            {p.esBs && (
                              <Text style={ts.mixedConverted}>
                                Equivale a: <Text style={{ fontWeight: '700' }}>{formatUSD(p.monto)}</Text>
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}

                      <TouchableOpacity style={ts.addMixedBtn} onPress={addPaymentRow}>
                        <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                        <Text style={ts.addMixedBtnText}>Añadir otro método</Text>
                      </TouchableOpacity>

                      <View style={[ts.mixedSummary, restanteMixed > 0.01 ? { borderColor: Colors.error } : { borderColor: Colors.success }]}>
                        <View style={ts.summaryRow}>
                          <Text style={ts.summaryLabel}>Total Pagado:</Text>
                          <Text style={ts.summaryVal}>{formatUSD(totalPagadoMixed)}</Text>
                        </View>
                        <View style={ts.summaryRow}>
                          <Text style={ts.summaryLabel}>Restante:</Text>
                          <Text style={[ts.summaryVal, restanteMixed > 0.01 ? { color: Colors.error } : { color: Colors.success }]}>
                            {restanteMixed <= 0.01 ? '¡Completo!' : formatUSD(restanteMixed)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={ts.metodosRow}>
                        {METODOS.map(m => (
                          <TouchableOpacity
                            key={m.key}
                            style={[ts.metodoBtn, metodo === m.key && ts.metodoBtnActive]}
                            onPress={() => setMetodo(m.key)}
                          >
                            <Ionicons name={m.icon} size={18} color={metodo === m.key ? Colors.white : Colors.textSecondary} />
                            <Text style={[ts.metodoLabel, metodo === m.key && { color: Colors.white }]}>{m.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {metodo === 'pago_movil' && (
                        <View style={ts.refWrap}>
                          <Text style={ts.refLabel}>Referencia (Últimos dígitos)</Text>
                          <TextInput
                            style={ts.refInput}
                            placeholder="Ej: 58492"
                            placeholderTextColor={Colors.textMuted}
                            value={referencia}
                            onChangeText={setReferencia}
                            keyboardType="number-pad"
                            maxLength={8}
                          />
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>

            {/* Sticky Footer */}
            <View style={ts.footerBtnWrap}>
              <TouchableOpacity
                style={[ts.cobrarBtn, cobrandoLoading && { opacity: 0.7 }]}
                onPress={handleCobrar}
                disabled={cobrandoLoading || cart.length === 0}
                activeOpacity={0.85}
              >
                {cobrandoLoading
                  ? <ActivityIndicator color={Colors.white} />
                  : <>
                    <Ionicons name={tipo === 'fiar' ? "time-outline" : "checkmark-circle"} size={22} color={Colors.white} />
                    <Text style={ts.cobrarText}>{tipo === 'fiar' ? 'Procesar Crédito' : 'Procesar Pago'} · {formatUSD(subtotalUSD)}</Text>
                  </>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: Ciente Selector ── */}
      <Modal visible={showClientePicker} animationType="slide" transparent>
        <View style={ts.modalOverlayBottom}>
          <View style={[ts.cartSheet, { height: '80%' }]}>
            <View style={ts.sheetHeader}>
              <Text style={ts.sheetTitle}>Seleccionar Cliente</Text>
              <TouchableOpacity onPress={() => { setShowClientePicker(false); setShowCartModal(true); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={ts.modalSearch}
              placeholder="Buscar por nombre o teléfono..."
              placeholderTextColor={Colors.textMuted}
              value={clienteSearch}
              onChangeText={setClienteSearch}
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              <TouchableOpacity
                style={[ts.clienteRow, !clienteId && ts.clienteRowActive]}
                onPress={() => { setClienteId(null); setShowClientePicker(false); setShowCartModal(true); }}
              >
                <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
                <Text style={ts.clienteRowText}>Sin cliente asignado</Text>
              </TouchableOpacity>
              {filteredClientes.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[ts.clienteRow, clienteId === c.id && ts.clienteRowActive]}
                  onPress={() => {
                    setClienteId(c.id);
                    setShowClientePicker(false);
                    setClienteSearch('');
                    setShowCartModal(true);
                  }}
                >
                  <Ionicons name="person" size={18} color={Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={ts.clienteRowText}>{c.nombre}</Text>
                    {c.telefono && <Text style={ts.clienteRowSub}>{c.telefono}</Text>}
                  </View>
                  {clienteId === c.id && <Ionicons name="checkmark" size={18} color={Colors.success} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Éxito ── */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={ts.modalOverlayCenter}>
          <Animated.View style={[ts.successSheet, { transform: [{ scale: successScale }], opacity: successOpacity }]}>
            <View style={ts.successIcon}>
              <Ionicons
                name="checkmark-circle"
                size={72}
                color={lastVentaNum === 'OFFLINE' ? Colors.warning : Colors.success}
              />
            </View>
            <Text style={ts.successTitle}>
              {lastVentaNum === 'OFFLINE' ? '¡Guardada offline!' : '¡Venta procesada!'}
            </Text>
            {lastVentaNum === 'OFFLINE' ? (
              <>
                <View style={{ backgroundColor: Colors.warningBg, borderRadius: 10, padding: 12, marginTop: 8, width: '100%' }}>
                  <Text style={{ color: Colors.warning, fontWeight: '700', textAlign: 'center', fontSize: 13 }}>
                    ⚡ Sin conexión{"\n"}La venta se sincronizará automáticamente cuando recuperes internet.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={ts.successNum}>{lastVentaNum}</Text>
                {descPct > 0 && (
                  <Text style={{ color: Colors.warning, fontWeight: '700', marginTop: 6 }}>Descuento aplicado: {descPct}%</Text>
                )}
              </>
            )}
            <TouchableOpacity
              style={[ts.cobrarBtn, { marginTop: 30, width: '100%', backgroundColor: lastVentaNum === 'OFFLINE' ? Colors.warning : Colors.success }]}
              onPress={() => setShowSuccess(false)}
            >
              <Text style={ts.cobrarText}>Nueva Venta</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

    </View>
  );
}

// ─── Estilos Modificados ────────────────────────────────────────────────────────
const getStyles = (Colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header & Búsqueda
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 56 : 56,
    paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    zIndex: 2,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.text },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 10 },
  clearSearch: { padding: 4 },

  // Tasa Bar
  tasaBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.background, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  tasaText: { fontSize: 12, color: Colors.textSecondary },
  tasaFecha: { fontSize: 11, color: Colors.textMuted },
  tasaVal: { color: Colors.success, fontWeight: '700' },
  tasaInput: { fontSize: 12, color: Colors.text, borderBottomWidth: 1, borderBottomColor: Colors.primary, minWidth: 70 },
  tasaEditBtn: { padding: 2 },

  // Catálogo Grid
  catalogContainer: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  gridRow: { gap: 12 },

  prodCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'flex-start',
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  prodIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.infoBg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  prodNombre: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4, lineHeight: 18 },
  prodPrecioUsd: { fontSize: 17, fontWeight: '800', color: Colors.text },
  prodPrecioBs: { fontSize: 12, color: Colors.success, marginBottom: 12 },
  stockBadge: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: Colors.info, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.surface,
  },
  stockText: { fontSize: 10, fontWeight: 'bold', color: Colors.white },
  prodAddBtn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary, borderRadius: 10,
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
  },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textMuted, marginTop: 14, fontSize: 16 },

  // Botón Flotante Fijo en la parte baja
  floatingCartWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(249,250,251,0.9)', // Colors.background transp
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  floatingCartBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingHorizontal: 16, height: 60,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  floatingBadge: {
    backgroundColor: Colors.white, borderRadius: 20,
    minWidth: 28, height: 28, justifyContent: 'center', alignItems: 'center',
    marginRight: 12, paddingHorizontal: 6,
  },
  floatingBadgeText: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  floatingCartLabel: { flex: 1, color: Colors.white, fontSize: 16, fontWeight: '600' },
  floatingCartTotal: { color: Colors.white, fontSize: 18, fontWeight: '800' },

  // Bottom Sheet Modal
  modalOverlayBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  cartSheet: {
    backgroundColor: Colors.surface, height: '85%',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  closeSheetBtn: { width: 32, height: 32, backgroundColor: Colors.background, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  cartScroll: { flex: 1 },
  cartScrollContent: { paddingBottom: 30 },

  // Cart Rows
  cartRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cartInfo: { flex: 1 },
  cartNombre: { fontSize: 14, fontWeight: '600', color: Colors.text },
  cartSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cartQty: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.background, borderRadius: 10, padding: 4,
  },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  qtyNum: { fontSize: 14, fontWeight: '700', color: Colors.text, minWidth: 22, textAlign: 'center' },
  cartTotal: { fontSize: 15, fontWeight: '800', color: Colors.text, minWidth: 65, textAlign: 'right' },
  cartRemove: { padding: 6 },

  totalsBox: {
    backgroundColor: Colors.background, borderRadius: 16, padding: 16,
    marginVertical: 16, borderWidth: 1, borderColor: Colors.border,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  totalUSD: { fontSize: 24, fontWeight: '900', color: Colors.text, textAlign: 'right' },
  totalBs: { fontSize: 13, color: Colors.success, textAlign: 'right', marginTop: 2, fontWeight: '600' },

  discountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.warningBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4,
  },
  discountLabel: { fontSize: 13, color: Colors.warning, fontWeight: '600' },
  discountInput: {
    flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text,
    borderBottomWidth: 1, borderBottomColor: Colors.warning, textAlign: 'center',
  },
  discountAmt: { fontSize: 13, fontWeight: '700', minWidth: 60, textAlign: 'right' },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10, marginTop: 8 },

  clienteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: 16,
  },
  clienteBtnText: { fontSize: 14, color: Colors.textMuted },

  tipoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tipoBtn: {
    flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  tipoBtnActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  tipoBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tipoBtnTextActive: { color: Colors.primary, fontWeight: '700' },

  metodosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  metodoBtn: {
    width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 12,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  metodoBtnActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  metodoLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },

  refWrap: { marginBottom: 20 },
  refLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8, fontWeight: '600' },
  refInput: {
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, height: 46, fontSize: 15, color: Colors.text,
  },

  footerBtnWrap: { paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  cobrarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, height: 56, backgroundColor: Colors.success,
  },
  cobrarText: { fontSize: 17, fontWeight: '800', color: Colors.white },

  // Modal Cliente Ext
  modalSearch: {
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, height: 46, fontSize: 15, color: Colors.text, marginBottom: 12,
  },
  clienteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  clienteRowActive: { backgroundColor: Colors.primaryBg, borderRadius: 12, paddingHorizontal: 10, borderBottomWidth: 0 },
  clienteRowText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  clienteRowSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  // Center Modal Success
  modalOverlayCenter: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  successSheet: {
    backgroundColor: Colors.surface, borderRadius: 24,
    width: '85%', padding: 32, alignItems: 'center',
  },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '900', color: Colors.text, marginBottom: 8 },
  successNum: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },

  // Mixed Payments Styles
  mixedToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  mixedToggleText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },

  mixedContainer: { gap: 12, marginBottom: 16 },
  mixedRow: {
    backgroundColor: Colors.background, borderRadius: 16,
    padding: 12, borderWidth: 1, borderColor: Colors.border,
  },
  mixedRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mixedRowTitle: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase' },

  mixedInputs: { gap: 8 },
  mixedMethodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mixedMethodBtn: {
    width: '48.5%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: 8, paddingVertical: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  mixedMethodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  mixedMethodLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

  mixedAmountRow: { flexDirection: 'row', gap: 8 },
  mixedInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, height: 42, fontSize: 14, color: Colors.text,
  },
  currencyBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  currencyBtnActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  currencyText: { fontSize: 14, fontWeight: '800', color: Colors.textSecondary },

  mixedConverted: { fontSize: 11, color: Colors.success, marginTop: 2, textAlign: 'right' },

  addMixedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, borderStyle: 'dashed',
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  addMixedBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  mixedSummary: {
    backgroundColor: Colors.surface, borderRadius: 14,
    padding: 12, borderWidth: 1, marginTop: 4, gap: 4,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  summaryVal: { fontSize: 15, fontWeight: '800', color: Colors.text },
});
