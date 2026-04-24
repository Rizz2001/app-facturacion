import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_TASA = 36.5;
const DOLAR_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const STORAGE_KEY_LAST_AUTO_UPDATE = 'tasa_bcv_last_auto_update_date';

interface TasaContextType {
  tasa: number;
  loadingTasa: boolean;
  setTasa: (t: number) => Promise<void>;
  refreshTasaBCV: () => Promise<void>;
  formatUSD: (n: number) => string;
  formatBs: (n: number) => string;
  formatDual: (n: number) => string;
}

const TasaContext = createContext<TasaContextType>({
  tasa: DEFAULT_TASA,
  loadingTasa: true,
  setTasa: async () => { },
  refreshTasaBCV: async () => { },
  formatUSD: (n) => `$${n.toFixed(2)}`,
  formatBs: (n) => `Bs. ${n.toFixed(2)}`,
  formatDual: (n) => `$${n.toFixed(2)}`,
});

export function TasaProvider({ children }: { children: ReactNode }) {
  const { tenant_id, empleado } = useAuth();
  const [tasa, setTasaState] = useState(DEFAULT_TASA);
  const [loadingTasa, setLoadingTasa] = useState(true);

  // Determina si el usuario actual puede modificar la tasa
  const puedeModificarTasa = !empleado || empleado.permiso_modificar_tasa;

  // ── 1. Actualizar tasa en BD ──────────────────────────────────────────────
  const setTasa = useCallback(async (t: number) => {
    if (!tenant_id) return;
    try {
      const { error } = await supabase
        .from('negocio_config')
        .upsert({ owner_id: tenant_id, tasa_bcv: t }, { onConflict: 'owner_id' });

      if (error) throw error;
      setTasaState(t); // Optimistic Update
    } catch (err: any) {
      Alert.alert('Acceso Denegado', 'Solo el dueño puede modificar la Tasa, o hubo un error de conexión.');
    }
  }, [tenant_id]);

  // ── 2. Auto-fetch de la API de DolarAPI ──────────────────────────────────
  const autoFetchBCV = useCallback(async (currentTasa: number) => {
    // Solo usuarios autorizados ejecutan el fetch automático
    if (!puedeModificarTasa || !tenant_id) return;

    try {
      const hoy = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
      const lastUpdate = await AsyncStorage.getItem(STORAGE_KEY_LAST_AUTO_UPDATE);

      // Si ya se actualizó hoy, no volvemos a intentarlo
      if (lastUpdate === hoy) return;

      console.log('[TasaBCV] Consultando API DolarAPI...');
      const response = await fetch(DOLAR_API_URL, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      // La API retorna: { promedio, nombre, fuente, fechaActualizacion, ... }
      const promedio = parseFloat(json.promedio);

      if (isNaN(promedio) || promedio <= 0) {
        throw new Error('Valor recibido inválido');
      }

      console.log(`[TasaBCV] Tasa obtenida: ${promedio} Bs/$`);

      // Solo guardamos si cambió para evitar escrituras innecesarias
      if (Math.abs(promedio - currentTasa) > 0.001) {
        await setTasa(promedio);
      }

      // Marcar la fecha de hoy como actualizada exitosamente
      await AsyncStorage.setItem(STORAGE_KEY_LAST_AUTO_UPDATE, hoy);
    } catch (err: any) {
      console.warn('[TasaBCV] Error en auto-fetch:', err.message);
      // Mostrar alerta solo al usuario autorizado para que actualice manualmente
      Alert.alert(
        '⚠️ Tasa BCV no actualizó',
        'No se pudo obtener la tasa del día automáticamente.\n\n¿Deseas actualizarla manualmente ahora?',
        [
          {
            text: 'Actualizar manualmente',
            onPress: () => {
              // La alerta le indica al usuario que use el campo de edición en la barra de tasa
              Alert.alert(
                'Actualizar Tasa',
                'Toca el ícono ✏️ en la barra de tasa (arriba en el catálogo) para ingresar el valor manualmente.',
                [{ text: 'Entendido', style: 'default' }]
              );
            },
          },
          {
            text: 'Ignorar',
            style: 'cancel',
          },
        ]
      );
    }
  }, [puedeModificarTasa, tenant_id, setTasa]);

  // Función pública para forzar refresh manual desde la UI
  const refreshTasaBCV = useCallback(async () => {
    if (!puedeModificarTasa || !tenant_id) return;
    try {
      const response = await fetch(DOLAR_API_URL, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const promedio = parseFloat(json.promedio);
      if (isNaN(promedio) || promedio <= 0) throw new Error('Valor inválido');
      await setTasa(promedio);
      const hoy = new Date().toISOString().slice(0, 10);
      await AsyncStorage.setItem(STORAGE_KEY_LAST_AUTO_UPDATE, hoy);
      Alert.alert('✅ Tasa Actualizada', `Nueva tasa BCV: ${promedio.toFixed(2)} Bs/$`);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo conectar con la API del BCV. Verifica tu conexión.');
    }
  }, [puedeModificarTasa, tenant_id, setTasa]);

  // ── 3. Cargar Tasa desde BD + Realtime ───────────────────────────────────
  useEffect(() => {
    if (!tenant_id) {
      setLoadingTasa(false);
      return;
    }

    let tasaCargada = DEFAULT_TASA;

    const fetchTasa = async () => {
      try {
        const { data, error } = await supabase
          .from('negocio_config')
          .select('tasa_bcv')
          .eq('owner_id', tenant_id)
          .single();

        if (data) {
          tasaCargada = Number(data.tasa_bcv);
          setTasaState(tasaCargada);
        } else if (error && error.code !== 'PGRST116') {
          console.error('Error fetching tasa:', error.message);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTasa(false);
        // Una vez cargada la tasa de BD, intentar auto-actualización diaria
        autoFetchBCV(tasaCargada);
      }
    };

    fetchTasa();

    // WebSockets: suscripción a cambios en vivo de la tasa
    const channel = supabase
      .channel('tasa-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'negocio_config', filter: `owner_id=eq.${tenant_id}` },
        (payload) => {
          console.log('Cambio de Tasa recibido en vivo:', payload.new);
          if (payload.new && payload.new.tasa_bcv) {
            setTasaState(Number(payload.new.tasa_bcv));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant_id, autoFetchBCV]);

  const formatUSD = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatBs = (n: number) =>
    `Bs. ${(n * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDual = (n: number) => `${formatUSD(n)}  ·  ${formatBs(n)}`;

  return (
    <TasaContext.Provider value={{ tasa, loadingTasa, setTasa, refreshTasaBCV, formatUSD, formatBs, formatDual }}>
      {children}
    </TasaContext.Provider>
  );
}

export const useTasa = () => useContext(TasaContext);
