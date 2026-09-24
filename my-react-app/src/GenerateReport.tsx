import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from './utils/api';
import { useDashboardCalculations, type DashboardCalculationItem } from './Dashboard';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  Skeleton,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Radio,
  RadioGroup,
} from '@mui/material';
import {
  ArrowBack,
  ExpandMore,
  PictureAsPdf,
  CloudUpload,
  AutoAwesome,
} from '@mui/icons-material';
import { uploadReportToBlob } from './utils/blobStorage';

/* ─── Design tokens ─── */
const T = {
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  color: {
    forest: '#0B4F3E',
    forestLight: '#14785E',
    sage: '#3A7D6A',
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
    blue: '#2563EB',
    blueHover: '#1D4ED8',
  },
  radius: { sm: '8px', md: '14px', lg: '20px', pill: '999px' },
};

const sectionPaperSx = {
  borderRadius: T.radius.lg,
  border: `1px solid ${T.color.lineFaint}`,
  bgcolor: T.color.warmWhite,
  overflow: 'hidden' as const,
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: T.radius.sm, fontFamily: T.font.body },
  '& .MuiInputLabel-root': { fontFamily: T.font.body },
};

const readOnlyFieldSx = {
  ...textFieldSx,
  '& .MuiOutlinedInput-root': {
    borderRadius: T.radius.sm,
    fontFamily: T.font.body,
    bgcolor: T.color.mint,
  },
};

const tableHeadCellSx = {
  fontFamily: T.font.body,
  fontWeight: 600,
  fontSize: '0.8rem',
  letterSpacing: '0.03em',
  color: T.color.inkSoft,
  bgcolor: T.color.cream,
  borderBottom: `1px solid ${T.color.line}`,
  whiteSpace: 'nowrap' as const,
};

const tableCellSx = {
  fontFamily: T.font.body,
  fontSize: '0.88rem',
  color: T.color.ink,
  borderBottom: `1px solid ${T.color.lineFaint}`,
};

const accordionSx = {
  '&.MuiAccordion-root': {
    border: `1px solid ${T.color.lineFaint}`,
    borderRadius: `${T.radius.lg} !important`,
    bgcolor: T.color.warmWhite,
    boxShadow: 'none',
    mb: 2,
    overflow: 'hidden',
    '&::before': { display: 'none' },
    '&.Mui-expanded': { margin: '0 0 16px 0' },
  },
};

const accordionSummarySx = {
  fontFamily: T.font.body,
  '&:hover': { bgcolor: T.color.lineFaint },
  '& .MuiAccordionSummary-expandIconWrapper': { color: T.color.muted },
};

const sectionChipSx = {
  bgcolor: T.color.forest,
  color: '#fff',
  fontFamily: T.font.body,
  fontWeight: 700,
  fontSize: '0.75rem',
  mr: 1.5,
};

/** Electricity / indirect formula codes — excluded for Annex II (aluminium). */
const INDIRECT_FORMULA_CODES = new Set([
  'ALU_GRID_ELECTRICITY_EMISSIONS',
  'ALU_OWN_PLANT_ELECTRICITY_EMISSIONS',
  'ALU_PPA_ELECTRICITY_EMISSIONS',
  'ALU_PPA_ELECTRICITY_EMISSIONS_NO_EF',
]);

interface UserData {
  id: number;
  username: string;
  email: string;
  companyName: string;
  companyCountry: string;
  companyRegistrationNumber: string;
  companyContactPerson: string;
  companyId: number | null;
}

interface InstallationData {
  id: number;
  companyId: number;
  installationName: string;
  address: string;
  country: string;
  unLocode: string;
  latitude: number | null;
  longitude: number | null;
  cbamRegistryInstallationId: string;
}

interface ResultItem {
  id: number;
  formulaCode: string;
  outputCode: string | null;
  passCode: string | null;
  entryIndex: number | null;
  expression: string;
  inputSnapshot: string;
  resultValue: number;
  computedAt: string;
}

interface CalcResult {
  id: number;
  calculationId: number;
  totalEmissions: number | null;
  status: string;
  reportYear: number;
  computedAt: string;
  items: ResultItem[];
}

interface CalculationAnswerDetailRow {
  questionCode: string | null;
  answerValue: string | null;
  answerCode?: string | null;
  emissionFactorName?: string | null;
  passCode?: string | null;
}

interface ProductInfoSummary {
  productCategory: string | null;
  reportingPeriodFrom: string | null;
  reportingPeriodTo: string | null;
}

interface ProductRow {
  description: string;
  cnCode: string;
  productionRoute: string;
  quantity: string;
  countryOfOrigin: string;
  specificDirectEmbedded: string;
  shareDefaultValues: string;
  freeAllocation: string;
}

interface PrecursorRow {
  cnCode: string;
  name: string;
  countryOfOrigin: string;
  quantity: string;
  valueType: 'actual' | 'default' | '';
  specificDirectEmbedded: string;
  reportingPeriod: string;
  originOperator: string;
  originInstallation: string;
  originCbamId: string;
}

interface FuelRow {
  name: string;
  amount: string;
}

type YesNoUnknown = 'yes' | 'no' | 'unknown';

interface ManualReportFields {
  operatorAddressEn: string;
  cbamProcesses: string;
  nonCbamProcesses: string;
  topProcessMaterials: string;
  continuousMeasurement: string;
  zeroRatedFuels: YesNoUnknown;
  zeroRatedFuelsEvidence: string;
  measurableHeat: YesNoUnknown;
  measurableHeatInstallations: string;
  wasteGases: YesNoUnknown;
  wasteGasesInstallations: string;
  co2Transfer: YesNoUnknown;
  co2TransferContact: string;
  newInstallationMonths: string;
  dataQualityMethods: string;
  attributionMethod: string;
  freeAllocationMethodConfirm: boolean;
  benchmarksConfirm: boolean;
  declarationName: string;
  declarationPosition: string;
  declarationDate: string;
}

type ReportTab = 'full' | 'summary';

const emptyManual = (): ManualReportFields => ({
  operatorAddressEn: '',
  cbamProcesses: '',
  nonCbamProcesses: '',
  topProcessMaterials: '',
  continuousMeasurement: '',
  zeroRatedFuels: 'unknown',
  zeroRatedFuelsEvidence: '',
  measurableHeat: 'unknown',
  measurableHeatInstallations: '',
  wasteGases: 'unknown',
  wasteGasesInstallations: '',
  co2Transfer: 'unknown',
  co2TransferContact: '',
  newInstallationMonths: '',
  dataQualityMethods: '',
  attributionMethod: '',
  freeAllocationMethodConfirm: false,
  benchmarksConfirm: false,
  declarationName: '',
  declarationPosition: '',
  declarationDate: '',
});

const emptyProduct = (): ProductRow => ({
  description: '',
  cnCode: '',
  productionRoute: '',
  quantity: '',
  countryOfOrigin: '',
  specificDirectEmbedded: '',
  shareDefaultValues: '',
  freeAllocation: '',
});

const emptyPrecursor = (): PrecursorRow => ({
  cnCode: '',
  name: '',
  countryOfOrigin: '',
  quantity: '',
  valueType: '',
  specificDirectEmbedded: '',
  reportingPeriod: '',
  originOperator: '',
  originInstallation: '',
  originCbamId: '',
});

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtNum(n: number | null | undefined, digits = 4): string {
  if (n == null || Number.isNaN(n)) return '';
  return Number(n).toFixed(digits);
}

function parseNum(v: string | null | undefined): number | null {
  if (v == null || String(v).trim() === '') return null;
  const n = Number.parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function extractLatestAnswer(
  rows: CalculationAnswerDetailRow[],
  questionCode: string
): string | null {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row.questionCode === questionCode && row.answerValue != null && row.answerValue.trim() !== '') {
      return row.answerValue;
    }
  }
  return null;
}

function extractLatestAnswerCode(
  rows: CalculationAnswerDetailRow[],
  questionCode: string
): string | null {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row.questionCode === questionCode && row.answerCode) return row.answerCode;
  }
  return null;
}

