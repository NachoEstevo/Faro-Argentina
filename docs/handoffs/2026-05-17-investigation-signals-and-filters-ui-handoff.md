# Investigation Signals And Filters UI Handoff

Fecha: 2026-05-17

## Objetivo

Este cambio convierte las senales de Faro de reglas aisladas por expediente a
senales con contexto de coleccion. El producto sigue sin acusar: Faro prioriza
donde mirar, explica por que, muestra evidencia oficial, caveats y el siguiente
paso verificable.

La unidad de producto sigue siendo:

```text
pista verificable -> fuente oficial -> expediente -> evidence pack -> accion
```

## Que datos nuevos puede mostrar UI

Cada senal sigue teniendo los campos anteriores:

- `code`: identificador estable para filtros y analytics.
- `kind`: tipo visual principal.
- `priority`: orden de relevancia.
- `label`: texto corto para chips, filas y pivots.
- `summary`: por que importa.
- `evidence`: dato concreto que sostiene la senal.
- `caveat`: limite de interpretacion.
- `action`: siguiente paso de verificacion.

Ahora tambien puede traer:

- `family`: categoria semantica.
- `severity`: intensidad de revision.
- `confidence`: confianza de la senal.
- `relatedCaseIds`: expedientes relacionados que explican la recurrencia.
- `sourceIds`: reservado para senales multi-fuente.

## Kinds

`kind` es el nivel visual mas simple. Usarlo para color/icono general:

- `watch`: revisar con prioridad.
- `gap`: falta un dato o hay una brecha de trazabilidad.
- `ready`: evidencia o contexto ya disponible.
- `context`: dato util para entender el caso, sin alarma.

## Families

`family` sirve para agrupar filtros o secciones:

- `competition`: oferentes, competencia, reclamos.
- `money`: monto, presupuesto, costo.
- `supplier`: proveedor, recurrencia, alias, concentracion.
- `traceability`: receipts, actas, evidencia cruzada.
- `geo_visual`: geometria oficial y candidato satelital.
- `data_gap`: falta de monto, pagos, avance, geometria confiable.
- `context`: contexto general.

## Senales actuales

### Proveedor

- `repeat_single_bid_winner`
  - Label: Ganador recurrente con baja competencia.
  - Cuando aparece: mismo proveedor, mismo organismo, al menos dos contratos con 1 oferente.
  - Uso UI: esta es una senal fuerte para abrir una ruta investigativa.

- `recurring_supplier_agency`
  - Label: Proveedor recurrente por organismo.
  - Cuando aparece: mismo proveedor aparece en al menos tres contratos del mismo organismo.
  - Uso UI: buen pivot para trazar relacion proveedor-organismo.

- `supplier_concentration`
  - Label: Concentracion proveedor-organismo.
  - Cuando aparece: la mayoria de los contratos cargados del proveedor se concentran en un organismo.
  - Uso UI: mostrar como patron de contexto, no como conclusion.

- `possible_supplier_alias`
  - Label: Posible alias de proveedor.
  - Cuando aparece: nombres similares sin documento fiscal suficiente para resolver identidad.
  - Uso UI: brecha de limpieza/entity-resolution.

### Competencia

- `single_bidder`
  - Label: Competencia baja.
  - Cuando aparece: 1 oferente.

- `limited_competition`
  - Label: Competencia limitada.
  - Cuando aparece: 2 o 3 oferentes.

- `competition_measured`
  - Label: Competencia medida.
  - Cuando aparece: hay cantidad de oferentes y no entra en baja/limitada.

- `high_claim_volume`
  - Label: Reclamos asociados.
  - Cuando aparece: la fuente informa muchos reclamos.

### Dinero

- `amount_over_official_budget`
  - Label: Monto sobre presupuesto.
  - Cuando aparece: el monto supera el presupuesto oficial en mas de 5% y ambas monedas coinciden.

- `missing_amount`
  - Label: Monto faltante.
  - Cuando aparece: compra, contrato o adjudicacion sin monto usable en el snapshot.

### Trazabilidad

- `official_award_act`
  - Label: Acta oficial disponible.
  - Cuando aparece: hay link oficial a acta o detalle de adjudicacion.

- `cross_source_evidence`
  - Label: Evidencia cruzada.
  - Cuando aparece: hay receipts relacionados de otras fuentes oficiales.

- `supplier_identified`
  - Label: Proveedor identificado.
  - Cuando aparece: hay nombre o documento fiscal del proveedor.

### Geografia y satelite

- `official_geometry`
  - Label: Ubicacion oficial validada.
  - Cuando aparece: coordenada oficial pasa los controles geograficos.

- `geometry_needs_review`
  - Label: Geometria requiere revision.
  - Cuando aparece: hay coordenada, pero no pasa controles.

- `missing_official_geometry`
  - Label: Sin geometria oficial.
  - Cuando aparece: el caso es verificable, pero no se dibuja en mapa.

- `sentinel_candidate`
  - Label: Candidato Sentinel-2.
  - Cuando aparece: hay fecha y coordenada suficiente para preparar comparacion satelital.

### Brechas de verificacion

- `payment_verification_gap`
  - Label: Falta pago/avance.
  - Cuando aparece: hay registro de compra/contrato/adjudicacion, pero todavia falta cruzar pago efectivo y avance cuando aplique.

