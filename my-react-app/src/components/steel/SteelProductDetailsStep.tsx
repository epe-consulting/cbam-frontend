import { useMemo, useState } from 'react';
import {
  Autocomplete, Box, Dialog, DialogContent, DialogTitle, IconButton, TextField, Typography,
} from '@mui/material';
import { Close, InfoOutlined } from '@mui/icons-material';
import { T, textFieldSx } from './steelTheme';
import { AddButton, IssueList, NavButtons, NumField, RowCard, SelectField, TextInput } from './SteelUi';
import { checkCn } from './cnCheck';
import { CountrySelect } from '../CountrySelect';
import { useCountries } from '../../hooks/useCountries';
import { useIsCnMapping, useIsCnValidation, useIsExemptOrigins } from '../../hooks/useIronSteelRefData';
import type { ProductDetailEntry } from '../ProductDetailsStep';
import { categoryLabel, cnDigits, toNum, type StepIssue } from '../../utils/steelSteps';

export interface SteelProductDetailsStepProps {
  entries: ProductDetailEntry[];
  updateEntry: (index: number, updates: Partial<ProductDetailEntry>) => void;
  addEntry: () => void;
  removeEntry: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  saving?: boolean;
  saveError?: string | null;
}

/** CBAM_PRODUCT_DETAILS for iron & steel (spec §5.3): 8-digit CN, tonnes, CountrySelect, 7205 category. */
export function SteelProductDetailsStep({
  entries, updateEntry, addEntry, removeEntry, onBack, onNext, saving, saveError,
}: SteelProductDetailsStepProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { countries } = useCountries();
  const { exempt } = useIsExemptOrigins();
  const { rows: mapping, error: mappingError } = useIsCnMapping();
  const cnResults = useIsCnValidation(entries.map((e) => e.cnCode), false);
  const suggestions = useMemo(() => mapping.filter((m) => !m.precursorOnly), [mapping]);

  const { errors, warnings, pending } = useMemo(() => {
    const e: StepIssue[] = [];
    const w: StepIssue[] = [];
    let pend = false;
    entries.forEach((en, idx) => {
      const what = `Proizvod ${idx + 1}`;
      if (!en.productName.trim()) e.push({ code: '', message: `${what}: unesite naziv proizvoda.` });
      const chk = checkCn(en.cnCode, cnResults, what);
      if (chk.state === 'error') e.push(chk.issue);
      else if (chk.state === 'pending') pend = true;
      else if (chk.result.precursorOnly) {
        e.push({ code: 'IS_E_CN_NOT_CBAM_STEEL', message: `${what}: vodik (2804 10 00) se može unijeti samo kao prekursor, ne kao deklarisana roba.` });
      }
      const q = toNum(en.quantity);
      if (q == null || q <= 0) e.push({ code: 'IS_E_QTY', message: `${what}: količina (t) mora biti veća od 0.` });
      if (!en.countryOfOrigin) e.push({ code: '', message: `${what}: odaberite državu porijekla.` });
      else if (countries.find((c) => c.country === en.countryOfOrigin)?.isEu) {
        w.push({ code: 'IS_W_ORIGIN_EU', message: `${what}: roba porijeklom iz države članice EU – ugrađene emisije se ne obračunavaju (rezultat 0).` });
      } else if (exempt.countries.includes(en.countryOfOrigin)) {
        w.push({ code: 'IS_W_ORIGIN_EXEMPT', message: `${what}: roba porijeklom iz države izuzete iz CBAM-a – rezultat 0.` });
      }
    });
    return { errors: e, warnings: w, pending: pend };
  }, [entries, cnResults, countries, exempt]);

  return (
    <Box sx={{ fontFamily: T.font.body }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 600, fontSize: '1.2rem', color: T.color.ink, letterSpacing: '-0.02em' }}>
          Detalji proizvoda – željezo i čelik
        </Typography>
        <IconButton size="small" aria-label="Informacije o CN kodovima" onClick={() => setInfoOpen(true)} sx={{ color: T.color.forest }}>
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Box>
      <Typography sx={{ fontFamily: T.font.body, fontSize: '0.88rem', color: T.color.muted, mb: 2 }}>
        Unesite svaki proizvod s punim 8-cifrenim CN kodom, količinom u tonama i državom porijekla.
      </Typography>

      {entries.map((en, idx) => {
        const res = cnResults[cnDigits(en.cnCode)];
        const ambiguous = Boolean(res?.ok && res.ambiguous);
        return (
          <RowCard key={en.id} title={`Proizvod ${idx + 1}`} onRemove={entries.length > 1 ? () => removeEntry(idx) : undefined}>
            <TextInput label="Naziv proizvoda" required value={en.productName} onChange={(v) => updateEntry(idx, { productName: v })} />
            <Autocomplete
              freeSolo
              options={suggestions.map((m) => m.cnCode)}
              getOptionLabel={(o) => o}
              renderOption={(props, option) => {
                const m = suggestions.find((x) => x.cnCode === option);
                return (
                  <li {...props} key={option}>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem' }}>{option}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: T.color.muted }}>{categoryLabel(m?.category)}</Typography>
                    </Box>
                  </li>
                );
              }}
              inputValue={en.cnCode}
              onInputChange={(_, v) => updateEntry(idx, { cnCode: v })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  required
                  label="CN kod (8 cifara)"
                  helperText={res?.ok ? categoryLabel(ambiguous ? (en.aggregatedCategory || 'IRON_STEEL_PRODUCTS') : res.category) : 'npr. 7208 51 20'}
                  sx={textFieldSx}
                />
              )}
            />
            <NumField label="Količina (t)" required value={en.quantity} onChange={(v) => updateEntry(idx, { quantity: v })} />
            <CountrySelect
              label="Država porijekla"
              countries={countries}
              value={countries.find((c) => c.country === en.countryOfOrigin)?.id ?? null}
              onChange={(c) => updateEntry(idx, { countryOfOrigin: c?.country ?? '' })}
            />
            {ambiguous && (
              <SelectField
                label="Agregirana kategorija (7205)"
                value={en.aggregatedCategory || 'IRON_STEEL_PRODUCTS'}
                options={[
                  { value: 'IRON_STEEL_PRODUCTS', label: categoryLabel('IRON_STEEL_PRODUCTS') },
                  { value: 'PIG_IRON', label: categoryLabel('PIG_IRON') },
                ]}
                onChange={(v) => updateEntry(idx, { aggregatedCategory: v })}
              />
            )}
          </RowCard>
        );
      })}
      <AddButton label="Dodaj proizvod" onClick={addEntry} />
      <IssueList
        errors={errors}
        warnings={warnings}
        infos={[
          ...(pending ? ['Provjera CN kodova u toku…'] : []),
          ...(mappingError ? [`Lista CN kodova nije učitana (${mappingError}).`] : []),
        ]}
      />
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={errors.length > 0 || pending} saving={saving} saveError={saveError} />

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: T.font.display, fontWeight: 600, color: T.color.ink, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          CN kodovi – željezo i čelik
          <IconButton onClick={() => setInfoOpen(false)} size="small" aria-label="Zatvori"><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, mb: 2, fontSize: '0.9rem' }}>
            Kodovi s 4 ili 6 cifara obuhvataju sve 8-cifrene kodove koji počinju istim ciframa. Isključeni su ferosilicij i ostale navedene ferolegure (7202 2, 7202 30 00 …) te otpad i lom (7204).
          </Typography>
          <Box display="grid" gap={1}>
            {suggestions.map((m) => (
              <Box key={m.cnCode} sx={{ p: 1.25, border: `1px solid ${T.color.lineFaint}`, borderRadius: T.radius.sm, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1.5 }}>
                <Typography sx={{ fontFamily: T.font.body, fontWeight: 700, color: T.color.forest }}>{m.cnCode}</Typography>
                <Box>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.inkSoft, fontSize: '0.88rem' }}>{categoryLabel(m.category)}</Typography>
                  <Typography sx={{ fontFamily: T.font.body, color: T.color.muted, fontSize: '0.78rem' }}>{m.description}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