function mapProductionRoute(methodCode: string | null, productTypeCode: string | null): string {
  const method =
    methodCode === 'PRIMARY' ? 'Primary'
      : methodCode === 'SECONDARY' ? 'Secondary'
        : methodCode === 'BOTH' ? 'Mixed (primary + secondary)'
          : '';
  const product =
    productTypeCode === 'UNWROUGHT_CN7601' ? 'Unwrought aluminium'
      : productTypeCode === 'ALU_PRODUCTS' ? 'Aluminium products'
        : '';
  if (method && product) return `${product} — ${method}`;
  return method || product || '';
}

function mapDataQuality(code: string | null): string {
  if (code === 'HAS_REAL_INPUTS') {
    return 'Embedded emissions determined from monitored activity data and calculation factors (actual values).';
  }
  if (code === 'HAS_EMISSIONS_ONLY') {
    return 'Operator-entered total emissions (direct values provided without full activity-data breakdown in the tool).';
  }
  return '';
}

function mapProductRows(rows: CalculationAnswerDetailRow[], defaultRoute: string): ProductRow[] {
  return rows
    .filter((row) => row.questionCode === 'CBAM_PRODUCT_ENTRY' && row.answerValue)
    .map((row) => {
      try {
        const parsed = JSON.parse(row.answerValue as string) as {
          product_name?: string;
          cn_code?: string;
          quantity?: string;
          country_of_origin?: string;
        };
        return {
          ...emptyProduct(),
          description: parsed.product_name ?? '',
          cnCode: parsed.cn_code ?? '',
          productionRoute: defaultRoute,
          quantity: parsed.quantity ?? '',
          countryOfOrigin: parsed.country_of_origin ?? '',
        };
      } catch {
        return null;
      }
    })
    .filter((row): row is ProductRow => row !== null)
    .filter((row) => row.description || row.cnCode || row.quantity || row.countryOfOrigin);
}

