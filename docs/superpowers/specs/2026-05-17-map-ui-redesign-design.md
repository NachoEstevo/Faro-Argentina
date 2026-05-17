# Map UI Redesign — Click panel, controles flotantes, animaciones

**Fecha:** 2026-05-17
**Branch:** `feat/ui-map`
**Autor:** Juan + Claude

## Contexto

El experience principal de Faro en modo "map" se ve hoy denso y datado: el panel del expediente que aparece al clickear un dot tira ~12 secciones de una sola vez (8 metrics, hash y rawPath visibles, varios `<dl>` técnicos, sin acordeones); los controles del mapa están dispersos (ZoomControl de Leaflet bottom-right, slider Wayback abajo-izquierda en su propio aside, MapLegend overlay flotante separado); no hay animaciones de entrada/salida ni shared elements. La referencia visual que pidió el usuario es Statistics Norway Wayfinder (`kart.ssb.no/wayfinder`) — respiración generosa, jerarquía clara, controles agrupados, transiciones suaves.

Trabajo en paralelo: otra persona está iterando en el Explorer y en `CountrySidebar`. Este rediseño NO debe pisar esos archivos.

## Objetivos

1. Reducir ruido visual en el panel del click sin perder info: sólo lo crítico visible, lo técnico colapsado.
2. Agrupar todos los controles del mapa en un dock vertical bottom-right.
3. Mover el slider Wayback dentro del panel del caso seleccionado (contexto inline).
4. Sumar animaciones modernas: CSS `@starting-style` + React 19 `<ViewTransition>`.
5. Mantener tema oscuro coherente con el resto de Faro.

## No-objetivos

- Mobile bottom-sheet con drag-to-dismiss.
- Cambiar la lógica de filtros (siguen en sidebar).
- Animaciones de las polylines de "Rastro visual".
- Framework de tests UI nuevo (Playwright/Vitest jsdom).
- Tocar `CaseDetails.tsx`, `CountrySidebar`, `RegionalSidebar`, `ExplorerView` — Explorer en desarrollo paralelo (ver nota abajo sobre `CaseDetails`).

## Decisiones

| Pregunta | Decisión | Razón |
|---|---|---|
| Tema visual | Oscuro Faro + respiración Norway | Coherencia con sidebar y resto del app |
| Densidad info panel | Compacto + acordeones para detalles técnicos | Click sirve para triage rápido, no para deep dive |
| Layout controles | Stack único bottom-right vertical | Concentra acciones del mapa en un solo dock |
| Wayback año | Inline en el panel del caso seleccionado | El año es del caso, no global |
| Animaciones | CSS `@starting-style` + React 19 `<ViewTransition>` | Modernas, sin librerías nuevas |
| Toggle basemap | Incluido (dark / satellite) | Funcionalidad nueva chica, usa el mismo dock |

## Arquitectura

Todos los componentes nuevos viven en `src/components/MapUI/`. Boundaries claras: `MapDock` no sabe del caso, `CasePanel` no sabe del mapa.

```
src/components/MapUI/
  CasePanel.tsx              # reemplaza CaseDetails dentro del <aside className="casePanel"> SOLO en modo map
  panel/
    PanelHero.tsx            # kicker + título + chips severidad
    PanelFacts.tsx           # grid 2x2 de 4 facts críticos
    PanelWhy.tsx             # subtítulo + summary 2-3 oraciones
    PanelImagery.tsx         # wrapper que monta WaybackControl inline; sólo si caseFile.coordinates
    PanelTechDetails.tsx     # <details> colapsable: hash, rawPath, related receipts, signal panel completo, metrics secundarios
    PanelNextSteps.tsx       # <details> colapsable: nextVerification items
    PanelActions.tsx         # Ver fuente, Exportar, Rastro visual toggle
  MapDock.tsx                # stack vertical bottom-right
  LayersPopover.tsx          # popover anchored al botón Capas
  LegendPopover.tsx          # popover anchored al botón Leyenda
  MarkerTooltip.tsx          # mini-card que reemplaza el children del <Tooltip> Leaflet
  mapUI.module.css           # estilos del módulo (scoped)
```

### Cambios en archivos existentes (quirúrgicos)

