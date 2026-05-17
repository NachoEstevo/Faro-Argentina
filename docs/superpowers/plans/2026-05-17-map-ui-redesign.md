# CasePanel Redesign Implementation Plan (v2 — narrowed scope)

> **Note:** This supersedes an earlier wider-scope plan that touched the zoom control, map legend, and basemap toggle. The user pushed back: only the click panel and Wayback inline are in scope. Everything else stays as-is.

**Goal:** Replace the dense `<CaseDetails>` panel that appears when clicking a marker with a compact `<CasePanel>` — clean hero, critical facts grid, collapsible technical details, inline Wayback slider — with a smooth slide-in animation.

**Architecture:** New components under `src/components/MapUI/` (`CasePanel.tsx` composer + `panel/*.tsx` parts). Wayback state lifts from `CaseMap.tsx` up to `FaroExperience.tsx` so the panel can host the slider inline. The only edits to existing files are: (a) lift wayback state out of `CaseMap.tsx` and remove its sibling `<WaybackControl>` render, (b) swap `<CaseDetails>` for `<CasePanel>` in `FaroExperience.tsx`, (c) loosen the global `.casePanel` aside CSS so the new component controls its own padding/background.

**Tech Stack:** Next 16 · React 19.2 · TypeScript 6 · CSS Modules · `@starting-style` for entry animation. No new dependencies.

**Strictly NOT touched in this plan:**
- ZoomControl (stays Leaflet default bottom-right)
- MapLegend overlay (stays as-is)
- CaseMap markers, tooltip, hover behaviour
- `CountrySidebar`, `RegionalSidebar`, `ExplorerView`, `MobileHeader`
- `CaseDetails.tsx` (left intact for parallel Explorer work)
- Any styling/logic of `floatingToggle`, map/explorer toggle
- View Transitions API, basemap switching, popovers

---

## File Structure

**New:**
```
src/components/MapUI/
  CasePanel.tsx                   # composer
  casePanel.module.css            # scoped styles
  panel/
    PanelHero.tsx                 # kicker + title + chips + close
    PanelWhy.tsx                  # "Por qué apareció" section
    PanelFacts.tsx                # 2×2 grid of 4 critical facts
    PanelImagery.tsx              # wraps WaybackControl inline
    PanelTechDetails.tsx          # <details> accordion
    PanelNextSteps.tsx            # <details> accordion
    PanelActions.tsx              # source / export / trace buttons
```

**Modified (small, surgical):**
- `src/components/CaseMap.tsx` — drop internal wayback state and the sibling `<WaybackControl>` render; accept `waybackState` as a prop.
- `src/components/FaroExperience.tsx` — host wayback state; swap `<CaseDetails>` for `<CasePanel>`; pass wayback callbacks to it.
- `src/app/globals.css` — strip internal padding/background from the global `.casePanel` aside rule so the new CasePanel can paint edge-to-edge.

**Not touched:** every other file.

---

### Task 1: Scaffold MapUI + CSS module

**Files:**
- Create: `src/components/MapUI/casePanel.module.css`

- [ ] Create the module file with shared tokens for the panel:

```css
.module {
  --cp-ease: cubic-bezier(0.32, 0.72, 0, 1);
  --cp-surface: #0d0f13;
  --cp-border: rgba(255, 255, 255, 0.08);
  --cp-border-soft: rgba(255, 255, 255, 0.06);
  --cp-hover: rgba(255, 255, 255, 0.06);
  --cp-fact-bg: rgba(255, 255, 255, 0.03);
  --cp-text: #eef2f7;
  --cp-text-muted: rgba(255, 255, 255, 0.6);
  --cp-text-faint: rgba(255, 255, 255, 0.45);
  --cp-accent: #5aa9e5;
  --cp-radius: 12px;
  --cp-radius-sm: 10px;
}
```

- [ ] Commit:

```bash
git add src/components/MapUI/casePanel.module.css
git commit -m "chore: scaffold CasePanel CSS module with tokens"
```

---

