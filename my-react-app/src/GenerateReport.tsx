import { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  ArrowBack,
  ExpandMore,
  PictureAsPdf,
  CloudUpload,
} from '@mui/icons-material';
import { uploadReportToBlob } from './utils/blobStorage';

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

interface ProductRow {
  description: string;
  cnCode: string;
  productionRoute: string;
  quantity: string;
  countryOfOrigin: string;
}

interface EmissionsRow {
  product: string;
  directEmissions: string;
  indirectEmissions: string;
  totalEmbedded: string;
}

interface QuantityRow {
  product: string;
  quantity: string;
  totalEmbeddedEmissions: string;
}

interface ReportData {
  reportingYear: string;
  producer: {
    legalName: string;
    registrationNumber: string;
    country: string;
    contactPerson: string;
  };
  installation: {
    installationName: string;
    address: string;
    country: string;
    unLocode: string;
    coordinates: string;
    cbamRegistryId: string;
  };
  products: ProductRow[];
  emissions: EmissionsRow[];
  quantities: QuantityRow[];
  verification: {
    verifierCompany: string;
    accreditationRef: string;
    verificationReportRef: string;
    verificationDate: string;
    reportAttached: boolean;
  };
  carbonPrice: {
    noPricePaid: boolean;
    pricePaid: boolean;
    schemeType: string;
    carbonPrice: string;
    emissionsCovered: string;
    totalAmountPaid: string;
    paymentEvidence: boolean;
    certificationAttached: boolean;
  };
  declaration: {
    name: string;
    position: string;
    date: string;
  };
}

const emptyProduct = (): ProductRow => ({
  description: '', cnCode: '', productionRoute: '', quantity: '', countryOfOrigin: '',
});

const emptyEmission = (): EmissionsRow => ({
  product: '', directEmissions: '', indirectEmissions: '', totalEmbedded: '',
});

const emptyQuantity = (): QuantityRow => ({
  product: '', quantity: '', totalEmbeddedEmissions: '',
});

const SECTION_COLOR = '#059669';

