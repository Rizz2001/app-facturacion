// Design system colors for the billing app

export const lightTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceHover: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#CBD5E1',

  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#818CF8',
  primaryBg: '#EEF2FF',

  success: '#10B981',
  successBg: '#D1FAE5',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  error: '#EF4444',
  errorBg: '#FEE2E2',
  info: '#3B82F6',
  infoBg: '#DBEAFE',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  white: '#FFFFFF',
  black: '#000000',
};

export const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceHover: '#243447',
  border: '#334155',
  borderLight: '#475569',

  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  primaryBg: '#1E1B4B',

  success: '#10B981',
  successBg: '#022C22',
  warning: '#F59E0B',
  warningBg: '#2D1B00',
  error: '#EF4444',
  errorBg: '#2D0000',
  info: '#3B82F6',
  infoBg: '#0C1E40',

  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  white: '#FFFFFF',
  black: '#000000',
};

// Mantenemos Colors exportando darkTheme temporalmente para no romper la app entera durante el refactor
export const Colors = darkTheme;

export type ThemeColors = typeof lightTheme;

export type EstadoFactura = 'borrador' | 'emitida' | 'pagada' | 'vencida' | 'cancelada';

export const EstadoBadge: Record<EstadoFactura, { bg: string; text: string; label: string }> = {
  borrador:  { bg: '#1E293B', text: '#94A3B8', label: 'Borrador' },
  emitida:   { bg: '#0C1E40', text: '#3B82F6', label: 'Emitida' },
  pagada:    { bg: '#022C22', text: '#10B981', label: 'Pagada' },
  vencida:   { bg: '#2D0000', text: '#EF4444', label: 'Vencida' },
  cancelada: { bg: '#1C1917', text: '#78716C', label: 'Cancelada' },
};