### Task 2: PanelHero

**Files:**
- Create: `src/components/MapUI/panel/PanelHero.tsx`
- Modify: `src/components/MapUI/casePanel.module.css` (append)

- [ ] Create `PanelHero.tsx`:

```tsx
"use client";

import { ShieldCheck, X } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { CaseSignalChips } from "@/components/CaseSignals";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
  onClose: () => void;
}

export default function PanelHero({ caseFile, signalContext, onClose }: Props) {
  return (
    <header className={styles.hero}>
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Cerrar panel"
        title="Cerrar"
      >
        <X size={14} aria-hidden />
      </button>
      <p className={styles.kicker}>
        <ShieldCheck size={12} aria-hidden /> Expediente verificable
      </p>
      <h1 className={styles.title}>{caseFile.title}</h1>
      <div className={styles.chips}>
        <CaseSignalChips caseFile={caseFile} limit={3} signalContext={signalContext} />
      </div>
    </header>
  );
}
```

- [ ] Append to `casePanel.module.css`:

```css
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.close {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--cp-text-muted);
  cursor: pointer;
  transition: background-color 120ms var(--cp-ease), color 120ms var(--cp-ease);
}

.close:hover {
  background: var(--cp-hover);
  color: var(--cp-text);
}

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cp-accent);
  margin: 0;
  font-weight: 600;
}

.title {
  font-size: 22px;
  line-height: 1.25;
  font-weight: 600;
  margin: 0;
  color: var(--cp-text);
  font-family: var(--cf-font-heading);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
```

- [ ] Run `npm run typecheck` (must pass), then commit:

```bash
git add src/components/MapUI/panel/PanelHero.tsx src/components/MapUI/casePanel.module.css
git commit -m "feat: add PanelHero component"
```

---

### Task 3: PanelWhy + PanelFacts

**Files:**
- Create: `src/components/MapUI/panel/PanelWhy.tsx`
- Create: `src/components/MapUI/panel/PanelFacts.tsx`
- Modify: `src/components/MapUI/casePanel.module.css` (append)

- [ ] Create `PanelWhy.tsx`:

```tsx
"use client";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
}

export default function PanelWhy({ caseFile, signalContext }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  return (
    <section className={styles.section}>
      <p className={styles.sectionKicker}>Por qué apareció</p>
      <p className={styles.body}>{expediente.summary.plainSummary}</p>
    </section>
  );
}
```

- [ ] Create `PanelFacts.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { formatAmountWithUsd, type AmountInput } from "@/lib/format/money";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
}

function isCrossCountryCase(caseFile: ExplorerCase): caseFile is CrossCountryCaseFile {
  return "caseType" in caseFile;
}

function formatSupplier(caseFile: ExplorerCase): string {
  if (isCrossCountryCase(caseFile)) {
    return caseFile.supplierName ?? caseFile.supplierDocument ?? "Sin dato";
  }
  return "Sin dato";
}

function renderAmount(amount: AmountInput | null): ReactNode {
  if (!amount) return "Sin dato";
  const formatted = formatAmountWithUsd(amount);
  return (
    <>
      <span>{formatted.primary}</span>
      {formatted.usdSegment && <span className={styles.factSub}>{formatted.usdSegment}</span>}
    </>
  );
}

export default function PanelFacts({ caseFile }: Props) {
  const amount = isCrossCountryCase(caseFile) ? (caseFile.amount as AmountInput | null) : null;
  return (
    <div className={styles.facts}>
      <Fact label="Monto">{renderAmount(amount)}</Fact>
      <Fact label="Año">{caseFile.year ?? "Sin dato"}</Fact>
      <Fact label="Organismo">{caseFile.agencyName ?? "Sin dato"}</Fact>
      <Fact label="Proveedor">{formatSupplier(caseFile)}</Fact>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <strong className={styles.factValue}>{children}</strong>
    </div>
  );
}
```

- [ ] Append to `casePanel.module.css`:

```css
.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sectionKicker {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cp-text-muted);
  margin: 0;
  font-weight: 500;
}

.body {
  font-size: 14px;
  line-height: 1.55;
  color: var(--cp-text);
  margin: 0;
}

.facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.fact {
  background: var(--cp-fact-bg);
  border: 1px solid var(--cp-border-soft);
  border-radius: var(--cp-radius-sm);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.factLabel {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cp-text-faint);
}

.factValue {
  font-size: 14px;
  line-height: 1.3;
  font-weight: 600;
  color: var(--cp-text);
  display: flex;
  flex-direction: column;
  gap: 2px;
  word-break: break-word;
}

.factSub {
  font-size: 11px;
  font-weight: 400;
  color: var(--cp-text-muted);
}
```

- [ ] typecheck and commit:

```bash
npm run typecheck
git add src/components/MapUI/panel/PanelWhy.tsx src/components/MapUI/panel/PanelFacts.tsx src/components/MapUI/casePanel.module.css
git commit -m "feat: add PanelWhy and PanelFacts components"
```

---

### Task 4: PanelTechDetails + PanelNextSteps (accordions)

**Files:**
- Create: `src/components/MapUI/panel/PanelTechDetails.tsx`
- Create: `src/components/MapUI/panel/PanelNextSteps.tsx`
- Modify: `src/components/MapUI/casePanel.module.css` (append)

- [ ] Create `PanelTechDetails.tsx`:

```tsx
"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import { CaseSignalPanel } from "@/components/CaseSignals";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
}

function isCrossCountryCase(caseFile: ExplorerCase): caseFile is CrossCountryCaseFile {
  return "caseType" in caseFile;
}

function shortSource(sourceId: string): string {
  if (sourceId.includes("ACTAS")) return "Actas";
  if (sourceId.includes("CONTRATOS")) return "Contratos";
  if (sourceId.includes("OFERTAS")) return "Ofertas";
  if (sourceId.includes("PROCEDIMIENTOS")) return "Procedimiento";
  if (sourceId.includes("UBICACION")) return "Ubicacion";
  if (sourceId.includes("SIPRO")) return "SIPRO";
  if (sourceId.includes("OCDS")) return "OCDS";
  if (sourceId.includes("GASTO")) return "Presupuesto";
  if (sourceId.includes("MERCADO")) return "Adjudicaciones";
  return "Fuente";
}

export default function PanelTechDetails({ caseFile, signalContext }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  const relatedReceipts = isCrossCountryCase(caseFile) ? caseFile.relatedReceipts ?? [] : [];
  return (
    <details className={styles.accordion}>
      <summary className={styles.accordionSummary}>
        <ChevronRight size={14} aria-hidden className={styles.accordionChevron} />
        Detalles técnicos
      </summary>
      <div className={styles.accordionBody}>
        <CaseSignalPanel caseFile={caseFile} signalContext={signalContext} />
        <dl className={styles.receiptList}>
          <ReceiptRow label="Fuente" value={caseFile.receipt.sourceName} />
          <ReceiptRow label="Locator" value={expediente.officialTrail.primary.locator.label} />
          <ReceiptRow label="Nota" value={expediente.officialTrail.primary.locator.note} />
          <ReceiptRow label="Hash" value={`${caseFile.receipt.fileHash.slice(0, 24)}...`} />
          <ReceiptRow label="Raw path" value={caseFile.receipt.rawPath} />
          <ReceiptRow
            label="Extraido"
            value={new Date(caseFile.receipt.extractedAt).toLocaleString("es-AR")}
          />
        </dl>
        {relatedReceipts.length > 0 && (
          <div className={styles.relatedReceipts}>
            <span className={styles.sectionKicker}>Evidencia cruzada</span>
            <div className={styles.relatedReceiptLinks}>
              {relatedReceipts.slice(0, 6).map((receipt) => (
                <a
                  key={receipt.receiptId}
                  href={receipt.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.relatedReceiptLink}
                >
                  <ExternalLink size={11} aria-hidden /> {shortSource(receipt.sourceId)}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.receiptRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
```

