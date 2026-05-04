import { TextStyle } from 'react-native';

export const colors = {
  // Surface
  bg:        '#f5f7f6',
  bgElev:    '#ffffff',
  bgSunken:  '#ebefed',
  bgChip:    '#eef3f1',

  // Mint primary
  mint50:    '#eaf6f1',
  mint100:   '#d2ebe1',
  mint200:   '#a8d8c4',
  mint300:   '#7ec3a6',
  mint400:   '#56ad88',
  mint500:   '#3a9170',
  mint600:   '#2c7559',
  mint700:   '#205a44',
  mint800:   '#164230',
  mint900:   '#0d2c1f',

  // Semantic
  warn:        '#c98a2c',
  warnSoft:    '#fbeed5',
  danger:      '#d04848',
  dangerSoft:  '#fbe2e2',
  info:        '#5b7fcf',
  infoSoft:    '#e1e8f6',

  // Ink
  ink900:  '#0e1411',
  ink700:  '#2c3531',
  ink500:  '#5b6661',
  ink400:  '#818a85',
  ink300:  '#a7afaa',
  ink200:  '#d2d7d4',
  ink100:  '#e6eae7',
};

export const type: Record<string, TextStyle> = {
  display:  { fontSize: 34, fontWeight: '700', letterSpacing: -0.7, lineHeight: 38 },
  titleXl:  { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 32 },
  titleLg:  { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 26 },
  titleMd:  { fontSize: 18, fontWeight: '700', letterSpacing: -0.2, lineHeight: 22 },
  titleSm:  { fontSize: 15, fontWeight: '600', letterSpacing: -0.1, lineHeight: 20 },
  body:     { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodySm:   { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  caption:  { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
};

export const radius = {
  sm:   8,
  md:   12,
  lg:   18,
  xl:   24,
  xxl:  32,
  pill: 9999,
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};

export const shadow = {
  sm: {
    shadowColor: '#0d1e18',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#0d1e18',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0d1e18',
    shadowOpacity: 0.08,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};
