import { useState } from 'react';
import { Box, Button, Checkbox, Chip, Collapse, FormControlLabel, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MpField, MpJson, MpQuestion } from '../../api/monitoringPlan';
import { T } from '../steel/steelTheme';
import JsonValueEditor from './JsonValueEditor';
import { badgeFor, editorFor, emptyValue, fieldLabelKey, hasValue, sourceText, summarize } from './mpFields';

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  ASK: { bg: '#FDEDEC', fg: '#C0392B' },
  CONFIRM: { bg: '#F4E8C9', fg: '#8A6A20' },
  CONFLICT: { bg: '#FDEDEC', fg: '#8E1B10' },
  DONE: { bg: '#E8F5EF', fg: '#0B4F3E' },
  NOT_APPLICABLE: { bg: '#EAF0EC', fg: '#6B8F82' },
};

const BADGE_STYLE: Record<string, { bg: string; fg: string }> = {
  APP: { bg: '#E8F5EF', fg: '#0B4F3E' },
  SUGGESTION: { bg: '#EBF2FF', fg: '#1A4B8E' },
  USER: { bg: '#F3EEF9', fg: '#5B3A8A' },
};

/** One plan question: status, value with its origin badge and sources, edit, confirm, conflict choice. */
export default function QuestionCard({
  question, field, onValue, onConfirm,
}: {
  question: MpQuestion;
  field: MpField | undefined;
  onValue: (key: string, v: MpJson) => void;
  onConfirm: (key: string, confirmed: boolean) => void;
}) {
  const { t } = useTranslation();
  const [showSources, setShowSources] = useState(false);
  const editor = editorFor(question.key);
  const value = field && hasValue(field.value) ? field.value : (field?.value ?? emptyValue(editor));
  const badge = badgeFor(field);
  const na = question.status === 'NOT_APPLICABLE';
  const st = STATUS_STYLE[question.status];
  const sources = field?.sources ?? [];

  return (
    <Box
      id={`mp-q-${question.key}`}
      sx={{
        mb: 2, p: 2.5, borderRadius: T.radius.md, bgcolor: T.color.warmWhite,
        border: `1px solid ${question.status === 'CONFLICT' ? '#E8A39B' : T.color.lineFaint}`,
        opacity: na ? 0.6 : 1,
      }}
    >
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={1} mb={1}>
        <Chip size="small" label={t('mp.elementShort', { n: question.element })}
          sx={{ fontFamily: T.font.body, bgcolor: T.color.lineFaint, color: T.color.inkSoft, height: 22 }} />
        <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.98rem', color: T.color.ink, flexGrow: 1 }}>
          {t(fieldLabelKey(question.key))}
          {question.required && !na && <Box component="span" sx={{ color: T.color.error }}> *</Box>}
        </Typography>
        {badge && (
          <Chip size="small" label={t(`mp.badge.${badge}`)}
            sx={{ fontFamily: T.font.body, fontWeight: 600, bgcolor: BADGE_STYLE[badge].bg, color: BADGE_STYLE[badge].fg, height: 22 }} />
        )}
        <Chip size="small" label={t(`mp.status.${question.status}`)}
          sx={{ fontFamily: T.font.body, fontWeight: 600, bgcolor: st.bg, color: st.fg, height: 22 }} />
      </Box>

      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.84rem', color: T.color.muted, mb: 1.5, lineHeight: 1.5 }}>
        {t(`${fieldLabelKey(question.key)}_help`, { defaultValue: '' }) || t(`mp.element.${question.element}`)}
      </Typography>

      {na ? (
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
          {t('mp.notApplicableHint')}
        </Typography>
      ) : (
        <>
          {field?.conflict && field.conflicts.length > 0 && (
            <Box sx={{ mb: 1.5, p: 1.5, borderRadius: T.radius.sm, bgcolor: '#FDEDEC' }}>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', fontWeight: 600, color: '#8E1B10', mb: 1 }}>
                {t('mp.conflictTitle')}
              </Typography>
              {field.conflicts.map((c, i) => (
                <Box key={i} display="flex" alignItems="flex-start" gap={1} mb={1}>
                  <Box flexGrow={1}>
                    <Typography sx={{ fontFamily: T.font.mono, fontSize: '0.78rem', color: T.color.ink, wordBreak: 'break-word' }}>
                      {summarize(c.value, 400)}
                    </Typography>
                    <Typography sx={{ fontFamily: T.font.body, fontSize: '0.75rem', color: T.color.muted }}>
                      {c.sources.map(sourceText).join(' · ')}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => onValue(question.key, c.value)}
                    sx={{ fontFamily: T.font.body, textTransform: 'none', flexShrink: 0 }}>
                    {t('mp.useThis')}
                  </Button>
                </Box>
              ))}
            </Box>
          )}

          <JsonValueEditor value={value} editor={editor} onChange={(v) => onValue(question.key, v)} />

          <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="space-between" mt={1.5} gap={1}>
            {sources.length > 0 ? (
              <Button size="small" onClick={() => setShowSources((s) => !s)}
                sx={{ fontFamily: T.font.body, textTransform: 'none', color: T.color.sage, px: 0 }}>
                {showSources ? t('mp.hideSources') : t('mp.showSources', { n: sources.length })}
              </Button>
            ) : <span />}
            {field && hasValue(field.value) && field.origin !== 'USER' && (
              <FormControlLabel
                disabled={field.conflict}
                control={<Checkbox size="small" checked={field.confirmed} onChange={(e) => onConfirm(question.key, e.target.checked)} />}
                label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem' }}>{t('mp.confirmValue')}</Typography>}
              />
            )}
          </Box>
          <Collapse in={showSources}>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {sources.map((s, i) => (
                <Typography component="li" key={i} sx={{ fontFamily: T.font.body, fontSize: '0.78rem', color: T.color.inkSoft }}>
                  {sourceText(s)}
                </Typography>
              ))}
            </Box>
          </Collapse>
        </>
      )}
      {question.reason && (
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.72rem', color: T.color.muted, mt: 1 }}>
          {t('mp.ruleSource')}: {question.reason}
        </Typography>
      )}
    </Box>
  );
}
