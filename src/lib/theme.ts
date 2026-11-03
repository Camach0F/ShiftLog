import { useColorScheme } from 'react-native';

const light = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  border: '#E5E7EB',
  accent: '#2F6BFF',
  onAccent: '#FFFFFF',
  danger: '#DC2626',
};

const dark: typeof light = {
  bg: '#000000',
  card: '#1C1C1E',
  text: '#F9FAFB',
  sub: '#9CA3AF',
  border: '#2C2C2E',
  accent: '#5B8CFF',
  onAccent: '#FFFFFF',
  danger: '#F87171',
};

export type Theme = typeof light;

export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);

export const TYPE_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#6B7280',
];
