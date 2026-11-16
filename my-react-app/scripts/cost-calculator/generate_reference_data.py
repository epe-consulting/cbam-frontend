"""
Generate hardcoded reference data for the frontend CBAM cost calculator.

Sources (all in docs/cbam-sources):
  * OJ-L-202502621-Default-values.pdf  - Implementing Regulation (EU) 2025/2621,
    Annex I (default values per country, pp. 4-2354).
  * OJ-L-202502620.pdf                 - Implementing Regulation (EU) 2025/2620,
    Annex point 5.3 (CBAM benchmarks, Column A and Column B, pp. 10-65).
  * Default-values-Bosnia-and-other-countries.xlsx - Commission workbook v1
    (4 Feb 2026); used ONLY for cross-checking, never as a value source.

Outputs:
  * src/costCalculator/data/defaultValues.ts
  * src/costCalculator/data/benchmarks.ts
  * src/costCalculator/DATA_VALIDATION.md

Usage (needs PyMuPDF + openpyxl):
  python -I generate_reference_data.py <docs/cbam-sources dir> <my-react-app dir>
"""
import json
import re
import sys
from collections import Counter, defaultdict

import fitz  # PyMuPDF
import openpyxl

SRC, APP = sys.argv[1], sys.argv[2]
PDF_2621 = f"{SRC}/OJ-L-202502621-Default-values.pdf"
PDF_2620 = f"{SRC}/OJ-L-202502620.pdf"
XLSX = f"{SRC}/Default-values-Bosnia-and-other-countries.xlsx"

# Countries agreed with the user (Balkans + key trading partners + fallback table).
TARGET = {
    "Bosnia and Herzegovina", "Serbia", "Montenegro", "North Macedonia", "Albania",
    "Türkiye", "China", "India", "Ukraine", "United Kingdom",
    "Other Countries and Territories",
}
OTHER = "Other Countries and Territories"


def sector_of(cn: str) -> str:
    """Sector from CN code. Source: Reg. (EU) 2023/956 Annex I (consolidated 20.10.2025, pp. 46-49)."""
    c = cn.replace(" ", "")
    if c.startswith(("2507", "2523")):
        return "CEMENT"
    if c.startswith("2716"):
        return "ELECTRICITY"
    if c.startswith(("2808", "2814", "2834", "3102", "3105")):
        return "FERTILISERS"
    if c.startswith("2804"):
        return "HYDROGEN"
    if c.startswith(("2601", "72", "73")):
        return "IRON_AND_STEEL"
    if c.startswith("76"):
        return "ALUMINIUM"
    raise ValueError(cn)


def direct_only(cn: str) -> bool:
    """Reg. (EU) 2023/956 Annex II (consolidated, pp. 49-51): only direct emissions for
    chapter 72 / 7301-7326 iron and steel goods, aluminium (76xx) and hydrogen (2804 10 00).
    2601 12 00 (agglomerated iron ore) is NOT in Annex II."""
    c = cn.replace(" ", "")
    return c.startswith(("72", "73", "76", "280410"))


def num(s: str):
    """Parse an Annex I cell. Returns (value|None, marker). Markers: NUM, DASH, NA, BLANK."""
    s = (s or "").strip()
    if s in ("–", "-", "_", "—"):
        return None, "DASH"
    if s.upper() == "N/A":
        return None, "NA"
    if s == "":
        return None, "BLANK"
    return float(s.replace(",", ".")), "NUM"