**`src/components/FaroExperience.tsx`:**
- Reemplaza `<CaseDetails ...>` dentro del `<aside className="casePanel">` (`viewMode === "map"`) por `<CasePanel ...>`.
- Elimina el render de `<MapLegend>` del `overlayLayer` (contenido se sirve desde `LegendPopover`).
- No toca `CountrySidebar`, `MobileHeader`, `ExplorerView`, ni la rama `viewMode === "explorer"`.

**`src/components/CaseMap.tsx`:**
- Elimina `<ZoomControl position="bottomright" />` Leaflet.
- Elimina el `<Tooltip>` actual con `<strong>` + `<span>` plano. Lo reemplaza por `<Tooltip>` envolviendo `<MarkerTooltip caseFile={...} severity={...} />`.
- Elimina el render de `<WaybackControl>` como hermano de `<MapContainer>`. La lógica de wayback state queda en `CaseMap` o se sube a `FaroExperience` y se pasa al `CasePanel` via props (decisión en plan).
- Agrega un sub-componente interior que usa `useMap()` y expone refs/handlers para que el `MapDock` externo pueda invocar `zoomIn`/`zoomOut`. Patrón: el dock se monta fuera de `MapContainer`, el sub-componente publica un handler en un ref pasado desde `FaroExperience`, o usa React context. Decisión técnica en el plan, lo más simple es un ref + un componente puente.
- Agrega state `basemap: 'dark' | 'satellite'` y renderiza el `<TileLayer>` correspondiente (CartoDB dark vs Esri imagery), salvo cuando wayback active (caso con coordenadas y release válido), que sigue ganando.

**No se tocan**:
- `src/components/CaseDetails.tsx` — hoy sólo se importa desde `FaroExperience.tsx` para el panel del mapa. Tras este rediseño queda sin uso, pero NO se borra ni se modifica: el otro dev puede estar refactorizándolo para reutilizarlo en Explorer detail view. Si confirma que no lo va a usar, se elimina en un PR posterior junto con `CountryExplorer` y `EmptyCountry` (también declarados en ese archivo y sin uso actual).
- `src/components/RegionalMap/CountrySidebar.tsx`, `RegionalSidebar.tsx`.
- `src/components/Explorer/ExplorerView.tsx`.
- `src/components/RegionalMap/MobileHeader.tsx`.
- `src/components/RegionalMap/MapLegend.tsx` (queda como código no usado; se borra en un PR separado de cleanup).
- `src/components/WaybackControl.tsx` por dentro; sólo se override su contenedor con CSS del módulo nuevo cuando vive dentro de `PanelImagery`.

### Contratos de componentes

**`CasePanel`** — mismo shape que `CaseDetails` + `onClose`:
```ts
interface Props {
  caseFile: ExplorerCase;
  dataset: CaseDataset;
  signalContext?: CaseSignalContext;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
  onClose: () => void;
}
```

**`MapDock`** — no sabe del caso:
```ts
interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  basemap: 'dark' | 'satellite';
  onBasemapChange: (next: 'dark' | 'satellite') => void;
  severityCounts: { high: number; medium: number; total: number };
  shifted: boolean;   // true cuando CasePanel está abierto → translateX(-420px)
}
```

**`MarkerTooltip`** — JSX puro:
```ts
interface Props {
  caseFile: ExplorerCase;
  severity: CaseAlertSeverity | null;
}
```

## Diseño visual

### CasePanel layout

Top → bottom:
1. Close button top-right (32×32, ghost icon X).
2. Kicker all-caps tracking-wide 11px: "EXPEDIENTE VERIFICABLE".
3. Título H1 22-24px peso 600, line-height 1.25.
4. Chips de severidad (máx 3) redondeados.
5. Divider 1px rgba blanco 0.06.
6. Subtítulo all-caps "POR QUÉ APARECIÓ" + summary 14px line-height 1.55.
7. Divider.
8. Grid 2×2 de 4 facts críticos: MONTO (con USD inline), AÑO, ORGANISMO, PROVEEDOR. Cards anidadas radius 10, fondo rgba 0.03, border rgba 0.06.
9. Divider.
10. Subtítulo "IMAGEN SATELITAL" + `<PanelImagery>` envolviendo `<WaybackControl>` con override de estilos. Sólo si `caseFile.coordinates`.
11. Divider.
12. `<details>` "Detalles técnicos" — adentro: signal panel completo, fuente, locator, hash, rawPath, extraído, related receipts.
13. `<details>` "Qué verificar después" — `nextVerification.slice(0, 5)`.
14. Divider.
15. Acciones: 2 botones lado a lado (Ver fuente, Exportar) + 1 botón ancho debajo (Rastro visual, disabled si no hay geometría).

