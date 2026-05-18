# Casos a revisar — Panel lateral

**Fecha:** 2026-05-17
**Branch:** `feat/casos-revisar-panel`

## Contexto

La sidebar de país (`CountrySidebar`, 360px de ancho) hoy incluye una sección "Casos a revisar" con la lista paginada de leads (12 por página). Comparte espacio vertical con la intro de país, búsqueda y filtros. Resultado: la lista queda apretada, las cards se ven chicas, y la paginación pelea con el footer. El usuario pide convertir esa sección en un botón que abra un rectángulo lateral con la lista paginada de 8 casos, separado de la sidebar.

## Objetivos

1. Liberar espacio vertical en la sidebar.
2. Mostrar la lista de casos en un panel dedicado con la misma respiración de UI que el resto del producto.
3. Conservar la paginación, ahora con 8 por página.
4. Mantener filtros/búsqueda intactos: el panel consume el mismo `leads` ya derivado.

## No-objetivos

- Touch swipe-to-close (out — sin librería de gestos).
- Multi-select / batch actions.
- Sort opciones (sigue `sortScore` desc).
- Cambiar lógica de `buildCaseLeads`, `caseSignals`, filtros.
- Tocar `MapUI/CasePanel`, `CaseMap`, `Explorer`, `Investigations`, `Aportes`, `SidebarFilters`, `FeaturedCasesOverlay`, etc.

## Decisiones

| Pregunta | Decisión |
|---|---|
| Dirección | Drawer sale a la derecha de la sidebar, sobre el mapa |
| Forma de card | Mismo formato actual con más aire |
| Trigger | Row full-width en sidebar: ícono + título + count + chevron |
| Page size | 8 (vs 12 actual) |
| Cerrar | X header + Esc + re-click del botón (toggle). Click fuera NO cierra |
| Auto-close al seleccionar caso | Sí (para no solapar con CasePanel del expediente) |

## Arquitectura

### Archivos

**Nuevos:**
```
src/components/RegionalMap/LeadsPanel.tsx
src/components/RegionalMap/LeadsPanel.module.css
```

**Modificados:**
- `src/components/FaroExperience.tsx` — agrega state `leadsPanelOpen`, renderiza `<LeadsPanel>` como hermano de `<CountrySidebar>`, pasa props.
- `src/components/RegionalMap/CountrySidebar.tsx` — elimina la `<section className={styles.cpLeadsSection}>` con su lista, paginación y todos los imports/state asociados (`ChevronLeft`, `ChevronRight`, `ArrowRight`, `pagedLeads` useMemo, `page` useState, `PAGE_SIZE`, etc.). Reemplaza por un `<button>` row tipo "Casos a revisar · {count} ▶" que llama `onOpenLeadsPanel()`. Recibe nuevas props: `onOpenLeadsPanel`, `leadsPanelOpen`, `leadsCount`.
- `src/components/RegionalMap/RegionalMap.module.css` — sumar reglas `.cpLeadsButton`, `.cpLeadsButtonActive`, `.cpLeadsButtonIcon`, `.cpLeadsButtonLabel`, `.cpLeadsButtonCount`, `.cpLeadsButtonChevron`. Eliminar `.cpLeadsList`, `.cpLeadsListItem`, `.cpPagination`, `.cpPageButton`, `.cpPageStatus`, y cualquier regla scoped a la lista que ya no se usa (si quedan referenciadas por LeadsPanel.module.css con sus propios nombres, no se borran las globales; pero como el panel tiene su propio CSS module, podemos retirar las reglas viejas).

**NO se tocan** (verificación post-merge con git diff):
- `src/components/MapUI/` (todo)
- `src/components/CaseMap.tsx`, `CaseDetails.tsx`
- `src/components/Explorer/`, `Investigations/`, `Aportes/`
- `src/components/RegionalMap/SidebarFilters.tsx`, `MapLegend.tsx`, `MobileHeader.tsx`, `WelcomeOverlay.tsx`, `FeaturedCasesOverlay.tsx`, `CountryMap.tsx`, `RegionalSidebar.tsx`, `SidebarBrand.tsx`, `FloatingModeToggle.tsx`, `TrustStrip.tsx`

### Contratos

