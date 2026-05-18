# Casos a revisar — Lateral Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the cramped lead list out of `CountrySidebar` and into a dedicated 400px drawer that opens to the right of the sidebar over the map. The sidebar shows a thin row button (`⚠ Casos a revisar · N ▶`) that toggles the drawer. The drawer paginates 8 leads per page. Selecting a case auto-closes the drawer so the expediente panel can take focus.

**Architecture:** New stand-alone `LeadsPanel` component (with its own CSS module) is rendered as a sibling of `<CountrySidebar>` inside `FaroExperience`. The sidebar loses its leads section and pagination state (those move into the new panel). State `leadsPanelOpen` lives in `FaroExperience`; selecting a lead clears it. No changes to data flow — the panel consumes the same `leads` array.

**Tech Stack:** Next 16, React 19.2, TypeScript 6, CSS Modules, lucide-react. No new dependencies.

**Pre-flight for the engineer:**
- Branch: `feat/casos-revisar-panel`. Never push to remote without explicit request. Never commit to `main`.
- Spec lives at `docs/internal/superpowers/specs/2026-05-17-casos-revisar-panel-design.md`. Read it first.
- Tokens in `src/app/globals.css` (`--cf-*`).
- Dev server: `npm run dev` → `http://127.0.0.1:3002`.
- No UI test harness; verification is manual via dev server + `npm run typecheck`.

---

## File Structure

**New:**
```
src/components/RegionalMap/LeadsPanel.tsx
src/components/RegionalMap/LeadsPanel.module.css
```

**Modified:**
- `src/components/RegionalMap/CountrySidebar.tsx` — drop `leads`/`selectedCaseId`/`onSelectCase` props + the entire `<section className={styles.cpLeadsSection}>` block + pagination state. Drop `useState`, `useMemo`, `useEffect` from React imports if no longer needed (check before deleting — only `useState`/`useMemo`/`useEffect` are no longer used after this change). Drop `ChevronLeft`, `ChevronRight`, `ArrowRight`, `AlertTriangle` from lucide imports if no longer referenced (we keep `ChevronRight` + `AlertTriangle` for the new button). Drop `CaseLead` type import. Drop `FAMILY_ICONS` / `SEVERITY_CLASS` constants. Add new props `onOpenLeadsPanel`, `leadsPanelOpen`, `leadsCount`. Render the new button row in place of the section.
- `src/components/RegionalMap/RegionalMap.module.css` — append the `.cpLeadsButton*` selectors. The old `.cpLeadsSection`, `.cpLeadsList`, `.cpLeadCard*`, `.cpLeadIcon*`, `.cpLeadBody`, `.cpLeadMeta`, `.cpLeadTitle`, `.cpLeadWhy`, `.cpLeadArrow`, `.cpLeadEmpty`, `.cpPagination`, `.cpPageButton`, `.cpPageStatus` blocks are now dead in this module. **Leave them alone** in this iteration (deleting unused CSS is a separate cleanup) so the diff stays small and reviewable; LeadsPanel uses its own CSS module so there's no name collision.
- `src/components/FaroExperience.tsx` — add `leadsPanelOpen` useState, `handleSelectLead` callback, `useEffect` that closes the panel when `viewMode !== "map"`. Render `<LeadsPanel>` inside the `showMapChrome` block. Update `<CountrySidebar>` prop list: remove `leads`/`selectedCaseId`/`onSelectCase`, add `leadsCount`/`leadsPanelOpen`/`onOpenLeadsPanel`.

**NOT touched** (verify post-merge with `git diff main..HEAD`):
- `src/components/MapUI/` (all)
- `src/components/CaseMap.tsx`, `CaseDetails.tsx`
- `src/components/Explorer/`, `Investigations/`, `Aportes/`
- `src/components/RegionalMap/SidebarFilters.tsx`, `MapLegend.tsx`, `MobileHeader.tsx`, `WelcomeOverlay.tsx`, `FeaturedCasesOverlay.tsx`, `CountryMap.tsx`, `RegionalSidebar.tsx`, `SidebarBrand.tsx`, `FloatingModeToggle.tsx`, `TrustStrip.tsx`

---

### Task 1: Build `LeadsPanel` stand-alone

