import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { ArrowBack, AssignmentOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { getMyCompanyInstallations, type CompanyInstallation } from './api/ironSteel';
import { createOrResumePlan, listPlans, type MpPlanRow, type MpPlanView } from './api/monitoringPlan';
import { T, outlinedButtonSx } from './components/steel/steelTheme';
import MonitoringPlanWizard from './components/monitoringPlan/MonitoringPlanWizard';

/**
 * "Plan praćenja": installation list → "Kreiraj plan" / "Nastavi plan" → wizard.
 * One plan per installation; prefill reads only that installation's data (backend MpPrefillEngine).
 */
export default function MonitoringPlan() {
  const { installationId } = useParams();
  return installationId ? <PlanScreen installationId={Number(installationId)} /> : <InstallationList />;
}

function Header({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  const { t } = useTranslation();
  return (
    <Box mb={3}>
      {back && (
        <Button startIcon={<ArrowBack />} onClick={back} sx={{ ...outlinedButtonSx, border: 'none', mb: 1, px: 1 }}>
          {t('mp.back')}
        </Button>
      )}
      <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' }, color: T.color.ink, letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, mt: 0.5, lineHeight: 1.6 }}>{subtitle}</Typography>
      )}
    </Box>
  );
}

function InstallationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<CompanyInstallation[] | null>(null);
  const [plans, setPlans] = useState<Record<number, MpPlanRow | null>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const inst = await getMyCompanyInstallations();
        setItems(inst);
        const entries = await Promise.all(inst.map(async (i) => {
          try {
            const p = await listPlans(i.id);
            return [i.id, p[0] ?? null] as const;
          } catch {
            return [i.id, null] as const;
          }
        }));
        setPlans(Object.fromEntries(entries));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  return (
    <Container maxWidth="lg">
      <Header title={t('mp.title')} subtitle={t('mp.subtitle')} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {items === null && !error && <CircularProgress />}
      {items && items.length === 0 && (
        <Alert severity="info" action={<Button onClick={() => navigate('/dashboard/settings')}>{t('mp.openSettings')}</Button>}>
          {t('mp.noInstallations')}
        </Alert>
      )}
      {items?.map((i) => {
        const plan = plans[i.id];
        return (
          <Paper key={i.id} elevation={0}
            sx={{ p: 2.5, mb: 2, borderRadius: T.radius.lg, border: `1px solid ${T.color.lineFaint}`, bgcolor: T.color.warmWhite, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <AssignmentOutlined sx={{ color: T.color.forest }} />
            <Box flexGrow={1}>
              <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.ink }}>{i.installationName}</Typography>
              <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                {[i.address, i.country].filter(Boolean).join(', ')}
                {plan ? ` · ${t(`mp.planStatus.${plan.status}`)} · ${t('mp.versionNo', { n: plan.versionNo })}` : ` · ${t('mp.noPlan')}`}
              </Typography>
            </Box>
            <Button variant="contained" disableElevation onClick={() => navigate(`/dashboard/monitoring-plan/${i.id}`)}
              sx={{ fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', bgcolor: T.color.forest, borderRadius: T.radius.pill, px: 3, '&:hover': { bgcolor: T.color.ctaHover } }}>
              {plan ? t('mp.resume') : t('mp.create')}
            </Button>
          </Paper>
        );
      })}
    </Container>
  );
}

function PlanScreen({ installationId }: { installationId: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<MpPlanView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setView(null);
    setError(null);
    createOrResumePlan(installationId).then(setView, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, [installationId]);

  const name = view?.fields.find((f) => f.key === 'installation.name')?.value;
  return (
    <Container maxWidth="lg">
      <Header
        title={t('mp.title')}
        subtitle={typeof name === 'string' && name ? name : undefined}
        back={() => navigate('/dashboard/monitoring-plan')}
      />
      {error && <Alert severity="error">{error}</Alert>}
      {!view && !error && (
        <Box display="flex" alignItems="center" gap={1.5}>
          <CircularProgress size={22} />
          <Typography sx={{ fontFamily: T.font.body, color: T.color.muted }}>{t('mp.preparing')}</Typography>
        </Box>
      )}
      {view && <MonitoringPlanWizard initial={view} />}
    </Container>
  );
}
