import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Autocomplete,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material';
import { Add, ArrowBack, Calculate, DeleteOutline, Download, East, Shield } from '@mui/icons-material';
import {
  CN_OPTIONS,
  DATASET_COUNTRIES,
  FALLBACK_COUNTRY_LABEL,
  PLANNING_LABEL,
  compare,
  sensitivity,
  suggestDefaultPathwaySefa,
  variantsFor,
  type CompareInput,
  type Comparison,
  type CostCase,
  type CostView,
} from './costCalculator/engine.ts';
import {
  EXPORTER_WHY_ACTUALS,
  conclusionForAudience,
  type Audience,
} from './costCalculator/audienceCopy.ts';
import { buildExportPayload, downloadText, toComparisonCsv } from './costCalculator/exportComparison.ts';
import type {
  ActualDataSource,
  CostBasis,
  CostItem,
  CostOccurrence,
  CostPayer,
  CostScenario,
  ImportLine,
  PriceAssumptions,
  PriceCase,
} from './costCalculator/types.ts';

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

const COUNTRIES = [...DATASET_COUNTRIES, FALLBACK_COUNTRY_LABEL];

/** Official BAM peg used elsewhere in the app (CostCalculatorService): 1 EUR = 1.95583 BAM. */
const BAM_PER_EUR = 1.95583;
const consultancyEur = (bam: number) => Math.round((bam / BAM_PER_EUR) * 100) / 100;