- [ ] Create `PanelNextSteps.tsx`:

```tsx
"use client";

import { ChevronRight } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
}

export default function PanelNextSteps({ caseFile, signalContext }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  if (expediente.nextVerification.length === 0) return null;
  return (
    <details className={styles.accordion}>
      <summary className={styles.accordionSummary}>
        <ChevronRight size={14} aria-hidden className={styles.accordionChevron} />
        Qué verificar después
      </summary>
      <div className={styles.accordionBody}>
        <ol className={styles.nextStepsList}>
          {expediente.nextVerification.slice(0, 5).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
```

- [ ] Append to `casePanel.module.css`:

```css
.accordion {
  border-top: 1px solid var(--cp-border-soft);
  padding: 12px 0;
}

.accordionSummary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--cp-text);
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
}

.accordionSummary::-webkit-details-marker { display: none; }

.accordionChevron {
  transition: transform 200ms var(--cp-ease);
  color: var(--cp-text-muted);
}

.accordion[open] .accordionChevron {
  transform: rotate(90deg);
}

.accordionBody {
  padding: 14px 4px 4px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.receiptList {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.receiptRow {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 10px;
  font-size: 12px;
  align-items: baseline;
}

.receiptRow dt {
  color: var(--cp-text-faint);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10px;
}

.receiptRow dd {
  color: var(--cp-text);
  margin: 0;
  word-break: break-all;
  font-family: var(--cf-font-data);
}

.relatedReceipts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.relatedReceiptLinks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.relatedReceiptLink {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 8px;
  background: var(--cp-fact-bg);
  border: 1px solid var(--cp-border-soft);
  border-radius: 6px;
  color: var(--cp-text);
  text-decoration: none;
}

.relatedReceiptLink:hover { background: var(--cp-hover); }

.nextStepsList {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--cp-text);
}
```

- [ ] typecheck and commit:

```bash
npm run typecheck
git add src/components/MapUI/panel/ src/components/MapUI/casePanel.module.css
git commit -m "feat: add PanelTechDetails and PanelNextSteps accordions"
```

---

### Task 5: PanelActions

**Files:**
- Create: `src/components/MapUI/panel/PanelActions.tsx`
- Modify: `src/components/MapUI/casePanel.module.css` (append)

- [ ] Create `PanelActions.tsx`:

```tsx
"use client";

import { Download, ExternalLink, Route } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
}

export default function PanelActions({ caseFile, signalContext, traceMode, onTraceModeChange }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  const { hasOfficialGeometry } = expediente.investigationContext;
  const encodedId = encodeURIComponent(caseFile.id);
  return (
    <div className={styles.actions}>
      <div className={styles.actionRow}>
        <a
          href={caseFile.receipt.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className={styles.actionButton}
        >
          <ExternalLink size={14} aria-hidden /> Ver fuente
        </a>
        <a href={`/api/export/${encodedId}`} download className={styles.actionButton}>
          <Download size={14} aria-hidden /> Exportar
        </a>
      </div>
      <button
        type="button"
        className={`${styles.actionButton} ${styles.actionWide} ${traceMode && hasOfficialGeometry ? styles.actionWideActive : ""}`}
        disabled={!hasOfficialGeometry}
        onClick={() => {
          if (hasOfficialGeometry) onTraceModeChange(!traceMode);
        }}
      >
        <Route size={14} aria-hidden /> Rastro visual
      </button>
    </div>
  );
}
```

- [ ] Append to `casePanel.module.css`:

```css
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--cp-border-soft);
}

.actionRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.actionButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--cp-fact-bg);
  border: 1px solid var(--cp-border-soft);
  border-radius: var(--cp-radius-sm);
  color: var(--cp-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 120ms var(--cp-ease), border-color 120ms var(--cp-ease);
}

.actionButton:hover:not(:disabled) {
  background: var(--cp-hover);
  border-color: var(--cp-border);
}

.actionButton:disabled {
  color: var(--cp-text-faint);
  cursor: not-allowed;
}

.actionWide { width: 100%; }

.actionWideActive {
  background: rgba(90, 169, 229, 0.12);
  border-color: var(--cp-accent);
  color: var(--cp-accent);
}
```