# ---------------------------------------------------------------- 2025/2621 Annex I
def extract_defaults():
    d = fitz.open(PDF_2621)
    rows = []
    for i in range(3, 2354):  # Annex I = pages 4..2354
        page = d[i]
        if "Product CN Code" not in page.get_text():
            continue
        # Annex pages are landscape (rotated); bring text blocks into the same
        # (displayed) coordinate system as the table bounding boxes.
        rm = page.rotation_matrix
        blocks = []
        for b in page.get_text("blocks"):
            r = fitz.Rect(b[:4]) * rm
            blocks.append((r.x0, r.y0, r.x1, r.y1, b[4]))
        for t in page.find_tables().tables:
            # A page can hold the end of one country's table and the start of the next
            # (e.g. p. 535: China then Colombia), so the country is the title text block
            # directly above each table, not the first title on the page.
            top = t.bbox[1]
            above = [b for b in blocks if b[3] <= top + 1 and b[4].strip()]
            if not above:
                continue
            country = max(above, key=lambda b: b[3])[4].strip()
            if country not in TARGET:
                continue
            for r in t.extract():
                r = [(c or "").replace("\n", " ").strip() for c in r]
                if not r[0] or not re.match(r"^\d{4}", r[0]):
                    continue
                cn = re.sub(r"\s+", " ", r[0])
                if any("see below" in c.lower() for c in r[2:8]):
                    continue  # group header row; values are given on the 8-digit rows below it
                vals = {k: num(r[j]) for k, j in
                        (("direct", 2), ("indirect", 3), ("total", 4),
                         ("y2026", 5), ("y2027", 6), ("y2028", 7))}
                rows.append({
                    "country": "Other countries and territories" if country == OTHER else country,
                    "cn": cn, "description": re.sub(r"\s+", " ", r[1]),
                    "sector": sector_of(cn),
                    **{k: v[0] for k, v in vals.items()},
                    "markers": {k: v[1] for k, v in vals.items()},
                    "route": r[8].strip() if len(r) > 8 else "",
                    "page": i + 1,
                })
    return rows


# ---------------------------------------------------------------- 2025/2620 point 5.3
def parse_bm_cell(cell: str):
    """'1,460 (F)(1)\\n0,659 (G)(1)' -> [{value, route, yearBand}]"""
    out = []
    for line in [l.strip() for l in cell.split("\n") if l.strip()]:
        m = re.match(r"^([\d,]+)\s*(.*)$", line)
        if not m:
            raise ValueError(cell)
        labels = re.findall(r"\(([^)]+)\)", m.group(2))
        route = next((l for l in labels if l.isalpha()), None)
        band = next((int(l) for l in labels if l.isdigit()), None)
        out.append({"value": float(m.group(1).replace(",", ".")), "route": route, "yearBand": band})
    return out


def extract_benchmarks():
    d = fitz.open(PDF_2620)
    rows = []
    for i in range(9, d.page_count):
        for t in d[i].find_tables().tables:
            for r in t.extract():
                r = [(c or "").strip() for c in r]
                if len(r) < 4 or not re.match(r"^\d{4}", r[0]):
                    continue
                rows.append({"cn": re.sub(r"\s+", " ", r[0]),
                             "description": re.sub(r"\s+", " ", r[1]),
                             "sector": sector_of(r[0]),
                             "colA": parse_bm_cell(r[2]), "colB": parse_bm_cell(r[3]),
                             "page": i + 1})
    return rows


# ---------------------------------------------------------------- workbook cross-check
def workbook_rows():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    sheet_for = {c: c for c in TARGET}
    sheet_for[OTHER] = "_Other Countries and Territorie"
    out = defaultdict(list)
    extra_cols = {}
    for country, sheet in sheet_for.items():
        if sheet not in wb.sheetnames:
            out[country] = None
            continue
        ws = wb[sheet]
        extra_cols[country] = ws.max_column
        key = "Other countries and territories" if country == OTHER else country
        for r in ws.iter_rows(min_row=3, values_only=True):
            if r[0] is None or not re.match(r"^\d{4}", str(r[0])):
                continue
            out[key].append((wb_cn(r[0]),) + tuple(r[1:]))
    return out, extra_cols


def wb_cn(v) -> str:
    """Workbook stores some CN codes as integers (e.g. 28141000); restore 'NNNN NN NN' form."""
    s = re.sub(r"\s+", "", str(v))
    return " ".join([s[:4]] + [s[j:j + 2] for j in range(4, len(s), 2)])


def _unused():
    out, extra_cols = {}, {}
    return out, extra_cols


def close(a, b, tol):
    return a is not None and b is not None and abs(a - b) <= tol


