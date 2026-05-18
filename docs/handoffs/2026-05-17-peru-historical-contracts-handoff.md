# Peru Historical Contracts Handoff

## Objetivo

Ampliar Peru sin llenar Faro con un dump masivo. La carga historica agrega una
muestra investigativa reproducible de contratos OECE antiguos para que Peru no
quede concentrado en 2024-2026.

## Que Se Agrego

- Fuente primaria nueva: `PE-OECE-CONTRATOS-HISTORICOS`.
- Snapshot compacto: `data/official/pe/oece-contratos-historicos-seleccionados.json`.
- Snapshot OCDS relacionado: `data/official/pe/oece-ocds-seace-v3-historical-releases.sample.json`.
- Script reproducible: `npm run data:fetch:pe-historical`.
- Builder integrado en `scripts/build-cross-country-cases.ts`.

## Cobertura

La muestra selecciona 12 contratos por año:

- 2018: 12
- 2019: 12
- 2020: 12
- 2021: 12
- 2022: 12
- 2023: 12
- 2024: 12

Total: 84 expedientes historicos PE nuevos.

## Criterio De Seleccion

El criterio es deterministico y conservador:

- contrato en PEN;
- monto contratado alto dentro del año;
- `codigo_contrato` presente;
- `codigoconvocatoria` presente;
- descripcion presente;
- RUC de contratista presente;
- URL oficial de contrato presente;
- fecha de suscripcion o publicacion compatible con el año fuente;
- deduplicacion por ID final `PE-CONTRACT-<codigo_contrato>-<num_item>`.

La fuente oficial completa existe por año en OECE/CONOSCE, pero Faro versiona
solo el snapshot compacto seleccionado para no subir cientos de MB de XLSX ni
convertir Explorer en un catalogo bruto.

## Semantica De Producto

Estos casos no son acusaciones. Son expedientes historicos de alto valor para
mirar patrones:

- grandes montos;
- contratacion directa o metodo de compra relevante cuando OCDS lo provee;
- recurrencia de entidades/proveedores;
- obras, combustible, salud, educacion, saneamiento y servicios publicos.

El contrato no prueba pago efectivo ni ejecucion. El caveat debe mantenerse
visible en UI/export.

## Geografia

Cuando hay ubicacion, sigue la regla existente:

- solo centroide administrativo oficial;
- no sitio exacto de ejecucion;
- no elegible como evidencia satelital directa;
- sin coordenadas inventadas.

## Validacion Hecha

- Los 84 casos tienen receipt primario con hash contra el snapshot compacto.
- Los 84 tienen receipt OCDS relacionado.
- Los 84 tienen conversion FX o caveat de FX.
- Los 84 tienen caveats.
- Los 84 casos tienen IDs unicos de contrato/item; la seleccion dedupea filas
  repetidas del XLSX oficial.
- `tests/peruHistoricalContracts.test.ts`, `tests/peruHistoricalCoverage.test.ts`,
  `tests/xlsx.test.ts` y `tests/crossCountryCases.test.ts` pasan.

`npm run data:verify` pasa con el corpus completo actual: 17 datasets, 1867
casos, 4510 receipts, 24 raw files y 0 errores.