- [ ] typecheck and commit:

```bash
npm run typecheck
git add src/components/MapUI/panel/PanelActions.tsx src/components/MapUI/casePanel.module.css
git commit -m "feat: add PanelActions component"
```

---

### Task 6: Lift wayback state from CaseMap to FaroExperience

This is the only existing-file edit that does NOT touch the panel directly. The reason: the new `<PanelImagery>` (next task) needs to read `waybackState` and dispatch release changes. Easiest is to lift the state into the parent and pass it down to both `<CaseMap>` (for the tile URL) and `<CasePanel>` (for the slider).

**Files:**
- Modify: `src/components/CaseMap.tsx`
- Modify: `src/components/FaroExperience.tsx`

- [ ] In `CaseMap.tsx`:
  1. Change `Props` to include `waybackState: WaybackState`, `onWaybackReleaseChange: (releaseId: number) => void`, `onWaybackRetry: () => void`, `onCloseWayback: () => void`.
  2. Delete the internal `useState<WaybackState>`, `retryToken`, `hasArmedWaybackRef`, and the wayback `useEffect` (currently lines ~39-87).
  3. Delete the `handleActiveReleaseChange`, `handleClose`, `handleRetry` callbacks (lines ~89-103). The map no longer owns them.
  4. Remove the sibling `<WaybackControl>` render at the bottom of the component. The return is now just `<MapContainer>...</MapContainer>` (drop the surrounding fragment).
  5. Change `import WaybackControl, { type WaybackState } from "./WaybackControl";` to `import type { WaybackState } from "./WaybackControl";` — type-only.
  6. The unused parts of the lifted callbacks (`onWaybackReleaseChange`, `onWaybackRetry`, `onCloseWayback`) ARE in the Props but unused inside the component for now. **YAGNI**: don't add them as props if CaseMap never uses them. Only `waybackState` is needed by CaseMap (to compute `waybackTileUrl`). Drop the other three from the Props and only pass `waybackState`.

  Final Props for CaseMap:

  ```tsx
  interface Props {
    cases: ExplorerCase[];
    selectedCaseId: string | null;
    traceMode: boolean;
    onSelectCase: (id: string) => void;
    waybackState: WaybackState;
  }
  ```

- [ ] In `FaroExperience.tsx`:
  1. Add imports:
     ```tsx
     import { useRef } from "react"; // (or add to existing react import)
     import { loadYearlyReleases } from "@/lib/data/wayback";
     import type { WaybackState } from "./WaybackControl";
     ```
  2. Add state inside the component (after existing useState declarations):
     ```tsx
     const [waybackState, setWaybackState] = useState<WaybackState>({ status: "off" });
     const [waybackRetryToken, setWaybackRetryToken] = useState(0);
     const hasArmedWaybackRef = useRef(false);
     ```
  3. Add wayback effect (after `selectedCase` is computed):
     ```tsx
     useEffect(() => {
       let cancelled = false;
       const coordinates = selectedCase?.coordinates;
       const caseId = selectedCase?.id;
       if (!caseId || !coordinates || viewMode !== "map") {
         setWaybackState({ status: "off" });
         hasArmedWaybackRef.current = true;
         return;
       }
       if (!hasArmedWaybackRef.current) {
         hasArmedWaybackRef.current = true;
         return;
       }
       setWaybackState({ status: "loading", caseId });
       loadYearlyReleases()
         .then((releases) => {
           if (cancelled) return;
           if (releases.length === 0) {
             setWaybackState({ status: "error", caseId, message: "Wayback no devolvio releases disponibles." });
             return;
           }
           const latest = releases[releases.length - 1];
           setWaybackState({
             status: "active",
             caseId,
             releases,
             activeReleaseId: latest.releaseId,
           });
         })
         .catch((error: unknown) => {
           if (cancelled) return;
           setWaybackState({
             status: "error",
             caseId,
             message: error instanceof Error ? error.message : "Error desconocido",
           });
         });
       return () => {
         cancelled = true;
       };
     }, [selectedCase?.id, selectedCase?.coordinates?.lat, selectedCase?.coordinates?.lon, viewMode, waybackRetryToken]);
     ```
  4. Pass new prop to `<CaseMap>`:
     ```tsx
     <CaseMap
       cases={countryCases}
       selectedCaseId={selectedCase?.id ?? null}
       traceMode={traceMode}
       onSelectCase={setSelectedCaseId}
       waybackState={waybackState}
     />
     ```

