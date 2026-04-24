// ─── Design System — App Facturación ─────────────────────────────────────────

export const lightTheme = {
  // Backgrounds
  background:   '#F4F6FB',
  surface:      '#FFFFFF',
  surfaceHover: '#F0F4FF',
  surfaceElevated: '#FFFFFF',

  // Borders
  border:      '#E4E9F4',
  borderLight: '#CBD5E1',

  // Brand — Indigo vibrante
  primary:      '#5B5EF4',
  primaryDark:  '#4338CA',
  primaryLight: '#818CF8',
  primaryBg:    '#ECEFFE',
  primaryGlow:  'rgba(91,94,244,0.15)',

  // Semantic
  success:   '#0EA36A',
  successBg: '#D1FAE5',
  successGlow: 'rgba(14,163,106,0.15)',

  warning:   '#F59E0B',
  warningBg: '#FEF3C7',
  warningGlow: 'rgba(245,158,11,0.15)',

  error:   '#E63757',
  errorBg: '#FFE4EA',
  errorGlow: 'rgba(230,55,87,0.15)',

  info:   '#3B82F6',
  infoBg: '#DBEAFE',
  infoGlow: 'rgba(59,130,246,0.15)',

  // Typography
  text:          '#111827',
  textSecondary: '#4B5563',
  textMuted:     '#9CA3AF',

  // Utils
  white:  '#FFFFFF',
  black:  '#000000',
  overlay: 'rgba(0,0,0,0.5)',

  // Gradient accent (metadata only — use in LinearGradient)
  gradientStart: '#5B5EF4',
  gradientEnd:   '#818CF8',
};

export const darkTheme = {
  // Backgrounds — deep navy, not pure black
  background:      '#0C1020',
  surface:         '#141928',
  surfaceHover:    '#1C2540',
  surfaceElevated: '#1A2236',

  // Borders
  border:      '#1E2D48',
  borderLight: '#2A3B5E',

  // Brand — electric violet
  primary:      '#6366F1',
  primaryDark:  '#4F46E5',
  primaryLight: '#A5B4FC',
  primaryBg:    '#1A1B4B',
  primaryGlow:  'rgba(99,102,241,0.25)',

  // Semantic
  success:     '#10B981',
  successBg:   '#052E20',
  successGlow: 'rgba(16,185,129,0.25)',

  warning:     '#FBBF24',
  warningBg:   '#291A00',
  warningGlow: 'rgba(251,191,36,0.2)',

  error:     '#F43F5E',
  errorBg:   '#2D0515',
  errorGlow: 'rgba(244,63,94,0.2)',

  info:     '#60A5FA',
  infoBg:   '#0C1E40',
  infoGlow: 'rgba(96,165,250,0.2)',

  // Typography
  text:          '#EEF2FF',
  textSecondary: '#94A3B8',
  textMuted:     '#475569',

  // Utils
  white:  '#FFFFFF',
  black:  '#000000',
  overlay: 'rgba(0,0,0,0.7)',

  // Gradient accent
  gradientStart: '#6366F1',
  gradientEnd:   '#818CF8',
};

// Compatibilidad legacy
export const Colors = darkTheme;

export type ThemeColors = typeof lightTheme;

export type EstadoFactura = 'borrador' | 'emitida' | 'pagada' | 'vencida' | 'cancelada';

export const EstadoBadge: Record<EstadoFactura, { bg: string; text: string; label: string }> = {
  borrador:  { bg: '#1E293B', text: '#94A3B8', label: 'Borrador' },
  emitida:   { bg: '#0C1E40', text: '#60A5FA', label: 'Emitida'  },
  pagada:    { bg: '#052E20', text: '#10B981', label: 'Pagada'   },
  vencida:   { bg: '#2D0515', text: '#F43F5E', label: 'Vencida'  },
  cancelada: { bg: '#1C1917', text: '#78716C', label: 'Cancelada'},
};
