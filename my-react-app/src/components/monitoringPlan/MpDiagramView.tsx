import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MpDiagram } from '../../api/monitoringPlan';
import { T } from '../steel/steelTheme';
import { diagramSvg } from './mpDiagram';

/** Process diagram from confirmed links only (backend MpDiagramBuilder). SVG text is escaped in diagramSvg. */
export default function MpDiagramView({ diagram }: { diagram: MpDiagram }) {
  const { t, i18n } = useTranslation();
  const svg = useMemo(
    () => diagramSvg(diagram, {
      boundary: t('mp.diagram.boundary'),
      empty: t('mp.diagram.empty'),
      tl: (k, fallback) => t(k, { defaultValue: fallback }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diagram, i18n.language],
  );
  return (
    <Box>
      <Box sx={{ overflowX: 'auto', border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.sm, bgcolor: '#fff', p: 1 }}
        dangerouslySetInnerHTML={{ __html: svg }} />
      {diagram.unconfirmedLinks > 0 && (
        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: '#8A6A20', mt: 1 }}>
          {t('mp.diagram.pending', { n: diagram.unconfirmedLinks })}
        </Typography>
      )}
    </Box>
  );
}
