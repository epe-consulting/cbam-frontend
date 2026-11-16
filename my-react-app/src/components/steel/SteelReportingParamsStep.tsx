import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { T } from './steelTheme';
import { IssueList, NavButtons, NumField, RowCard, SelectField, StepHeader } from './SteelUi';
import { questionMeta, type SteelStepProps } from './types';
import {
  CATEGORY_PARAMS, IS_Q, PARAM_LABELS, REDUCING_AGENTS, categoryLabel, checkNonNegative, checkPercent, newRowId,
  parseJsonRows, processLabel,
  type ParamField, type ProcessRow, type ReportingParamRow, type SteelCategory, type StepIssue,
} from '../../utils/steelSteps';

const HELP = 'Parametri se prenose uvozniku za CBAM deklaraciju (Prilog IV t. 2 Uredbe 2025/2547).';
const FIELD_ORDER: ParamField[] = [
  'redukciono_sredstvo', 'mn_posto', 'cr_posto', 'ni_posto', 'ostali_legirni_posto', 'c_posto', 'otpad_t_po_t', 'pre_consumer_otpad_posto',
];

interface Slot { key: string; process: ProcessRow; category: SteelCategory; rowKategorija: string }

function emptyRow(processId: string, kategorija: string): ReportingParamRow {
  return {
    row_id: newRowId(), process_id: processId, kategorija, redukciono_sredstvo: '', mn_posto: '', cr_posto: '',
    ni_posto: '', ostali_legirni_posto: '', c_posto: '', otpad_t_po_t: '', pre_consumer_otpad_posto: '',
  };
}

export function SteelReportingParamsStep({ data, questions, saving, saveError, onBack, onSubmit }: SteelStepProps) {
  const meta = questionMeta(questions, IS_Q.REPORTING_PARAM, 'Dodatni parametri za izvještaj (sektor željezo i čelik)', HELP);

  /** One slot per SINGLE process, one per covered category of a JOINT process (spec §5.4). */
  const slots = useMemo<Slot[]>(() => data.processes.flatMap((p) => {
    if (p.tip === 'JOINT') {
      return p.obuhvacene_kategorije.map((c) => ({ key: `${p.process_id}|${c}`, process: p, category: c as SteelCategory, rowKategorija: c }));
    }
    return p.kategorija ? [{ key: `${p.process_id}|`, process: p, category: p.kategorija as SteelCategory, rowKategorija: '' }] : [];
  }), [data.processes]);

  const [rows, setRows] = useState<Record<string, ReportingParamRow>>(() => {
    const stored = parseJsonRows<ReportingParamRow>(data.values[IS_Q.REPORTING_PARAM]);
    const out: Record<string, ReportingParamRow> = {};
    slots.forEach((s) => {
      const found = stored.find((r) => r.process_id === s.process.process_id && (s.rowKategorija === '' || r.kategorija === s.rowKategorija));
      out[s.key] = { ...emptyRow(s.process.process_id, s.rowKategorija), ...(found ?? {}), kategorija: s.rowKategorija };
    });
    return out;
  });

  const upd = (key: string, patch: Partial<ReportingParamRow>) => setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const { errors, warnings } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    slots.forEach((s) => {
      const r = rows[s.key];
      const req = CATEGORY_PARAMS[s.category] ?? {};
      const what = `${s.process.process_id}${s.rowKategorija ? ` (${categoryLabel(s.category)})` : ''}`;
      (Object.keys(req) as ParamField[]).forEach((f) => {
        if (f === 'redukciono_sredstvo') return;
        if (f === 'otpad_t_po_t') checkNonNegative(r[f], `${what}, ${PARAM_LABELS[f]}`, e);
        else checkPercent(r[f], `${what}, ${PARAM_LABELS[f]}`, e);
      });
      const missing = (Object.entries(req) as [ParamField, 'req' | 'opt'][])
        .filter(([f, level]) => level === 'req' && String(r[f] ?? '').trim() === '')
        .map(([f]) => PARAM_LABELS[f]);
      if (missing.length > 0) {
        w.push({ code: 'IS_W_REPORTING_PARAM_MISSING', message: `${what}: nedostaju obavezni parametri – ${missing.join(', ')}.` });
      }
    });
    return { errors: e, warnings: w };
  }, [rows, slots]);

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <StepHeader title={meta.label} help={meta.help} />
      <Typography sx={{ fontSize: '0.82rem', color: T.color.muted, mb: 2 }}>✱ = obavezno · ◇ = ako je poznato</Typography>
      {slots.map((s) => {
        const req = CATEGORY_PARAMS[s.category] ?? {};
        const fields = FIELD_ORDER.filter((f) => req[f]);
        const r = rows[s.key];
        return (
          <RowCard key={s.key} title={`${processLabel(s.process)} · ${categoryLabel(s.category)}`}>
            {fields.length === 0 && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={{ fontSize: '0.85rem', color: T.color.muted }}>Za ovu kategoriju nema dodatnih parametara.</Typography>
              </Box>
            )}
            {fields.map((f) => {
              const mark = req[f] === 'req' ? ' ✱' : ' ◇';
              if (f === 'redukciono_sredstvo') {
                return (
                  <SelectField key={f} label={`${PARAM_LABELS[f]}${mark}`} value={r.redukciono_sredstvo}
                    options={REDUCING_AGENTS.filter((o) => o.value !== 'UNKNOWN' || req[f] === 'opt')}
                    emptyLabel="—" onChange={(v) => upd(s.key, { redukciono_sredstvo: v })} />
                );
              }
              return (
                <NumField key={f} label={`${PARAM_LABELS[f]}${mark}`} value={r[f]} onChange={(v) => upd(s.key, { [f]: v })} />
              );
            })}
          </RowCard>
        );
      })}
      <IssueList errors={errors} warnings={warnings} />
      <NavButtons
        onBack={onBack}
        onNext={() => onSubmit({
          rows: {
            [IS_Q.REPORTING_PARAM]: slots
              .filter((s) => Object.keys(CATEGORY_PARAMS[s.category] ?? {}).length > 0)
              .map((s) => rows[s.key]),
          },
        })}
        nextDisabled={errors.length > 0}
        saving={saving}
        saveError={saveError}
      />
    </Box>
  );
}
