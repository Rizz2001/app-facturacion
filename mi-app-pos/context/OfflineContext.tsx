/**
 * OfflineContext.tsx
 *
 * CÓMO FUNCIONA EL MODO OFFLINE:
 * ─────────────────────────────────────────────────────
 * 1. NetInfo monitorea la conexión en tiempo real.
 * 2. Cuando el POS quiere guardar una venta:
 *    - Si HAY conexión → normal: inserta en Supabase
 *    - Si NO hay conexión → llama a `saveSaleOffline()`
 *      que serializa la venta y la guarda en AsyncStorage
 *      bajo la clave "offline_pending_sales"
 * 3. Cuando la conexión se restaura (evento de NetInfo),
 *    `syncPendingSales()` se llama automáticamente:
 *    - Lee la cola de AsyncStorage
 *    - Por cada venta pendiente, intenta el insert en Supabase
 *    - Si triunfa, la elimina de la cola
 *    - Si falla, la deja en la cola para el próximo intento
 * 4. El componente OfflineBanner muestra cuántas ventas
 *    están en cola y permite hacer sync manual.
 * ─────────────────────────────────────────────────────
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';

// ─── Tipos ───────────────────────────────────────────

export interface PendingSaleItem {
  producto_id: string;
  descripcion: string;
  cantidad: number;
  cantidad_stock?: number;
  precio_unitario: number;
  iva: number;
  subtotal: number;
  total: number;
  orden: number;
}

export interface PendingSale {
  /** UUID local temporal (para identificar en la cola) */
  localId: string;
  /** Timestamp de cuando se creó offline */
  createdAt: string;
  tenant_id: string;
  empleado_id: string | null;
  cliente_id: string;
  numero_temp: string;
  fecha: string;
  estado: string;
  subtotal: number;
  total: number;
  descuento_pct: number;
  descuento_monto: number;
  items: PendingSaleItem[];
  metodo: string;
  referencia: string;
  notas: string;
  tasa: number;
}

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
  saveSaleOffline: (sale: Omit<PendingSale, 'localId' | 'createdAt'>) => Promise<void>;
  syncPendingSales: () => Promise<{ synced: number; failed: number }>;
  clearPendingQueue: () => Promise<void>;
  getPendingSales: () => Promise<PendingSale[]>;
}

const STORAGE_KEY = 'offline_pending_sales';
const OfflineContext = createContext<OfflineContextType | null>(null);

// ─── Utilidades ──────────────────────────────────────

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function loadQueue(): Promise<PendingSale[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingSale[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

// ─── Provider ────────────────────────────────────────

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const wasOfflineRef = useRef(false);

  // Refrescar contador desde AsyncStorage
  const refreshCount = useCallback(async () => {
    const queue = await loadQueue();
    setPendingCount(queue.length);
  }, []);

  // ── Sincronizar con Supabase ──────────────────────
  const syncPendingSales = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    try {
      const queue = await loadQueue();
      if (queue.length === 0) return { synced: 0, failed: 0 };

      const remaining: PendingSale[] = [];

      for (const sale of queue) {
        try {
          // Generar número real de factura filtrado por tenant
          const { data: lastFact } = await supabase
            .from('facturas')
            .select('numero')
            .eq('user_id', sale.tenant_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastNum = lastFact?.numero
            ? parseInt(lastFact.numero.replace(/\D/g, ''), 10) || 0
            : 0;
          const numero = `V-${String(lastNum + 1).padStart(4, '0')}`;

          const { data: factura, error } = await supabase
            .from('facturas')
            .insert({
              user_id: sale.tenant_id,
              cliente_id: sale.cliente_id,
              numero,
              fecha: sale.fecha,
              estado: sale.estado,
              subtotal: sale.subtotal,
              total_iva: 0,
              total: sale.total,
              descuento_pct: sale.descuento_pct,
              descuento_monto: sale.descuento_monto,
              generada_por: sale.empleado_id,
              notas: sale.notas + ' | [SYNC OFFLINE]',
            })
            .select()
            .single();

          if (error || !factura) throw error ?? new Error('No venta');

          // Insertar items
          await supabase.from('factura_items').insert(
            sale.items.map(i => ({ ...i, factura_id: factura.id }))
          );

          // Insertar pago si no era fiado
          if (sale.estado === 'pagada') {
            await supabase.from('pagos').insert({
              factura_id: factura.id,
              monto: sale.total,
              metodo: sale.metodo,
              notas: sale.referencia ? `Ref: ${sale.referencia}` : 'Pago offline sincronizado',
            });
          }

          synced++;
          // NO agregar a remaining → se elimina de la cola
        } catch (err) {
          console.warn('Fallo al sincronizar venta offline:', err);
          failed++;
          remaining.push(sale); // dejar en cola para reintentar
        }
      }

      await saveQueue(remaining);
      setPendingCount(remaining.length);
      setLastSyncAt(new Date().toISOString());
    } finally {
      setIsSyncing(false);
    }

    return { synced, failed };
  }, []);

  // ── NetInfo: monitorear conectividad ─────────────
  useEffect(() => {
    refreshCount();

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      // Si volvemos a estar online después de haber estado offline → auto-sync
      if (online && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        syncPendingSales();
      } else if (!online) {
        wasOfflineRef.current = true;
      }
    });

    return () => unsubscribe();
  }, [refreshCount, syncPendingSales]);

  // ── Guardar venta offline ─────────────────────────
  const saveSaleOffline = useCallback(async (
    sale: Omit<PendingSale, 'localId' | 'createdAt'>
  ): Promise<void> => {
    const queue = await loadQueue();
    const pending: PendingSale = {
      ...sale,
      localId: generateLocalId(),
      createdAt: new Date().toISOString(),
    };
    queue.push(pending);
    await saveQueue(queue);
    setPendingCount(queue.length);
  }, []);

  // ── Limpiar cola (uso de emergencia) ─────────────
  const clearPendingQueue = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setPendingCount(0);
  }, []);

  const getPendingSales = useCallback(async (): Promise<PendingSale[]> => {
    return loadQueue();
  }, []);

  return (
    <OfflineContext.Provider value={{
      isOnline,
      pendingCount,
      isSyncing,
      lastSyncAt,
      saveSaleOffline,
      syncPendingSales,
      clearPendingQueue,
      getPendingSales,
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────
export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used inside OfflineProvider');
  return ctx;
}