function fmtEur(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n < 0 ? '−' : '';
  return `${sign}€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyCostItem(partial: Partial<CostItem> & Pick<CostItem, 'label' | 'scenario'>): CostItem {
  return {
    id: newId(),
    amount: { central: 0 },
    occurrence: 'ANNUAL',
    basis: 'PER_INSTALLATION',
    count: 1,
    allocationShare: 1,
    payer: 'IMPORTER',
    ...partial,
  };
}

const CostCalculator: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  const [cn, setCn] = useState('2523 29 00');
  const [variant, setVariant] = useState('');
  const [country, setCountry] = useState('Serbia');
  const [importYear, setImportYear] = useState(2026);
  const [importQuarter, setImportQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState<'t' | 'kg'>('t');
  const [otherImports, setOtherImports] = useState('0');

  const [actualSee, setActualSee] = useState('0.8');
  const [actualSefa, setActualSefa] = useState('');
  const [sefaManual, setSefaManual] = useState(false);
  const [actualSource, setActualSource] = useState<ActualDataSource>('PRELIMINARY_ESTIMATE');

  const [priceLow, setPriceLow] = useState('60');
  const [priceCentral, setPriceCentral] = useState('80');
  const [priceHigh, setPriceHigh] = useState('100');
  const [priceCase, setPriceCase] = useState<PriceCase>('central');
  const [costCase, setCostCase] = useState<CostCase>('central');
  const [audience, setAudience] = useState<Audience>('EXPORTER');
  const [view, setView] = useState<CostView>('COMBINED');
  const [officialQ, setOfficialQ] = useState('');

  const handleAudience = (_: React.MouseEvent<HTMLElement>, next: Audience | null) => {
    if (!next) return;
    setAudience(next);
    setView(next === 'EXPORTER' ? 'COMBINED' : 'IMPORTER');
    setComparison(null);
    setLastInput(null);
  };

  // Prefills are user-provided planning assumptions, not official market rates.
  const [costItems, setCostItems] = useState<CostItem[]>(() => [
    emptyCostItem({
      label: 'Consultancy / emissions calculation (user estimate; 1,200–2,400 BAM)',
      scenario: 'ACTUAL',
      occurrence: 'ONE_OFF',
      basis: 'PER_INSTALLATION',
      payer: 'PRODUCER',
      amount: {
        low: consultancyEur(1200),
        central: consultancyEur(1800),
        high: consultancyEur(2400),
      },
    }),
    emptyCostItem({
      label: 'Independent verification (user estimate)',
      scenario: 'ACTUAL',
      occurrence: 'ANNUAL',
      basis: 'PER_INSTALLATION',
      payer: 'PRODUCER',
      amount: { central: 5000 },
    }),
    emptyCostItem({
      label: 'Other reporting or administration',
      scenario: 'ACTUAL',
      occurrence: 'ANNUAL',
      basis: 'PER_REPORTING_PERIOD',
      payer: 'PRODUCER',
    }),
  ]);

  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [lastInput, setLastInput] = useState<CompareInput | null>(null);

  const cnOption = useMemo(() => CN_OPTIONS.find((o) => o.cn === cn) ?? null, [cn]);
  const variants = useMemo(() => variantsFor(country, cn), [country, cn]);
  const suggestedSefa = useMemo(
    () => suggestDefaultPathwaySefa(country, cn, importYear, variant || undefined),
    [country, cn, importYear, variant],
  );

  useEffect(() => {
    if (sefaManual) return;
    if (suggestedSefa.ok) {
      // Trim trailing zeros for display while keeping enough precision (e.g. 0.64935).
      setActualSefa(String(Number(suggestedSefa.sefa.toFixed(6))));
    } else {
      setActualSefa('');
    }
  }, [suggestedSefa, sefaManual]);

  function buildCompareInput() {
    const qty = Number(quantity);
    const prices: PriceAssumptions = {
      low: Number(priceLow) || 0,
      central: Number(priceCentral) || 0,
      high: Number(priceHigh) || 0,
    };
    if (importYear === 2026 && officialQ.trim() !== '') {
      const o = Number(officialQ);
      if (Number.isFinite(o) && o > 0) {
        prices.official2026 = { [importQuarter]: o };
      }
    }
    const other = otherImports.trim() === '' ? undefined : Number(otherImports);
    const line: ImportLine = {
      id: '1',
      cn,
      variant: variant || undefined,
      countryOfOrigin: country,
      importYear,
      importQuarter,
      quantity: qty,
      unit,
      actualSee: actualSee.trim() === '' ? undefined : Number(actualSee),
      actualSefa: actualSefa.trim() === '' ? undefined : Number(actualSefa),
      actualSource: actualSee.trim() === '' ? undefined : actualSource,
    };
    return {
      lines: [line],
      prices,
      priceCase,
      importer: {
        otherImportsTonnesByYear: {
          [importYear]: other != null && Number.isFinite(other) ? other : undefined,
        },
      },
      costItems: costItems.filter((c) => (c.amount.central ?? 0) > 0 || (c.amount.low ?? 0) > 0 || (c.amount.high ?? 0) > 0),
      view,
      costCase,
    };
  }

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setComparison(null);
    setLastInput(null);

    const qty = Number(quantity);
    if (!cn || !country || !Number.isFinite(qty) || qty <= 0) {
      setError('Enter a CN code, country of origin and a positive quantity.');
      return;
    }
    if (actualSee.trim() !== '' && actualSefa.trim() === '') {
      setError(
        "Enter the supplier's specific embedded free allocation (SEFA) for the actual-emissions scenario, or clear actual SEE.",
      );
      return;
    }

    const input = buildCompareInput();
    const result = compare(input);
    setLastInput(input);
    setComparison(result);
  };

  const sensRows = useMemo(() => (lastInput ? sensitivity(lastInput) : []), [lastInput]);

  const updateCostItem = (id: string, patch: Partial<CostItem>) => {
    setCostItems((items) => items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleExportJson = () => {
    if (!comparison || !lastInput) return;
    const payload = {
      ...buildExportPayload(lastInput, comparison),
      audience,
      audienceConclusion: conclusionForAudience(comparison, audience),
    };
    downloadText(`cbam-cost-comparison-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  };

  const handleExportCsv = () => {
    if (!comparison || !lastInput) return;
    const payload = buildExportPayload(lastInput, comparison);
    const extra = `\nmeta,audience,,,${audience}\nmeta,audienceConclusion,,,${JSON.stringify(conclusionForAudience(comparison, audience))}`;
    downloadText(
      `cbam-cost-comparison-${Date.now()}.csv`,
      `${toComparisonCsv(payload)}${extra}`,
      'text/csv;charset=utf-8',
    );
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
        <Toolbar sx={{ maxWidth: 1100, mx: 'auto', width: '100%', px: { xs: 2, md: 3 } }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ fontFamily: T.font.body, textTransform: 'none', color: T.color.inkSoft, mr: 1 }}
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

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 3 }, maxWidth: '1100px !important' }}>
        <Chip
          icon={<Calculate sx={{ fontSize: 16 }} />}
          label="Default values vs actual emissions"
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
          {audience === 'EXPORTER' ? 'Why measure real emissions?' : 'Is measuring worth it?'}
        </Typography>
        <Typography sx={{ color: T.color.muted, mb: 2, maxWidth: 720, lineHeight: 1.6 }}>
          {audience === 'EXPORTER'
            ? 'For non-EU exporters: compare what your EU buyer pays in CBAM certificates under official defaults versus your actual (verified) emissions — after the consultancy and verification costs you typically carry.'
            : 'For EU importers: compare total CBAM-related costs using official default values versus actual emissions plus calculation and verification costs.'}{' '}
          Same goods, quantities, origin and price assumptions in both scenarios.
        </Typography>

        <ToggleButtonGroup
          exclusive
          value={audience}
          onChange={handleAudience}
          sx={{
            mb: 3,
            bgcolor: T.color.warmWhite,
            border: `1px solid ${T.color.line}`,
            borderRadius: T.radius.pill,
            '& .MuiToggleButton-root': {
              fontFamily: T.font.body,
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1,
              border: 'none',
              borderRadius: `${T.radius.pill} !important`,
              color: T.color.inkSoft,
              '&.Mui-selected': {
                bgcolor: T.color.forest,
                color: '#fff',
                '&:hover': { bgcolor: T.color.ctaHover },
              },
            },
          }}
        >
          <ToggleButton value="EXPORTER">Non-EU exporter</ToggleButton>
          <ToggleButton value="IMPORTER">EU importer</ToggleButton>
        </ToggleButtonGroup>

        {audience === 'EXPORTER' && (
          <Box
            sx={{
              mb: 4,
              p: { xs: 2.5, md: 3 },
              bgcolor: T.color.mint,
              border: `1px solid ${T.color.mintDark}`,
              borderRadius: T.radius.lg,
            }}
          >
            <Typography sx={{ fontFamily: T.font.body, fontWeight: 700, color: T.color.ink, mb: 1.5 }}>
              Why actual emissions often beat defaults
            </Typography>
            <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5, color: T.color.inkSoft }}>
              {EXPORTER_WHY_ACTUALS.map((line) => (
                <Typography component="li" key={line.slice(0, 40)} sx={{ fontSize: '0.95rem', lineHeight: 1.55 }}>
                  {line}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

        <Box
          component="form"
          onSubmit={handleCompare}
          sx={{
            bgcolor: T.color.warmWhite,
            border: `1px solid ${T.color.line}`,
            borderRadius: T.radius.lg,
            p: { xs: 2.5, md: 3.5 },
          }}
        >
          <Stack spacing={2.5}>
            <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.inkSoft }}>
              Goods & period
            </Typography>

            <Autocomplete
              options={CN_OPTIONS}
              value={cnOption}
              onChange={(_, v) => {
                setCn(v?.cn ?? '');
                setVariant('');
              }}
              getOptionLabel={(o) => `${o.cn} — ${o.description}`}
              isOptionEqualToValue={(a, b) => a.cn === b.cn}
              renderInput={(params) => (
                <TextField {...params} label="CN code" required sx={textFieldSx} />
              )}
            />

            {variants.length > 0 && (
              <TextField
                select
                fullWidth
                label="Product variant (Annex I description)"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                sx={textFieldSx}
                helperText="Required when Annex I lists more than one row for this CN."
              >
                <MenuItem value="">Select variant</MenuItem>
                {variants.map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete
                sx={{ flex: 1 }}
                options={COUNTRIES}
                value={country}
                onChange={(_, v) => setCountry(v ?? '')}
                renderInput={(params) => (
                  <TextField {...params} label="Country of origin" required sx={textFieldSx} />
                )}
              />
              <TextField
                select
                sx={{ flex: 1, ...textFieldSx }}
                label="Import year"
                value={importYear}
                onChange={(e) => setImportYear(Number(e.target.value))}
              >
                {[2026, 2027, 2028, 2029, 2030].map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                sx={{ flex: 1, ...textFieldSx }}
                label="Import quarter"
                value={importQuarter}
                onChange={(e) => setImportQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)}
              >
                {[1, 2, 3, 4].map((q) => (
                  <MenuItem key={q} value={q}>
                    Q{q}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                required
                fullWidth
                type="number"
                label="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
                sx={textFieldSx}
              />
              <TextField
                select
                fullWidth
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as 't' | 'kg')}
                sx={textFieldSx}
              >
                <MenuItem value="t">tonnes</MenuItem>
                <MenuItem value="kg">kg</MenuItem>
              </TextField>
              <TextField
                fullWidth
                type="number"
                label="Other CBAM imports same year (t)"
                value={otherImports}
                onChange={(e) => setOtherImports(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
                sx={textFieldSx}
                helperText="Needed for the 50 t Art. 2a threshold when this line alone is ≤ 50 t."
              />
            </Stack>

            <Divider sx={{ borderColor: T.color.lineFaint }} />

            <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.inkSoft }}>
              Actual emissions scenario
            </Typography>
            <Typography sx={{ color: T.color.muted, fontSize: '0.9rem', mt: -1 }}>
              Official defaults are looked up from IR 2025/2621 for the selected CN and origin. Enter actual
              SEE and SEFA for the comparison pathway.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Actual SEE (t CO₂e / t)"
                value={actualSee}
                onChange={(e) => setActualSee(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
                sx={textFieldSx}
              />
              <TextField
                fullWidth
                type="number"
                label="Actual SEFA (t CO₂e / t)"
                value={actualSefa}
                onChange={(e) => {
                  setSefaManual(true);
                  setActualSefa(e.target.value);
                }}
                inputProps={{ min: 0, step: 'any' }}
                sx={textFieldSx}
                helperText={
                  suggestedSefa.ok
                    ? sefaManual
                      ? `Manual entry. Default-path suggestion for this CN/year: ${Number(suggestedSefa.sefa.toFixed(6))} (CBAM factor × CSCF × BMg).`
                      : `Prefilled with default-path SEFA ${Number(suggestedSefa.sefa.toFixed(6))} = ${suggestedSefa.cbamFactor} × ${suggestedSefa.cscf} × ${suggestedSefa.benchmark} (IR 2025/2620 Eq. 6). Planning only — replace with supplier-report SEFA when available.`
                    : suggestedSefa.reason
                }
              />
              <TextField
                select
                fullWidth
                label="Actual data source"
                value={actualSource}
                onChange={(e) => setActualSource(e.target.value as ActualDataSource)}
                sx={textFieldSx}
              >
                <MenuItem value="PRELIMINARY_ESTIMATE">Preliminary estimate</MenuItem>
                <MenuItem value="VERIFIED_SUPPLIER">Verified supplier data</MenuItem>
              </TextField>
            </Stack>
            {sefaManual && suggestedSefa.ok && (
              <Button
                onClick={() => setSefaManual(false)}
                sx={{ alignSelf: 'flex-start', textTransform: 'none', color: T.color.forest, fontFamily: T.font.body }}
              >
                Reset SEFA to default-path ({Number(suggestedSefa.sefa.toFixed(6))})
              </Button>
            )}

            {actualSource === 'PRELIMINARY_ESTIMATE' && actualSee.trim() !== '' && (
              <Alert severity="warning" sx={{ fontFamily: T.font.body }}>
                {PLANNING_LABEL}. Preliminary values are for scenario analysis only — not eligible for
                regulatory use until verification requirements are met.
              </Alert>
            )}

            <Divider sx={{ borderColor: T.color.lineFaint }} />

            <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.inkSoft }}>
              Certificate price assumptions (EUR / certificate)
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Low"
                value={priceLow}
                onChange={(e) => setPriceLow(e.target.value)}
                sx={textFieldSx}
              />
              <TextField
                fullWidth
                type="number"
                label="Central"
                value={priceCentral}
                onChange={(e) => setPriceCentral(e.target.value)}
                sx={textFieldSx}
              />
              <TextField
                fullWidth
                type="number"
                label="High"
                value={priceHigh}
                onChange={(e) => setPriceHigh(e.target.value)}
                sx={textFieldSx}
              />
              <TextField
                select
                fullWidth
                label="Price case"
                value={priceCase}
                onChange={(e) => setPriceCase(e.target.value as PriceCase)}
                sx={textFieldSx}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="central">Central</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </TextField>
            </Stack>
            {importYear === 2026 && (
              <TextField
                fullWidth
                type="number"
                label={`Official 2026 Q${importQuarter} certificate price (optional)`}
                value={officialQ}
                onChange={(e) => setOfficialQ(e.target.value)}
                sx={textFieldSx}
                helperText="If entered, overrides the low/central/high case for 2026 (Art. 21(1a))."
              />
            )}

            <Divider sx={{ borderColor: T.color.lineFaint }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.inkSoft, flex: 1 }}>
                Calculation, verification & admin costs (EUR)
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={view === 'COMBINED'}
                    onChange={(_, on) => setView(on ? 'COMBINED' : 'IMPORTER')}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: T.color.forest } }}
                  />
                }
                label={
                  <Typography sx={{ fontFamily: T.font.body, fontSize: '0.9rem' }}>
                    {audience === 'EXPORTER'
                      ? 'Include exporter verification costs (combined view)'
                      : 'Combined producer–importer view'}
                  </Typography>
                }
              />
              <TextField
                select
                size="small"
                label="Cost case"
                value={costCase}
                onChange={(e) => setCostCase(e.target.value as CostCase)}
                sx={{ minWidth: 120, ...textFieldSx }}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="central">Central</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </TextField>
            </Stack>
            <Typography sx={{ color: T.color.muted, fontSize: '0.85rem', mt: -1 }}>
              {audience === 'EXPORTER'
                ? 'Prefills treat consultancy and verification as paid by the producer/exporter. Use allocation share if one installation fee covers several customers. Costs with amount 0 are ignored.'
                : 'Enter your own estimates. Use allocation share to avoid double-counting installation-level fees across products or customers. Costs with amount 0 are ignored. Producer-only costs appear only in the combined view.'}
            </Typography>

            {costItems.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 2,
                  borderRadius: T.radius.md,
                  border: `1px solid ${T.color.lineFaint}`,
                  bgcolor: T.color.cream,
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      fullWidth
                      label="Cost label"
                      value={item.label}
                      onChange={(e) => updateCostItem(item.id, { label: e.target.value })}
                      sx={textFieldSx}
                    />
                    <IconButton
                      aria-label="Remove cost item"
                      onClick={() => setCostItems((items) => items.filter((i) => i.id !== item.id))}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Central €"
                      value={item.amount.central}
                      onChange={(e) =>
                        updateCostItem(item.id, {
                          amount: { ...item.amount, central: Number(e.target.value) || 0 },
                        })
                      }
                      sx={textFieldSx}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="Low €"
                      value={item.amount.low ?? ''}
                      onChange={(e) =>
                        updateCostItem(item.id, {
                          amount: {
                            ...item.amount,
                            low: e.target.value === '' ? undefined : Number(e.target.value) || 0,
                          },
                        })
                      }
                      sx={textFieldSx}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="High €"
                      value={item.amount.high ?? ''}
                      onChange={(e) =>
                        updateCostItem(item.id, {
                          amount: {
                            ...item.amount,
                            high: e.target.value === '' ? undefined : Number(e.target.value) || 0,
                          },
                        })
                      }
                      sx={textFieldSx}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      select
                      fullWidth
                      label="Scenario"
                      value={item.scenario}
                      onChange={(e) => updateCostItem(item.id, { scenario: e.target.value as CostScenario })}
                      sx={textFieldSx}
                    >
                      <MenuItem value="ACTUAL">Actual emissions path</MenuItem>
                      <MenuItem value="DEFAULT">Default values path</MenuItem>
                    </TextField>
                    <TextField
                      select
                      fullWidth
                      label="Occurrence"
                      value={item.occurrence}
                      onChange={(e) =>
                        updateCostItem(item.id, { occurrence: e.target.value as CostOccurrence })
                      }
                      sx={textFieldSx}
                    >
                      <MenuItem value="ONE_OFF">One-off (first year)</MenuItem>
                      <MenuItem value="ANNUAL">Annual / recurring</MenuItem>
                    </TextField>
                    <TextField
                      select
                      fullWidth
                      label="Basis"
                      value={item.basis}
                      onChange={(e) => updateCostItem(item.id, { basis: e.target.value as CostBasis })}
                      sx={textFieldSx}
                    >
                      <MenuItem value="PER_INSTALLATION">Per installation</MenuItem>
                      <MenuItem value="PER_REPORTING_PERIOD">Per reporting period</MenuItem>
                      <MenuItem value="PER_PRODUCT">Per product</MenuItem>
                      <MenuItem value="PER_SUPPLIER">Per supplier</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Count"
                      value={item.count}
                      onChange={(e) => updateCostItem(item.id, { count: Number(e.target.value) || 0 })}
                      sx={textFieldSx}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="Allocation share (0–1)"
                      value={item.allocationShare}
                      onChange={(e) =>
                        updateCostItem(item.id, { allocationShare: Number(e.target.value) || 0 })
                      }
                      inputProps={{ min: 0, max: 1, step: 0.01 }}
                      sx={textFieldSx}
                      helperText="e.g. 0.25 if this import is 25% of the installation volume covered by the fee"
                    />
                    <TextField
                      select
                      fullWidth
                      label="Who pays"
                      value={item.payer}
                      onChange={(e) => updateCostItem(item.id, { payer: e.target.value as CostPayer })}
                      sx={textFieldSx}
                    >
                      <MenuItem value="IMPORTER">Importer (direct)</MenuItem>
                      <MenuItem value="PASSED_ON">Passed on to importer</MenuItem>
                      <MenuItem value="PRODUCER">Producer (not passed on)</MenuItem>
                    </TextField>
                  </Stack>
                </Stack>
              </Box>
            ))}

            <Button
              startIcon={<Add />}
              onClick={() =>
                setCostItems((items) => [
                  ...items,
                  emptyCostItem({ label: 'Additional cost', scenario: 'ACTUAL' }),
                ])
              }
              sx={{ alignSelf: 'flex-start', textTransform: 'none', color: T.color.forest, fontFamily: T.font.body }}
            >
              Add cost item
            </Button>

            {error && (
              <Alert severity="error" sx={{ fontFamily: T.font.body }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              disableElevation
              endIcon={<East />}
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
              Compare costs
            </Button>
          </Stack>
        </Box>

        {comparison && (
          <Box
            sx={{
              mt: 4,
              bgcolor: T.color.warmWhite,
              border: `1px solid ${T.color.line}`,
              borderRadius: T.radius.lg,
              p: { xs: 2.5, md: 3.5 },
            }}
          >
            <Alert
              severity={comparison.netSavingFirstYear >= 0 && comparison.comparable ? 'success' : 'info'}
              sx={{ fontFamily: T.font.body, mb: 2 }}
            >
              {conclusionForAudience(comparison, audience)}
            </Alert>

            {!comparison.comparable && (
              <Alert severity="warning" sx={{ fontFamily: T.font.body, mb: 2 }}>
                {comparison.comparableNote}
              </Alert>
            )}

            {audience === 'EXPORTER' && comparison.comparable && view === 'IMPORTER' && (
              <Alert severity="info" sx={{ fontFamily: T.font.body, mb: 2 }}>
                Importer-only view hides producer-paid verification/consultancy. Turn on combined view to see
                your exporter cost burden against the buyer’s certificate saving.
              </Alert>
            )}

            <Typography sx={{ fontWeight: 700, color: T.color.ink, mb: 1 }}>
              {audience === 'EXPORTER' ? 'Cost comparison (exporter lens)' : 'Cost comparison'}
            </Typography>
            <Box sx={{ overflowX: 'auto', mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Cost component</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Official default values
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Actual emissions + verification
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>CBAM certificate cost</TableCell>
                    <TableCell align="right">{fmtEur(comparison.default.certificateCost)}</TableCell>
                    <TableCell align="right">{fmtEur(comparison.actual.certificateCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Emissions calculation / data prep (one-off)</TableCell>
                    <TableCell align="right">{fmtEur(comparison.default.oneOff)}</TableCell>
                    <TableCell align="right">{fmtEur(comparison.actual.oneOff)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Verification & other annual costs</TableCell>
                    <TableCell align="right">{fmtEur(comparison.default.annual)}</TableCell>
                    <TableCell align="right">{fmtEur(comparison.actual.annual)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Total estimated cost (first year)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {fmtEur(comparison.default.firstYearTotal)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {fmtEur(comparison.actual.firstYearTotal)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Recurring annual total</TableCell>
                    <TableCell align="right">{fmtEur(comparison.default.recurringTotal)}</TableCell>
                    <TableCell align="right">{fmtEur(comparison.actual.recurringTotal)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cost per tonne (first year)</TableCell>
                    <TableCell align="right">{fmtEur(comparison.default.costPerTonneFirstYear)}</TableCell>
                    <TableCell align="right">{fmtEur(comparison.actual.costPerTonneFirstYear)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>

            <Stack spacing={1} mb={3}>
              <Typography sx={{ color: T.color.inkSoft }}>
                {audience === 'EXPORTER'
                  ? 'Certificate cost for your EU buyer (default − actual): '
                  : 'Certificate-cost difference (default − actual): '}
                <strong>{fmtEur(comparison.certificateSaving)}</strong>
                {comparison.certificateSaving < 0 ? ' (actual path has higher certificate cost)' : ''}
              </Typography>
              <Typography sx={{ color: T.color.inkSoft }}>
                {audience === 'EXPORTER'
                  ? 'Your additional calculation / verification costs (first year): '
                  : 'Additional calculation / verification costs (first year): '}
                <strong>{fmtEur(comparison.additionalCostsFirstYear)}</strong>
              </Typography>
              <Typography sx={{ color: T.color.inkSoft }}>
                {audience === 'EXPORTER' ? 'Net effect first year (combined): ' : 'Net saving first year: '}
                <strong>
                  {comparison.netSavingFirstYear >= 0
                    ? fmtEur(comparison.netSavingFirstYear)
                    : `additional cost ${fmtEur(comparison.netSavingFirstYear)}`}
                </strong>
              </Typography>
              <Typography sx={{ color: T.color.inkSoft }}>
                {audience === 'EXPORTER' ? 'Net effect recurring: ' : 'Net saving recurring: '}
                <strong>
                  {comparison.netSavingRecurring >= 0
                    ? fmtEur(comparison.netSavingRecurring)
                    : `additional cost ${fmtEur(comparison.netSavingRecurring)}`}
                </strong>{' '}
                / year
              </Typography>
              <Typography sx={{ color: T.color.inkSoft }}>
                Break-even (first year): {comparison.breakEvenFirstYear.explanation}
                {comparison.breakEvenFirstYear.quantityTonnes != null && (
                  <> (~{fmtNum(comparison.breakEvenFirstYear.quantityTonnes, 1)} t)</>
                )}
              </Typography>
              <Typography sx={{ color: T.color.inkSoft }}>
                Break-even (recurring): {comparison.breakEvenRecurring.explanation}
              </Typography>
            </Stack>

            {sensRows.length > 0 && (
              <>
                <Typography sx={{ fontWeight: 700, color: T.color.ink, mb: 1 }}>Sensitivity</Typography>
                <Box sx={{ overflowX: 'auto', mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Assumption</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Net saving first year
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Net saving recurring
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sensRows.map((r) => (
                        <TableRow key={r.label}>
                          <TableCell>{r.label}</TableCell>
                          <TableCell align="right">{fmtEur(r.netSavingFirstYear)}</TableCell>
                          <TableCell align="right">{fmtEur(r.netSavingRecurring)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
              <Button
                startIcon={<Download />}
                onClick={handleExportCsv}
                sx={{ textTransform: 'none', color: T.color.forest, fontFamily: T.font.body }}
              >
                Export CSV
              </Button>
              <Button
                startIcon={<Download />}
                onClick={handleExportJson}
                sx={{ textTransform: 'none', color: T.color.forest, fontFamily: T.font.body }}
              >
                Export JSON
              </Button>
              <Button
                variant="contained"
                disableElevation
                onClick={() =>
                  navigate(
                    isLoggedIn ? '/dashboard/new-calculation' : '/login',
                    isLoggedIn ? undefined : { state: { from: '/dashboard/new-calculation' } },
                  )
                }
                sx={{
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
            </Stack>

            <Alert severity="warning" sx={{ fontFamily: T.font.body, fontSize: '0.85rem' }}>
              Screening estimate only. Default values and benchmarks come from IR (EU) 2025/2621 and
              2025/2620 extracts in this app. Foreign carbon-price deductions are not quantified (see open
              questions). CBAM factor / CSCF use Guidance Doc. No. 4 pending binding acts in the source
              folder. Not legal advice.
            </Alert>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default CostCalculator;
