import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { APP_LANGUAGES } from '../i18n';

/** Compact BS / EN switcher used in the dashboard top bar. */
export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={current}
      onChange={(_, lng: string | null) => {
        if (lng && lng !== current) void i18n.changeLanguage(lng);
      }}
      aria-label={t('common.language')}
      sx={{ mr: 1.5 }}
    >
      {APP_LANGUAGES.map((l) => (
        <ToggleButton
          key={l.code}
          value={l.code}
          title={l.label}
          aria-label={l.label}
          sx={{
            px: 1.2,
            py: 0.3,
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'none',
            '&.Mui-selected': { bgcolor: '#E8F5EF', color: '#0B4F3E' },
          }}
        >
          {l.short}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
