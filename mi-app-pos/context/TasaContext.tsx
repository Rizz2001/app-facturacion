import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Alert } from 'react-native';

const DEFAULT_TASA = 36.5;

interface TasaContextType {
  tasa: number;
  loadingTasa: boolean;
  setTasa: (t: number) => Promise<void>;
  formatUSD: (n: number) => string;
  formatBs: (n: number) => string;
  formatDual: (n: number) => string;
}

const TasaContext = createContext<TasaContextType>({
  tasa: DEFAULT_TASA,
  loadingTasa: true,
  setTasa: async () => { },
  formatUSD: (n) => `$${n.toFixed(2)}`,
  formatBs: (n) => `Bs. ${n.toFixed(2)}`,
  formatDual: (n) => `$${n.toFixed(2)}`,
});

export function TasaProvider({ children }: { children: ReactNode }) {
  const { tenant_id } = useAuth();
  const [tasa, setTasaState] = useState(DEFAULT_TASA);
  const [loadingTasa, setLoadingTasa] = useState(true);

  // 1. Cargar Tasa y Suscribirse al Realtime del Tenant
  useEffect(() => {
    if (!tenant_id) {
      setLoadingTasa(false);
      return;
    }

    const fetchTasa = async () => {
      try {
        const { data, error } = await supabase
          .from('negocio_config')
          .select('tasa_bcv')
          .eq('owner_id', tenant_id)
          .single();
        
        if (data) {
          setTasaState(Number(data.tasa_bcv));
        } else if (error && error.code !== 'PGRST116') {
          console.error("Error fetching tasa:", error.message);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTasa(false);
      }
    };

    fetchTasa();

    // 2. WebSockets (Suscripción a Cambios en Vivo de la Tasa)
    const channel = supabase
      .channel('schema-db-changes')
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

  }, [tenant_id]);

  // Actualizar Tasa en BD (Sólo Dueño será permitido por la Base de Datos automáticamente)
  const setTasa = async (t: number) => {
    if (!tenant_id) return;
    try {
      const { error } = await supabase
        .from('negocio_config')
        .upsert({ owner_id: tenant_id, tasa_bcv: t }, { onConflict: 'owner_id' });
      
      if (error) throw error;
      setTasaState(t); // Optimistic Update
    } catch (err: any) {
      Alert.alert("Acceso Denegado", "Solo el dueño puede modificar la Tasa, o hubo un error de conexión.");
    }
  };

  const formatUSD = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatBs = (n: number) =>
    `Bs. ${(n * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDual = (n: number) => `${formatUSD(n)}  ·  ${formatBs(n)}`;

  return (
    <TasaContext.Provider value={{ tasa, loadingTasa, setTasa, formatUSD, formatBs, formatDual }}>
      {children}
    </TasaContext.Provider>
  );
}

export const useTasa = () => useContext(TasaContext);