def main():
    dv = extract_defaults()
    bm = extract_benchmarks()
    issues = []  # (severity, country, cn, description, message, page)

    def flag(sev, row, msg):
        issues.append((sev, row["country"], row["cn"], row["description"][:60], msg, row["page"]))

    for r in dv:
        mk = r["markers"]
        fert = r["sector"] == "FERTILISERS"
        # Mark-up per Guidance 03 p. 115 / 2025/2621 Annex I headers: 10/20/30 %, fertilisers 1 %.
        mus = (1.01, 1.01, 1.01) if fert else (1.10, 1.20, 1.30)
        if mk["total"] != "NUM" and any(mk[y] == "NUM" for y in ("y2026", "y2027", "y2028")):
            flag("CRITICAL", r, "Base columns are '–' but marked-up columns contain numbers "
                 "(apparent column shift in the official PDF). Row blocked.")
            r["blocked"] = True
            continue
        if mk["total"] == "NUM":
            for y, f in zip(("y2026", "y2027", "y2028"), mus):
                if r[y] is None:
                    flag("CRITICAL", r, f"{y} missing although total is given. Row blocked.")
                    r["blocked"] = True
                elif not close(r[y], r["total"] * f, 0.0015):
                    flag("WARNING", r, f"{y}={r[y]} differs from total×{f}={r['total']*f:.4f}")
            if mk["direct"] == "NUM" and mk["indirect"] == "NUM":
                if not close(r["direct"] + r["indirect"], r["total"], 0.0105):
                    flag("WARNING", r, f"direct+indirect={r['direct']+r['indirect']:.3f} ≠ total={r['total']}")
            if direct_only(r["cn"]) and mk["indirect"] == "NUM" and r["indirect"] not in (0.0,):
                flag("WARNING", r, "Direct-only good (Annex II) but indirect value given")
            if direct_only(r["cn"]) and mk["direct"] == "NUM" and not close(r["direct"], r["total"], 0.0005):
                flag("WARNING", r, "Direct-only good (Annex II) but total ≠ direct")

    # Duplicates (same country + CN): legitimate only if descriptions differ (qualifiers).
    groups = defaultdict(list)
    for r in dv:
        groups[(r["country"], r["cn"])].append(r)
    for (c, cn), g in groups.items():
        if len(g) > 1 and len({x["description"] for x in g}) < len(g):
            for x in g:
                flag("CRITICAL", x, "Duplicate CN row with identical description")

    # Route-indicator check against benchmarks (2620 point 5.1): a default row with a value whose
    # 8-digit benchmarks depend on the route must carry a matching route indicator, unless the
    # benchmark options are steel alloy grades only ("highest value" rule). Same logic as engine.ts.
    for r in dv:
        if r.get("blocked") or r["markers"]["total"] != "NUM":
            continue
        rd = r["cn"].replace(" ", "")
        letters = set(re.findall(r"[A-L]", r["route"]))
        bad = []
        for b in bm:
            if not b["cn"].replace(" ", "").startswith(rd):
                continue
            routed = {o["route"] for o in b["colB"] if o["route"]}
            if not routed or letters & routed or routed <= {"F", "G", "H", "J"}:
                continue
            bad.append(b["cn"])
        if bad:
            what = "no route indicator" if not letters else f"route {r['route']} not among benchmark routes"
            flag("WARNING", r, f"Benchmark route cannot be determined ({what}) for {len(bad)} CN code(s), "
                 f"e.g. {', '.join(bad[:3])}. Calculator returns 'insufficient information'.")
    # Workbook cross-check
    wbr, ncols = workbook_rows()
    wb_index = {}
    for country, rows in wbr.items():
        if rows is None:
            continue
        cnt = Counter()
        for r in rows:
            cn = re.sub(r"\s+", " ", str(r[0]).strip())
            wb_index[(country, cn, cnt[(cn)])] = r
            cnt[cn] += 1
    seen = Counter()
    wb_mismatch = 0
    for r in dv:
        k = (r["country"], r["cn"], seen[(r["country"], r["cn"])])
        seen[(r["country"], r["cn"])] += 1
        w = wb_index.get(k)
        if w is None:
            flag("WARNING", r, "Row not found in workbook")
            continue
        for j, f in ((2, "direct"), (3, "indirect"), (4, "total"), (5, "y2026"), (6, "y2027"), (7, "y2028")):
            wv = w[j]
            pv = r[f]
            if isinstance(wv, (int, float)):
                if pv is None or abs(wv - pv) > 0.0005:
                    wb_mismatch += 1
                    flag("INFO" if pv is not None and abs(wv - pv) < 0.002 else "WARNING", r,
                         f"Workbook {f}={wv!r} vs PDF {pv!r}")
            elif pv is not None:
                wb_mismatch += 1
                flag("WARNING", r, f"Workbook {f}={wv!r} vs PDF {pv!r}")

    # ---------------- write TypeScript
    ts_dv = [
        {k: r[k] for k in ("country", "cn", "description", "sector", "direct", "indirect", "total",
                           "y2026", "y2027", "y2028", "route", "page")}
        | {"markers": r["markers"], **({"blocked": True} if r.get("blocked") else {})}
        for r in dv
    ]
    hdr = ("// GENERATED by scripts/cost-calculator/generate_reference_data.py - do not edit by hand.\n"
           "// Source: Commission Implementing Regulation (EU) 2025/2621, Annex I\n"
           "// (docs/cbam-sources/OJ-L-202502621-Default-values.pdf). 'page' = PDF page of each row.\n"
           "// Units: t CO2e per tonne of good. '–'/'_' -> null + marker DASH; 'N/A' -> null + marker NA.\n"
           "// WARNING: Annexes I and IV were corrected by Implementing Regulation (EU) 2026/1740\n"
           "// (retroactive to 1.1.2026), which is NOT in docs/cbam-sources. See OPEN_QUESTIONS.md.\n")
    with open(f"{APP}/src/costCalculator/data/defaultValues.ts", "w") as f:
        f.write(hdr)
        f.write("import type { DefaultValueRow } from '../types.ts';\n\n")
        f.write("export const DEFAULT_VALUES_DATASET = {\n"
                "  id: 'IR-2025-2621-AnnexI',\n"
                "  label: 'Implementing Regulation (EU) 2025/2621, Annex I (OJ L 31.12.2025)',\n"
                "  correctionStatus: 'NOT_CHECKED_AGAINST_IR_2026_1740',\n"
                "} as const;\n\n")
        f.write("export const DEFAULT_VALUES: DefaultValueRow[] = ")
        f.write(json.dumps(ts_dv, ensure_ascii=False, separators=(",", ":")).replace("},{", "},\n{"))
        f.write(";\n")
    with open(f"{APP}/src/costCalculator/data/benchmarks.ts", "w") as f:
        f.write("// GENERATED by scripts/cost-calculator/generate_reference_data.py - do not edit by hand.\n"
                "// Source: Commission Implementing Regulation (EU) 2025/2620, Annex point 5.3\n"
                "// (docs/cbam-sources/OJ-L-202502620.pdf). colA = BMg* (actual data, Eq. 2),\n"
                "// colB = BMg (default values, Eq. 6). Units t CO2e/t. route = indicator (A)-(L);\n"
                "// yearBand 1 = production years 2026-27, 2 = 2028-30 (point 5.3). 'page' = PDF page.\n")
        f.write("import type { BenchmarkRow } from '../types.ts';\n\n")
        f.write("export const BENCHMARKS: BenchmarkRow[] = ")
        f.write(json.dumps(bm, ensure_ascii=False, separators=(",", ":")).replace("},{\"cn\"", "},\n{\"cn\""))
        f.write(";\n")

    # ---------------- validation report
    sev = Counter(i[0] for i in issues)
    with open(f"{APP}/src/costCalculator/DATA_VALIDATION.md", "w") as f:
        f.write("# Cost calculator reference data – validation report\n\n")
        f.write("Generated by `scripts/cost-calculator/generate_reference_data.py`.\n\n")
        f.write("## Datasets\n\n")
        f.write(f"- Default values: IR (EU) 2025/2621 Annex I, {len(dv)} rows, countries: "
                f"{', '.join(sorted({r['country'] for r in dv}))}.\n")
        f.write(f"- Benchmarks: IR (EU) 2025/2620 Annex point 5.3, {len(bm)} CN rows.\n")
        f.write("- Cross-check: Commission workbook v1 (4 Feb 2026), not legally binding "
                "(see its 'Overview' sheet disclaimer).\n")
        f.write("- **Not checked against IR (EU) 2026/1740** (corrected Annexes I and IV, retroactive "
                "to 1 January 2026) – document not supplied.\n\n")
        f.write(f"Workbook sheet column counts (9 expected): {ncols}\n\n")
        f.write(f"## Summary\n\n- CRITICAL (row blocked from calculations): {sev['CRITICAL']}\n"
                f"- WARNING: {sev['WARNING']}\n- INFO (rounding < 0.002): {sev['INFO']}\n\n")
        f.write("## Issues\n\n| Severity | Country | CN | Description | Issue | PDF page |\n|---|---|---|---|---|---|\n")
        for i in sorted(issues, key=lambda x: ({"CRITICAL": 0, "WARNING": 1, "INFO": 2}[x[0]], x[1], x[2])):
            f.write("| " + " | ".join(str(v).replace("|", "/") for v in i) + " |\n")
    print(len(dv), len(bm), dict(sev))


if __name__ == "__main__":
    main()
