export const colors = {
  primary: {
    DEFAULT: '#1e1b4b',
    light: '#312e81',
    dark: '#0f0d2e',
  },
  accent: {
    DEFAULT: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  success: {
    DEFAULT: '#22c55e',
    light: '#4ade80',
    dark: '#16a34a',
  },
  error: {
    DEFAULT: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  card: '#faf9f6',
} as const;

export const fonts = {
  heading: '"Space Grotesk", sans-serif',
  body: '"Inter", sans-serif',
} as const;

export const borderRadius = {
  card: '0.75rem',    // rounded-xl
  modal: '1rem',      // rounded-2xl
  button: '0.75rem',  // rounded-xl
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
} as const;
