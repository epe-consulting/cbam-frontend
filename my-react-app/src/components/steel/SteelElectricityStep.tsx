import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Divider, Typography } from '@mui/material';
import { T } from './steelTheme';
import { AddButton, CheckField, IssueList, NavButtons, NumField, RowCard, SelectField, StepHeader } from './SteelUi';
import { questionMeta, type SteelStepProps } from './types';
import { useCountries } from '../../hooks/useCountries';
import { getIsGridEf, type IsGridEf } from '../../api/ironSteel';
import {
  ELECTRICITY_SOURCES, IS_Q, checkNonNegative, checkPositive, newRowId, parseJsonRows, processCoversSinter, processLabel,
  type ElectricityRow, type StepIssue,
} from '../../utils/steelSteps';

const HELP = 'Indirektne emisije uračunavaju se samo za CN 2601 12 00. Za zajednički proces unesite samo potrošnju sinter/pelet postrojenja. Ako se struja dobija iz više izvora, unesite udjele izvora (ponderisani prosjek, čl. 9 Uredbe 2025/2547).';

export function SteelElectricityStep({ data, questions, saving, saveError, onBack, onSubmit }: SteelStepProps) {
  const meta = questionMeta(questions, IS_Q.ELECTRICITY, 'Potrošnja električne energije – samo za aglomeriranu rudu (sinter/pelete)', HELP);
  const { countries } = useCountries();
  const sinterProcesses = useMemo(() => data.processes.filter(processCoversSinter), [data.processes]);
  const sinterIds = useMemo(() => new Set(sinterProcesses.map((p) => p.process_id)), [sinterProcesses]);
  const storedRows = useMemo(() => parseJsonRows<ElectricityRow>(data.values[IS_Q.ELECTRICITY]), [data.values]);
  const ignoredCount = storedRows.filter((r) => !sinterIds.has(r.process_id)).length;

  const newRow = (processId: string): ElectricityRow => ({
    row_id: newRowId(), process_id: processId, mwh: '', izvor: 'GRID', drzava: data.installationCountry, ef: '', dokazi: false,
  });
  const [rows, setRows] = useState<ElectricityRow[]>(() => {
    const kept = storedRows.filter((r) => sinterIds.has(r.process_id)).map((r) => ({ ...newRow(r.process_id), ...r }));
    sinterProcesses.forEach((p) => {
      if (!kept.some((r) => r.process_id === p.process_id)) kept.push(newRow(p.process_id));
    });
    return kept;
  });

  const [gridEf, setGridEf] = useState<Record<string, IsGridEf | null>>({});
  const gridCountries = useMemo(
    () => [...new Set(rows.map((r) => r.drzava || data.installationCountry).filter(Boolean))],
    [rows, data.installationCountry],
  );
  const requestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    gridCountries.filter((c) => !requestedRef.current.has(c)).forEach((c) => {
      requestedRef.current.add(c);
      getIsGridEf(c).then((r) => setGridEf((prev) => ({ ...prev, [c]: r }))).catch(() => {});
    });
  }, [gridCountries]);

  const upd = (rowId: string, patch: Partial<ElectricityRow>) =>
    setRows((prev) => prev.map((r) => (r.row_id === rowId ? { ...r, ...patch } : r)));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    sinterProcesses.forEach((p) => {
      if (!rows.some((r) => r.process_id === p.process_id)) {
        e.push({ code: 'IS_E_SINTER_EL_MISSING', message: `Proces ${p.process_id}: proces aglomerirane rude mora imati potrošnju električne energije.` });
      }
    });
    rows.forEach((r, idx) => {
      const what = `Električna energija ${idx + 1} (${r.process_id})`;
      checkPositive(r.mwh, what, e);
      if (r.izvor === 'GRID') {
        if (!r.drzava && !data.installationCountry) e.push({ code: '', message: `${what}: odaberite državu mreže.` });
      } else {
        checkNonNegative(r.ef, `${what}, EF`, e, true);
        if (!r.dokazi) w.push({ code: 'IS_W_EL_NO_EVIDENCE', message: `${what}: bez dokaza se koristi zadani emisioni faktor mreže.` });
      }
    });
    return { errors: e, warnings: w };
  }, [rows, sinterProcesses, data.installationCountry]);

  const countryOptions = countries.map((c) => ({ value: c.country, label: c.country }));

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={meta.label} help={meta.help} />
      {sinterProcesses.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: T.radius.sm, fontFamily: T.font.body }}>
          Ovaj korak nije potreban za vaše procese.
          {ignoredCount > 0 && ` Ranije uneseni redovi (${ignoredCount}) se ne koriste i bit će uklonjeni.`}
        </Alert>
      ) : (
        sinterProcesses.map((p) => (
          <Box key={p.process_id} sx={{ mb: 3 }}>
            <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.05rem', color: T.color.forest, mb: 1 }}>
              {processLabel(p)}
            </Typography>
            {rows.filter((r) => r.process_id === p.process_id).map((r, idx) => {
              const country = r.drzava || data.installationCountry;
              const ef = gridEf[country];
              return (
                <RowCard key={r.row_id} title={`Izvor ${idx + 1}`} onRemove={() => setRows((prev) => prev.filter((x) => x.row_id !== r.row_id))}>
                  <NumField label="Potrošnja (MWh)" required value={r.mwh} onChange={(v) => upd(r.row_id, { mwh: v })} />
                  <SelectField label="Izvor električne energije" value={r.izvor} options={ELECTRICITY_SOURCES}
                    onChange={(v) => upd(r.row_id, { izvor: v, ...(v === 'GRID' ? { ef: '', dokazi: false } : {}) })} />
                  <SelectField label="Država mreže" value={r.drzava} options={countryOptions} emptyLabel="Država postrojenja"
                    onChange={(v) => upd(r.row_id, { drzava: v })} />
                  {r.izvor !== 'GRID' && (
                    <>
                      <NumField label="Stvarni EF (t CO2/MWh)" required value={r.ef} onChange={(v) => upd(r.row_id, { ef: v })} />
                      <CheckField label="Dokazi za verifikatora su dostupni" checked={r.dokazi} onChange={(v) => upd(r.row_id, { dokazi: v })} />
                    </>
                  )}
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    {ef && (
                      <Typography sx={{ fontSize: '0.78rem', color: T.color.muted }}>
                        Zadani EF mreže ({ef.country}): {ef.efTPerMwh} t CO2/MWh{ef.fallbackUsed ? ' – država nije u tabeli, koristi se „Other countries and territories“' : ''} · {ef.source}
                      </Typography>
                    )}
                  </Box>
                </RowCard>
              );
            })}
            <AddButton label="Dodaj izvor električne energije" onClick={() => setRows((prev) => [...prev, newRow(p.process_id)])} />
            <Divider sx={{ mt: 1, borderColor: T.color.lineFaint }} />
          </Box>
        ))
      )}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({ rows: { [IS_Q.ELECTRICITY]: rows } })}
        nextDisabled={errors.length > 0}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