- [ ] typecheck and commit:

```bash
npm run typecheck
git add src/components/CaseMap.tsx src/components/FaroExperience.tsx
git commit -m "refactor: lift wayback state from CaseMap to FaroExperience"
```

Note: this commit, on its own, removes the on-screen WaybackControl (it was the sibling render). That's expected — the next task re-mounts it inside the panel.

---

### Task 7: PanelImagery

**Files:**
- Create: `src/components/MapUI/panel/PanelImagery.tsx`
- Modify: `src/components/MapUI/casePanel.module.css` (append)

- [ ] Create `PanelImagery.tsx`:

```tsx
"use client";

import WaybackControl, { type WaybackState } from "@/components/WaybackControl";
import styles from "../casePanel.module.css";

interface Props {
  state: WaybackState;
  onActiveReleaseChange: (releaseId: number) => void;
  onClose: () => void;
  onRetry: () => void;
}

export default function PanelImagery({ state, onActiveReleaseChange, onClose, onRetry }: Props) {
  if (state.status === "off") return null;
  return (
    <section className={styles.section}>
      <p className={styles.sectionKicker}>Imagen satelital</p>
      <div className={styles.imageryWrap}>
        <WaybackControl
          state={state}
          onActiveReleaseChange={onActiveReleaseChange}
          onClose={onClose}
          onRetry={onRetry}
        />
      </div>
    </section>
  );
}
```

- [ ] Append to `casePanel.module.css`:

```css
.imageryWrap :global(.waybackControl) {
  position: static;
  margin: 0;
  width: 100%;
  background: var(--cp-fact-bg);
  border: 1px solid var(--cp-border-soft);
  border-radius: var(--cp-radius-sm);
  box-shadow: none;
}

.imageryWrap :global(.waybackControl header button) {
  display: none;
}
```

Note: this assumes `WaybackControl` styles live in `globals.css` with positioning. Quickly verify with Grep before adjusting if needed.

- [ ] typecheck and commit:

```bash
npm run typecheck
git add src/components/MapUI/panel/PanelImagery.tsx src/components/MapUI/casePanel.module.css
git commit -m "feat: add PanelImagery inline wayback wrapper"
```

---

### Task 8: CasePanel composer

**Files:**
- Create: `src/components/MapUI/CasePanel.tsx`
- Modify: `src/components/MapUI/casePanel.module.css` (append)

- [ ] Create `CasePanel.tsx`:

```tsx
"use client";

import type { CaseSignalContext } from "@/lib/data/caseSignals";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { WaybackState } from "@/components/WaybackControl";
import PanelHero from "./panel/PanelHero";
import PanelWhy from "./panel/PanelWhy";
import PanelFacts from "./panel/PanelFacts";
import PanelImagery from "./panel/PanelImagery";
import PanelTechDetails from "./panel/PanelTechDetails";
import PanelNextSteps from "./panel/PanelNextSteps";
import PanelActions from "./panel/PanelActions";
import styles from "./casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
  onClose: () => void;
  waybackState: WaybackState;
  onWaybackReleaseChange: (releaseId: number) => void;
  onWaybackRetry: () => void;
}

export default function CasePanel({
  caseFile,
  signalContext,
  traceMode,
  onTraceModeChange,
  onClose,
  waybackState,
  onWaybackReleaseChange,
  onWaybackRetry,
}: Props) {
  return (
    <div className={`${styles.module} ${styles.panel}`}>
      <div className={styles.scroll}>
        <PanelHero caseFile={caseFile} signalContext={signalContext} onClose={onClose} />
        <div className={styles.divider} aria-hidden />
        <PanelWhy caseFile={caseFile} signalContext={signalContext} />
        <div className={styles.divider} aria-hidden />
        <PanelFacts caseFile={caseFile} />
        {caseFile.coordinates && waybackState.status !== "off" && (
          <>
            <div className={styles.divider} aria-hidden />
            <PanelImagery
              state={waybackState}
              onActiveReleaseChange={onWaybackReleaseChange}
              onClose={onClose}
              onRetry={onWaybackRetry}
            />
          </>
        )}
        <PanelTechDetails caseFile={caseFile} signalContext={signalContext} />
        <PanelNextSteps caseFile={caseFile} signalContext={signalContext} />
        <PanelActions
          caseFile={caseFile}
          signalContext={signalContext}
          traceMode={traceMode}
          onTraceModeChange={onTraceModeChange}
        />
      </div>
    </div>
  );
}
```

- [ ] Append to `casePanel.module.css`:

```css
.panel {
  height: 100%;
  width: 100%;
  background: var(--cp-surface);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 40%);
  border-left: 1px solid var(--cp-border);
  display: flex;
  flex-direction: column;
  color: var(--cp-text);
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 32px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.scroll::-webkit-scrollbar { width: 8px; }
.scroll::-webkit-scrollbar-track { background: transparent; }
.scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.divider {
  height: 1px;
  background: var(--cp-border-soft);
}
```

- [ ] typecheck and commit:

```bash
npm run typecheck
git add src/components/MapUI/CasePanel.tsx src/components/MapUI/casePanel.module.css
git commit -m "feat: add CasePanel composer"
```

---

### Task 9: Integrate CasePanel in FaroExperience + adjust global .casePanel CSS

**Files:**
- Modify: `src/components/FaroExperience.tsx`
- Modify: `src/app/globals.css`

- [ ] In `FaroExperience.tsx`:
  1. Add import: `import CasePanel from "./MapUI/CasePanel";`
  2. Remove import: `import { CaseDetails } from "./CaseDetails";`
  3. Replace the existing `{selectedCase && viewMode === "map" && (...<CaseDetails .../>...)}` block with:
     ```tsx
     {selectedCase && viewMode === "map" && (
       <aside className="casePanel" aria-label="Expediente Faro">
         <CasePanel
           caseFile={selectedCase}
           signalContext={activeSignalContext}
           traceMode={traceMode}
           onTraceModeChange={setTraceMode}
           onClose={() => setSelectedCaseId("")}
           waybackState={waybackState}
           onWaybackReleaseChange={(releaseId) => {
             setWaybackState((current) =>
               current.status === "active" ? { ...current, activeReleaseId: releaseId } : current,
             );
           }}
           onWaybackRetry={() => setWaybackRetryToken((token) => token + 1)}
         />
       </aside>
     )}
     ```

- [ ] In `src/app/globals.css`, find the existing `.casePanel` rule. Read it first (use Grep to locate it). Then modify so the panel fills the aside without internal padding/background interfering with the new CasePanel:

  ```css
  .casePanel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 420px;
    max-width: 100vw;
    background: transparent;
    border: 0;
    padding: 0;
    z-index: 600;
    display: flex;
  }

  @media (max-width: 720px) {
    .casePanel {
      width: 100vw;
    }
  }
  ```

  IMPORTANT: BEFORE replacing, Read the current `.casePanel` rule completely and any related selectors (e.g. nested `.casePanel h1`, `.casePanel section`, etc.). The CaseDetails-era styles likely include child selectors that styled the OLD layout. Those become dead code after this task but don't NECESSARILY harm us — they just don't match the new component's classes. However, to avoid leaks (e.g. a `.casePanel h1 { font-size: ... }` that would override `PanelHero` title): if such cascading child rules exist, either (a) strip them too, or (b) accept they exist and confirm via inspector that they don't affect the new layout. Recommended: strip ALL `.casePanel *` descendant selectors and `.casePanel.something` modifier selectors. Replace the entire `.casePanel` block (including descendants) with just the rule above plus the mobile media query.

