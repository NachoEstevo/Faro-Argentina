# Data Robustness Sprint 2 Design

Fecha: 2026-06-05
Estado: aprobado por criterio operativo del thread

## Objetivo

Convertir la matriz de afirmaciones en una herramienta accionable para
periodistas e investigadores. El usuario no solo debe ver que Faro no puede
afirmar un pago, una ubicacion o un cruce presupuestario; debe entender que
campo oficial existe, que fuente puede revisar despues y que limite no debe
cruzar.

## Principio

Faro no acusa y no adivina. Este sprint no integra nuevos datos productivos si
no hay receipt, query reproducible y llave oficial. La mejora es de robustez:
ordenar brechas, exponer readiness de cruces oficiales y mejorar export/report
para que la investigacion pueda continuar fuera de Faro.

## Hallazgos De Fuente

- Presupuesto Abierto expone API con endpoints de credito (`/api/v1/credito`) y
  programacion/ejecucion fisica (`/api/v1/pef`).
- El endpoint de credito documenta `codigo_bapin_id`, `credito_devengado`,
  `credito_pagado` y `ultima_actualizacion_fecha`.
- Los importes de credito estan expresados en millones de pesos segun el
  diccionario oficial.
- La API requiere token; sin token no se debe simular ingestion ni escribir
  snapshots de produccion.
- Mapa de Inversiones ya aporta `codigobapin`, avance fisico/financiero, monto
  total, perfil oficial, provincia/departamento y posible contraparte.

## Decision

Agregar una capa deterministica de "preparacion investigativa" por expediente:

1. lista priorizada de brechas;
2. lista priorizada de proximos cruces o revisiones;
3. fuentes candidatas aplicables por expediente;
4. resumen de que no conviene afirmar todavia;
5. agregados de calidad para saber cuantas filas tienen un cruce BAPIN
   potencial y cuantas siguen sin fuente de pago.

Esta capa debe viajar en:

- expediente JSON;
- evidence pack/export;
- informe PDF/printable;
- Explorer, de forma compacta;
- `data:quality-report`, como cobertura agregada.

## No Alcance

- No pedir token ni integrar Presupuesto Abierto en produccion.
- No convertir `credito_pagado` en pago a proveedor.
- No unir CONTRAT.AR con Presupuesto Abierto por CUIT, nombre, monto, localidad
  o similitud.
- No geocodificar Mapa de Inversiones.
- No introducir score de sospecha, ranking de irregularidad ni copy acusatorio.

## Modelo Propuesto

`CaseInvestigationChecklist`:

- `readiness`: `strong_start`, `needs_source_cross`, `limited`;
- `summary`: frase corta para usuario comun;
- `gaps`: filas con `claimCode`, `label`, `severity`, `whatIsMissing`,
  `whyItMatters`, `nextStep`;
- `followUps`: acciones concretas con `sourceId`, `sourceName`, `joinKey`,
  `joinValue`, `sourceStatus`, `claimCode`, `caveat`;
- `doNotClaim`: lista corta de afirmaciones que Faro no sostiene.

Reglas:

- Las brechas se derivan de `claimMatrix`; no hay LLM ni heuristica opaca.
- Los follow-ups solo aparecen si existe llave oficial. Ejemplo: Mapa con
  `codigobapin` puede sugerir revisar Presupuesto Abierto por ese BAPIN.
- La severidad no expresa sospecha; expresa riesgo de sobreinterpretacion.

## Valor Para Investigadores

- Permite decidir si un expediente es buen punto de partida o solo una pista
  limitada.
- Evita que un reporte exportado pierda los caveats cuando sale de la app.
- Prioriza trabajo real: abrir fuente, cruzar BAPIN, buscar certificado/pago,
  completar geometria o revisar contexto judicial.
- Hace visible que la plataforma sabe lo que no sabe.

## Revision Critica

Riesgo: duplicar la matriz y saturar la UI.

Mitigacion: la matriz sigue siendo el contrato detallado; el checklist es una
vista operacional compacta con maximos estrictos.

Riesgo: que "readiness" se lea como score de caso.

Mitigacion: usar etiquetas de trabajo ("Buen punto de partida", "Requiere cruce
de fuente", "Pista limitada") y nunca puntaje numerico.

Riesgo: sugerir Presupuesto Abierto sin poder consultarlo todavia.

Mitigacion: etiquetar como "cruce posible", no como dato integrado, y mostrar la
llave oficial usada.

## Criterio De Exito

- Los tests prueban que el checklist no contiene lenguaje acusatorio.
- Los tests prueban que Mapa con BAPIN genera follow-up de Presupuesto Abierto
  y que un contrato sin BAPIN no lo genera.
- Los exports e informes incluyen el checklist.
- `data:quality-report` agrega readiness por pais y cobertura de BAPIN
  potencial.
- La UI del Explorer muestra brechas/proximos pasos sin aumentar scroll pesado.