## Filtros disponibles

### Explorer investigador

View model: `src/lib/data/investigatorExplorer.ts`

Filtros:

- `query`: busca por proveedor, organismo, fuente, receipt, senal y texto del expediente.
- `countries`: uno o mas paises.
- `geometry`: `any`, `with`, `without`.
- `signalCode`: una senal concreta.
- `entity`: pivot por `supplier`, `agency`, `source` o `signal`.
- `limit`: cantidad maxima de filas.

La UI actual muestra:

- search box;
- selector de pais;
- selector de geometria;
- selector de senal;
- pivot chips;
- scanner rows;
- inspector compacto en la derecha.

### Lead feed / mapa

View model: `src/lib/data/caseLeads.ts`

Filtros:

- `countryCode`;
- `sourceId`;
- `caseType`;
- `query`;
- `limit`.

Importante: `query` filtra los resultados, pero no destruye el contexto
comparativo. Esto permite buscar un contrato especifico y seguir viendo que es
parte de una recurrencia.

### Exports

APIs:

- `/api/export/:id`: Evidence Pack de un expediente.
- `/api/export?country=AR&sourceId=...&caseType=...&q=...`: paquete de coleccion.
- `/api/signals?...`: feed de senales.
- `/api/leads?...`: feed priorizado.

Filtros de coleccion:

- `country`;
- `sourceId`;
- `caseType`;
- `q`.

Los exports usan el mismo criterio que UI: `q` achica lo exportado, pero las
senales agregadas se calculan contra el scope sin `q`.

## Reglas de contexto y robustez

- Las senales agregadas se calculan por pais. No se mezclan proveedores entre
  Argentina, Peru y Chile.
- La recurrencia se calcula dentro del scope activo sin query. Por ejemplo:
  `country + source + caseType` define el universo; `q` solo encuentra filas.
- Las senales por proveedor prefieren documento fiscal cuando existe. Si no hay
  documento, usan una normalizacion conservadora del nombre.
- Alias de proveedores se muestran como brecha de limpieza, con `confidence: low`.
- Ninguna senal prueba una conclusion. Todas tienen caveat y siguiente paso.
- Los puntos geograficos siguen usando el gate de coordenadas oficiales; si no
  pasan, se muestran como brecha, no como ubicacion valida.

## Como deberia verse para usuarios

### Ciudadano

Debe entender una pista sin leer la tabla completa:

- que paso;
- cuanto dinero o que dato falta;
- quien es el proveedor/organismo;
- por que vale mirar;
- donde abrir la fuente.

### Periodista / investigador

Debe poder pivotear:

- proveedor -> otros contratos;
- organismo -> proveedores recurrentes;
- senal -> casos similares;
- fuente -> receipts comparables;
- expediente -> Evidence Pack.

### Auditor / watchdog

Debe distinguir:

- datos listos;
- datos faltantes;
- patrones de revision;
- evidencia oficial;
- caveats.

## UI guidance

- Mostrar `kind` como estado visual principal.
- Usar `family` para agrupaciones o filtros avanzados.
- Mostrar `confidence` solo si ayuda; no deberia sentirse como un score de culpa.
- No usar lenguaje acusatorio. Evitar terminos como fraude, delito, culpable,
  corrupcion, estafa, abuso, favoritismo o irregularidad.
- El inspector derecho debe seguir siendo compacto: senal principal, hechos,
  evidencia, caveat y accion.
- El expediente completo puede mostrar todas las senales y `relatedCaseIds`.
- Los pivots de proveedor/organismo/senal son mas importantes que un dashboard
  de metricas decorativas.

## Casos reales utiles para probar UI

- `AR-CONTRACT-40/31-1005-CON20`
  - Deberia mostrar `repeat_single_bid_winner` como senal fuerte.
  - Export por id y export filtrado por `q=40/31-1005-CON20` deben coincidir en
    la senal principal.

- `AR-CONTRACT-14-1009-CON21`
  - Buen caso para `recurring_supplier_agency`.

- Casos PE/CL sin geometria
  - Deben seguir siendo utiles en Explorer/export aunque no se dibujen en mapa.

## Archivos importantes

- `src/lib/data/investigationSignalContext.ts`: perfiles agregados por proveedor,
  organismo y alias.
- `src/lib/data/caseSignals.ts`: reglas, copy y metadatos de senales.
- `src/lib/data/investigatorExplorer.ts`: filtros, pivots y filas del scanner.
- `src/lib/data/caseLeads.ts`: feed priorizado del mapa.
- `src/lib/data/caseCollections.ts`: exports de coleccion.
- `src/lib/caseRepository.ts`: wiring de API y Evidence Pack.
- `src/components/CaseSignals.tsx`: chips y panel de senales.
- `src/components/CaseInspector.tsx`: inspector compacto.
- `src/components/CaseDetails.tsx`: expediente visible.

## Validacion actual

Pasaron:

- `npm run typecheck`
- `npm run build`
- tests focalizados de senales, explorer, inspector, expediente, leads y exports

El suite completo sigue bloqueado por el verificador de data spine: hashes raw y
related receipts. Ese problema es de integridad de snapshots/receipts, no de UI.
