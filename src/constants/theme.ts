export const colors = {
  primary: '#3D5A73',
  primaryLight: '#EEF2F6',
  primaryDark: '#2A3F52',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  text: '#1C2B38',
  textMuted: '#7A8A96',
  border: '#DDE4EB',
  warning: '#D97706',
  danger: '#DC2626',
  teal: '#0A7B7B',
};

// App.tsx의 useFonts에서 로딩하는 실제 패밀리 이름과 일치해야 한다
export const fonts = {
  sans: 'NotoSansKR_400Regular',
  sansMedium: 'NotoSansKR_500Medium',
  sansBold: 'NotoSansKR_700Bold',
  serifBold: 'NotoSerifKR_700Bold', // 타이틀·로고 전용
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  full: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};