```ts
// LeadsPanel.tsx
interface Props {
  open: boolean;
  leads: CaseLead[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  onClose: () => void;
}
```

`leads` ya viene filtrado y ordenado por `FaroExperience`. `LeadsPanel` solo presenta + pagina.

```ts
// CountrySidebar.tsx — nuevas props
onOpenLeadsPanel: () => void;
leadsPanelOpen: boolean;
leadsCount: number;
```

Drop: `leads`, ya no lo usa directamente (el conteo viene como número plano).

### Data flow

1. `FaroExperience` computa `leads` (ya pasa).
2. Estado nuevo: `const [leadsPanelOpen, setLeadsPanelOpen] = useState(false);`
3. Sidebar recibe `leadsCount={leads.length}`, `leadsPanelOpen={leadsPanelOpen}`, `onOpenLeadsPanel={() => setLeadsPanelOpen(o => !o)}` (toggle).
4. `<LeadsPanel>` recibe `open={leadsPanelOpen}`, `leads`, `selectedCaseId`, `onSelectCase`, `onClose={() => setLeadsPanelOpen(false)}`.
5. El `onSelectCase` que recibe LeadsPanel envuelve el de FaroExperience: `(id) => { setSelectedCaseId(id); setLeadsPanelOpen(false); }`. **El cierre automático al seleccionar caso vive en FaroExperience**, no dentro del panel — más simple y reusable.

### Pagination state

Vive **dentro de LeadsPanel** (movido desde CountrySidebar).

```tsx
const PAGE_SIZE = 8;
const [page, setPage] = useState(0);
const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));

useEffect(() => {
  setPage(0);
}, [leads.length, leads[0]?.leadId]);

const safePage = Math.min(page, totalPages - 1);
const pageStart = safePage * PAGE_SIZE;
const pagedLeads = useMemo(
  () => leads.slice(pageStart, pageStart + PAGE_SIZE),
  [leads, pageStart],
);
```

## Visual

### Botón en sidebar

Reemplaza `.cpLeadsSection`. CSS:

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

JSX en CountrySidebar (reemplaza la sección):

```tsx
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
      <span className={styles.cpLeadsButtonCount}>{leadsCount.toLocaleString("es-AR")}</span>
    )}
  </span>
  <ChevronRight size={14} aria-hidden className={styles.cpLeadsButtonChevron} />
</button>
```

### LeadsPanel

Estructura (3 zonas):
- Header sticky (56px alto): título + count + close button
- List scrollable (flex: 1)
- Footer sticky: paginación

```tsx
<aside
  id="leads-panel"
  className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
  role="dialog"
  aria-modal="false"
  aria-labelledby="leads-panel-title"
  aria-hidden={!open}
>
  <header className={styles.header}>
    <h2 id="leads-panel-title" className={styles.title}>
      Casos a revisar <span className={styles.titleCount}>· {leads.length}</span>
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
    {pagedLeads.map((lead) => (
      <LeadCard
        key={lead.leadId}
        lead={lead}
        active={lead.caseId === selectedCaseId}
        onClick={() => onSelectCase(lead.caseId)}
      />
    ))}
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
      <span className={styles.pageStatus}>{safePage + 1} / {totalPages}</span>
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
```

`<LeadCard>` es un componente interno del archivo (no se exporta) que recrea el mismo JSX visual de la card actual (`.cpLeadCard`), pero re-styled con CSS del módulo nuevo (más padding, más aire). Mantiene el contrato visual: icon de severidad + meta (sourceName) + título completo + por qué + chevron derecho.

### CSS LeadsPanel.module.css

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
  margin-left: 2px;
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