The component owns its own pagination state and renders header / list / footer. Not yet mounted in the tree.

**Files:**
- Create: `src/components/RegionalMap/LeadsPanel.tsx`
- Create: `src/components/RegionalMap/LeadsPanel.module.css`

- [ ] **Step 1: Create `LeadsPanel.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  FileCheck,
  Info,
  MapPin,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import type { CaseLead } from "@/lib/data/caseLeads";
import type { CaseSignalFamily } from "@/lib/data/caseSignals";
import styles from "./LeadsPanel.module.css";

const FAMILY_ICONS: Record<CaseSignalFamily, LucideIcon> = {
  competition: Users,
  money: CircleDollarSign,
  supplier: Building2,
  traceability: FileCheck,
  geo_visual: MapPin,
  data_gap: CircleHelp,
  context: Info,
};

const SEVERITY_CLASS: Record<"high" | "medium" | "low", string> = {
  high: styles.leadIconHigh,
  medium: styles.leadIconMedium,
  low: styles.leadIconLow,
};

const PAGE_SIZE = 8;

interface Props {
  open: boolean;
  leads: CaseLead[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  onClose: () => void;
}

export default function LeadsPanel({
  open,
  leads,
  selectedCaseId,
  onSelectCase,
  onClose,
}: Props) {
  const [page, setPage] = useState(0);

  // Reset to first page whenever the lead set changes shape.
  useEffect(() => {
    setPage(0);
  }, [leads.length, leads[0]?.leadId]);

  // Esc closes the panel while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pagedLeads = useMemo(
    () => leads.slice(pageStart, pageStart + PAGE_SIZE),
    [leads, pageStart],
  );

  return (
    <aside
      id="leads-panel"
      className={styles.panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="leads-panel-title"
      aria-hidden={!open}
    >
      <header className={styles.header}>
        <h2 id="leads-panel-title" className={styles.title}>
          Casos a revisar
          <span className={styles.titleCount}> · {leads.length.toLocaleString("es-AR")}</span>
        </h2>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Cerrar casos a revisar"
        >
          <X size={16} aria-hidden />
        </button>
      </header>

      <div className={styles.list}>
        {pagedLeads.map((lead) => {
          const isSelected = lead.caseId === selectedCaseId;
          const family = lead.primarySignal.family;
          const SignalIcon = family ? FAMILY_ICONS[family] : AlertTriangle;
          const severity = lead.primarySignal.severity;
          const severityClass = severity ? SEVERITY_CLASS[severity] : "";
          return (
            <button
              key={lead.leadId}
              type="button"
              className={`${styles.leadCard} ${isSelected ? styles.leadCardActive : ""}`}
              onClick={() => onSelectCase(lead.caseId)}
              aria-pressed={isSelected}
            >
              <span className={`${styles.leadIcon} ${severityClass}`}>
                <SignalIcon size={14} aria-hidden />
              </span>
              <span className={styles.leadBody}>
                <span className={styles.leadMeta}>{lead.sourceName}</span>
                <strong className={styles.leadTitle}>{lead.caseTitle}</strong>
                <span className={styles.leadWhy}>{lead.why}</span>
              </span>
              <ArrowRight size={14} aria-hidden className={styles.leadArrow} />
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} aria-hidden />
          </button>
          <span className={styles.pageStatus}>
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            aria-label="Página siguiente"
          >
            <ChevronRight size={14} aria-hidden />
          </button>
        </footer>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Create `LeadsPanel.module.css`**

```css
.panel {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--sidebar-width);
  width: 400px;
  z-index: 9;
  display: flex;
  flex-direction: column;
  background: var(--cf-bg-elev);
  border-right: 1px solid var(--cf-border);
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.3);
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 280ms cubic-bezier(0.32, 0.72, 0, 1),
    transform 280ms cubic-bezier(0.32, 0.72, 0, 1);
  visibility: visible;
}

@starting-style {
  .panel {
    opacity: 0;
    transform: translateX(-24px);
  }
}

