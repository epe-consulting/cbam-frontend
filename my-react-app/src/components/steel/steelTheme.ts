/* Design tokens shared by the iron & steel wizard components (same values as the aluminium screens). */
export const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
    mono: "'DM Mono', 'Fira Code', monospace",
  },
  color: {
    forest: '#0B4F3E',
    sage: '#3A7D6A',
    mint: '#E8F5EF',
    mintDark: '#C3E6D5',
    cream: '#FAFAF7',
    warmWhite: '#FFFEF9',
    ink: '#1A2B25',
    inkSoft: '#3D5A50',
    muted: '#6B8F82',
    line: '#D6E5DD',
    lineFaint: '#EAF0EC',
    ctaHover: '#0A3F32',
    error: '#C0392B',
    errorLight: '#FDEDEC',
  },
  radius: { sm: '8px', md: '14px', lg: '20px', pill: '999px' },
};

export const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
  '& .MuiFormHelperText-root': { fontFamily: T.font.body },
};

export const outlinedButtonSx = {
  fontFamily: T.font.body,
  fontWeight: 600,
  textTransform: 'none' as const,
  borderRadius: T.radius.pill,
  borderColor: T.color.line,
  color: T.color.forest,
  '&:hover': { bgcolor: T.color.mint, borderColor: T.color.mintDark },
};