const GenerateReport: React.FC = () => {
  const navigate = useNavigate();
  const dashCtx = useDashboardCalculations();
  const calculations = dashCtx?.calculations ?? [];
  const calcsLoading = dashCtx?.calculationsLoading ?? true;

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);

  const [selectedCalcId, setSelectedCalcId] = useState<number | ''>('');
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [resultLoading, setResultLoading] = useState(false);

  const [installations, setInstallations] = useState<InstallationData[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<number | ''>('');

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const [data, setData] = useState<ReportData>({
    reportingYear: new Date().getFullYear().toString(),
    producer: { legalName: '', registrationNumber: '', country: '', contactPerson: '' },
    installation: { installationName: '', address: '', country: '', unLocode: '', coordinates: '', cbamRegistryId: '' },
    products: [emptyProduct()],
    emissions: [emptyEmission()],
    quantities: [emptyQuantity()],
    verification: { verifierCompany: '', accreditationRef: '', verificationReportRef: '', verificationDate: '', reportAttached: false },
    carbonPrice: { noPricePaid: false, pricePaid: false, schemeType: '', carbonPrice: '', emissionsCovered: '', totalAmountPaid: '', paymentEvidence: false, certificationAttached: false },
    declaration: { name: '', position: '', date: '' },
  });

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const result = await apiRequest<{ success: boolean; user?: UserData }>('/users/me');
      if (result?.data?.success && result.data.user) {
        const u = result.data.user;
        setCompanyId(u.companyId);
        setData(prev => ({
          ...prev,
          producer: {
            ...prev.producer,
            legalName: u.companyName || '',
            country: u.companyCountry || '',
            registrationNumber: u.companyRegistrationNumber || '',
            contactPerson: u.companyContactPerson || '',
          },
        }));
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
      setData(prev => ({
        ...prev,
        installation: { installationName: '', address: '', country: '', unLocode: '', coordinates: '', cbamRegistryId: '' },
      }));
      return;
    }
    const inst = installations.find(i => i.id === selectedInstId);
    if (inst) {
      const coords = inst.latitude != null && inst.longitude != null
        ? `${inst.latitude}, ${inst.longitude}` : '';
      setData(prev => ({
        ...prev,
        installation: {
          installationName: inst.installationName || '',
          address: inst.address || '',
          country: inst.country || '',
          unLocode: inst.unLocode || '',
          coordinates: coords,
          cbamRegistryId: inst.cbamRegistryInstallationId || '',
        },
      }));
    }
  }, [selectedInstId, installations]);

  useEffect(() => {
    if (!selectedCalcId) {
      setCalcResult(null);
      return;
    }
    let cancelled = false;
    const fetchResult = async () => {
      setResultLoading(true);
      const res = await apiRequest<{ success: boolean; result?: CalcResult }>(
        `/calculations/${selectedCalcId}/result`
      );
      if (!cancelled && res?.data?.success && res.data.result) {
        setCalcResult(res.data.result);
      } else if (!cancelled) {
        setCalcResult(null);
      }
      if (!cancelled) setResultLoading(false);
    };
    fetchResult();
    return () => { cancelled = true; };
  }, [selectedCalcId]);

  const set = <K extends keyof ReportData>(section: K) =>
    (field: keyof ReportData[K], value: ReportData[K][keyof ReportData[K]]) => {
      setData(prev => {
        const current = prev[section] as Record<string, unknown>;
        return { ...prev, [section]: { ...current, [field]: value } };
      });
    };

  const setProduct = (idx: number, field: keyof ProductRow, value: string) => {
    setData(prev => {
      const products = [...prev.products];
      products[idx] = { ...products[idx], [field]: value };
      return { ...prev, products };
    });
  };

  const setEmission = (idx: number, field: keyof EmissionsRow, value: string) => {
    setData(prev => {
      const emissions = [...prev.emissions];
      emissions[idx] = { ...emissions[idx], [field]: value };
      return { ...prev, emissions };
    });
  };

  const setQuantity = (idx: number, field: keyof QuantityRow, value: string) => {
    setData(prev => {
      const quantities = [...prev.quantities];
      quantities[idx] = { ...quantities[idx], [field]: value };
      return { ...prev, quantities };
    });
  };

  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!data.producer.legalName) missing.push('Producer: Legal name');
    if (!data.producer.country) missing.push('Producer: Country');
    if (!data.installation.installationName) missing.push('Installation: Name');
    if (!data.installation.country) missing.push('Installation: Country');
    if (data.products.every(p => !p.description)) missing.push('Products: At least one product');
    if (!data.declaration.name) missing.push('Declaration: Name');
    if (!data.declaration.date) missing.push('Declaration: Date');
    return missing;
  };

  const missingFields = getMissingFields();

  const buildReportHtml = (): string => {
    const productRows = data.products
      .filter(p => p.description || p.cnCode || p.quantity)
      .map(p => `<tr><td>${esc(p.description)}</td><td>${esc(p.cnCode)}</td><td>${esc(p.productionRoute)}</td><td>${esc(p.quantity)}</td><td>${esc(p.countryOfOrigin)}</td></tr>`)
      .join('');

    const emissionRows = data.emissions
      .filter(e => e.product || e.directEmissions)
      .map(e => `<tr><td>${esc(e.product)}</td><td>${esc(e.directEmissions)}</td><td>${esc(e.indirectEmissions)}</td><td>${esc(e.totalEmbedded)}</td></tr>`)
      .join('');

    const quantityRows = data.quantities
      .filter(q => q.product || q.quantity)
      .map(q => `<tr><td>${esc(q.product)}</td><td>${esc(q.quantity)}</td><td>${esc(q.totalEmbeddedEmissions)}</td></tr>`)
      .join('');

    const calcInfo = calcResult
      ? `<p style="margin-top:8px;color:#666;font-size:12px;">Calculation #${calcResult.calculationId} &mdash; Total Emissions: ${calcResult.totalEmissions != null ? Number(calcResult.totalEmissions).toFixed(4) : 'N/A'} t CO₂e &mdash; Report Year: ${calcResult.reportYear}</p>`
      : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CBAM Aluminium Disclosure</title>
<style>
  @page { margin: 20mm 15mm; size: A4; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #222; line-height: 1.6; margin: 0; padding: 20px; }
  h1 { font-size: 22px; color: #059669; margin-bottom: 4px; border-bottom: 3px solid #059669; padding-bottom: 8px; }
  h2 { font-size: 16px; color: #059669; margin-top: 28px; margin-bottom: 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 16px; }
  .field { margin-bottom: 6px; }
  .field-label { font-weight: 600; display: inline-block; min-width: 260px; }
  .field-value { border-bottom: 1px dotted #999; display: inline-block; min-width: 250px; padding-bottom: 1px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 12px; }
  th { background: #f0fdf4; font-weight: 600; color: #059669; }
  .checkbox { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #666; margin-right: 6px; vertical-align: middle; text-align: center; font-size: 11px; line-height: 14px; }
  .checked { background: #059669; color: white; }
  .sig-block { margin-top: 30px; }
  .sig-field { border-bottom: 1px solid #333; display: inline-block; min-width: 300px; margin-bottom: 8px; padding-bottom: 2px; }
</style></head><body>
<h1>CBAM ALUMINIUM DISCLOSURE</h1>
<p class="subtitle">Installation Operator → EU Authorised CBAM Declarant<br>Reporting Year: ${esc(data.reportingYear)}</p>
${calcInfo}

<h2>1. Producer & Installation Identification</h2>
<p style="font-weight:600;color:#555;margin-bottom:8px;">Producer (Operator)</p>
<div class="field"><span class="field-label">Legal name:</span> <span class="field-value">${esc(data.producer.legalName)}</span></div>
<div class="field"><span class="field-label">Registration number:</span> <span class="field-value">${esc(data.producer.registrationNumber)}</span></div>
<div class="field"><span class="field-label">Country:</span> <span class="field-value">${esc(data.producer.country)}</span></div>
<div class="field"><span class="field-label">Contact person (name / email):</span> <span class="field-value">${esc(data.producer.contactPerson)}</span></div>

<p style="font-weight:600;color:#555;margin-top:16px;margin-bottom:8px;">Installation (Production Site)</p>
<div class="field"><span class="field-label">Installation name:</span> <span class="field-value">${esc(data.installation.installationName)}</span></div>
<div class="field"><span class="field-label">Address:</span> <span class="field-value">${esc(data.installation.address)}</span></div>
<div class="field"><span class="field-label">Country:</span> <span class="field-value">${esc(data.installation.country)}</span></div>
<div class="field"><span class="field-label">UN/LOCODE:</span> <span class="field-value">${esc(data.installation.unLocode)}</span></div>
<div class="field"><span class="field-label">Coordinates (Lat / Long):</span> <span class="field-value">${esc(data.installation.coordinates)}</span></div>
<div class="field"><span class="field-label">CBAM Registry Installation ID:</span> <span class="field-value">${esc(data.installation.cbamRegistryId)}</span></div>

<h2>2. Products Supplied to EU Buyer</h2>
<table><thead><tr><th>Product Description</th><th>CN Code</th><th>Production Route</th><th>Quantity Supplied (t)</th><th>Country of Origin</th></tr></thead>
<tbody>${productRows || '<tr><td colspan="5" style="text-align:center;color:#999;">No products entered</td></tr>'}</tbody></table>

<h2>3. Embedded Emissions (Verified Values)</h2>
<p style="font-weight:600;color:#555;margin-bottom:8px;">Per Product – Specific Embedded Emissions</p>
<table><thead><tr><th>Product</th><th>Direct Emissions (tCO₂e/t)</th><th>Indirect Emissions (tCO₂e/t)</th><th>Total Embedded (tCO₂e/t)</th></tr></thead>
<tbody>${emissionRows || '<tr><td colspan="4" style="text-align:center;color:#999;">No emissions entered</td></tr>'}</tbody></table>

<p style="font-weight:600;color:#555;margin-top:16px;margin-bottom:8px;">Totals for Quantity Supplied</p>
<table><thead><tr><th>Product</th><th>Quantity (t)</th><th>Total Embedded Emissions (tCO₂e)</th></tr></thead>
<tbody>${quantityRows || '<tr><td colspan="3" style="text-align:center;color:#999;">No quantities entered</td></tr>'}</tbody></table>

<h2>4. Verification Statement</h2>
<div class="field"><span class="field-label">Verifier company:</span> <span class="field-value">${esc(data.verification.verifierCompany)}</span></div>
<div class="field"><span class="field-label">Accreditation reference:</span> <span class="field-value">${esc(data.verification.accreditationRef)}</span></div>
<div class="field"><span class="field-label">Verification report reference / ID:</span> <span class="field-value">${esc(data.verification.verificationReportRef)}</span></div>
<div class="field"><span class="field-label">Verification date:</span> <span class="field-value">${esc(data.verification.verificationDate)}</span></div>
<p style="margin:12px 0;font-style:italic;color:#555;">"The embedded emissions reported above have been verified in accordance with applicable CBAM verification requirements."</p>
<div><span class="checkbox${data.verification.reportAttached ? ' checked' : ''}">${data.verification.reportAttached ? '✓' : ''}</span> Verification report attached</div>

<h2>5. Carbon Price Paid in Country of Production</h2>
<div style="margin-bottom:8px;"><span class="checkbox${data.carbonPrice.noPricePaid ? ' checked' : ''}">${data.carbonPrice.noPricePaid ? '✓' : ''}</span> No carbon price paid</div>
<div style="margin-bottom:12px;"><span class="checkbox${data.carbonPrice.pricePaid ? ' checked' : ''}">${data.carbonPrice.pricePaid ? '✓' : ''}</span> Carbon price paid (details below)</div>
${data.carbonPrice.pricePaid ? `
<div class="field"><span class="field-label">Scheme type:</span> <span class="field-value">${esc(data.carbonPrice.schemeType)}</span></div>
<div class="field"><span class="field-label">Carbon price (€/tCO₂e):</span> <span class="field-value">${esc(data.carbonPrice.carbonPrice)}</span></div>
<div class="field"><span class="field-label">Emissions covered (tCO₂e):</span> <span class="field-value">${esc(data.carbonPrice.emissionsCovered)}</span></div>
<div class="field"><span class="field-label">Total amount paid:</span> <span class="field-value">${esc(data.carbonPrice.totalAmountPaid)}</span></div>
<div><span class="checkbox${data.carbonPrice.paymentEvidence ? ' checked' : ''}">${data.carbonPrice.paymentEvidence ? '✓' : ''}</span> Evidence of payment attached</div>
<div><span class="checkbox${data.carbonPrice.certificationAttached ? ' checked' : ''}">${data.carbonPrice.certificationAttached ? '✓' : ''}</span> Independent certification attached</div>
` : ''}

<h2>6. Declaration by Installation Operator</h2>
<p style="margin-bottom:16px;">I confirm that the information provided in this disclosure is accurate and complete for the reporting year indicated above.</p>
<div class="sig-block">
<div class="field"><span class="field-label">Name:</span> <span class="sig-field">${esc(data.declaration.name)}</span></div>
<div class="field"><span class="field-label">Position:</span> <span class="sig-field">${esc(data.declaration.position)}</span></div>
<div class="field"><span class="field-label">Date:</span> <span class="sig-field">${esc(data.declaration.date)}</span></div>
<div class="field"><span class="field-label">Signature:</span> <span class="sig-field"></span></div>
</div>

</body></html>`;
  };

  const handleDownloadPdf = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const html = buildReportHtml();
    w.document.write(html);
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

    const html = buildReportHtml();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `CBAM-Report-${data.reportingYear}-${timestamp}.html`;

    const result = await uploadReportToBlob(companyId, fileName, html);

    if (result.success) {
      setUploadResult({ success: true, message: `Report uploaded to cloud storage.` });
    } else {
      setUploadResult({ success: false, message: result.error || 'Upload failed.' });
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (fetchError) {
    return (
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </Container>
    );
  }

  const completedCalcs = calculations.filter(c => c.status === 'COMPLETED');

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Box mb={3}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Generate CBAM Report
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Fill in the details below and download a compliant CBAM Aluminium Disclosure PDF.
        </Typography>
      </Box>

      {/* Calculation & Installation selector */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Select Calculation & Installation
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              label="CBAM Calculation"
              value={selectedCalcId}
              onChange={e => setSelectedCalcId(e.target.value ? Number(e.target.value) : '')}
              disabled={calcsLoading}
              helperText={completedCalcs.length === 0 && !calcsLoading ? 'No completed calculations available' : ''}
            >
              <MenuItem value="">
                <em>— Select a calculation —</em>
              </MenuItem>
              {calculations.map((c: DashboardCalculationItem) => (
                <MenuItem key={c.id} value={c.id}>
                  Calculation #{c.id} — {c.status} — {c.currentStep ?? 'N/A'}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              label="Installation Site"
              value={selectedInstId}
              onChange={e => setSelectedInstId(e.target.value ? Number(e.target.value) : '')}
              helperText={installations.length === 0 ? 'No installations — add them in Settings' : ''}
            >
              <MenuItem value="">
                <em>— Select an installation —</em>
              </MenuItem>
              {installations.map(inst => (
                <MenuItem key={inst.id} value={inst.id}>
                  {inst.installationName || `Installation #${inst.id}`}{inst.country ? ` — ${inst.country}` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {(resultLoading || calcResult) && (
            <Grid size={12}>
              {resultLoading && <Typography color="text.secondary">Loading result...</Typography>}
              {calcResult && (
                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Total Emissions: {calcResult.totalEmissions != null ? Number(calcResult.totalEmissions).toFixed(4) : 'N/A'} t CO₂e
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Report Year: {calcResult.reportYear} &middot; Status: {calcResult.status}
                  </Typography>
                </Box>
              )}
            </Grid>
          )}
        </Grid>
      </Paper>

      <div>
        {/* Section 1: Producer & Installation */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Chip label="1" size="small" sx={{ bgcolor: SECTION_COLOR, color: 'white', mr: 1.5, fontWeight: 700 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Producer & Installation Identification</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
              Producer (Operator)
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Legal Name" value={data.producer.legalName}
                  onChange={e => set('producer')('legalName', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Registration Number" value={data.producer.registrationNumber}
                  onChange={e => set('producer')('registrationNumber', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Country" value={data.producer.country}
                  onChange={e => set('producer')('country', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Contact Person (name / email)" value={data.producer.contactPerson}
                  onChange={e => set('producer')('contactPerson', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
              Installation (Production Site)
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Installation Name" value={data.installation.installationName}
                  onChange={e => set('installation')('installationName', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Address" value={data.installation.address}
                  onChange={e => set('installation')('address', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Country" value={data.installation.country}
                  onChange={e => set('installation')('country', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="UN/LOCODE" value={data.installation.unLocode}
                  onChange={e => set('installation')('unLocode', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Coordinates (Lat / Long)" value={data.installation.coordinates}
                  onChange={e => set('installation')('coordinates', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  placeholder="e.g. 48.8566, 2.3522" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="CBAM Registry Installation ID" value={data.installation.cbamRegistryId}
                  onChange={e => set('installation')('cbamRegistryId', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Section 2: Products */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Chip label="2" size="small" sx={{ bgcolor: SECTION_COLOR, color: 'white', mr: 1.5, fontWeight: 700 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Products Supplied to EU Buyer</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Product Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>CN Code</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Production Route</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Quantity (t)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Country of Origin</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.products.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell><TextField variant="standard" fullWidth value={p.description} onChange={e => setProduct(i, 'description', e.target.value)} placeholder="e.g. Unwrought aluminium" /></TableCell>
                      <TableCell><TextField variant="standard" fullWidth value={p.cnCode} onChange={e => setProduct(i, 'cnCode', e.target.value)} placeholder="7601 10 00" /></TableCell>
                      <TableCell>
                        <TextField variant="standard" fullWidth select value={p.productionRoute} onChange={e => setProduct(i, 'productionRoute', e.target.value)}>
                          <MenuItem value=""><em>Select</em></MenuItem>
                          <MenuItem value="Primary">Primary</MenuItem>
                          <MenuItem value="Secondary">Secondary</MenuItem>
                          <MenuItem value="Mixed">Mixed</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell><TextField variant="standard" fullWidth value={p.quantity} onChange={e => setProduct(i, 'quantity', e.target.value)} type="number" /></TableCell>
                      <TableCell><TextField variant="standard" fullWidth value={p.countryOfOrigin} onChange={e => setProduct(i, 'countryOfOrigin', e.target.value)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button size="small" sx={{ mt: 1 }} onClick={() => setData(prev => ({ ...prev, products: [...prev.products, emptyProduct()] }))}>
              + Add Row
            </Button>
          </AccordionDetails>
        </Accordion>

        {/* Section 3: Embedded Emissions */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Chip label="3" size="small" sx={{ bgcolor: SECTION_COLOR, color: 'white', mr: 1.5, fontWeight: 700 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Embedded Emissions (Verified Values)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
              Per Product – Specific Embedded Emissions
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Direct Emissions (tCO₂e/t)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Indirect Emissions (tCO₂e/t)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Total Embedded (tCO₂e/t)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.emissions.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell><TextField variant="standard" fullWidth value={e.product} onChange={ev => setEmission(i, 'product', ev.target.value)} /></TableCell>
                      <TableCell><TextField variant="standard" fullWidth value={e.directEmissions} onChange={ev => setEmission(i, 'directEmissions', ev.target.value)} type="number" /></TableCell>
                      <TableCell><TextField variant="standard" fullWidth value={e.indirectEmissions} onChange={ev => setEmission(i, 'indirectEmissions', ev.target.value)} type="number" /></TableCell>
                      <TableCell><TextField variant="standard" fullWidth value={e.totalEmbedded} onChange={ev => setEmission(i, 'totalEmbedded', ev.target.value)} type="number" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button size="small" sx={{ mt: 1 }} onClick={() => setData(prev => ({ ...prev, emissions: [...prev.emissions, emptyEmission()] }))}>
              + Add Row
            </Button>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
              Totals for Quantity Supplied
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Quantity (t)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Total Embedded Emissions (tCO₂e)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.quantities.map((q, i) => (
                    <TableRow key={i}>
                      <TableCell><TextField variant="standard" fullWidth value={q.product} onChange={ev => setQuantity(i, 'product', ev.target.value)} /></TableCell>
                      <TableCell><TextField variant="standard" fullWidth value={q.quantity} onChange={ev => setQuantity(i, 'quantity', ev.target.value)} type="number" /></TableCell>
                      <TableCell><TextField variant="standard" fullWidth value={q.totalEmbeddedEmissions} onChange={ev => setQuantity(i, 'totalEmbeddedEmissions', ev.target.value)} type="number" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button size="small" sx={{ mt: 1 }} onClick={() => setData(prev => ({ ...prev, quantities: [...prev.quantities, emptyQuantity()] }))}>
              + Add Row
            </Button>
          </AccordionDetails>
        </Accordion>

        {/* Section 4: Verification Statement */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Chip label="4" size="small" sx={{ bgcolor: SECTION_COLOR, color: 'white', mr: 1.5, fontWeight: 700 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Verification Statement</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Verifier Company" value={data.verification.verifierCompany}
                  onChange={e => set('verification')('verifierCompany', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Accreditation Reference" value={data.verification.accreditationRef}
                  onChange={e => set('verification')('accreditationRef', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Verification Report Reference / ID" value={data.verification.verificationReportRef}
                  onChange={e => set('verification')('verificationReportRef', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Verification Date" type="date" value={data.verification.verificationDate}
                  onChange={e => set('verification')('verificationDate', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={12}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #e2e8f0', fontStyle: 'italic', color: '#555', mb: 2 }}>
                  "The embedded emissions reported above have been verified in accordance with applicable CBAM verification requirements."
                </Box>
                <FormControlLabel
                  control={<Checkbox checked={data.verification.reportAttached}
                    onChange={e => set('verification')('reportAttached', e.target.checked as never)} />}
                  label="Verification report attached" />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Section 5: Carbon Price */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Chip label="5" size="small" sx={{ bgcolor: SECTION_COLOR, color: 'white', mr: 1.5, fontWeight: 700 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Carbon Price Paid in Country of Production</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={<Checkbox checked={data.carbonPrice.noPricePaid}
                onChange={e => {
                  set('carbonPrice')('noPricePaid', e.target.checked as never);
                  if (e.target.checked) set('carbonPrice')('pricePaid', false as never);
                }} />}
              label="No carbon price paid" />
            <FormControlLabel
              control={<Checkbox checked={data.carbonPrice.pricePaid}
                onChange={e => {
                  set('carbonPrice')('pricePaid', e.target.checked as never);
                  if (e.target.checked) set('carbonPrice')('noPricePaid', false as never);
                }} />}
              label="Carbon price paid (details below)" />

            {data.carbonPrice.pricePaid && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Scheme Type" value={data.carbonPrice.schemeType}
                    onChange={e => set('carbonPrice')('schemeType', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    placeholder="ETS / Carbon Tax / Other" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Carbon Price (€/tCO₂e)" value={data.carbonPrice.carbonPrice}
                    onChange={e => set('carbonPrice')('carbonPrice', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }} type="number" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Emissions Covered (tCO₂e)" value={data.carbonPrice.emissionsCovered}
                    onChange={e => set('carbonPrice')('emissionsCovered', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }} type="number" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Total Amount Paid" value={data.carbonPrice.totalAmountPaid}
                    onChange={e => set('carbonPrice')('totalAmountPaid', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={12}>
                  <FormControlLabel
                    control={<Checkbox checked={data.carbonPrice.paymentEvidence}
                      onChange={e => set('carbonPrice')('paymentEvidence', e.target.checked as never)} />}
                    label="Evidence of payment attached" />
                  <FormControlLabel
                    control={<Checkbox checked={data.carbonPrice.certificationAttached}
                      onChange={e => set('carbonPrice')('certificationAttached', e.target.checked as never)} />}
                    label="Independent certification attached" />
                </Grid>
              </Grid>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Section 6: Declaration */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Chip label="6" size="small" sx={{ bgcolor: SECTION_COLOR, color: 'white', mr: 1.5, fontWeight: 700 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Declaration by Installation Operator</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              I confirm that the information provided in this disclosure is accurate and complete for the reporting year indicated above.
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="Name" value={data.declaration.name}
                  onChange={e => set('declaration')('name', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="Position" value={data.declaration.position}
                  onChange={e => set('declaration')('position', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="Date" type="date" value={data.declaration.date}
                  onChange={e => set('declaration')('date', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </div>

      {/* Reporting Year */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mt: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="Reporting Year" value={data.reportingYear}
              onChange={e => setData(prev => ({ ...prev, reportingYear: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }} type="number" />
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            {missingFields.length > 0 && (
              <Alert severity="warning" sx={{ mb: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Missing fields:</Typography>
                {missingFields.map((f, i) => (
                  <Typography key={i} variant="body2">• {f}</Typography>
                ))}
              </Alert>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Action buttons */}
      <Box sx={{ mt: 3, mb: 1, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<PictureAsPdf />}
          onClick={handleDownloadPdf}
          sx={{
            py: 1.5,
            px: 5,
            fontSize: '1.1rem',
            bgcolor: SECTION_COLOR,
            '&:hover': { bgcolor: '#047857' },
          }}
        >
          Download PDF
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUpload />}
          onClick={handleUploadReport}
          disabled={uploading || !companyId}
          sx={{
            py: 1.5,
            px: 5,
            fontSize: '1.1rem',
            bgcolor: '#2563eb',
            '&:hover': { bgcolor: '#1d4ed8' },
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Report'}
        </Button>
      </Box>
      {uploadResult && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Alert severity={uploadResult.success ? 'success' : 'error'} sx={{ mt: 1 }}>
            {uploadResult.message}
          </Alert>
        </Box>
      )}
      {!companyId && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Alert severity="info" sx={{ mt: 1 }}>
            Upload is unavailable — no company is associated with your account.
          </Alert>
        </Box>
      )}
    </Container>
  );
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default GenerateReport;