**Estilo global del panel:**
- Width 380-420px desktop, full-screen mobile.
- Background `#0d0f13` + overlay `linear-gradient(180deg, rgba(255,255,255,0.02), transparent 40%)`.
- Border-left 1px rgba blanco 0.08.
- Padding horizontal 28, vertical 24 entre secciones.
- Scroll interno con scrollbar custom.

### MapDock layout

Stack vertical 40px ancho, bottom 20px, right 20px:
- Botón `+` (zoom in)
- Botón `−` (zoom out)
- Divider más marcado
- Botón `⧉` (Capas — `Layers` icon)
- Divider sutil
- Botón `ⓘ` (Leyenda — `Info` icon)

Container: border-radius 12, background `rgba(13,15,19,0.92)` + `backdrop-filter: blur(12px)`, border 1px rgba 0.08, shadow `0 8px 24px rgba(0,0,0,0.4)`.

Botones 40×40, icono 16px. Estados: default (icono rgba blanco 0.7) / hover (bg rgba 0.06, icono blanco) / active popover (bg acento 0.12, indicator 2px borde izq) / disabled (icono rgba 0.25).

**Popovers anchored a la izquierda del dock**, transform-origin right-center:
- `LayersPopover`: radios "Dark (CartoDB)" / "Satelital (Esri)" + texto gris explicando Wayback contextual.
- `LegendPopover`: 3 ítems con dot color severidad + label + count (mismo contenido que `MapLegend.tsx` actual).

Cerrar popover: click fuera (overlay invisible), Esc, click mismo botón.

### MarkerTooltip layout

Mini-card 240px:
- Chip severidad arriba (chico, 10px).
- Título 13px peso 600, máx 2 líneas truncadas con `-webkit-line-clamp: 2`.
- Meta 11px rgba 0.6: `agencyName · year`.

Background `rgba(13,15,19,0.95)` + blur, radius 10, padding 12×14, pointer abajo via `::after`, offset Leaflet `[0,-12]`, `pointer-events: none`.

### Micro-interacciones dots

- Hover: `r` +1, `weight` +0.5, halo concéntrico (segundo `<CircleMarker>` `fillOpacity: 0` `weight: 2` color severidad), transición SVG `r 150ms ease-out`.
- Selected: halo grande (radius 16, fillOpacity 0.12) con `@keyframes pulse` 2.4s loop. Pausa bajo `prefers-reduced-motion`.

### Map/Explorer toggle (top center)

Mantener posición y lógica. Sólo refresh CSS: bg `rgba(13,15,19,0.92)` + blur, border rgba 0.08, pill activa con `box-shadow: 0 0 0 1px rgba(acento, 0.4)`.

## Animaciones

### CSS moderno (`@starting-style` + `transition-behavior: allow-discrete`)

Easing global: `cubic-bezier(0.32, 0.72, 0, 1)`.

| Elemento | Trigger | Animación |
|---|---|---|
| CasePanel enter | abrir caso | `translateX(20px) → 0` + opacity, 280ms |
| CasePanel exit | cerrar | inverso, 220ms |
| Popovers | toggle | `translateX(8px) → 0` + opacity + `scale(0.96) → 1`, 180ms |
| Dock mount | inicial | `translateY(12px) → 0` + opacity, 240ms con 80ms delay |
| Dock shift | panel open/close | `transform: translateX(-420px)`, 280ms |
| `<details>` | open/close | `interpolate-size: allow-keywords` + height auto; fallback rotación chevron 200ms |
| Marker hover halo | mouseover/out | `r 150ms ease-out` SVG |
| Selected marker pulse | selección | `@keyframes` 2.4s loop |
| MarkerTooltip | hover | `opacity 0→1` + `translateY(-4px)→0`, 140ms |
| Toggle activo | switch | `box-shadow` cross-fade 200ms |
| Dock buttons | hover/active | `background-color` 120ms + `scale(0.96)` `:active` 80ms |