.panel[aria-hidden="true"] {
  opacity: 0;
  transform: translateX(-24px);
  visibility: hidden;
  transition:
    opacity 220ms cubic-bezier(0.32, 0.72, 0, 1),
    transform 220ms cubic-bezier(0.32, 0.72, 0, 1),
    visibility 0s linear 220ms;
  pointer-events: none;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--cf-border);
  flex-shrink: 0;
}

.title {
  margin: 0;
  font-family: var(--cf-font-heading);
  font-size: 17px;
  font-weight: 500;
  color: var(--cf-text);
}

.titleCount {
  font-family: var(--cf-font-data);
  font-variant-numeric: tabular-nums;
  font-weight: 400;
  color: var(--cf-text-muted);
}

.closeButton {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--cf-text-muted);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.closeButton:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--cf-text);
}

.list {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}

.list::-webkit-scrollbar { width: 6px; }
.list::-webkit-scrollbar-track { background: transparent; }
.list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 3px;
}
.list::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.24); }

.leadCard {
  display: grid;
  grid-template-columns: 28px 1fr 14px;
  gap: 10px;
  align-items: start;
  padding: 12px 14px;
  border: 1px solid var(--cf-border);
  background: var(--cf-bg-surface);
  border-radius: var(--cf-radius-sm);
  cursor: pointer;
  color: var(--cf-text-secondary);
  text-align: left;
  font: inherit;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.leadCard:hover {
  background: var(--cf-bg-overlay);
  border-color: var(--cf-border-strong);
  color: var(--cf-text);
}

.leadCardActive {
  background: rgba(90, 169, 229, 0.12);
  border-color: var(--cf-accent-dim);
  color: var(--cf-text);
}

.leadIcon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: var(--cf-text-muted);
  border: 1px solid var(--cf-border-strong);
  background: var(--cf-bg-overlay);
  border-radius: var(--cf-radius-sm);
  flex-shrink: 0;
}

.leadIconHigh {
  color: #d94c3a;
  border-color: rgba(217, 76, 58, 0.55);
  background: rgba(217, 76, 58, 0.12);
  box-shadow: 0 0 0 1px rgba(217, 76, 58, 0.18);
}

.leadIconMedium {
  color: #e07a5f;
  border-color: rgba(224, 122, 95, 0.55);
  background: rgba(224, 122, 95, 0.12);
}

.leadIconLow {
  color: #d4a04a;
  border-color: rgba(212, 160, 74, 0.55);
  background: rgba(212, 160, 74, 0.1);
}