- [ ] typecheck and smoke test (`npm run dev`, open page, click marker — panel should render edge-to-edge with new layout). Expect: panel slides in (no animation yet — that's Task 10), shows kicker + title + chips + "Por qué apareció" + facts + (optional) Imagery + accordions + actions. The old WaybackControl is no longer visible bottom-left because it now lives inside the panel.

- [ ] Commit:

```bash
git add src/components/FaroExperience.tsx src/app/globals.css
git commit -m "feat: swap CaseDetails for CasePanel in map mode"
```

---

### Task 10: @starting-style entry animation + prefers-reduced-motion

**Files:**
- Modify: `src/components/MapUI/casePanel.module.css` (append)
- Modify: `src/app/globals.css` (append reduce-motion block)

- [ ] Append to `casePanel.module.css`:

```css
.panel {
  transition:
    opacity 280ms var(--cp-ease),
    transform 280ms var(--cp-ease);
  opacity: 1;
  transform: translateX(0);
}

@starting-style {
  .panel {
    opacity: 0;
    transform: translateX(20px);
  }
}
```

Note: this duplicates the `.panel` selector with an additional `transition` property. That's fine — CSS merges. If you prefer cleanliness, edit the existing `.panel` block to include the `transition` and add the `@starting-style` separately. Either way is OK.

- [ ] Append to `src/app/globals.css` (at the end of the file):

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] Smoke test:
  - Click a marker → panel slides in from the right with a soft ease.
  - Close → no animation (CSS doesn't animate exit on unmount unless we use `@starting-style` reverse; that's a follow-up if needed).
  - In DevTools, emulate `prefers-reduced-motion: reduce` and click again — should be instant.

- [ ] Commit:

```bash
git add src/components/MapUI/casePanel.module.css src/app/globals.css
git commit -m "feat: add panel entry animation and reduce-motion guard"
```

---

### Task 11: Final verification

- [ ] `npm run typecheck` — must pass.
- [ ] `npm run test` — must pass.
- [ ] `git diff main..HEAD -- src/components/Explorer/ src/components/RegionalMap/ src/components/CaseDetails.tsx` — must be empty (Explorer untouched).
- [ ] Manual smoke matrix in browser:
  - Open AR map. Old MapLegend overlay still appears (we didn't touch it). Old ZoomControl bottom-right still appears (we didn't touch it).
  - Click a marker → panel slides in with new layout.
  - "Detalles técnicos" accordion expands.
  - "Qué verificar después" accordion expands.
  - Wayback slider appears inside the panel (under "Imagen satelital").
  - Click X → panel closes.
  - Switch to Explorer mode → Explorer view renders identical to main.
  - Resize to mobile → panel takes full width.
- [ ] If everything passes, no commit needed. Otherwise fix and commit.

---

## Notes for the implementing engineer

1. **Branch:** `feat/ui-map`. Never `main`.
2. **Never push** without explicit user request.
3. **Read the spec first**: `docs/superpowers/specs/2026-05-17-map-ui-redesign-design.md` (note: that spec described a wider scope; this plan implements only the click panel + Wayback inline. Ignore spec sections about MapDock, popovers, basemap toggle, MarkerTooltip, marker halos.)
4. **Do NOT touch:** `CaseDetails.tsx` (Explorer uses it potentially), `CountrySidebar`, `RegionalSidebar`, `ExplorerView`, `MobileHeader`, `WaybackControl.tsx` itself (we only wrap it). `MapLegend` stays. Markers and Tooltips in `CaseMap` stay. ZoomControl stays.
5. **typecheck** after every task. Manual browser smoke at Task 9 and Task 11.
6. **If a line number from the plan drifted**, use Grep/Read to relocate by content.