function mapPrecursorRows(rows: CalculationAnswerDetailRow[]): PrecursorRow[] {
  const out: PrecursorRow[] = [];
  for (const row of rows) {
    if (!row.answerValue) continue;
    if (row.questionCode === 'ALU_PRECURSOR_ENTRY') {
      try {
        const p = JSON.parse(row.answerValue) as {
          cn_code?: string;
          vrsta?: string;
          drzava?: string;
          kolicina?: string;
          emisije_poznate?: string;
          ugradjene_emisije?: string;
        };
        const known = p.emisije_poznate === 'YES';
        out.push({
          ...emptyPrecursor(),
          cnCode: p.cn_code ?? '',
          name: p.vrsta ?? '',
          countryOfOrigin: p.drzava ?? '',
          quantity: p.kolicina ?? '',
          valueType: known ? 'actual' : 'default',
          specificDirectEmbedded: known ? (p.ugradjene_emisije ?? '') : '10.49 (default kgCO₂e/kg)',
        });
      } catch {
        /* skip */
      }
    }
    if (row.questionCode === 'ALU_EXTERNAL_UNWROUGHT_ENTRY') {
      try {
        const p = JSON.parse(row.answerValue) as {
          drzava?: string;
          kolicina?: string;
          emisije_poznate?: string;
          ugradjene_emisije?: string;
        };
        const known = p.emisije_poznate === 'YES';
        out.push({
          ...emptyPrecursor(),
          cnCode: '7601',
          name: 'Purchased unwrought aluminium (external)',
          countryOfOrigin: p.drzava ?? '',
          quantity: p.kolicina ?? '',
          valueType: known ? 'actual' : 'default',
          specificDirectEmbedded: known ? (p.ugradjene_emisije ?? '') : '10.49 (default kgCO₂e/kg)',
        });
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

function mapTopFuels(rows: CalculationAnswerDetailRow[]): FuelRow[] {
  const fuels: FuelRow[] = [];
  for (const row of rows) {
    if (!row.emissionFactorName || !row.answerValue) continue;
    const code = row.questionCode ?? '';
    if (
      code.includes('FUEL') ||
      code === 'ALU_OWN_PLANT_CONSUMPTION_AMOUNT' ||
      code.includes('ANODES') ||
      code.includes('SODERBERG')
    ) {
      fuels.push({
        name: row.emissionFactorName,
        amount: row.answerValue,
      });
    }
  }
  // Also collect fuel answers without EF name (secondary fuel type labels)
  for (const row of rows) {
    if (row.questionCode?.includes('FUEL_TYPE') && row.answerValue) {
      fuels.push({ name: row.answerValue, amount: '' });
    }
  }
  const seen = new Set<string>();
  return fuels.filter((f) => {
    const key = `${f.name}|${f.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

function splitEmissions(items: ResultItem[]): { direct: number; indirect: number } {
  let direct = 0;
  let indirect = 0;
  for (const item of items) {
    const v = Number(item.resultValue) || 0;
    if (INDIRECT_FORMULA_CODES.has(item.formulaCode) || (item.outputCode ?? '').includes('ELECTRICITY')) {
      indirect += v;
    } else if (item.formulaCode === 'ALU_DIRECT_INDIRECT_SUM') {
      // Combined path — handled separately via answers
      direct += v;
    } else {
      direct += v;
    }
  }
  return { direct, indirect };
}

function yesNoLabel(v: YesNoUnknown): string {
  if (v === 'yes') return 'Yes';
  if (v === 'no') return 'No';
  return 'Not specified';
}

const GenerateReport: React.FC = () => {
  const navigate = useNavigate();
  const dashCtx = useDashboardCalculations();
  const calculations = dashCtx?.calculations ?? [];
  const calcsLoading = dashCtx?.calculationsLoading ?? true;

  const [reportTab, setReportTab] = useState<ReportTab>('full');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);

  const [selectedCalcId, setSelectedCalcId] = useState<number | ''>('');
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [answerRows, setAnswerRows] = useState<CalculationAnswerDetailRow[]>([]);

  const [installations, setInstallations] = useState<InstallationData[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<number | ''>('');

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const [productInfo, setProductInfo] = useState<ProductInfoSummary>({
    productCategory: null,
    reportingPeriodFrom: null,
    reportingPeriodTo: null,
  });

  const [producer, setProducer] = useState({
    legalName: '',
    registrationNumber: '',
    country: '',
    contactPerson: '',
  });
  const [installation, setInstallation] = useState({
    installationName: '',
    address: '',
    country: '',
    unLocode: '',
    coordinates: '',
    cbamRegistryId: '',
  });

  const [products, setProducts] = useState<ProductRow[]>([emptyProduct()]);
  const [precursors, setPrecursors] = useState<PrecursorRow[]>([]);
  const [topFuels, setTopFuels] = useState<FuelRow[]>([]);
  const [manual, setManual] = useState<ManualReportFields>(emptyManual());

  const [sectorParams, setSectorParams] = useState({
    scrapTonnes: '',
    preConsumerScrapPct: '',
    otherElementsPct: '',
  });

  const [toolDirectTotal, setToolDirectTotal] = useState<number | null>(null);
  const [toolIndirectTotal, setToolIndirectTotal] = useState<number | null>(null);
  const [directFromAnswer, setDirectFromAnswer] = useState<string | null>(null);
  const [productionRouteDefault, setProductionRouteDefault] = useState('');

  const isAluminium = (productInfo.productCategory ?? '').toLowerCase().includes('aluminium')
    || (productInfo.productCategory ?? '').toLowerCase().includes('aluminum');
  /** Aluminium is listed in Annex II → only direct emissions for CBAM. */
  const isAnnexII = isAluminium;

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const result = await apiRequest<{ success: boolean; user?: UserData }>('/users/me');
      if (result?.data?.success && result.data.user) {
        const u = result.data.user;
        setCompanyId(u.companyId);
        setProducer({
          legalName: u.companyName || '',
          country: u.companyCountry || '',
          registrationNumber: u.companyRegistrationNumber || '',
          contactPerson: u.companyContactPerson || '',
        });
        if (u.companyId) {
          const instRes = await apiRequest<{ success: boolean; installations?: InstallationData[] }>(
            `/installations/company/${u.companyId}`
          );
          if (instRes?.data?.success && Array.isArray(instRes.data.installations)) {
            setInstallations(instRes.data.installations);
          }
        }
      } else {
        setFetchError('Failed to load your profile.');
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!selectedInstId) {
      setInstallation({
        installationName: '', address: '', country: '', unLocode: '', coordinates: '', cbamRegistryId: '',
      });
      return;
    }
    const inst = installations.find((i) => i.id === selectedInstId);
    if (inst) {
      const coords = inst.latitude != null && inst.longitude != null
        ? `${inst.latitude}, ${inst.longitude}` : '';
      setInstallation({
        installationName: inst.installationName || '',
        address: inst.address || '',
        country: inst.country || '',
        unLocode: inst.unLocode || '',
        coordinates: coords,
        cbamRegistryId: inst.cbamRegistryInstallationId || '',
      });
      setManual((prev) => ({
        ...prev,
        operatorAddressEn: prev.operatorAddressEn || inst.address || '',
      }));
    }
  }, [selectedInstId, installations]);

  useEffect(() => {
    if (!selectedCalcId) {
      setCalcResult(null);
      setAnswerRows([]);
      setProductInfo({ productCategory: null, reportingPeriodFrom: null, reportingPeriodTo: null });
      setProducts([emptyProduct()]);
      setPrecursors([]);
      setTopFuels([]);
      setSectorParams({ scrapTonnes: '', preConsumerScrapPct: '', otherElementsPct: '' });
      setToolDirectTotal(null);
      setToolIndirectTotal(null);
      setDirectFromAnswer(null);
      setProductionRouteDefault('');
      return;
    }

    let cancelled = false;
    const fetchResult = async () => {
      setResultLoading(true);
      const [res, answersRes, productInfoRes] = await Promise.all([
        apiRequest<{ success: boolean; result?: CalcResult }>(`/calculations/${selectedCalcId}/result`),
        apiRequest<{ success: boolean; answers?: CalculationAnswerDetailRow[] }>(
          `/calculation-answers/detail/by-calculation?calculationId=${selectedCalcId}`
        ),
        apiRequest<{ success: boolean; productInfo?: ProductInfoSummary }>(
          `/calculation-answers/product-info/by-calculation?calculationId=${selectedCalcId}`
        ),
      ]);

      if (cancelled) return;

      const answers = answersRes?.data?.success && Array.isArray(answersRes.data.answers)
        ? answersRes.data.answers : [];
      setAnswerRows(answers);

      const methodCode = extractLatestAnswerCode(answers, 'ALU_UNWROUGHT_PRODUCTION_METHOD');
      const productTypeCode = extractLatestAnswerCode(answers, 'ALU_DECLARATION_PRODUCT');
      const dataQualityCode = extractLatestAnswerCode(answers, 'ALU_DATA_AVAILABILITY');
      const route = mapProductionRoute(methodCode, productTypeCode);
      setProductionRouteDefault(route);

      const mappedProducts = mapProductRows(answers, route);
      setProducts(mappedProducts.length > 0 ? mappedProducts : [emptyProduct()]);
      setPrecursors(mapPrecursorRows(answers));
      setTopFuels(mapTopFuels(answers));

      setSectorParams({
        scrapTonnes: extractLatestAnswer(answers, 'ALU_SCRAP_TONNES') ?? '',
        preConsumerScrapPct: extractLatestAnswer(answers, 'ALU_SCRAP_PRE_CONSUMER_PCT') ?? '',
        otherElementsPct: extractLatestAnswer(answers, 'ALU_OTHER_ELEMENTS_PCT') ?? '',
      });

      const directAns = extractLatestAnswer(answers, 'ALU_TOTAL_DIRECT_EMISSIONS');
      setDirectFromAnswer(directAns);

      setManual((prev) => ({
        ...prev,
        dataQualityMethods: prev.dataQualityMethods || mapDataQuality(dataQualityCode),
        cbamProcesses: prev.cbamProcesses || route,
      }));

      if (productInfoRes?.data?.success && productInfoRes.data.productInfo) {
        setProductInfo(productInfoRes.data.productInfo);
      } else {
        const cat = extractLatestAnswer(answers, 'CBAM_PRODUCT_CATEGORY');
        setProductInfo({
          productCategory: cat,
          reportingPeriodFrom: extractLatestAnswer(answers, 'CBAM_REPORTING_PERIOD_FROM'),
          reportingPeriodTo: extractLatestAnswer(answers, 'CBAM_REPORTING_PERIOD_TO'),
        });
      }

      if (res?.data?.success && res.data.result) {
        const result = res.data.result;
        setCalcResult(result);
        const split = splitEmissions(result.items ?? []);
        // Prefer explicit direct answer when on HAS_EMISSIONS_ONLY path
        const directAnsNum = parseNum(directAns);
        if (directAnsNum != null && answers.some((a) => a.questionCode === 'ALU_TOTAL_DIRECT_EMISSIONS')) {
          setToolDirectTotal(directAnsNum);
          const indirectAns = parseNum(extractLatestAnswer(answers, 'ALU_TOTAL_INDIRECT_EMISSIONS'));
          setToolIndirectTotal(indirectAns);
        } else {
          // If DIRECT_INDIRECT_SUM is the only item, don't double-count
          const hasSumOnly = (result.items ?? []).some((i) => i.formulaCode === 'ALU_DIRECT_INDIRECT_SUM')
            && (result.items ?? []).every((i) =>
              i.formulaCode === 'ALU_DIRECT_INDIRECT_SUM' || INDIRECT_FORMULA_CODES.has(i.formulaCode)
            );
          if (hasSumOnly && directAnsNum != null) {
            setToolDirectTotal(directAnsNum);
          } else {
            const withoutSum = (result.items ?? []).filter((i) => i.formulaCode !== 'ALU_DIRECT_INDIRECT_SUM');
            const s = splitEmissions(withoutSum.length ? withoutSum : result.items ?? []);
            setToolDirectTotal(s.direct || split.direct);
            setToolIndirectTotal(s.indirect || split.indirect);
          }
        }
      } else {
        setCalcResult(null);
        setToolDirectTotal(directAns != null ? parseNum(directAns) : null);
        setToolIndirectTotal(null);
      }

      setResultLoading(false);
    };

    fetchResult();
    return () => { cancelled = true; };
  }, [selectedCalcId]);

  /** Auto-fill specific direct embedded = direct total / quantity when possible. */
  useEffect(() => {
    if (toolDirectTotal == null) return;
    setProducts((prev) => {
      const withQty = prev.filter((p) => parseNum(p.quantity) != null && parseNum(p.quantity)! > 0);
      if (withQty.length === 0) return prev;
      // Single product: allocate full direct total
      if (withQty.length === 1) {
        return prev.map((p) => {
          const q = parseNum(p.quantity);
          if (q == null || q <= 0) return p;
          if (p.specificDirectEmbedded && p.specificDirectEmbedded.trim() !== '') return p;
          return { ...p, specificDirectEmbedded: fmtNum(toolDirectTotal / q) };
        });
      }
      // Multiple products: only fill if empty and we can use equal split by mass
      const totalQty = withQty.reduce((s, p) => s + (parseNum(p.quantity) ?? 0), 0);
      if (totalQty <= 0) return prev;
      return prev.map((p) => {
        const q = parseNum(p.quantity);
        if (q == null || q <= 0) return p;
        if (p.specificDirectEmbedded && p.specificDirectEmbedded.trim() !== '') return p;
        // Attribute proportionally by quantity (same SEE for all if one process)
        return { ...p, specificDirectEmbedded: fmtNum(toolDirectTotal / totalQty) };
      });
    });
  }, [toolDirectTotal, selectedCalcId]);

  const reportingPeriodText = useMemo(() => {
    const from = productInfo.reportingPeriodFrom;
    const to = productInfo.reportingPeriodTo;
    if (from && to) return `${from} – ${to}`;
    return from || to || 'N/A';
  }, [productInfo]);

  const reportingYear = calcResult?.reportYear
    ? String(calcResult.reportYear)
    : (productInfo.reportingPeriodFrom?.slice(0, 4) || new Date().getFullYear().toString());

  const setManualField = <K extends keyof ManualReportFields>(field: K, value: ManualReportFields[K]) => {
    setManual((prev) => ({ ...prev, [field]: value }));
  };

  const setProduct = (idx: number, field: keyof ProductRow, value: string) => {
    setProducts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const setPrecursor = (idx: number, field: keyof PrecursorRow, value: string) => {
    setPrecursors((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!producer.legalName) missing.push('Operator name');
    if (!producer.country) missing.push('Operator country');
    if (!installation.installationName) missing.push('Installation name');
    if (!installation.country) missing.push('Installation country');
    if (products.every((p) => !p.description && !p.cnCode)) missing.push('At least one good / product');
    if (!manual.declarationName) missing.push('Declaration: name');
    if (!manual.declarationDate) missing.push('Declaration: date');
    return missing;
  };

  const missingFields = getMissingFields();

  const buildReportHtml = (mode: ReportTab): string => {
    const title = mode === 'full'
      ? "Operator's Emissions Report (Annex IV §1.1)"
      : "Operator's Summary Emissions Report (Annex IV §1.2)";

    const productRowsHtml = products
      .filter((p) => p.description || p.cnCode || p.quantity)
      .map((p) => {
        const indirectCell = isAnnexII
          ? '<td colspan="1" style="color:#666;font-style:italic;">N/A (Annex II — aluminium: direct only)</td>'
          : `<td>—</td>`;
        return `<tr>
          <td>${esc(p.description)}</td>
          <td>${esc(p.cnCode)}</td>
          <td>${esc(p.productionRoute)}</td>
          <td>${esc(p.quantity)}</td>
          <td>${esc(p.countryOfOrigin)}</td>
          <td>${esc(p.specificDirectEmbedded)}</td>
          ${mode === 'full' || mode === 'summary' ? indirectCell : ''}
          <td>${esc(p.shareDefaultValues)}</td>
          <td>${esc(p.freeAllocation)}</td>
        </tr>`;
      })
      .join('');

    const precursorRowsHtml = precursors
      .filter((p) => p.cnCode || p.name || p.quantity)
      .map((p) => `<tr>
        <td>${esc(p.cnCode)}</td>
        <td>${esc(p.name)}</td>
        <td>${esc(p.countryOfOrigin)}</td>
        <td>${esc(p.quantity)}</td>
        <td>${esc(p.valueType)}</td>
        <td>${esc(p.specificDirectEmbedded)}${isAnnexII ? ' (direct)' : ''}</td>
        <td>${esc(p.reportingPeriod)}</td>
        <td>${esc(p.originOperator)} / ${esc(p.originInstallation)} / ${esc(p.originCbamId)}</td>
      </tr>`)
      .join('');

    const fuelRowsHtml = topFuels
      .map((f) => `<tr><td>${esc(f.name)}</td><td>${esc(f.amount)}</td></tr>`)
      .join('');

    const annexNote = isAnnexII
      ? `<p style="background:#E8F5EF;border:1px solid #C3E6D5;padding:10px 12px;border-radius:8px;color:#0B4F3E;">
          <strong>Annex II — Aluminium:</strong> Only direct emissions are taken into account for CBAM.
          Indirect (electricity) emissions are <em>not applicable</em> and are excluded from embedded emissions in this report.
          ${toolIndirectTotal != null && toolIndirectTotal > 0
            ? ` (Tool also computed ${fmtNum(toolIndirectTotal)} t CO₂e electricity-related figures for information only — not reported as CBAM embedded emissions.)`
            : ''}
        </p>`
      : '';

    const directTotalDisplay = toolDirectTotal != null ? `${fmtNum(toolDirectTotal)} t CO₂e` : 'N/A';

    const monitoringFull = mode === 'full' ? `
<h2>2. Monitoring plan summary</h2>
<div class="field"><span class="field-label">CBAM production processes / routes:</span> <span class="field-value">${esc(manual.cbamProcesses || productionRouteDefault)}</span></div>
<div class="field"><span class="field-label">Non-CBAM production processes:</span> <span class="field-value">${esc(manual.nonCbamProcesses || 'N/A')}</span></div>
<div class="field"><span class="field-label">Top process materials (by emissions):</span> <span class="field-value">${esc(manual.topProcessMaterials || 'N/A')}</span></div>
<div class="field"><span class="field-label">Continuous emissions measurement:</span> <span class="field-value">${esc(manual.continuousMeasurement || 'N/A')}</span></div>
<div class="field"><span class="field-label">Zero-rated fuels:</span> <span class="field-value">${esc(yesNoLabel(manual.zeroRatedFuels))}${manual.zeroRatedFuelsEvidence ? ` — ${esc(manual.zeroRatedFuelsEvidence)}` : ''}</span></div>
<div class="field"><span class="field-label">Measurable heat import/export:</span> <span class="field-value">${esc(yesNoLabel(manual.measurableHeat))}${manual.measurableHeatInstallations ? ` — ${esc(manual.measurableHeatInstallations)}` : ''}</span></div>
<div class="field"><span class="field-label">Waste gases:</span> <span class="field-value">${esc(yesNoLabel(manual.wasteGases))}${manual.wasteGasesInstallations ? ` — ${esc(manual.wasteGasesInstallations)}` : ''}</span></div>
<div class="field"><span class="field-label">CO₂ transfer / capture:</span> <span class="field-value">${esc(yesNoLabel(manual.co2Transfer))}${manual.co2TransferContact ? ` — ${esc(manual.co2TransferContact)}` : ''}</span></div>
${manual.newInstallationMonths ? `<div class="field"><span class="field-label">New installation monitoring period (months):</span> <span class="field-value">${esc(manual.newInstallationMonths)}</span></div>` : ''}
${topFuels.length ? `<p style="font-weight:600;margin-top:12px;">Top fuels used (from calculation tool)</p>
<table><thead><tr><th>Fuel / source stream</th><th>Amount</th></tr></thead><tbody>${fuelRowsHtml}</tbody></table>` : ''}
` : `
<h2>2. Production processes</h2>
<div class="field"><span class="field-label">CBAM production processes / routes:</span> <span class="field-value">${esc(manual.cbamProcesses || productionRouteDefault)}</span></div>
<div class="field"><span class="field-label">Zero-rated fuels:</span> <span class="field-value">${esc(yesNoLabel(manual.zeroRatedFuels))}</span></div>
<div class="field"><span class="field-label">Measurable heat import/export:</span> <span class="field-value">${esc(yesNoLabel(manual.measurableHeat))}</span></div>
<div class="field"><span class="field-label">Waste gases:</span> <span class="field-value">${esc(yesNoLabel(manual.wasteGases))}</span></div>
<div class="field"><span class="field-label">CO₂ capture / transfer:</span> <span class="field-value">${esc(yesNoLabel(manual.co2Transfer))}</span></div>
`;

    const methodsBlock = `
<h2>${mode === 'full' ? '4' : '4'}. Data quality & attribution</h2>
<div class="field"><span class="field-label">Methods / data quality:</span> <span class="field-value">${esc(manual.dataQualityMethods || 'N/A')}</span></div>
${mode === 'full' ? `<div class="field"><span class="field-label">How attributed emissions were calculated:</span> <span class="field-value">${esc(manual.attributionMethod || 'N/A')}</span></div>` : ''}
<div class="field"><span class="field-label">CBAM benchmarks used:</span> <span class="field-value">${manual.benchmarksConfirm ? 'Confirmed' : 'Not confirmed'}</span></div>
<div class="field"><span class="field-label">Free allocation method:</span> <span class="field-value">${manual.freeAllocationMethodConfirm ? 'Confirmed' : 'Not confirmed'}</span></div>
`;

    const sectorBlock = (sectorParams.scrapTonnes || sectorParams.preConsumerScrapPct || sectorParams.otherElementsPct) ? `
<h2>Sector-specific parameters (aluminium)</h2>
<div class="field"><span class="field-label">Tonnes scrap used per 1 t product:</span> <span class="field-value">${esc(sectorParams.scrapTonnes || 'N/A')}</span></div>
<div class="field"><span class="field-label">% pre-consumer scrap:</span> <span class="field-value">${esc(sectorParams.preConsumerScrapPct || 'N/A')}</span></div>
<div class="field"><span class="field-label">% elements other than Al (if &gt;1%):</span> <span class="field-value">${esc(sectorParams.otherElementsPct || 'N/A')}</span></div>
` : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { margin: 16mm 12mm; size: A4; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; line-height: 1.55; margin: 0; padding: 16px; }
  h1 { font-size: 20px; color: #0B4F3E; margin-bottom: 4px; border-bottom: 3px solid #0B4F3E; padding-bottom: 8px; }
  h2 { font-size: 14px; color: #0B4F3E; margin-top: 22px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 12px; }
  .field { margin-bottom: 5px; }
  .field-label { font-weight: 600; display: inline-block; min-width: 280px; vertical-align: top; }
  .field-value { border-bottom: 1px dotted #999; display: inline-block; min-width: 220px; padding-bottom: 1px; max-width: 55%; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; font-size: 11px; }
  th { background: #E8F5EF; font-weight: 600; color: #0B4F3E; }
  .sig-field { border-bottom: 1px solid #333; display: inline-block; min-width: 280px; margin-bottom: 6px; padding-bottom: 2px; }
</style></head><body>
<h1>${esc(title)}</h1>
<p class="subtitle">Regulation (EU) 2025/2547 — Annex IV<br>
Reporting period: ${esc(reportingPeriodText)} &middot; Report year: ${esc(reportingYear)}
${selectedCalcId ? ` &middot; Calculation #${selectedCalcId}` : ''}</p>
${annexNote}

<h2>1. Identification of the operator and the installation</h2>
<p style="font-weight:600;color:#555;">Operator</p>
<div class="field"><span class="field-label">Name:</span> <span class="field-value">${esc(producer.legalName)}</span></div>
<div class="field"><span class="field-label">Corporate / activity registration number:</span> <span class="field-value">${esc(producer.registrationNumber)}</span></div>
<div class="field"><span class="field-label">Full address (English):</span> <span class="field-value">${esc(manual.operatorAddressEn || installation.address)}</span></div>
<div class="field"><span class="field-label">Country:</span> <span class="field-value">${esc(producer.country)}</span></div>
<div class="field"><span class="field-label">Contact:</span> <span class="field-value">${esc(producer.contactPerson)}</span></div>

<p style="font-weight:600;color:#555;margin-top:12px;">Installation</p>
<div class="field"><span class="field-label">Name:</span> <span class="field-value">${esc(installation.installationName)}</span></div>
<div class="field"><span class="field-label">CBAM Registry installation ID:</span> <span class="field-value">${esc(installation.cbamRegistryId)}</span></div>
<div class="field"><span class="field-label">UN/LOCODE:</span> <span class="field-value">${esc(installation.unLocode)}</span></div>
<div class="field"><span class="field-label">Address (English):</span> <span class="field-value">${esc(installation.address)}</span></div>
<div class="field"><span class="field-label">Coordinates (main emission source):</span> <span class="field-value">${esc(installation.coordinates)}</span></div>
<div class="field"><span class="field-label">Country:</span> <span class="field-value">${esc(installation.country)}</span></div>

${monitoringFull}

<h2>3. Emissions &amp; goods</h2>
<div class="field"><span class="field-label">Total direct emissions of the installation:</span> <span class="field-value">${esc(directTotalDisplay)}</span></div>
${isAnnexII
    ? `<div class="field"><span class="field-label">Indirect emissions:</span> <span class="field-value">Not applicable (Annex II)</span></div>`
    : `<div class="field"><span class="field-label">Indirect emissions:</span> <span class="field-value">${toolIndirectTotal != null ? `${fmtNum(toolIndirectTotal)} t CO₂e` : 'N/A'}</span></div>`}

<p style="font-weight:600;margin-top:12px;">Goods produced — specific embedded emissions</p>
<table>
<thead><tr>
  <th>Good</th><th>CN</th><th>Route</th><th>Quantity (t)</th><th>Origin</th>
  <th>Specific direct (tCO₂e/t)</th>
  <th>Indirect</th>
  <th>Share default values</th>
  <th>Specific embedded free allocation</th>
</tr></thead>
<tbody>${productRowsHtml || '<tr><td colspan="9" style="text-align:center;color:#999;">No goods entered</td></tr>'}</tbody>
</table>

${precursors.length ? `
<p style="font-weight:600;margin-top:12px;">Precursors</p>
<table>
<thead><tr>
  <th>CN</th><th>Name</th><th>Origin</th><th>Quantity</th><th>Actual/Default</th>
  <th>Specific embedded</th><th>Reporting period</th><th>Origin operator / installation / ID</th>
</tr></thead>
<tbody>${precursorRowsHtml}</tbody>
</table>` : ''}

${sectorBlock}
${methodsBlock}

<h2>Declaration</h2>
<p>I confirm that the information in this ${mode === 'full' ? "operator's emissions report" : 'summary emissions report'} is accurate and complete for the reporting period indicated.</p>
<div class="field"><span class="field-label">Name:</span> <span class="sig-field">${esc(manual.declarationName)}</span></div>
<div class="field"><span class="field-label">Position:</span> <span class="sig-field">${esc(manual.declarationPosition)}</span></div>
<div class="field"><span class="field-label">Date:</span> <span class="sig-field">${esc(manual.declarationDate)}</span></div>
<div class="field"><span class="field-label">Signature:</span> <span class="sig-field"></span></div>
</body></html>`;
  };

  const handleDownloadPdf = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildReportHtml(reportTab));
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  const handleUploadReport = async () => {
    if (!companyId) {
      setUploadResult({ success: false, message: 'No company ID found for your account.' });
      return;
    }
    setUploading(true);
    setUploadResult(null);
    const html = buildReportHtml(reportTab);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const kind = reportTab === 'full' ? 'Operator-Emissions-Report' : 'Summary-Emissions-Report';
    const fileName = `CBAM-${kind}-${reportingYear}-${timestamp}.html`;
    const result = await uploadReportToBlob(companyId, fileName, html);
    if (result.success) {
      setUploadResult({ success: true, message: 'Report uploaded to cloud storage.' });
    } else {
      setUploadResult({ success: false, message: result.error || 'Upload failed.' });
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, fontFamily: T.font.body }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2, borderRadius: T.radius.sm }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: T.radius.lg }} />
      </Container>
    );
  }

  if (fetchError) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, fontFamily: T.font.body }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>{fetchError}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')}
          sx={{ fontFamily: T.font.body, textTransform: 'none', color: T.color.muted, borderRadius: T.radius.pill }}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const completedCalcs = calculations.filter((c) => c.status === 'COMPLETED');
  const showFullOnly = reportTab === 'full';

  return (
    <Container maxWidth="lg" sx={{ py: 3, fontFamily: T.font.body }}>
      <Box mb={3}>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: '18px !important' }} />}
          onClick={() => navigate('/dashboard')}
          sx={{
            mb: 2, fontFamily: T.font.body, fontWeight: 500, fontSize: '0.9rem',
            color: T.color.muted, textTransform: 'none', borderRadius: T.radius.pill,
            '&:hover': { bgcolor: T.color.mint, color: T.color.forest },
          }}
        >
          Back to Dashboard
        </Button>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' }, color: T.color.ink, letterSpacing: '-0.02em', mb: 0.5 }}>
          Generate CBAM Emissions Report
        </Typography>
        <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, lineHeight: 1.6 }}>
          Build the operator&apos;s emissions report and its summary (Regulation (EU) 2025/2547, Annex IV).
          Values from your calculation are filled automatically — only enter what the tool does not already capture.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 3 }}>
        <Tabs
          value={reportTab}
          onChange={(_, v: ReportTab) => setReportTab(v)}
          sx={{
            px: 2, pt: 1,
            '& .MuiTab-root': { fontFamily: T.font.body, textTransform: 'none', fontWeight: 600, color: T.color.muted },
            '& .Mui-selected': { color: `${T.color.forest} !important` },
            '& .MuiTabs-indicator': { bgcolor: T.color.forest },
          }}
        >
          <Tab value="full" label="Full operator's emissions report" />
          <Tab value="summary" label="Summary emissions report" />
        </Tabs>
        <Box sx={{ px: 3, pb: 2, pt: 1 }}>
          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted }}>
            {reportTab === 'full'
              ? 'Annex IV §1.1 — full report for the verifier (includes monitoring-plan detail and activity data).'
              : 'Annex IV §1.2 — summary shared with authorised CBAM declarants (commercially sensitive detail omitted).'}
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 }, mb: 3 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.15rem', color: T.color.ink, mb: 2.5 }}>
          Select calculation &amp; installation
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select fullWidth label="CBAM Calculation" value={selectedCalcId}
              onChange={(e) => setSelectedCalcId(e.target.value ? Number(e.target.value) : '')}
              disabled={calcsLoading}
              helperText={completedCalcs.length === 0 && !calcsLoading ? 'No completed calculations available' : 'Auto-fills emissions, goods, precursors, and Al sector parameters'}
              sx={textFieldSx}
            >
              <MenuItem value=""><em>— Select a calculation —</em></MenuItem>
              {calculations.map((c: DashboardCalculationItem) => (
                <MenuItem key={c.id} value={c.id}>
                  Calculation #{c.id} — {c.status} — {c.currentStep ?? 'N/A'}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select fullWidth label="Installation Site" value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value ? Number(e.target.value) : '')}
              helperText={installations.length === 0 ? 'No installations — add them in Settings' : ''}
              sx={textFieldSx}
            >
              <MenuItem value=""><em>— Select an installation —</em></MenuItem>
              {installations.map((inst) => (
                <MenuItem key={inst.id} value={inst.id}>
                  {inst.installationName || `Installation #${inst.id}`}{inst.country ? ` — ${inst.country}` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {(resultLoading || selectedCalcId) && (
            <Grid size={12}>
              {resultLoading && <Typography sx={{ fontFamily: T.font.body, color: T.color.muted }}>Loading calculation data…</Typography>}
              {!resultLoading && selectedCalcId && (
                <Box sx={{ p: 2.5, bgcolor: T.color.mint, borderRadius: T.radius.sm, border: `1px solid ${T.color.mintDark}` }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AutoAwesome sx={{ color: T.color.forest, fontSize: 18 }} />
                    <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.92rem', color: T.color.forest }}>
                      Auto-filled from tool
                    </Typography>
                  </Box>
                  <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.inkSoft }}>
                    Category: {productInfo.productCategory ?? '—'} · Period: {reportingPeriodText} · Year: {reportingYear}
                  </Typography>
                  <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.inkSoft }}>
                    Direct emissions (CBAM): {toolDirectTotal != null ? `${fmtNum(toolDirectTotal)} t CO₂e` : '—'}
                    {isAnnexII && (
                      <> · Indirect: <em>not applicable (Annex II)</em></>
                    )}
                    {!isAnnexII && toolIndirectTotal != null && (
                      <> · Indirect: {fmtNum(toolIndirectTotal)} t CO₂e</>
                    )}
                  </Typography>
                  {directFromAnswer && (
                    <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted, mt: 0.5 }}>
                      Direct total from answer ALU_TOTAL_DIRECT_EMISSIONS: {directFromAnswer}
                    </Typography>
                  )}
                  {isAnnexII && (
                    <Alert severity="info" sx={{ mt: 1.5, borderRadius: T.radius.sm, fontFamily: T.font.body, bgcolor: T.color.warmWhite }}>
                      Aluminium is listed in Annex II of Regulation (EU) 2023/956 — only direct emissions are reported.
                      Electricity-related figures from the tool are excluded from CBAM embedded emissions.
                    </Alert>
                  )}
                </Box>
              )}
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* 1. Operator & installation */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
          <Chip label="1" size="small" sx={sectionChipSx} />
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>
            Operator &amp; installation identification
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
          <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted, mb: 2 }}>
            Prefilled from your profile and selected installation. Add the English address if missing.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Operator name" value={producer.legalName}
                onChange={(e) => setProducer((p) => ({ ...p, legalName: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Registration number" value={producer.registrationNumber}
                onChange={(e) => setProducer((p) => ({ ...p, registrationNumber: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Country" value={producer.country}
                onChange={(e) => setProducer((p) => ({ ...p, country: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Contact person" value={producer.contactPerson}
                onChange={(e) => setProducer((p) => ({ ...p, contactPerson: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Full address in English (operator)" value={manual.operatorAddressEn}
                onChange={(e) => setManualField('operatorAddressEn', e.target.value)}
                helperText="Required by Annex IV — not always stored in the tool"
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
          </Grid>
          <Divider sx={{ my: 3, borderColor: T.color.lineFaint }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Installation name" value={installation.installationName}
                onChange={(e) => setInstallation((p) => ({ ...p, installationName: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="CBAM Registry installation ID" value={installation.cbamRegistryId}
                onChange={(e) => setInstallation((p) => ({ ...p, cbamRegistryId: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Address" value={installation.address}
                onChange={(e) => setInstallation((p) => ({ ...p, address: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="UN/LOCODE" value={installation.unLocode}
                onChange={(e) => setInstallation((p) => ({ ...p, unLocode: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Coordinates" value={installation.coordinates}
                onChange={(e) => setInstallation((p) => ({ ...p, coordinates: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 2. Monitoring / characterisation — mostly manual */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
          <Chip label="2" size="small" sx={sectionChipSx} />
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>
            Installation characterisation {showFullOnly ? '(monitoring plan)' : '(summary)'}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
            These fields are required by Annex IV and are not collected in the calculation wizard — please complete them here.
          </Alert>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth multiline minRows={2}
                label="CBAM production processes and routes"
                value={manual.cbamProcesses}
                onChange={(e) => setManualField('cbamProcesses', e.target.value)}
                helperText={productionRouteDefault ? `Suggested from tool: ${productionRouteDefault}` : undefined}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            {showFullOnly && (
              <>
                <Grid size={12}>
                  <TextField fullWidth multiline minRows={2}
                    label="Non-CBAM production processes at the installation"
                    value={manual.nonCbamProcesses}
                    onChange={(e) => setManualField('nonCbamProcesses', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth multiline minRows={2}
                    label="Top materials leading to process emissions (up to 5)"
                    value={manual.topProcessMaterials}
                    onChange={(e) => setManualField('topProcessMaterials', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth multiline minRows={2}
                    label="Continuous emissions measurement (GHGs & main sources), if any"
                    value={manual.continuousMeasurement}
                    onChange={(e) => setManualField('continuousMeasurement', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
                </Grid>
              </>
            )}
          </Grid>

          {topFuels.length > 0 && (
            <Box mt={2}>
              <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', color: T.color.muted, mb: 1 }}>
                Top fuels / source streams (from calculation)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={tableHeadCellSx}>Fuel / stream</TableCell>
                      <TableCell sx={tableHeadCellSx}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topFuels.map((f, i) => (
                      <TableRow key={i}>
                        <TableCell sx={tableCellSx}>{f.name}</TableCell>
                        <TableCell sx={tableCellSx}>{f.amount || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Divider sx={{ my: 3, borderColor: T.color.lineFaint }} />

          {([
            { key: 'zeroRatedFuels' as const, label: 'Zero-rated fuels used?', detail: 'zeroRatedFuelsEvidence' as const, detailLabel: 'How zero-rating is demonstrated' },
            { key: 'measurableHeat' as const, label: 'Measurable heat imported/exported?', detail: 'measurableHeatInstallations' as const, detailLabel: 'Other installations involved' },
            { key: 'wasteGases' as const, label: 'Waste gases produced/used/imported/exported?', detail: 'wasteGasesInstallations' as const, detailLabel: 'Other installations involved' },
            { key: 'co2Transfer' as const, label: 'CO₂ transfer / capture applies?', detail: 'co2TransferContact' as const, detailLabel: 'Receiving installation / contact' },
          ]).map((item) => (
            <Box key={item.key} mb={2}>
              <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', color: T.color.inkSoft, mb: 0.5 }}>
                {item.label}
              </Typography>
              <RadioGroup
                row
                value={manual[item.key]}
                onChange={(e) => setManualField(item.key, e.target.value as YesNoUnknown)}
              >
                <FormControlLabel value="yes" control={<Radio sx={{ color: T.color.muted, '&.Mui-checked': { color: T.color.forest } }} />}
                  label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem' }}>Yes</Typography>} />
                <FormControlLabel value="no" control={<Radio sx={{ color: T.color.muted, '&.Mui-checked': { color: T.color.forest } }} />}
                  label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem' }}>No</Typography>} />
                <FormControlLabel value="unknown" control={<Radio sx={{ color: T.color.muted, '&.Mui-checked': { color: T.color.forest } }} />}
                  label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem' }}>Not specified</Typography>} />
              </RadioGroup>
              {manual[item.key] === 'yes' && (
                <TextField fullWidth sx={{ ...textFieldSx, mt: 1 }} label={item.detailLabel}
                  value={manual[item.detail]}
                  onChange={(e) => setManualField(item.detail, e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              )}
            </Box>
          ))}

          {showFullOnly && (
            <TextField fullWidth sx={{ ...textFieldSx, mt: 1 }}
              label="New installation — monitoring period (months), if applicable"
              value={manual.newInstallationMonths}
              onChange={(e) => setManualField('newInstallationMonths', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} />
          )}

          {isAnnexII && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
              Points on electricity consumption for embedded <em>indirect</em> emissions (Annex IV §§9–12 / 15(e)) do not apply to aluminium (Annex II).
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* 3. Goods & emissions */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
          <Chip label="3" size="small" sx={sectionChipSx} />
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>
            Goods &amp; embedded emissions
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
          <Box sx={{ p: 2, mb: 2, bgcolor: T.color.cream, borderRadius: T.radius.sm, border: `1px solid ${T.color.lineFaint}` }}>
            <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.9rem', color: T.color.ink }}>
              Total direct emissions: {toolDirectTotal != null ? `${fmtNum(toolDirectTotal)} t CO₂e` : '—'}
            </Typography>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.82rem', color: T.color.muted }}>
              Specific direct embedded emissions are auto-calculated as direct total ÷ product quantity (tCO₂e/t) when quantity is available. Override if you need a different attribution.
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeadCellSx}>Good</TableCell>
                  <TableCell sx={tableHeadCellSx}>CN</TableCell>
                  <TableCell sx={tableHeadCellSx}>Route</TableCell>
                  <TableCell sx={tableHeadCellSx}>Qty (t)</TableCell>
                  <TableCell sx={tableHeadCellSx}>Origin</TableCell>
                  <TableCell sx={tableHeadCellSx}>Specific direct (tCO₂e/t)</TableCell>
                  <TableCell sx={tableHeadCellSx}>Indirect</TableCell>
                  <TableCell sx={tableHeadCellSx}>Share defaults %</TableCell>
                  <TableCell sx={tableHeadCellSx}>Free allocation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell sx={tableCellSx}>
                      <TextField variant="standard" fullWidth value={p.description}
                        onChange={(e) => setProduct(i, 'description', e.target.value)}
                        InputProps={{ sx: { fontFamily: T.font.body } }} />
                    </TableCell>
                    <TableCell sx={tableCellSx}>
                      <TextField variant="standard" fullWidth value={p.cnCode}
                        onChange={(e) => setProduct(i, 'cnCode', e.target.value)}
                        InputProps={{ sx: { fontFamily: T.font.body } }} />
                    </TableCell>
                    <TableCell sx={tableCellSx}>
                      <TextField variant="standard" fullWidth value={p.productionRoute}
                        onChange={(e) => setProduct(i, 'productionRoute', e.target.value)}
                        InputProps={{ sx: { fontFamily: T.font.body } }} />
                    </TableCell>
                    <TableCell sx={tableCellSx}>
                      <TextField variant="standard" fullWidth value={p.quantity} type="number"
                        onChange={(e) => {
                          const qty = e.target.value;
                          setProducts((prev) => {
                            const next = prev.map((row, idx) =>
                              idx === i ? { ...row, quantity: qty } : row
                            );
                            if (toolDirectTotal == null) return next;
                            const totalQty = next.reduce((s, row) => s + (parseNum(row.quantity) ?? 0), 0);
                            if (totalQty <= 0) return next;
                            return next.map((row) => {
                              const q = parseNum(row.quantity);
                              if (q == null || q <= 0) return row;
                              return { ...row, specificDirectEmbedded: fmtNum(toolDirectTotal / totalQty) };
                            });
                          });
                        }}
                        InputProps={{ sx: { fontFamily: T.font.body } }} />
                    </TableCell>
                    <TableCell sx={tableCellSx}>
                      <TextField variant="standard" fullWidth value={p.countryOfOrigin}
                        onChange={(e) => setProduct(i, 'countryOfOrigin', e.target.value)}
                        InputProps={{ sx: { fontFamily: T.font.body } }} />
                    </TableCell>
                    <TableCell sx={tableCellSx}>
                      <TextField variant="standard" fullWidth value={p.specificDirectEmbedded} type="number"
                        onChange={(e) => setProduct(i, 'specificDirectEmbedded', e.target.value)}
                        InputProps={{ sx: { fontFamily: T.font.body, bgcolor: T.color.mint } }} />
                    </TableCell>
                    <TableCell sx={tableCellSx}>
                      {isAnnexII ? (
                        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', fontStyle: 'italic', color: T.color.muted }}>
                          N/A
                        </Typography>
                      ) : (
                        <Typography sx={{ fontFamily: T.font.body, fontSize: '0.8rem', color: T.color.muted }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={tableCellSx}>
                      <TextField variant="standard" fullWidth value={p.shareDefaultValues}
                        onChange={(e) => setProduct(i, 'shareDefaultValues', e.target.value)}
                        placeholder="%"
                        InputProps={{ sx: { fontFamily: T.font.body } }} />
                    </TableCell>
                    <TableCell sx={tableCellSx}>
                      <TextField variant="standard" fullWidth value={p.freeAllocation}
                        onChange={(e) => setProduct(i, 'freeAllocation', e.target.value)}
                        InputProps={{ sx: { fontFamily: T.font.body } }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button size="small" onClick={() => setProducts((prev) => [...prev, emptyProduct()])}
            sx={{ mt: 1.5, fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', color: T.color.forest, borderRadius: T.radius.pill }}>
            + Add good
          </Button>

          <Divider sx={{ my: 3, borderColor: T.color.lineFaint }} />

          <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.92rem', color: T.color.muted, mb: 1.5 }}>
            Precursors {precursors.length ? '(from calculation — complete origin operator fields if needed)' : '(none in calculation — add if relevant)'}
          </Typography>
          {precursors.length === 0 ? (
            <Button size="small" onClick={() => setPrecursors([emptyPrecursor()])}
              sx={{ fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', color: T.color.forest }}>
              + Add precursor row
            </Button>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={tableHeadCellSx}>CN</TableCell>
                      <TableCell sx={tableHeadCellSx}>Name</TableCell>
                      <TableCell sx={tableHeadCellSx}>Origin</TableCell>
                      <TableCell sx={tableHeadCellSx}>Qty</TableCell>
                      <TableCell sx={tableHeadCellSx}>Type</TableCell>
                      <TableCell sx={tableHeadCellSx}>Specific embedded</TableCell>
                      <TableCell sx={tableHeadCellSx}>Period</TableCell>
                      <TableCell sx={tableHeadCellSx}>Origin operator</TableCell>
                      <TableCell sx={tableHeadCellSx}>Origin installation</TableCell>
                      <TableCell sx={tableHeadCellSx}>CBAM ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {precursors.map((p, i) => (
                      <TableRow key={i}>
                        {(['cnCode', 'name', 'countryOfOrigin', 'quantity'] as const).map((f) => (
                          <TableCell key={f} sx={tableCellSx}>
                            <TextField variant="standard" fullWidth value={p[f]}
                              onChange={(e) => setPrecursor(i, f, e.target.value)}
                              InputProps={{ sx: { fontFamily: T.font.body } }} />
                          </TableCell>
                        ))}
                        <TableCell sx={tableCellSx}>
                          <TextField variant="standard" select fullWidth value={p.valueType}
                            onChange={(e) => setPrecursor(i, 'valueType', e.target.value)}
                            InputProps={{ sx: { fontFamily: T.font.body } }}>
                            <MenuItem value="">—</MenuItem>
                            <MenuItem value="actual">Actual</MenuItem>
                            <MenuItem value="default">Default</MenuItem>
                          </TextField>
                        </TableCell>
                        <TableCell sx={tableCellSx}>
                          <TextField variant="standard" fullWidth value={p.specificDirectEmbedded}
                            onChange={(e) => setPrecursor(i, 'specificDirectEmbedded', e.target.value)}
                            InputProps={{ sx: { fontFamily: T.font.body } }} />
                        </TableCell>
                        <TableCell sx={tableCellSx}>
                          <TextField variant="standard" fullWidth value={p.reportingPeriod}
                            onChange={(e) => setPrecursor(i, 'reportingPeriod', e.target.value)}
                            InputProps={{ sx: { fontFamily: T.font.body } }} />
                        </TableCell>
                        {(['originOperator', 'originInstallation', 'originCbamId'] as const).map((f) => (
                          <TableCell key={f} sx={tableCellSx}>
                            <TextField variant="standard" fullWidth value={p[f]}
                              onChange={(e) => setPrecursor(i, f, e.target.value)}
                              InputProps={{ sx: { fontFamily: T.font.body } }} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button size="small" onClick={() => setPrecursors((prev) => [...prev, emptyPrecursor()])}
                sx={{ mt: 1.5, fontFamily: T.font.body, fontWeight: 600, textTransform: 'none', color: T.color.forest }}>
                + Add precursor
              </Button>
            </>
          )}
        </AccordionDetails>
      </Accordion>

      {/* 4. Aluminium sector params */}
      {isAluminium && (
        <Accordion defaultExpanded sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
            <Chip label="4" size="small" sx={sectionChipSx} />
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>
              Aluminium sector-specific parameters
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
            <Typography sx={{ fontFamily: T.font.body, fontSize: '0.85rem', color: T.color.muted, mb: 2 }}>
              Prefilled from additional questions in the calculation tool (Annex IV point 2).
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="Scrap tonnes per 1 t product" value={sectorParams.scrapTonnes}
                  onChange={(e) => setSectorParams((p) => ({ ...p, scrapTonnes: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="% pre-consumer scrap" value={sectorParams.preConsumerScrapPct}
                  onChange={(e) => setSectorParams((p) => ({ ...p, preConsumerScrapPct: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="% other elements (if >1%)" value={sectorParams.otherElementsPct}
                  onChange={(e) => setSectorParams((p) => ({ ...p, otherElementsPct: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }} sx={readOnlyFieldSx} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* 5. Methods */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
          <Chip label={isAluminium ? '5' : '4'} size="small" sx={sectionChipSx} />
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>
            Data quality, attribution &amp; free allocation
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth multiline minRows={2}
                label="Data quality and methods used"
                value={manual.dataQualityMethods}
                onChange={(e) => setManualField('dataQualityMethods', e.target.value)}
                helperText="Whether emissions are fully from monitoring or any defaults were used"
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            {showFullOnly && (
              <Grid size={12}>
                <TextField fullWidth multiline minRows={2}
                  label="How attributed direct emissions of each production process were calculated"
                  value={manual.attributionMethod}
                  onChange={(e) => setManualField('attributionMethod', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
              </Grid>
            )}
            <Grid size={12}>
              <FormControlLabel
                control={<Checkbox checked={manual.benchmarksConfirm}
                  onChange={(e) => setManualField('benchmarksConfirm', e.target.checked)}
                  sx={{ color: T.color.muted, '&.Mui-checked': { color: T.color.forest } }} />}
                label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.92rem' }}>
                  Confirmation that applicable CBAM benchmarks were used
                </Typography>} />
              <FormControlLabel
                control={<Checkbox checked={manual.freeAllocationMethodConfirm}
                  onChange={(e) => setManualField('freeAllocationMethodConfirm', e.target.checked)}
                  sx={{ color: T.color.muted, '&.Mui-checked': { color: T.color.forest } }} />}
                label={<Typography sx={{ fontFamily: T.font.body, fontSize: '0.92rem' }}>
                  Confirmation of methods used for specific embedded free allocation
                </Typography>} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 6. Declaration */}
      <Accordion defaultExpanded sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
          <Chip label={isAluminium ? '6' : '5'} size="small" sx={sectionChipSx} />
          <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>
            Declaration
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Name" value={manual.declarationName}
                onChange={(e) => setManualField('declarationName', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Position" value={manual.declarationPosition}
                onChange={(e) => setManualField('declarationPosition', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Date" type="date" value={manual.declarationDate}
                onChange={(e) => setManualField('declarationDate', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} sx={textFieldSx} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {answerRows.length > 0 && calcResult && showFullOnly && (
        <Accordion sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMore />} sx={accordionSummarySx}>
            <Chip label="A" size="small" sx={{ ...sectionChipSx, bgcolor: T.color.sage }} />
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.ink }}>
              Calculation breakdown (appendix — from tool)
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableHeadCellSx}>Formula</TableCell>
                    <TableCell sx={tableHeadCellSx}>Class</TableCell>
                    <TableCell sx={{ ...tableHeadCellSx, textAlign: 'right' }}>Result (t CO₂e)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(calcResult.items ?? []).map((item) => {
                    const isInd = INDIRECT_FORMULA_CODES.has(item.formulaCode)
                      || (item.outputCode ?? '').includes('ELECTRICITY');
                    return (
                      <TableRow key={item.id} sx={{ opacity: isAnnexII && isInd ? 0.55 : 1 }}>
                        <TableCell sx={tableCellSx}>{item.formulaCode}</TableCell>
                        <TableCell sx={tableCellSx}>
                          {isInd
                            ? (isAnnexII ? 'Indirect (excluded — Annex II)' : 'Indirect')
                            : 'Direct / attributed'}
                        </TableCell>
                        <TableCell sx={{ ...tableCellSx, textAlign: 'right' }}>
                          {fmtNum(Number(item.resultValue))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}

      <Paper elevation={0} sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 }, mt: 1 }}>
        {missingFields.length > 0 && (
          <Alert severity="warning" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
            <Typography sx={{ fontFamily: T.font.body, fontWeight: 600, fontSize: '0.88rem', mb: 0.5 }}>Missing fields:</Typography>
            {missingFields.map((f, i) => (
              <Typography key={i} sx={{ fontFamily: T.font.body, fontSize: '0.85rem' }}>• {f}</Typography>
            ))}
          </Alert>
        )}
      </Paper>

      <Box sx={{ mt: 3, mb: 1, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained" size="large" disableElevation startIcon={<PictureAsPdf />}
          onClick={handleDownloadPdf}
          sx={{
            py: 1.5, px: 5, fontFamily: T.font.body, fontWeight: 600, fontSize: '1rem', textTransform: 'none',
            bgcolor: T.color.forest, borderRadius: T.radius.pill,
            '&:hover': { bgcolor: T.color.ctaHover },
          }}
        >
          Download {reportTab === 'full' ? 'full' : 'summary'} PDF
        </Button>
        <Button
          variant="contained" size="large" disableElevation startIcon={<CloudUpload />}
          onClick={handleUploadReport} disabled={uploading || !companyId}
          sx={{
            py: 1.5, px: 5, fontFamily: T.font.body, fontWeight: 600, fontSize: '1rem', textTransform: 'none',
            bgcolor: T.color.blue, borderRadius: T.radius.pill,
            '&:hover': { bgcolor: T.color.blueHover },
          }}
        >
          {uploading ? 'Uploading…' : 'Upload report'}
        </Button>
      </Box>
      {uploadResult && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Alert severity={uploadResult.success ? 'success' : 'error'} sx={{ mt: 1, borderRadius: T.radius.sm, fontFamily: T.font.body }}>
            {uploadResult.message}
          </Alert>
        </Box>
      )}
    </Container>
  );
};

export default GenerateReport;
