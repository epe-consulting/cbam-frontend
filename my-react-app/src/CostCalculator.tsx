import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { ArrowBack, Calculate, East, Shield } from '@mui/icons-material';
import {
  compareCostCalculator,
  fetchCostCalculatorDefaults,
  type CostCalculatorDefaults,
  type CostCalculatorResult,
  type ProductCategoryCostDefaults,
} from './api/costCalculator';

const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    mint: '#E8F5EF',
    mintDark: '#C3E6D5',
    cream: '#FAFAF7',
    warmWhite: '#FFFEF9',
    ink: '#1A2B25',
    inkSoft: '#3D5A50',
    muted: '#6B8F82',
    accent: '#D4A853',
    accentLight: '#F4E8C9',
    line: '#D6E5DD',
    lineFaint: '#EAF0EC',
    ctaHover: '#0A3F32',
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
    pill: '999px',
  },
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
};

function fmtMoney(n: number | undefined | null, currency: 'BAM' | 'EUR'): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function fmtNum(n: number | undefined | null, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const CostCalculator: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem('token'));
  const [defaults, setDefaults] = useState<CostCalculatorDefaults | null>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CostCalculatorResult | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const [categoryCode, setCategoryCode] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [annualQuantity, setAnnualQuantity] = useState('');
  const [defaultSee, setDefaultSee] = useState('');
  const [actualSee, setActualSee] = useState('');
  const [verificationCostBam, setVerificationCostBam] = useState('');
  const [certificatePriceEur, setCertificatePriceEur] = useState('');
  const [productBenchmark, setProductBenchmark] = useState('');
  /** Honeypot — leave empty; bots that autofill get rejected server-side. */
  const [websiteHoneypot, setWebsiteHoneypot] = useState('');

  const selectedCategory: ProductCategoryCostDefaults | undefined = useMemo(
    () => defaults?.categories.find((c) => c.code === categoryCode),
    [defaults, categoryCode]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDefaults(true);
      const res = await fetchCostCalculatorDefaults();
      if (cancelled) return;
      if (res.error || !res.defaults) {
        setError(res.error ?? 'Failed to load calculator');
        setLoadingDefaults(false);
        return;
      }
      setDefaults(res.defaults);
      const first = res.defaults.categories[0];
      if (first) {
        setCategoryCode(first.code);
        setDefaultSee(String(first.suggestedDefaultSee));
        setActualSee(String(first.suggestedActualSee));
        setVerificationCostBam(String(first.suggestedVerificationCostBam));
        setProductBenchmark(
          first.productBenchmark != null ? String(first.productBenchmark) : ''
        );
      }
      setCertificatePriceEur(String(res.defaults.certificatePriceEur));
      setLoadingDefaults(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    setDefaultSee(String(selectedCategory.suggestedDefaultSee));
    setActualSee(String(selectedCategory.suggestedActualSee));
    setVerificationCostBam(String(selectedCategory.suggestedVerificationCostBam));
    setProductBenchmark(
      selectedCategory.productBenchmark != null ? String(selectedCategory.productBenchmark) : ''
    );
  }, [selectedCategory]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = window.setTimeout(() => setCooldownSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldownSeconds]);

  const startCooldown = (seconds: number) => {
    setCooldownSeconds(Math.max(seconds, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (cooldownSeconds > 0) {
      setError(`Please wait ${cooldownSeconds}s before comparing again.`);
      return;
    }

    const qty = Number(annualQuantity);
    if (!categoryCode || !productDescription.trim() || !Number.isFinite(qty) || qty <= 0) {
      setError('Enter what you make/export and a positive annual quantity.');
      return;
    }

    setSubmitting(true);
    const res = await compareCostCalculator({
      productCategoryCode: categoryCode,
      productDescription: productDescription.trim(),
      annualQuantity: qty,
      defaultSpecificEmbeddedEmissions: defaultSee ? Number(defaultSee) : null,
      actualSpecificEmbeddedEmissions: actualSee ? Number(actualSee) : null,
      verificationCostBam: verificationCostBam ? Number(verificationCostBam) : null,
      certificatePriceEur: certificatePriceEur ? Number(certificatePriceEur) : null,
      productBenchmark: productBenchmark ? Number(productBenchmark) : null,
      applyFreeAllocation: true,
      website: websiteHoneypot,
    });
    setSubmitting(false);

    if (res.retryAfterSeconds) {
      startCooldown(res.retryAfterSeconds);
    }

    if (res.error || !res.result) {
      setError(res.error ?? 'Comparison failed');
      return;
    }
    startCooldown(60);
    setResult(res.result);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.color.cream, fontFamily: T.font.body }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(250,250,247,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${T.color.line}`,
        }}
      >
        <Toolbar sx={{ maxWidth: 960, mx: 'auto', width: '100%', px: { xs: 2, md: 3 } }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{
              fontFamily: T.font.body,
              textTransform: 'none',
              color: T.color.inkSoft,
              mr: 1,
            }}
          >
            Home
          </Button>
          <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                bgcolor: T.color.forest,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, color: T.color.ink }}>
              Cost calculator
            </Typography>
          </Box>
          {isLoggedIn ? (
            <Button
              onClick={() => navigate('/dashboard')}
              sx={{ fontFamily: T.font.body, textTransform: 'none', color: T.color.forest, fontWeight: 600 }}
            >
              Dashboard
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/login')}
              sx={{ fontFamily: T.font.body, textTransform: 'none', color: T.color.forest, fontWeight: 600 }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 3 } }}>
        <Chip
          icon={<Calculate sx={{ fontSize: 16 }} />}
          label="CBAM vs defaults"
          sx={{
            fontFamily: T.font.body,
            fontWeight: 600,
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            bgcolor: T.color.mint,
            color: T.color.forest,
            border: `1px solid ${T.color.mintDark}`,
            mb: 2,
          }}
        />
        <Typography
          component="h1"
          sx={{
            fontFamily: T.font.display,
            fontWeight: 700,
            fontSize: { xs: '1.9rem', md: '2.4rem' },
            color: T.color.ink,
            letterSpacing: '-0.02em',
            mb: 1,
          }}
        >
          Is measuring worth it?
        </Typography>
        <Typography sx={{ color: T.color.muted, mb: 4, maxWidth: 640, lineHeight: 1.6 }}>
          Compare EU default values against actual CBAM emissions for your exports — including Panonia
          at <strong>1,200 BAM/year</strong> and verifier fees.
        </Typography>

        {loadingDefaults ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress sx={{ color: T.color.forest }} />
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              bgcolor: T.color.warmWhite,
              border: `1px solid ${T.color.line}`,
              borderRadius: T.radius.lg,
              p: { xs: 2.5, md: 3.5 },
            }}
          >
            <Stack spacing={2.5}>
              {/* Honeypot: hidden from users, filled by many bots */}
              <Box
                aria-hidden="true"
                sx={{ position: 'absolute', left: '-10000px', height: 0, overflow: 'hidden' }}
              >
                <label htmlFor="company-website">Website</label>
                <input
                  id="company-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={websiteHoneypot}
                  onChange={(e) => setWebsiteHoneypot(e.target.value)}
                />
              </Box>

              <TextField
                select
                required
                fullWidth
                label="What are you making?"
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                sx={textFieldSx}
              >
                {(defaults?.categories ?? []).map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                required
                fullWidth
                label="What are you exporting?"
                placeholder="e.g. Aluminium profiles to EU buyers"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                sx={textFieldSx}
              />

              <TextField
                required
                fullWidth
                type="number"
                label={`Annual export quantity (${selectedCategory?.quantityUnit ?? 't'})`}
                value={annualQuantity}
                onChange={(e) => setAnnualQuantity(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
                sx={textFieldSx}
                helperText={defaults?.quantityUnitHint}
              />

              <Divider sx={{ borderColor: T.color.lineFaint }} />

              <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.inkSoft }}>
                Emissions & costs (editable)
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label={`Default SEE (${selectedCategory?.quantityUnit === 'MWh' ? 'tCO₂e/MWh' : 'tCO₂e/t'})`}
                  value={defaultSee}
                  onChange={(e) => setDefaultSee(e.target.value)}
                  inputProps={{ min: 0, step: 'any' }}
                  sx={textFieldSx}
                  helperText={selectedCategory?.notes}
                />
                <TextField
                  fullWidth
                  type="number"
                  label={`Your estimated actual SEE`}
                  value={actualSee}
                  onChange={(e) => setActualSee(e.target.value)}
                  inputProps={{ min: 0, step: 'any' }}
                  sx={textFieldSx}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Verifier cost (BAM / year)"
                  value={verificationCostBam}
                  onChange={(e) => setVerificationCostBam(e.target.value)}
                  inputProps={{ min: 0, step: 'any' }}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Certificate price (EUR / tCO₂e)"
                  value={certificatePriceEur}
                  onChange={(e) => setCertificatePriceEur(e.target.value)}
                  inputProps={{ min: 0, step: 'any' }}
                  sx={textFieldSx}
                  helperText={defaults?.certificatePriceLabel}
                />
              </Stack>

              <TextField
                fullWidth
                type="number"
                label="Product benchmark (tCO₂e / unit)"
                value={productBenchmark}
                onChange={(e) => setProductBenchmark(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
                sx={textFieldSx}
                helperText={
                  defaults?.cbamFactor != null
                    ? `Used for 2026 free-allocation adjustment: benchmark × CBAM factor ${defaults.cbamFactor} (${defaults.cbamFactorYear ?? 2026}).`
                    : 'Used for free-allocation adjustment (benchmark × CBAM factor).'
                }
              />

              <Alert severity="info" sx={{ fontFamily: T.font.body }}>
                Panonia platform fee included in the “actual CBAM” path:{' '}
                <strong>{fmtMoney(defaults?.platformAnnualFeeBam, 'BAM')}</strong>
                {defaults?.platformAnnualFeeEur != null && (
                  <> (≈ {fmtMoney(defaults.platformAnnualFeeEur, 'EUR')})</>
                )}
                .
              </Alert>

              {error && (
                <Alert severity="error" sx={{ fontFamily: T.font.body }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={submitting || cooldownSeconds > 0}
                endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <East />}
                sx={{
                  alignSelf: { xs: 'stretch', sm: 'flex-start' },
                  fontFamily: T.font.body,
                  fontWeight: 600,
                  textTransform: 'none',
                  bgcolor: T.color.forest,
                  borderRadius: T.radius.pill,
                  px: 3.5,
                  py: 1.3,
                  '&:hover': { bgcolor: T.color.ctaHover },
                }}
              >
                {submitting
                  ? 'Calculating…'
                  : cooldownSeconds > 0
                    ? `Wait ${cooldownSeconds}s`
                    : 'Compare costs'}
              </Button>
            </Stack>
          </Box>
        )}

        {result && (
          <Box
            sx={{
              mt: 4,
              bgcolor: T.color.warmWhite,
              border: `1px solid ${T.color.line}`,
              borderRadius: T.radius.lg,
              p: { xs: 2.5, md: 3.5 },
            }}
          >
            <Chip
              label={
                result.recommendation === 'ACTUAL_CBAM'
                  ? 'Recommendation: measure actual CBAM'
                  : 'Recommendation: use default values'
              }
              sx={{
                mb: 2,
                fontFamily: T.font.body,
                fontWeight: 600,
                bgcolor: result.recommendation === 'ACTUAL_CBAM' ? T.color.mint : T.color.accentLight,
                color: T.color.ink,
              }}
            />
            <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, mb: 3, lineHeight: 1.6 }}>
              {result.recommendationMessage}
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
              <Box
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: T.radius.md,
                  border: `1px solid ${T.color.line}`,
                  bgcolor: result.recommendation === 'DEFAULT_VALUES' ? T.color.mint : T.color.cream,
                }}
              >
                <Typography sx={{ fontWeight: 700, color: T.color.ink, mb: 1.5 }}>Default values</Typography>
                <Typography sx={{ color: T.color.muted, fontSize: '0.9rem' }}>
                  SEE: {fmtNum(result.defaultSpecificEmbeddedEmissions, 3)}
                  {result.defaultNetSeeAfterFreeAllocation != null && (
                    <> → net {fmtNum(result.defaultNetSeeAfterFreeAllocation, 3)} after free allocation</>
                  )}
                </Typography>
                <Typography sx={{ color: T.color.muted, fontSize: '0.9rem', mt: 0.5 }}>
                  Certificates: {fmtNum(result.defaultPathCertificates, 2)}
                </Typography>
                <Typography sx={{ mt: 1.5, fontFamily: T.font.display, fontSize: '1.5rem', fontWeight: 700 }}>
                  {fmtMoney(result.defaultPathCbamCostBam, 'BAM')}
                </Typography>
                <Typography sx={{ color: T.color.muted, fontSize: '0.85rem' }}>
                  ≈ {fmtMoney(result.defaultPathCbamCostEur, 'EUR')} / year
                </Typography>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: T.radius.md,
                  border: `1px solid ${T.color.line}`,
                  bgcolor: result.recommendation === 'ACTUAL_CBAM' ? T.color.mint : T.color.cream,
                }}
              >
                <Typography sx={{ fontWeight: 700, color: T.color.ink, mb: 1.5 }}>
                  Actual CBAM (+ Panonia + verifier)
                </Typography>
                <Typography sx={{ color: T.color.muted, fontSize: '0.9rem' }}>
                  SEE: {fmtNum(result.actualSpecificEmbeddedEmissions, 3)}
                  {result.actualNetSeeAfterFreeAllocation != null && (
                    <> → net {fmtNum(result.actualNetSeeAfterFreeAllocation, 3)} after free allocation</>
                  )}
                </Typography>
                <Typography sx={{ color: T.color.muted, fontSize: '0.9rem', mt: 0.5 }}>
                  Certificates: {fmtNum(result.actualPathCertificates, 2)}
                  {result.freeAllocationPerUnit != null && result.cbamFactor != null && (
                    <> · free alloc. {fmtNum(result.freeAllocationPerUnit, 4)}/unit</>
                  )}
                </Typography>
                <Typography sx={{ mt: 1, color: T.color.muted, fontSize: '0.85rem' }}>
                  CBAM {fmtMoney(result.actualPathCbamCostBam, 'BAM')} + platform{' '}
                  {fmtMoney(result.platformFeeBam, 'BAM')} + verifier {fmtMoney(result.verificationCostBam, 'BAM')}
                </Typography>
                <Typography sx={{ mt: 1.5, fontFamily: T.font.display, fontSize: '1.5rem', fontWeight: 700 }}>
                  {fmtMoney(result.actualPathTotalCostBam, 'BAM')}
                </Typography>
                <Typography sx={{ color: T.color.muted, fontSize: '0.85rem' }}>
                  ≈ {fmtMoney(result.actualPathTotalCostEur, 'EUR')} / year
                </Typography>
              </Box>
            </Stack>

            <Alert severity="warning" sx={{ fontFamily: T.font.body, fontSize: '0.85rem' }}>
              {result.disclaimer}
            </Alert>

            {result.recommendation === 'ACTUAL_CBAM' && (
              <Button
                variant="contained"
                disableElevation
                onClick={() =>
                  navigate(
                    isLoggedIn ? '/dashboard/new-calculation' : '/login',
                    isLoggedIn ? undefined : { state: { from: '/dashboard/new-calculation' } }
                  )
                }
                sx={{
                  mt: 2.5,
                  fontFamily: T.font.body,
                  fontWeight: 600,
                  textTransform: 'none',
                  bgcolor: T.color.forest,
                  borderRadius: T.radius.pill,
                  '&:hover': { bgcolor: T.color.ctaHover },
                }}
              >
                {isLoggedIn ? 'Start a CBAM calculation' : 'Log in to start calculating'}
              </Button>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default CostCalculator;