.leadIconHigh   { color: #d94c3a; border-color: rgba(217, 76, 58, 0.55); background: rgba(217, 76, 58, 0.12); box-shadow: 0 0 0 1px rgba(217, 76, 58, 0.18); }
.leadIconMedium { color: #e07a5f; border-color: rgba(224, 122, 95, 0.55); background: rgba(224, 122, 95, 0.12); }
.leadIconLow    { color: #d4a04a; border-color: rgba(212, 160, 74, 0.55); background: rgba(212, 160, 74, 0.1); }

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

### Escape key handling

Dentro de `LeadsPanel`:

```tsx
useEffect(() => {
  if (!open) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [open, onClose]);
```

### Selección de caso

En `FaroExperience`:

```tsx
const handleSelectLead = useCallback((caseId: string) => {
  setSelectedCaseId(caseId);
  setLeadsPanelOpen(false);
}, []);

// y luego:
<LeadsPanel
  open={leadsPanelOpen}
  leads={leads}
  selectedCaseId={selectedCase?.id ?? null}
  onSelectCase={handleSelectLead}
  onClose={() => setLeadsPanelOpen(false)}
/>
```

### Modo Explorer / otros

El botón "Casos a revisar" solo aparece en `viewMode === "map"` (igual que el actual `.cpLeadsSection`). El LeadsPanel se renderiza únicamente si `viewMode === "map"` también; `FaroExperience` lo wrapea en `{viewMode === "map" && <LeadsPanel ... />}`. Adicionalmente, si `viewMode` cambia a algo distinto de "map" mientras el panel está abierto, se fuerza `setLeadsPanelOpen(false)` via un `useEffect` con dep `[viewMode]`.

## Verificación

**Smoke matrix manual** (`npm run dev` → `http://127.0.0.1:3002/pais/AR`):

1. Carga inicial: sidebar muestra botón "Casos a revisar · 50". Sin lista inline.
2. Click botón → panel desliza desde la izq. Chevron rota a ▼. Botón queda en active.
3. Header del panel muestra título + count + X. Footer paginación `◀ 1/7 ▶` (50/8≈7).
4. Click ▶ → página 2. Click ◀ → 1. Disabled extremos.
5. Click en card → caso seleccionado, panel se cierra, `<CasePanel>` del expediente abre a la derecha.
6. Esc → panel cierra.
7. Re-click del botón sidebar mientras abierto → cierra (toggle).
8. Cambio de filtros: count del botón actualiza. Si panel abierto, lista actualiza y vuelve a página 1.
9. Filtros count=0 → botón disabled con texto "Sin alertas para estos filtros".
10. Resize <720px → panel full-width.
11. `prefers-reduced-motion: reduce` → sin slide.
12. Toggle a Explorer → panel se cierra automáticamente; botón desaparece (gating por viewMode).

**Técnica:**

```bash
npm run typecheck
npm run test
```

**No-regresión:**

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

Debe estar vacío.

## Out of scope

- Touch swipe-to-close (sin libs de gestos).
- Sort options (mantiene `sortScore` desc).
- Multi-select.
- Animar la lista al paginar (basta el cambio instantáneo).
- Tests automáticos UI (no hay jsdom harness).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Panel se solapa con CasePanel a la derecha (en pantallas < 1100px) | LeadsPanel se cierra auto al seleccionar caso; el solape solo dura un click |
| Esc listener interfiere con otros componentes (CasePanel también escucha Esc) | Listener solo activo mientras `open === true`; cuando ambos paneles están abiertos en un mismo Esc... LeadsPanel se cierra y CasePanel también — aceptable (un solo Esc cierra todos los overlays activos) |
| Sidebar tiene scroll vertical interno; botón debe verse | El botón vive dentro de `.cpLeadsSection` que tiene `flex: 1 1 0`; siempre visible |
| `leads` cambia con filtros mientras panel abierto | useEffect resetea pagination a 0 cuando cambia identidad de `leads[0]?.leadId` o `length` |
| Animación `@starting-style` no soportada (browsers < Chrome 117) | Fallback graceful — el panel aparece sin slide, sigue funcional |

## Notas para el implementer

1. Branch `feat/casos-revisar-panel`. Nunca push sin pedir. Nunca commit a `main`.
2. Spec primero: este archivo.
3. NO tocar nada fuera de los 4 archivos listados (CountrySidebar, FaroExperience, RegionalMap.module.css, + los 2 nuevos LeadsPanel*).
4. Verificar después de cada cambio con `npm run typecheck` y `git diff main..HEAD` que solo toca archivos esperados.
5. La pagination state vive en LeadsPanel, NO en CountrySidebar (movida).
6. El `onSelectCase` que pasa FaroExperience al LeadsPanel **debe cerrar el panel** además de seleccionar.