Global respect `prefers-reduced-motion: reduce` deshabilita animaciones (transition/animation duration 0.01ms).

### React 19 `<ViewTransition>`

Tres usos:

**(1) Marker → CasePanel hero (shared element):**
`view-transition-name: marker-${caseFile.id}` aplicado al CircleMarker (path SVG via ref) y al chip de severidad en `PanelHero` cuando `caseFile.id` coincide. React anima posición/tamaño nativamente.

*Riesgo:* aplicar `viewTransitionName` a un elemento renderizado por Leaflet requiere ref al SVG path. Si en implementación se vuelve frágil, **fallback: desactivar este shared transition específico, mantener CSS panel slide-in**. El resto del plan no depende de esto.

**(2) Basemap toggle (dark ↔ satellite):**
```ts
const handleBasemapChange = (next: Basemap) => {
  if (!document.startViewTransition) { setBasemap(next); return; }
  document.startViewTransition(() => setBasemap(next));
};
```
Cross-fade nativo entre TileLayers.

**(3) Viewmode toggle (map ↔ explorer):**
Wrap `setViewMode` en `startViewTransition` para cross-fade entre mapa y explorer backdrop.

Skill a usar en implementación: `vercel-react-view-transitions`.

## Verificación

### Manual (dev server `http://127.0.0.1:3002`)

- Carga AR: dock entra, no aparecen viejos ZoomControl ni MapLegend.
- Hover dot: halo + mini-card tooltip.
- Click dot: panel slide-in, dock shift, marker pulse.
- Acordeones "Detalles técnicos" y "Qué verificar después" expanden.
- Slider Wayback inline cambia tiles.
- Acciones Ver fuente / Exportar funcionan.
- Cerrar (X o Esc): panel slide-out, dock vuelve.
- Capas popover: cambio dark↔sat cross-fade.
- Leyenda popover: counts correctos.
- Toggle Map/Explorer: cross-fade; Explorer renderiza idéntico a main.
- Resize 900px: panel full-screen mobile.
- `prefers-reduced-motion`: sin pulse ni slide.
- Caso sin coordenadas: panel sin sección "Imagen satelital".

### No-regresión Explorer

```bash
git diff main..HEAD -- src/components/Explorer/ \
  src/components/RegionalMap/CountrySidebar.tsx \
  src/components/RegionalMap/RegionalSidebar.tsx \
  src/components/CaseDetails.tsx \
  src/components/RegionalMap/MobileHeader.tsx
```
Debe estar vacío.

### Técnica

```bash
npm run typecheck   # debe pasar
npm run test        # mapMarkers.test.ts debe pasar
```

### Accesibilidad

- Tab order: dock → markers → panel → acordeones → acciones.
- Esc cierra panel y popovers.
- Botones del dock con `aria-label` y `title`.
- `<details>`/`<summary>` con navegación de teclado nativa.
- Contraste WCAG AA mantenido (mismos tokens oscuros).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| ViewTransition sobre SVG path Leaflet frágil | Fallback: desactivar shared transition marker→panel, mantener CSS slide-in |
| `@starting-style` no soportado en browsers viejos | Fallback graceful: el panel aparece sin animar (browsers <Chrome 117 ya son <2% global) |
| Trabajo paralelo en Explorer pisa archivos | Lista explícita de archivos no-tocar en spec; verificación con `git diff` en checklist. `CaseDetails.tsx` se preserva intacto aunque hoy quede sin referencias, porque el otro dev puede estar enganchándolo desde Explorer detail. |
| Dock se solapa con panel en pantallas chicas | `transform: translateX(-420px)` cuando panel abierto; en mobile el panel es full-screen y el dock se oculta |
| `MapLegend.tsx` queda muerto | Aceptable; cleanup en PR separado si se quiere |

## Out of scope (siguiente pass)

- Mobile bottom-sheet con drag-to-dismiss.
- Animación de polylines "Rastro visual".
- Filtros nuevos en el dock.
- Tests automáticos UI con jsdom.
- Eliminar `MapLegend.tsx` físicamente.
