import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
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
  calculate,
  compareByYear,
  sensitivity,
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
import { downloadComparisonPdf } from './costCalculator/pdfSummary.ts';
import ImportLineEditor from './costCalculator/ImportLineEditor.tsx';
import { draftToLine, newLineDraft, validateDraft, type LineDraft } from './costCalculator/lineDraft.ts';
import { scenarioLine, totals, type YearComparison } from './costCalculator/engine.ts';
import type {
  CostBasis,
  CostItem,
  CostOccurrence,
  CostPayer,
  CostScenario,
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

  const [drafts, setDrafts] = useState<LineDraft[]>(() => [
    newLineDraft({ cn: '2523 29 00', country: 'Serbia', quantity: '100' }),
  ]);
  /** Other CBAM imports (t) per year not entered as lines — needed for the Art. 2a threshold. */
  const [otherImports, setOtherImports] = useState<Record<number, string>>({ 2026: '0' });
  const importYears = useMemo(() => [...new Set(drafts.map((d) => d.importYear))].sort(), [drafts]);
  const has2026 = importYears.includes(2026);

  const updateDraft = (id: string, patch: Partial<LineDraft>) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const addDraft = () =>
    setDrafts((ds) => {
      const last = ds[ds.length - 1];
      return [...ds, newLineDraft(last ? { importYear: last.importYear, importQuarter: last.importQuarter } : {})];
    });
  const removeDraft = (id: string) => setDrafts((ds) => (ds.length > 1 ? ds.filter((d) => d.id !== id) : ds));

  const [priceLow, setPriceLow] = useState('60');
  const [priceCentral, setPriceCentral] = useState('80');
  const [priceHigh, setPriceHigh] = useState('100');
  const [priceCase, setPriceCase] = useState<PriceCase>('central');
  const [costCase, setCostCase] = useState<CostCase>('central');
  const [audience, setAudience] = useState<Audience>('EXPORTER');
  const [view, setView] = useState<CostView>('COMBINED');
  const [official2026, setOfficial2026] = useState<Record<1 | 2 | 3 | 4, string>>({ 1: '', 2: '', 3: '', 4: '' });

  const handleAudience = (_: React.MouseEvent<HTMLElement>, next: Audience | null) => {
    if (!next) return;
    setAudience(next);
    setView(next === 'EXPORTER' ? 'COMBINED' : 'IMPORTER');
    setFullInput(null);
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
      // No built-in verifier price (none in the sources): the user enters a quote.
      label: "Independent verification (enter your verifier's quote)",
      scenario: 'ACTUAL',
      occurrence: 'ANNUAL',
      basis: 'PER_INSTALLATION',
      payer: 'PRODUCER',
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
  /** Input of the last run (all lines, all years). */
  const [fullInput, setFullInput] = useState<CompareInput | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  // Each import year is compared on its own (certificates are surrendered per calendar year).
  const yearComparisons = useMemo(() => (fullInput ? compareByYear(fullInput) : []), [fullInput]);
  const selected = yearComparisons.find((y) => y.year === selectedYear) ?? yearComparisons[0] ?? null;
  const comparison: Comparison | null = selected?.comparison ?? null;
  const lastInput: CompareInput | null = selected?.input ?? null;

  function buildCompareInput(): CompareInput {
    const prices: PriceAssumptions = {
      low: Number(priceLow) || 0,
      central: Number(priceCentral) || 0,
      high: Number(priceHigh) || 0,
    };
    const off: Partial<Record<1 | 2 | 3 | 4, number>> = {};
    ([1, 2, 3, 4] as const).forEach((q) => {
      const o = Number(official2026[q]);
      if (official2026[q].trim() !== '' && Number.isFinite(o) && o > 0) off[q] = o;
    });
    if (has2026 && Object.keys(off).length) prices.official2026 = off;
    const otherByYear: Record<number, number | undefined> = {};
    importYears.forEach((y) => {
      const raw = (otherImports[y] ?? '').trim();
      const n = Number(raw);
      otherByYear[y] = raw !== '' && Number.isFinite(n) && n >= 0 ? n : undefined;
    });
    return {
      lines: drafts.map(draftToLine),
      prices,
      priceCase,
      importer: { otherImportsTonnesByYear: otherByYear },
      costItems: costItems.filter((c) => (c.amount.central ?? 0) > 0 || (c.amount.low ?? 0) > 0 || (c.amount.high ?? 0) > 0),
      view,
      costCase,
    };
  }

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFullInput(null);

    const problems = drafts.map(validateDraft).filter((p): p is string => p != null);
    if (problems.length) {
      setError(problems.join(' '));
      return;
    }

    const input = buildCompareInput();
    setFullInput(input);
    // Open on the first year that has actual data (that is where the comparison means something).
    const withActual = input.lines.filter((l) => l.actualSee != null).map((l) => l.importYear);
    setSelectedYear(Math.min(...(withActual.length ? withActual : input.lines.map((l) => l.importYear))));
  };

  const sensRows = useMemo(() => (lastInput ? sensitivity(lastInput) : []), [lastInput]);
  const lineResults = useMemo(
    () => (fullInput ? calculate(fullInput.lines, fullInput.prices, fullInput.priceCase, fullInput.importer) : []),
    [fullInput],
  );

  const conclusionFor = (y: YearComparison) => conclusionForAudience(y.comparison, audience, view);
  const audienceLabel = audience === 'EXPORTER' ? 'Non-EU exporter view' : 'EU importer view';

  const handleExportPdf = () => {
    if (!fullInput || !yearComparisons.length) return;
    downloadComparisonPdf(
      fullInput,
      yearComparisons.map((y) => ({ ...y, conclusion: conclusionFor(y) })),
      audienceLabel,
    );
  };

  const updateCostItem = (id: string, patch: Partial<CostItem>) => {
    setCostItems((items) => items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleExportJson = () => {
    if (!fullInput || !yearComparisons.length) return;
    const payload = { ...buildExportPayload(fullInput, yearComparisons, conclusionFor), audience: audienceLabel };
    downloadText(`cbam-cost-comparison-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  };

  const handleExportCsv = () => {
    if (!fullInput || !yearComparisons.length) return;
    const payload = buildExportPayload(fullInput, yearComparisons, conclusionFor);
    downloadText(
      `cbam-cost-comparison-${Date.now()}.csv`,
      toComparisonCsv(payload, [['audience', audienceLabel]]),
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
            ? 'For non-EU exporters: compare what your EU buyer pays in CBAM certificates under official defaults versus your actual (verified) emissions — after the calculation and verification costs you enter below.'
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
              Why actual emissions can be cheaper than defaults
            </Typography>
            <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5, color: T.color.inkSoft }}>
              {EXPORTER_WHY_ACTUALS.map((line) => (
                <Typography component="li" key={line.text.slice(0, 40)} sx={{ fontSize: '0.95rem', lineHeight: 1.55 }}>
                  {line.text}{' '}
                  <Typography component="span" sx={{ fontSize: '0.8rem', color: T.color.muted }}>
                    ({line.source})
                  </Typography>
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
              Import lines
            </Typography>
            <Typography sx={{ color: T.color.muted, fontSize: '0.9rem', mt: -1 }}>
              Add one line per product, origin and import period. Official defaults are looked up from IR 2025/2621
              for each line. Actual SEE and SEFA are optional per line; lines without them use default values in
              both scenarios.
            </Typography>

            {drafts.map((d, i) => (
              <ImportLineEditor
                key={d.id}
                index={i}
                draft={d}
                canRemove={drafts.length > 1}
                onChange={(patch) => updateDraft(d.id, patch)}
                onRemove={() => removeDraft(d.id)}
                fieldSx={textFieldSx}
                colors={{
                  line: T.color.line,
                  inkSoft: T.color.inkSoft,
                  muted: T.color.muted,
                  forest: T.color.forest,
                  cream: T.color.cream,
                }}
              />
            ))}
            <Button
              startIcon={<Add />}
              onClick={addDraft}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', color: T.color.forest, fontFamily: T.font.body }}
            >
              Add import line
            </Button>

            <Divider sx={{ borderColor: T.color.lineFaint }} />

            <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.inkSoft }}>
              Other CBAM imports by the same importer (50 t exemption)
            </Typography>
            <Typography sx={{ color: T.color.muted, fontSize: '0.9rem', mt: -1 }}>
              The 50 t threshold applies to the importer&rsquo;s total net mass of CBAM goods per calendar year, all CN
              codes together (hydrogen and electricity excluded). Enter imports not listed above. Leave empty if
              unknown: lines totalling 50 t or less will then show &ldquo;insufficient information&rdquo;.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {importYears.map((y) => (
                <TextField
                  key={y}
                  fullWidth
                  type="number"
                  label={`Other CBAM imports in ${y} (t)`}
                  value={otherImports[y] ?? ''}
                  onChange={(e) => setOtherImports((o) => ({ ...o, [y]: e.target.value }))}
                  inputProps={{ min: 0, step: 'any' }}
                  sx={textFieldSx}
                />
              ))}
            </Stack>

            <Divider sx={{ borderColor: T.color.lineFaint }} />

            <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, color: T.color.inkSoft }}>
              Certificate price assumptions (EUR / certificate)
            </Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
              Assumed prices for forecasting only — not official prices. Edit them to your own low, central and high
              view. Results using these prices are labelled “Forecast”.
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
            {has2026 && (
              <>
                <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
                  Official 2026 quarterly prices (optional). 2026 imports use the quarterly average price of the
                  quarter of importation (Art. 21(1a)). An entered price replaces the assumed price for that quarter.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {([1, 2, 3, 4] as const).map((q) => (
                    <TextField
                      key={q}
                      fullWidth
                      type="number"
                      label={`Official 2026 Q${q} price`}
                      value={official2026[q]}
                      onChange={(e) => setOfficial2026((o) => ({ ...o, [q]: e.target.value }))}
                      sx={textFieldSx}
                    />
                  ))}
                </Stack>
              </>
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
            {yearComparisons.length > 1 && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: T.color.ink, mb: 1 }}>Import year compared</Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={selected?.year ?? null}
                  onChange={(_, y: number | null) => y != null && setSelectedYear(y)}
                >
                  {yearComparisons.map((y) => (
                    <ToggleButton key={y.year} value={y.year} sx={{ textTransform: 'none', px: 2 }}>
                      {y.year}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <Typography sx={{ fontSize: '0.85rem', color: T.color.muted, mt: 1 }}>
                  Each import year is compared separately: certificates are surrendered per calendar year (Art. 22(1))
                  and the 50 t threshold is assessed per year (Art. 2a). One-off costs are counted once, in{' '}
                  {yearComparisons.find((y) => y.oneOffIncluded)?.year} (the first year with actual data); other
                  years show recurring costs.
                </Typography>
              </Box>
            )}
            <Alert
              severity={comparison.netSavingFirstYear >= 0 && comparison.comparable ? 'success' : 'info'}
              sx={{ fontFamily: T.font.body, mb: 2 }}
            >
              {conclusionForAudience(comparison, audience, view)}
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

            {lineResults.length > 0 && (
              <>
                <Typography sx={{ fontWeight: 700, color: T.color.ink, mb: 1 }}>Import lines</Typography>
                <Box sx={{ overflowX: 'auto', mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>CN / origin / period</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Mass (t)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Default values</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Actual emissions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineResults.map((r, i) => {
                        const cell = (s: ReturnType<typeof scenarioLine>, isActual: boolean) => (
                          <>
                            <Chip
                              size="small"
                              label={
                                isActual && !r.actualScenario
                                  ? 'no actual data — default used'
                                  : s.status.replace(/_/g, ' ').toLowerCase()
                              }
                              color={s.status === 'ESTIMATED' ? 'success' : s.status === 'EXEMPT' ? 'info' : s.status === 'OUT_OF_SCOPE' ? 'default' : 'warning'}
                              variant="outlined"
                            />
                            {s.status === 'ESTIMATED' && (
                              <Typography sx={{ fontSize: '0.85rem', mt: 0.5 }}>
                                {fmtNum(s.certificates, 3)} certificates · {fmtEur(s.certificateCost)}
                              </Typography>
                            )}
                            {s.reasons.map((reason) => (
                              <Typography key={reason} sx={{ fontSize: '0.78rem', color: T.color.muted, mt: 0.5 }}>
                                {reason}
                              </Typography>
                            ))}
                          </>
                        );
                        return (
                          <TableRow key={r.line.id} sx={{ verticalAlign: 'top' }}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>
                              {r.line.cn}
                              {r.line.variant ? ` (${r.line.variant})` : ''}
                              <br />
                              <Typography component="span" sx={{ fontSize: '0.8rem', color: T.color.muted }}>
                                {r.line.countryOfOrigin} · {r.line.importYear} Q{r.line.importQuarter}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{fmtNum(r.defaultScenario.massTonnes, 3)}</TableCell>
                            <TableCell>{cell(scenarioLine(r, 'DEFAULT'), false)}</TableCell>
                            <TableCell>{cell(scenarioLine(r, 'ACTUAL'), true)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>

                <Typography sx={{ fontWeight: 700, color: T.color.ink, mb: 1 }}>Annual summary (importer level)</Typography>
                <Box sx={{ overflowX: 'auto', mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Import year</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Lines mass (t)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Certificates (default)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Certificate cost (default)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Certificates (actual)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Certificate cost (actual)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...new Set(lineResults.map((r) => r.line.importYear))].sort().map((y) => {
                        const rs = lineResults.filter((r) => r.line.importYear === y);
                        const d = totals(rs, 'DEFAULT');
                        const a = totals(rs, 'ACTUAL');
                        const exempt = rs.some((r) => r.defaultScenario.status === 'EXEMPT');
                        const mass = rs.reduce((acc, r) => acc + r.defaultScenario.massTonnes, 0);
                        return (
                          <TableRow key={y}>
                            <TableCell>{y}</TableCell>
                            <TableCell align="right">{fmtNum(mass, 3)}</TableCell>
                            {/* Never show 0 where lines could not be estimated: missing data is not zero cost. */}
                            <TableCell align="right">{d.incomplete ? '—' : fmtNum(d.certificates, 3)}</TableCell>
                            <TableCell align="right">{d.incomplete ? '—' : fmtEur(d.certificateCost)}</TableCell>
                            <TableCell align="right">{a.incomplete ? '—' : fmtNum(a.certificates, 3)}</TableCell>
                            <TableCell align="right">{a.incomplete ? '—' : fmtEur(a.certificateCost)}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              {d.incomplete || a.incomplete
                                ? 'Incomplete — some lines could not be estimated'
                                : exempt
                                  ? 'Exempt lines included (≤ 50 t)'
                                  : 'Estimated'}
                              {(d.forecast || a.forecast) && ' · Forecast'}
                              {a.planning && ' · Planning (unverified actuals)'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </>
            )}

            {(comparison.default.totals.incomplete || comparison.actual.totals.incomplete) && (
              <Alert severity="warning" sx={{ mb: 2, fontFamily: T.font.body }}>
                Partial totals: the comparison below covers only lines that could be estimated. Lines marked
                “insufficient info” or “not implemented” are excluded, not counted as €0.
              </Alert>
            )}
            <Typography sx={{ fontWeight: 700, color: T.color.ink, mb: 1 }}>
              {audience === 'EXPORTER' ? 'Cost comparison (exporter lens)' : 'Cost comparison'}
              {selected ? ` — import year ${selected.year}` : ''}
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

            {lineResults.length > 0 && (
              <Box
                component="details"
                sx={{ mb: 3, border: `1px solid ${T.color.line}`, borderRadius: T.radius.sm, p: 2, fontFamily: T.font.body }}
              >
                <Box component="summary" sx={{ cursor: 'pointer', fontWeight: 700, color: T.color.ink }}>
                  Calculation steps and sources
                </Box>
                {lineResults.map((r) => (
                  <Box key={r.line.id} sx={{ mt: 2 }}>
                    <Typography sx={{ fontSize: '0.85rem', color: T.color.muted }}>Scope: {r.scopeNote}</Typography>
                    {r.thresholdNote && (
                      <Typography sx={{ fontSize: '0.85rem', color: T.color.muted }}>
                        Threshold: {r.thresholdNote}
                      </Typography>
                    )}
                    {(
                      [
                        ['Official default values', r.defaultScenario],
                        ['Actual emissions', r.actualScenario],
                      ] as const
                    ).map(([title, s]) =>
                      s ? (
                        <Box key={title} sx={{ mt: 1.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ fontWeight: 700, color: T.color.inkSoft }}>{title}</Typography>
                            <Chip size="small" label={s.status.replace(/_/g, ' ').toLowerCase()} />
                            {s.labels.map((l) => (
                              <Chip key={l} size="small" variant="outlined" label={l} />
                            ))}
                          </Stack>
                          {s.reasons.map((reason) => (
                            <Alert key={reason} severity="info" sx={{ mt: 1, fontSize: '0.85rem' }}>
                              {reason}
                            </Alert>
                          ))}
                          <Box component="ol" sx={{ pl: 3, my: 1 }}>
                            {s.steps.map((st, i) => (
                              <li key={i}>
                                <Typography component="span" sx={{ fontSize: '0.88rem', color: T.color.ink }}>
                                  {st.label}: <strong>{st.value}</strong>
                                </Typography>
                                {st.source && (
                                  <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>
                                    Source: {st.source}
                                  </Typography>
                                )}
                              </li>
                            ))}
                          </Box>
                        </Box>
                      ) : null,
                    )}
                  </Box>
                ))}
              </Box>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
              <Button
                startIcon={<Download />}
                onClick={handleExportPdf}
                sx={{ textTransform: 'none', color: T.color.forest, fontFamily: T.font.body }}
              >
                Export PDF summary
              </Button>
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
