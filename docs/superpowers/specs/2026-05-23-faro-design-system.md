# Faro Design System

Fecha: 2026-05-23
Estado: direccion visual aprobada, pendiente de implementacion por fases
Scope: Faro Argentina, producto privado institucional/investigativo

## Principio

Faro debe sentirse como una herramienta institucional de investigacion civica,
no como una landing, una demo ni una interfaz de inteligencia ficcional.

```text
pregunta -> expediente verificable -> fuente oficial -> caveats -> carpeta/export
```

Faro no acusa. La UI debe mostrar evidencia, limites y proximos pasos sin
sugerir culpabilidad, corrupcion, fraude o prueba cerrada.

## Decisiones Aprobadas

### 1. Modo Base

Usar **Oscuro cartografico institucional** para home, mapa operativo, Explorer,
Carpetas, Aportes, admin/revision y navegacion global.

Razon:

- preserva el mapa actual;
- evita una landing generica;
- permite densidad investigativa sobria;
- mantiene coherencia con puntos, overlays y filtros.

### 2. Documentos

Informes descargables y documentos para imprimir deben ser light-only:
fondo blanco, texto oscuro y sin toggle de tema. El objetivo es lectura,
archivo y PDF.

Regla:

- mapa/home: oscuro cartografico fijo;
- Explorer, Carpetas y Aportes: tema de plataforma claro/oscuro;
- informe descargable: claro fijo para leer, citar, imprimir y exportar.

El modo claro de plataforma no reemplaza el informe imprimible: el informe
siempre conserva hoja blanca.

### 3. Home

La home mantiene el mapa como protagonista.

Permitido:

- logo;
- navegacion;
- micro strip de confianza/cobertura;
- entrada discreta a `Expedientes seleccionados`.

Prohibido:

- cards grandes promocionales sobre el mapa;
- callouts de casos curados flotando sobre el canvas;
- hero de marketing;
- puntos editoriales no operativos dibujados como datos.

### 4. Mapa Operativo

La limpieza de home no elimina puntos de `/pais/AR`.

Argentina conserva:

- puntos con geometria oficial validada;
- tooltips;
- click para abrir expediente;
- filtros;
- data gaps en Explorer/export, no dibujados en mapa.

### 5. Expedientes Seleccionados

La capa curada publica se llama **Expedientes seleccionados**.

Debe vivir como preset cerrado en Explorer:

- solo expedientes seleccionados;
- banner sobrio de contexto;
- accion para volver a todos los expedientes;
- sin cantidad minima forzada;
- sin parecer ranking, recomendacion legal ni acusacion.

## Tokens

Base oscura: usar los tokens `--cf-*` existentes en `src/app/globals.css`.
El acento dominante sigue siendo `--cf-accent: #5aa9e5`.

Agregar para documentos claros:

```css
--cf-doc-bg: #f4f1ea;
--cf-doc-surface: #fbfaf6;
--cf-doc-text: #17202b;
--cf-doc-muted: #5e6673;
--cf-doc-border: rgba(23, 32, 43, 0.14);
--cf-doc-accent: #2b6f9f;
```

Reglas:

- Faro blue es el unico acento dominante.
- Green: dato oficial disponible/verificado.
- Caution amber: caveat, brecha o verificacion pendiente.
- Red/orange: errores reales o acciones bloqueadas, no drama investigativo.
- Color siempre va con copy.

## Tipografia

Usar lo ya cargado en `src/app/layout.tsx`:

- headings: `Funnel Sans`;
- body: `Geist`;
- data/numeros/ids: `Geist Mono`.

Reglas:

- no serif en UI de producto;
- no H1 hero gigante centrado;
- montos, ids, CUITs, fechas y conteos en mono;
- labels cortos y concretos.

## Layout

Densidad objetivo: app profesional diaria.

- Home: aire, mapa primero, UI minima.
- Explorer: mas denso para escanear y comparar.
- Expediente: resumen estable + tabs.
- Informe/documento: lectura e impresion.
- Aportes/admin: pasos y estados claros.

Superficies:

- usar cards solo cuando son superficies reales de trabajo;
- preferir bordes, filas divididas, tabs, split panels y headers sticky;
- evitar card dentro de card, secciones decorativas y 3-card rows;
- overlays de mapa: fondo oscuro translucido, borde 1px, inner highlight sutil,
  sin glow y sin negro puro.

## Navegacion

Labels primarios:

- `Mapa`
- `Explorar`
- `Aportar`
- `Carpetas`

Reglas:

- no usar `Mis carpetas` en navegacion principal;
- si falta ancho, usar icono + label corto o collapse responsivo;
- `Aportar` debe ser facil de encontrar desde flujo principal y empty states.

## Contratos Por Superficie

### Home / Regional Map

Debe mostrar mapa, navegacion sobria, trust strip y entrada discreta a
`Expedientes seleccionados`.

Ejemplo de strip:

