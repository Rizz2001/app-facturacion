// TypeScript types for the billing app

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  empresa?: string;
  telefono?: string;
  direccion?: string;
  nif?: string;
  logo_url?: string;
  avatar_url?: string;
  moneda: string;
  created_at: string;
  updated_at: string;
}

export interface Empleado {
  id: string;
  owner_id: string;
  auth_id: string | null;
  email: string;
  nombre?: string;
  permiso_ventas: boolean;
  permiso_productos: boolean;
  permiso_eliminar_facturas: boolean;
  permiso_modificar_tasa: boolean;
  activo: boolean;
  sucursal_id?: string | null;
}

export interface Sucursal {
  id: string;
  owner_id: string;
  nombre: string;
  direccion?: string;
  activa: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  user_id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigo_postal?: string;
  pais: string;
  nif?: string;
  notas?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Categoria {
  id: string;
  user_id: string;
  nombre: string;
  descripcion?: string;
  created_at: string;
}

export interface Producto {
  id: string;
  user_id: string;
  categoria_id?: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  iva: number;
  unidad: string;
  stock: number;
  stock_minimo: number;
  vende_por_caja: boolean;
  unidades_por_caja: number;
  precio_caja: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  categorias?: Categoria;
}

export type EstadoFactura = 'borrador' | 'emitida' | 'pagada' | 'vencida' | 'cancelada';
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';

export interface Factura {
  id: string;
  user_id: string;
  cliente_id: string;
  numero: string;
  fecha: string;
  fecha_vencimiento?: string;
  estado: EstadoFactura;
  subtotal: number;
  total_iva: number;
  total: number;
  descuento_pct: number;
  descuento_monto: number;
  generada_por?: string | null;
  sucursal_id?: string | null;
  notas?: string;
  created_at: string;
  updated_at: string;
  clientes?: Cliente;
  factura_items?: FacturaItem[];
}

export interface FacturaItem {
  id?: string;
  factura_id?: string;
  producto_id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  iva: number;
  subtotal: number;
  total: number;
  orden: number;
  cantidad_stock?: number;
}

export interface Pago {
  id: string;
  factura_id: string;
  fecha: string;
  monto: number;
  metodo: MetodoPago;
  notas?: string;
  created_at: string;
}

export interface CierreCaja {
  id: string;
  tenant_id: string;
  empleado_id?: string | null;
  fecha: string;
  total_ventas_usd: number;
  total_ventas_bs: number;
  num_facturas: number;
  tasa_bcv: number;
  notas?: string;
  created_at: string;
}

export interface DashboardStats {
  totalFacturas: number;
  facturasPendientes: number;
  facturasPagadas: number;
  totalCobrado: number;
  totalPendiente: number;
  clientesActivos: number;
  productosActivos: number;
}

export interface ClienteDeuda {
  cliente_id: string;
  nombre: string;
  total_deuda: number;
  num_facturas: number;
}
