# PE/CL Data & Geography Sprint Handoff

Fecha: 2026-05-17

## Objetivo

Ampliar Peru y Chile sin convertir Faro en una demo de puntos inventados. El sprint suma expedientes verificables, receipts oficiales y referencias territoriales honestas. La regla central es:

> Un punto administrativo ayuda a navegar, pero no prueba que la obra o servicio ocurra exactamente ahi.

## Que Se Agrego

- Peru:
  - `PE-OECE-CONTRATOS` sube a 500 contratos OECE.
  - `PE-OECE-OCDS` sube a 494 releases oficiales enlazados; 1 convocatoria devolvio 404 y queda registrada como fallo de cobertura.
  - `PE-IDEP-LIMITE-DISTRITAL` agrega 1891 centroides distritales oficiales desde IDEP.
  - 469 contratos PE ahora tienen `geoEvidence` y coordenada de mapa como centroide distrital oficial.

- Chile:
  - `CL-CHILECOMPRA-OCDS-PROCESOS` agrega 500 procesos OCDS de enero 2026.
  - `CL-CIREN-LIMITE-COMUNAL` agrega 345 centroides comunales oficiales desde CIREN.
  - Mercado Publico clasico se mantiene como muestra de detalle/API con 25 casos porque el ticket puede responder 429.
  - 217 casos CL tienen `geoEvidence` y coordenada de mapa como centroide comunal del comprador.

## Modelo Nuevo

Se agrego `geoEvidence` en `src/lib/data/geoEvidence.ts`.

Campos importantes:

- `precision`: `official_admin_centroid`, `official_point`, `official_address`, etc.
- `granularity`: `district`, `commune`, `region`, etc.
- `sourceId`: fuente oficial que justifica la referencia territorial.
- `sourceField`: campo usado para el match.
- `confidence`: confianza de la referencia.
- `exposeOnMap`: si puede dibujarse.
- `satelliteEligible`: si sirve para satelite.
- `caveat`: advertencia legible para UI/export.

En este sprint, PE/CL usan `official_admin_centroid` y `satelliteEligible: false`.

## Semantica UX

Para UI/UX:

- Mostrar estos puntos como "referencia territorial" o "centroide administrativo".
- No mostrarlos como "ubicacion exacta".
- No habilitar comparacion satelital automatica sobre estos puntos.
- En expediente o inspector, el copy deberia decir:
  - Peru: "Centroide distrital oficial; no es sitio exacto de ejecucion."
  - Chile: "Centroide comunal oficial del comprador; no es sitio exacto de ejecucion."

## Conteos Validados

Despues de regenerar datos:

- Total: 1608 casos, 9 datasets, 3995 receipts, 0 errores de data spine.
- Argentina: 558 casos, 413 map-eligible.
- Peru: 525 casos, 469 map-eligible, 469 con `geoEvidence`.
- Chile: 525 casos, 217 map-eligible, 217 con `geoEvidence`.

## Fuentes Nuevas

- `PE-IDEP-LIMITE-DISTRITAL`
  - Archivo: `data/official/pe/idep-district-centroids.json`
  - Uso: centroides distritales para matches de texto oficial OECE/OCDS.

- `CL-CIREN-LIMITE-COMUNAL`
  - Archivo: `data/official/cl/ciren-commune-centroids.json`
  - Uso: centroides comunales del comprador para procesos ChileCompra.

- `CL-CHILECOMPRA-OCDS-PROCESOS`
  - Archivo: `data/official/cl/chilecompra-ocds-procesos-2026-01.sample.json`
  - Uso: procesos OCDS masivos sin depender del ticket de la API clasica.

## Decisiones Tecnicas

- `coordinates` ahora puede venir de un centroide administrativo, pero siempre queda explicado por `geoEvidence`.
- `caseSignals.ts` cambia el label de esos puntos a "Referencia territorial validada".
- Sentinel/Wayback no se habilita para centroides administrativos.
- `fetch-official-snapshots.ts` soporta `FARO_REUSE_SNAPSHOTS=1` para no repetir descargas masivas cuando una corrida falla despues de escribir archivos caros.
- El endpoint IDEP necesita paginas chicas con geometria.
- El endpoint CIREN necesita geometria simplificada (`geometryPrecision` y `maxAllowableOffset`) para no fallar por payload enorme.
- ChileCompra clasico puede devolver 429; para volumen usar OCDS.

## Comandos De Verificacion

Comandos usados:

```bash
npm run data:fetch
FARO_REUSE_SNAPSHOTS=1 npm run data:fetch
npm run data:build
npm run data:verify
npm run data:quality-report
npm run data:geo-report
```

Antes de cerrar el sprint tambien deben pasar:

```bash
npm test
npm run typecheck
npm run build
```

## Siguiente Paso Recomendado

Separar visualmente en UI tres niveles:

- sitio/direccion oficial,
- centroide administrativo,
- sin geometria.

Esto evita que el mapa prometa mas precision que la evidencia permite y deja listo el camino para que el equipo satelital trabaje solo sobre puntos realmente aptos.
