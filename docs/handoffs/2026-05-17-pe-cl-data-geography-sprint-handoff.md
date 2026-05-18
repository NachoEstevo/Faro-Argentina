# PE/CL Data & Geography Sprint Handoff

Fecha: 2026-05-17

## Objetivo

Ampliar Peru y Chile sin convertir Faro en una demo de puntos inventados. El sprint suma expedientes verificables, receipts oficiales y referencias territoriales honestas. La regla central es:

> Un punto administrativo ayuda a navegar, pero no prueba que la obra o servicio ocurra exactamente ahi.

## Que Se Agrego

- Peru:
  - `PE-OECE-CONTRATOS` sube a 500 contratos OECE.
  - `PE-OECE-CONTRATOS-HISTORICOS` agrega 84 contratos seleccionados, 12 por ano entre 2018 y 2024.
  - `PE-OECE-OCDS` sube a 494 releases oficiales enlazados; 1 convocatoria devolvio 404 y queda registrada como fallo de cobertura.
  - El snapshot OCDS historico agrega 79 releases relacionados para los contratos historicos seleccionados.
  - `PE-IDEP-LIMITE-DISTRITAL` agrega 1891 centroides distritales oficiales desde IDEP.
  - 550 contratos PE tienen `geoEvidence` y coordenada de mapa como centroide distrital oficial.

- Chile:
  - `CL-CHILECOMPRA-OCDS-PROCESOS` agrega 675 procesos OCDS: una muestra controlada de enero 2019-2025 con 25 registros por ano, mas 500 registros de enero 2026.
  - `CL-CIREN-LIMITE-COMUNAL` agrega 345 centroides comunales oficiales desde CIREN.
  - Mercado Publico clasico se mantiene como muestra de detalle/API con 25 casos porque el ticket puede responder 429.
  - 292 casos CL tienen `geoEvidence` como referencia comunal oficial del comprador, pero 0 son map-eligible porque esa referencia no prueba el sitio exacto de ejecucion.

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
Peru puede exponer centroides distritales como referencia territorial de mapa.
Chile conserva centroides comunales del comprador solo como referencia
administrativa en Explorer/export (`exposeOnMap: false`), porque no prueba el
sitio exacto de ejecucion.

## Semantica UX

Para UI/UX:

- En Peru, mostrar estos puntos como "referencia territorial" o "centroide administrativo".
- En Chile, mostrar la referencia comunal como metadata/caveat de territorio, no como punto de mapa.
- No mostrarlos como "ubicacion exacta".
- No habilitar comparacion satelital automatica sobre estos puntos.
- En expediente o inspector, el copy deberia decir:
  - Peru: "Centroide distrital oficial; no es sitio exacto de ejecucion."
  - Chile: "Centroide comunal oficial del comprador; no es sitio exacto de ejecucion."

## Conteos Validados

Despues de regenerar datos:

- Total: 1867 casos, 17 datasets, 4510 receipts, 0 errores de data spine.
- Argentina: 558 casos, 411 map-eligible.
- Peru: 609 casos, 550 map-eligible, 550 con `geoEvidence`.
- Chile: 700 casos, 0 map-eligible, 292 con `geoEvidence` administrativo no dibujable.

Importante: Chile no es cobertura historica completa. Es una muestra oficial
controlada por periodos que prueba el pipeline y suma expedientes reales para
Explorer; cualquier UI o doc debe evitar presentarla como universo completo de
ChileCompra.

## Fuentes Nuevas

- `PE-IDEP-LIMITE-DISTRITAL`
  - Archivo: `data/official/pe/idep-district-centroids.json`
  - Uso: centroides distritales para matches de texto oficial OECE/OCDS.

- `CL-CIREN-LIMITE-COMUNAL`
  - Archivo: `data/official/cl/ciren-commune-centroids.json`
  - Uso: centroides comunales del comprador para procesos ChileCompra.

- `CL-CHILECOMPRA-OCDS-PROCESOS`
  - Archivos: `data/official/cl/chilecompra-ocds-procesos-2019-01.sample.json`
    hasta `data/official/cl/chilecompra-ocds-procesos-2026-01.sample.json`.
  - Uso: procesos OCDS por periodos sin depender del ticket de la API clasica.

- `PE-OECE-CONTRATOS-HISTORICOS`
  - Archivo: `data/official/pe/oece-contratos-historicos-seleccionados.json`
  - Uso: seleccion reproducible de contratos de alto monto 2018-2024.

- `PE-OECE-OCDS` historico
  - Archivo: `data/official/pe/oece-ocds-seace-v3-historical-releases.sample.json`
  - Uso: releases OCDS relacionados con los contratos historicos seleccionados.

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
npm run data:fetch:pe-historical
# o, para refrescar todo el set oficial actual:
npm run data:fetch:all
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
