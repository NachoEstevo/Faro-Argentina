# Data Integrity And Quality Sprint Handoff

Fecha: 2026-05-17

## Objetivo

Este sprint convierte la base chica de Faro en una base verificable y medible. Antes de sumar mas fuentes o detectores, Faro debe poder demostrar que sus snapshots, hashes, receipts, geometria y agrupacion de proveedores son reproducibles.

## Que Cambio

- `data/official/**` queda tratado como evidencia byte-for-byte. Git no debe normalizar line endings.
- `npm run data:build` usa un timestamp deterministico basado en `data/official/snapshot-manifest.json` o `FARO_DATA_BUILD_TIMESTAMP`.
- `npm run data:verify` vuelve a ser el gate principal para receipts y hashes.
- `npm run data:quality-report` resume cobertura por pais, fuente, monto, proveedor, geometria y senales.
- La identidad de proveedor queda separada entre documento fiscal confiable y nombre normalizado de baja confianza.

## Estado Actual Verificado

- `npm run data:verify` pasa con `errors: []`.
- `npm run data:quality-report` no muestra blockers.
- La base actual tiene 5 datasets generados, 558 casos, 1946 receipts y 8 snapshots en el manifest.
- El reporte de calidad muestra cobertura de Argentina sin convertir gaps en acusaciones.

## Como Interpretar Proveedor Recurrente

Una recurrencia con documento fiscal tiene mayor confianza. Una recurrencia solo por nombre normalizado sigue siendo util como pista, pero debe mostrarse con caveat y menor confianza.

Faro no debe afirmar que dos nombres parecidos son la misma empresa sin documento, domicilio, registro societario u otra evidencia oficial.

## Gate Antes De Cargar Mas Datos

Antes de agregar nuevos datasets:

1. `npm run data:verify` debe pasar.
2. `npm run data:quality-report` no debe mostrar blockers.
3. `npm run data:geo-report` debe mostrar los casos fuera de mapa como brechas, no como puntos visibles.
4. `npm test`, `npm run typecheck` y `npm run build` deben pasar.

## Comandos De Trabajo

```bash
npm run data:build
npm run data:verify
npm run data:geo-report
npm run data:quality-report
npm test
npm run typecheck
npm run build
```

No usar `npm run data:fetch` como reparacion rutinaria. Puede refrescar fuentes externas y cambiar la linea base de evidencia.