```text
7.932 expedientes · 431 con punto validado · 4 expedientes seleccionados
```

No debe mostrar cards de casos, callouts Ruta 3 ni copy de marketing.

### Argentina Map

Debe preservar puntos operativos con geometria validada, tooltips, filtros,
click para abrir expediente y caveats de geometria/fuente.

Casos sin geometria quedan en Explorer/export, no como puntos.

### Explorer

Debe tener filtros compactos, preset activo claro, detail con header estable,
tabs, money strip cuando haya datos y `Por que mirar` / `Proximo paso` antes de
tecnica.

`Expedientes seleccionados` debe tener banner, filtro cerrado y salida visible:
`Ver todos los expedientes` o `Limpiar filtro`.

### Expediente / Informe

El expediente dentro de Explorer puede seguir el tema de la plataforma.
El informe descargable debe ser siempre claro, imprimible y sin toggle.
Debe mantener receipt oficial visible, caveats antes de detalles tecnicos,
tablas para analisis y acciones de export/fuente visibles.

Nunca mostrar a usuarios comunes raw HTML, markdown crudo, code fences,
`<think>` o razonamiento interno del modelo.

### Carpetas

Debe usar label `Carpetas`, empty state claro y tabs si crece el contenido:
`Expedientes`, `Entidades`, `Notas`, `Exportar`.

Debe separar datos oficiales de notas del usuario. Sin login como dependencia
del flujo local actual salvo decision explicita posterior.

### Aportes

Estructura recomendada:

1. `Datos`
2. `Archivos`
3. `Revision`

Ningun aporte es publico por defecto. Contacto privado. Fotos/notas son
material enviado, no evidencia oficial. Aprobados siguen separados hasta
curacion manual.

### Admin / Review

Debe tener tabs o segmentos de estado, notas del revisor, trazabilidad por
submission id y acciones claras: `Necesita mas informacion`, `Aprobar para
carga`, `Rechazar`.

## Componentes, Motion Y Accesibilidad

Buttons: primary Faro blue con uso escaso; secondary dark surface + border;
tertiary texto/icono; destructive solo para acciones irreversibles. Todos
necesitan focus, disabled y active tactile state.

Tabs: usar en expediente, carpetas, admin queues y analisis. No crear framework
generico hasta tener 3 usos reales compartidos.

Tables: usar para costos, cronologia, identificadores, receipts y analisis.
Numeros a la derecha y mono. Missing data como gap neutral. Nada de
markdown/HTML/codigo crudo para usuarios comunes.

Chips permitidos: `Fuente oficial`, `Geometria validada`, `Brecha de datos`,
`Requiere verificar`, `Proveedor identificado`, `Competencia medida`.

Chips prohibidos: `sospechoso`, `riesgo alto`, `fraude`, `corrupcion`,
`culpable`.

Motion funcional: hover/active transitions, tab indicator, skeleton shimmer,
overlay entrance sutil, solo transform/opacity.

Evitar cinematic scroll, animaciones decorativas perpetuas, custom cursor, glows
y UI de mapa que se mueva mientras se lee.

Accesibilidad: buttons reales para tabs/toggles, `aria-selected`, focus visible,
labels arriba de inputs, helper/error text bajo inputs, color + copy, sin
overflow horizontal mobile e icon-only controls con label accesible.

## Implementacion

1. **Foundations**
   Agregar tokens claros de documento. Mantener CSS modules/global tokens,
   `lucide-react` y cero UI libraries nuevas.

2. **Home Cleanup**
   Sacar card promocional y callout de caso seleccionado de home. Mantener mapa
   y trust strip.

3. **Explorer Preset**
   Agregar preset cerrado `Expedientes seleccionados`, banner y salida a todos
   los expedientes. Preservar puntos operativos.

4. **Platform Theme Scope**
   Mantener el informe descargable light-only y aplicar Claro/Oscuro solo a
   Explorer, Carpetas y Aportes. El mapa sigue oscuro.

5. **Workflow Polish**
   Carpetas con tabs, Aportes como stepper y admin review con estados/acciones.

## Acceptance

- Home institucional, no promocional.
- Mapa actual central y usable.
- `/pais/AR` mantiene puntos con geometria oficial.
- Preset seleccionado entendible y reversible.
- Explorer, Carpetas y Aportes alternan claro/oscuro.
- Informes descargables son light-only e imprimibles.
- No copy implica culpa, corrupcion, fraude o prueba.
- Caveats visibles.
- Data gaps son informacion de primera clase.
- Navegacion entra en desktop/mobile.
- Analisis no expone HTML, markdown crudo, code fences ni reasoning interno.

## Verification

Antes de release UI:

```bash
npm test
npm run typecheck
npm run build
```

Visual checks: `/`, `/pais/AR`, `/pais/AR?mode=explorer`,
`/pais/AR?mode=explorer&preset=selected`, `/expediente/[id]/informe`,
`Aportar`, `Carpetas`, admin review views.