.leadBody {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.leadMeta {
  font-family: var(--cf-font-data);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.leadTitle {
  font-family: var(--cf-font-heading);
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  line-height: 1.3;
}

.leadWhy {
  font-family: var(--cf-font-body);
  font-size: 12px;
  line-height: 1.45;
  color: var(--cf-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.leadArrow {
  color: var(--cf-text-muted);
  margin-top: 8px;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 12px;
  border-top: 1px solid var(--cf-border);
  flex-shrink: 0;
}

.pageButton {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid var(--cf-border);
  border-radius: 6px;
  color: var(--cf-text-secondary);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.pageButton:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  color: var(--cf-text);
  border-color: var(--cf-border-strong);
}

.pageButton:disabled {
  color: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
}

.pageStatus {
  font-family: var(--cf-font-data);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--cf-text-secondary);
  min-width: 48px;
  text-align: center;
}

@media (max-width: 720px) {
  .panel {
    left: 0;
    right: 0;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/RegionalMap/LeadsPanel.tsx src/components/RegionalMap/LeadsPanel.module.css
git commit -m "feat: add LeadsPanel component (not yet mounted)"
```

---

### Task 2: Replace the leads section in `CountrySidebar` with a button row

The button takes the place of the old inline list. The sidebar loses three props (`leads`, `selectedCaseId`, `onSelectCase`) and gains three new ones (`leadsCount`, `leadsPanelOpen`, `onOpenLeadsPanel`). Pagination state and its imports go away.

**Files:**
- Modify: `src/components/RegionalMap/CountrySidebar.tsx`
- Modify: `src/components/RegionalMap/RegionalMap.module.css`

- [ ] **Step 1: Append button CSS to `RegionalMap.module.css`**

Append at the end of the file (don't touch existing rules):

```css
.cpLeadsButton {
  display: grid;
  grid-template-columns: 24px 1fr 14px;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 14px 16px;
  background: var(--cf-bg-surface);
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius-md);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--cf-text);
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.cpLeadsButton:hover:not(:disabled) {
  background: var(--cf-bg-overlay);
  border-color: var(--cf-border-strong);
}

.cpLeadsButtonActive {
  background: rgba(90, 169, 229, 0.1);
  border-color: var(--cf-accent-dim);
  color: var(--cf-accent);
}

.cpLeadsButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cpLeadsButtonIcon {
  color: var(--cf-state-flag);
  flex-shrink: 0;
}

.cpLeadsButtonActive .cpLeadsButtonIcon {
  color: var(--cf-accent);
}

.cpLeadsButtonLabel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cpLeadsButtonTitle {
  font-family: var(--cf-font-body);
  font-size: clamp(13px, 1.6vh, 14px);
  font-weight: 500;
  color: inherit;
}

.cpLeadsButtonCount {
  font-family: var(--cf-font-data);
  font-size: clamp(11px, 1.4vh, 12px);
  font-variant-numeric: tabular-nums;
  color: var(--cf-text-muted);
}

.cpLeadsButtonActive .cpLeadsButtonCount {
  color: var(--cf-accent);
  opacity: 0.85;
}

.cpLeadsButtonChevron {
  color: var(--cf-text-muted);
  transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
}

.cpLeadsButtonActive .cpLeadsButtonChevron {
  color: var(--cf-accent);
  transform: rotate(90deg);
}
```

- [ ] **Step 2: Rewrite the top of `CountrySidebar.tsx` (imports + Props + signature)**

Replace lines 1–97 of the file (everything from `"use client"` up to and including the destructure of Props in the function signature) with this exact block:

```tsx
"use client";

import { AlertTriangle, ChevronRight, Search } from "lucide-react";

import type { CaseSignalSeverity } from "@/lib/data/caseSignals";
import type { SearchSuggestion } from "@/lib/data/searchSuggestions";
import styles from "./RegionalMap.module.css";
import SidebarBrand from "./SidebarBrand";
import SyncFooter from "./SyncFooter";
import SidebarFilters, {
  type FindingOption,
  type SidebarFiltersValue,
} from "./SidebarFilters";

interface Props {
  countryName: string;
  sourceLabel: string;
  visibleCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  searchSuggestions: SearchSuggestion[];
  searchPending: boolean;
  onSelectSearchSuggestion: (suggestion: SearchSuggestion) => void;
  filters: SidebarFiltersValue;
  yearBounds: { min: number; max: number };
  onYearFromChange: (year: number) => void;
  onYearToChange: (year: number) => void;
  onToggleFinding: (finding: FindingOption) => void;
  onToggleSeverity: (severity: CaseSignalSeverity) => void;
  onClearFilters: () => void;
  leadsCount: number;
  leadsPanelOpen: boolean;
  onOpenLeadsPanel: () => void;
  syncLabel: string;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function CountrySidebar({
  countryName,
  sourceLabel,
  visibleCount,
  query,
  onQueryChange,
  searchSuggestions,
  searchPending,
  onSelectSearchSuggestion,
  filters,
  yearBounds,
  onYearFromChange,
  onYearToChange,
  onToggleFinding,
  onToggleSeverity,
  onClearFilters,
  leadsCount,
  leadsPanelOpen,
  onOpenLeadsPanel,
  syncLabel,
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: Props) {
```

Note: we drop `useEffect`, `useMemo`, `useState`, the lucide icons `ArrowRight`, `Building2`, `ChevronLeft`, `CircleDollarSign`, `CircleHelp`, `FileCheck`, `Info`, `MapPin`, `Users`, `type LucideIcon`, the `CaseLead` type import, the `CaseSignalFamily` type import, and the `FAMILY_ICONS` + `SEVERITY_CLASS` constants. We keep `AlertTriangle` (used in the new button), `ChevronRight` (chevron in the button), `Search` (existing search row).

- [ ] **Step 3: Replace the leads section in the JSX**

Locate the block that starts with `<section className={`${styles.section} ${styles.cpLeadsSection}`}` and ends at its closing `</section>` (this is the entire old leads list + pagination block, currently lines 213–277). Replace the whole block with:

```tsx
          <section className={styles.section} aria-labelledby="leads-button-heading">
            <p className={styles.eyebrow} id="leads-button-heading">
              Alertas
            </p>
            <button
              type="button"
              className={`${styles.cpLeadsButton} ${leadsPanelOpen ? styles.cpLeadsButtonActive : ""}`}
              onClick={onOpenLeadsPanel}
              disabled={leadsCount === 0}
              aria-expanded={leadsPanelOpen}
              aria-controls="leads-panel"
            >
              <AlertTriangle size={18} aria-hidden className={styles.cpLeadsButtonIcon} />
              <span className={styles.cpLeadsButtonLabel}>
                <span className={styles.cpLeadsButtonTitle}>
                  {leadsCount === 0 ? "Sin alertas para estos filtros" : "Casos a revisar"}
                </span>
                {leadsCount > 0 && (
                  <span className={styles.cpLeadsButtonCount}>
                    {leadsCount.toLocaleString("es-AR")}
                  </span>
                )}
              </span>
              <ChevronRight size={14} aria-hidden className={styles.cpLeadsButtonChevron} />
            </button>
          </section>
```

Also remove the `PAGE_SIZE` const, the `[page, setPage]` state, the `useEffect([leads.length, leads[0]?.leadId])` hook, the `safePage`/`pageStart`/`pagedLeads` block — everything that was used only by the old list.

The body of `CountrySidebar` after this edit should not reference `leads`, `selectedCaseId`, `onSelectCase`, `pagedLeads`, `safePage`, `totalPages`, `setPage`, `PAGE_SIZE`, `SEVERITY_CLASS`, or `FAMILY_ICONS` anywhere.

- [ ] **Step 4: typecheck**

```bash
npm run typecheck
```
Expected: errors about missing props on `<CountrySidebar>` in `FaroExperience.tsx` (we removed `leads`/`selectedCaseId`/`onSelectCase` but it still passes them, and we added new required props it doesn't pass). That's fine — Task 3 wires them up.

If there's any error inside `CountrySidebar.tsx` itself (unused import, undefined identifier), fix it before committing.

- [ ] **Step 5: Commit**

```bash
git add src/components/RegionalMap/CountrySidebar.tsx src/components/RegionalMap/RegionalMap.module.css
git commit -m "feat(sidebar): replace inline leads list with a button row"
```

---

### Task 3: Mount `LeadsPanel` in `FaroExperience` and wire it end-to-end

**Files:**
- Modify: `src/components/FaroExperience.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/components/FaroExperience.tsx`, after the existing `import CountrySidebar from "./RegionalMap/CountrySidebar";` line, add:

```tsx
import LeadsPanel from "./RegionalMap/LeadsPanel";
```

- [ ] **Step 2: Add `leadsPanelOpen` state**

Inside the component body, alongside the other `useState` declarations, add:

```tsx
const [leadsPanelOpen, setLeadsPanelOpen] = useState(false);
```

- [ ] **Step 3: Add `handleSelectLead` callback and viewMode-aware effect**

After the other handlers (search/sidebar toggle/etc.), add:

```tsx
const handleSelectLead = useCallback(
  (caseId: string) => {
    setSelectedCaseId(caseId);
    setLeadsPanelOpen(false);
  },
  [],
);

useEffect(() => {
  if (viewMode !== "map") setLeadsPanelOpen(false);
}, [viewMode]);

const handleToggleLeadsPanel = useCallback(() => {
  setLeadsPanelOpen((open) => !open);
}, []);

const handleCloseLeadsPanel = useCallback(() => {
  setLeadsPanelOpen(false);
}, []);
```

`useCallback` is already imported. `useEffect` is already imported.

- [ ] **Step 4: Update the `<CountrySidebar>` call**

Find the `<CountrySidebar>` JSX (around line 377). Replace the three props `leads={leads}`, `selectedCaseId={selectedCase?.id ?? null}`, `onSelectCase={setSelectedCaseId}` with:

```tsx
          leadsCount={leads.length}
          leadsPanelOpen={leadsPanelOpen}
          onOpenLeadsPanel={handleToggleLeadsPanel}
```

The rest of the props on `<CountrySidebar>` stay as they are.

- [ ] **Step 5: Render `<LeadsPanel>`**

Right after the `<CountrySidebar>` block closes (still inside the `showMapChrome` gate), add:

```tsx
      {showMapChrome && (
        <LeadsPanel
          open={leadsPanelOpen}
          leads={leads}
          selectedCaseId={selectedCase?.id ?? null}
          onSelectCase={handleSelectLead}
          onClose={handleCloseLeadsPanel}
        />
      )}
```

- [ ] **Step 6: typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Smoke matrix in browser**

Run `npm run dev` and open `http://127.0.0.1:3002/pais/AR`. Verify:

1. Sidebar shows "Alertas" eyebrow + a button "Casos a revisar · N ▶" (no inline list).
2. Click the button → panel slides in from the left edge of the map area (right side of the sidebar). Chevron rotates to point down. Button becomes accent-colored.
3. Header shows "Casos a revisar · N" + X. Footer shows `◀ 1 / M ▶` (M = ceil(N/8)).
4. Click ▶ → goes to page 2. ◀ goes back. Disabled at extremes.
5. Click a card → expediente panel opens on the right, leads panel auto-closes.
6. Press Esc with panel open → closes.
7. Re-click the sidebar button while open → toggles closed.
8. Change a filter that reduces lead count → button count updates. If panel was open, list updates and pagination resets to page 1.
9. Filter to zero leads → button shows "Sin alertas para estos filtros" + disabled (panel can't open).
10. Switch view to Explorer/Aportes/Investigations → panel closes (effect on viewMode). Button hides (sidebar isn't rendered in those modes via `showMapChrome` gate).
11. Resize viewport <720px → panel takes full width (left:0; right:0). Sidebar mobile drawer is independent.
12. Toggle prefers-reduced-motion → panel appears without slide.

Fix any issues before committing.

- [ ] **Step 8: No-regression diff**

```bash
git diff main..HEAD -- \
  src/components/MapUI/ \
  src/components/CaseMap.tsx \
  src/components/CaseDetails.tsx \
  src/components/Explorer/ \
  src/components/Investigations/ \
  src/components/Aportes/ \
  src/components/RegionalMap/SidebarFilters.tsx \
  src/components/RegionalMap/MapLegend.tsx \
  src/components/RegionalMap/MobileHeader.tsx \
  src/components/RegionalMap/WelcomeOverlay.tsx \
  src/components/RegionalMap/FeaturedCasesOverlay.tsx \
  src/components/RegionalMap/CountryMap.tsx \
  src/components/RegionalMap/RegionalSidebar.tsx \
  src/components/RegionalMap/SidebarBrand.tsx \
  src/components/RegionalMap/FloatingModeToggle.tsx \
  src/components/RegionalMap/TrustStrip.tsx
```

Must be empty.

- [ ] **Step 9: Existing tests**

```bash
npm run test
```
Expected: existing tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/components/FaroExperience.tsx
git commit -m "feat(landing): mount LeadsPanel and wire it through FaroExperience"
```

---

## Notes for the implementer

1. **Branch:** `feat/casos-revisar-panel`. Never `main`. Never push without explicit user request.
2. **Spec first**: `docs/internal/superpowers/specs/2026-05-17-casos-revisar-panel-design.md`.
3. **Don't touch** any file outside the three listed under "Modified" + the two under "New".
4. The pagination state moves OUT of `CountrySidebar` and INTO `LeadsPanel`. Don't leave it behind in both.
5. `LeadsPanel` Esc keypress only listens while `open === true`. If the user has the expediente CasePanel and the LeadsPanel open simultaneously, an Esc fires both close handlers — acceptable.
6. Auto-close on case selection lives in `FaroExperience.handleSelectLead`, not in the panel itself. The panel just calls `onSelectCase(caseId)` and stays open; the wrapping handler sets the case AND closes the panel.
7. Animations rely on `@starting-style`. Browsers <Chrome 117 degrade to instant; acceptable.
8. The old `.cpLeadsSection` / `.cpLeadCard*` etc. CSS rules in `RegionalMap.module.css` become unused after this change — **leave them in place** for a smaller diff. Cleanup is a separate PR.
