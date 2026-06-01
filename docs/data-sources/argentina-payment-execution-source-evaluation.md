# Argentina Payment And Execution Source Evaluation

Date: 2026-06-01
Worker: 5
Scope: official Argentina sources that may reduce `payment_verification_gap`

## Product Boundary

Faro does not accuse. This spike evaluates what each source can prove and what it
cannot prove. A source that exposes `pagado`, `devengado`, certified amount,
physical progress, reception, or amendment context must stay in that evidence
lane. Do not join records by similar names, nearby amounts, location text, or
supplier CUIT unless the source exposes an official/documentable key for that
join.

## Source Evaluation Matrix

| Source | Official URL | Relevant fields observed | Join keys | Update frequency | Machine readability | Can prove | Caveats and risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Presupuesto Abierto API - credito | https://www.presupuestoabierto.gob.ar/api/ and column dictionary https://www.presupuestoabierto.gob.ar/api/json/itemCredito.txt | `ejercicio_presupuestario`, `impacto_presupuestario_fecha`, `jurisdiccion_id`, `entidad_id`, `servicio_id`, `programa_id`, `proyecto_id`, `actividad_id`, `obra_id`, `codigo_bapin_id`, `codigo_bapin_desc`, `credito_presupuestado`, `credito_vigente`, `credito_comprometido`, `credito_devengado`, `credito_pagado`, `ultima_actualizacion_fecha` | Potential official join to Mapa de Inversiones only when Mapa exposes the same BAPIN code in `codigobapin`. Also useful by budget classifiers, but not by CONTRAT.AR contract number. | Presupuesto Abierto open-data page states daily updates for many budget datasets; the API dictionary exposes `ultima_actualizacion_fecha`. Verify per query. | API, CSV, JSON, ZIP. Requires access token for API use. | `devengado` and `pagado` at budget aperture/BAPIN level; budget commitment and current credit. | Strongest payment candidate, but it is not supplier-level payment evidence. `credito_pagado` is budget execution for the selected aperture, not proof that a named contractor invoice or certificate was paid. A BAPIN join is acceptable only when both sides expose the same official BAPIN value. |
| Presupuesto Abierto API - programacion y ejecucion fisica | https://www.presupuestoabierto.gob.ar/api/ and column dictionary https://www.presupuestoabierto.gob.ar/api/json/itemPef.txt | `ejercicio_presupuestario`, `trimestre`, `programa_id`, `proyecto_id`, `actividad_id`, `obra_id`, `medicion_fisica_id`, `medicion_fisica_desc`, `tipo_medicion_fisica`, `programacion_*`, `ejecutado_vigente_trim`, `ejecutado_acumulado_trim`, `ejecucion_anual_de_cierre`, `causa_desvio_*`, `ultima_actualizacion_fecha` | Budget classifiers only in the observed dictionary; no `codigo_bapin_id` was observed in `itemPef`, and it is not a direct CONTRAT.AR contract key. | Same API family; verify `ultima_actualizacion_fecha` per query. | API, CSV, JSON, ZIP. Requires access token for API use. | Physical execution/programmed-vs-executed context at budget target level. | Useful to compare physical execution claims, but not a certificate, reception act, or payment record. It may aggregate multiple works under one budget target. |
| Mapa de Inversiones Argentina - obras | https://mapainversiones.obraspublicas.gob.ar/ and dataset catalog https://datos.gob.ar/dataset/obras-mapa-inversiones-argentina | `idproyecto`, `numeroobra`, `codigobapin`, `fechainicioanio`, `fechafinanio`, `nombreobra`, `montototal`, `avancefinanciero`, `avancefisico`, `entidadejecutoranombre`, `etapaobra`, `url_perfil_obra`, counterpart fields (`contraparte_*`) in current CSV | `idproyecto` for Mapa profile; `codigobapin` for possible Presupuesto Abierto join; `numeroobra` is Mapa's work number and should not be assumed equal to CONTRAT.AR `numero_obra` without evidence. | Mapa site showed last update `22/5/2025`; Datos Argentina catalog says monthly, while dictionary says daily/weekly/monthly. Treat currentness as source-specific and record snapshot date. | CSV downloads and public profiles. | Physical progress, financial progress, project/work context, official profile URL. | Already ingested as progress context in Faro. It does not prove payments by itself, and the current Faro snapshot lacks lat/lon. `avancefinanciero` is not the same as `pagado` unless the source documentation defines that equivalence, which this spike did not establish. |
| CONTRAT.AR current EDCA dataset | https://datos.gob.ar/dataset/jgm-procesos-contratacion-obra-publica-gestionados-plataforma-contratar and methodology https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.0/download/metodologia-contratar.pdf | Procedures: `procedimiento_numero`, `expediente_procedimiento_numero`, `presupuesto_oficial_monto`, dates. Contracts: `contrato_numero`, `contrato_numero_gedo`, `procedimiento_numero`, `numero_obra`, `contratista_cuit`, `contrato_monto`, `contrato_perfeccionamiento_fecha`. Obras: `numero_obra`, `plazo_ejecucion_obra`, coordinates. Actas: `procedimiento_numero`, `fecha_creacion`, offer/provider ids. | Documented joins inside CONTRAT.AR: `procedimiento_numero` and `numero_obra`/front-of-work keys. | Datos Argentina page: eventual; current dataset page showed dataset update `2023-10-27` during this spike, with resource dates that can differ by file. Verify each resource date before ingestion. | CSV plus PDF methodology. | Contract award, procedure, offer/opening context, official work/location fields. | Does not expose payment, certificate, reception, or amendment rows in the current published resources. The methodology warns that one project may be split across procedures and the platform may not link those procedures back to one project. |
| CONTRAT.AR historico Decreto 1169/2018 | https://datos.gob.ar/dataset/jgm-contratar-historico | `proceso_de_seleccion_numero`, `afectacion_presupuestaria_solicitud_numero`, `presupuesto_oficial_monto`, `acta_de_inicio_fecha`, `anticipo_financiero_porcentaje`, `ampliaciones_al_contrato_original_porcentaje`, `economias_*`, `demasias_*`, `prorrogas_*`, `suspensiones_*`, `avance_fisico`, `monto_certificado`, `redeterminaciones_*`, `bapin`, `estado` | Historical row fields include `bapin` and selection-process text, but not the same normalized current CONTRAT.AR keys. Use only as a period-scoped historical dataset. | Eventual; catalog page shows 2020 update for the dataset. | CSV/XLSX. | Historical certified amount (`monto_certificado`), physical progress, amendments/change-order context, redetermination counts. | Valuable for older works only. Do not mix with current CONTRAT.AR records without preserving period, field definitions, and caveats. `monto_certificado` is certification evidence, not payment evidence. |
| COMPR.AR / ONC electronic procurement | https://datos.gob.ar/dataset/jgm-sistema-contrataciones-electronicas | Annual convocatorias/adjudicaciones resources expose `numero_procedimiento`, SAF/UOC, adjudication date, `cuit`, supplier description, `documento_contractual`, `monto`, `moneda`, `fecha_de_perfeccionamiento_OC`, plus SIPRO supplier resources. | `numero_procedimiento`, `documento_contractual`, supplier CUIT for COMPR.AR procurement context. Not a direct public-works BAPIN or certificate key. | Dataset page: every half year; catalog metadata showed current portal metadata modified on 2026-06-01, but listed resources are annual/historical. | CSV. | Procurement/adjudication and supplier context for goods/services and some procurement procedures. | Not a payment source. It may help supplier/procedure context, but should not be used to close public-works payment gaps unless a case is already COMPR.AR-scoped and keyed to those fields. |
| SIGEN archive | https://www.sigen.gob.ar/archivoweb/Buscador.aspx | Search filters by year, report type, keywords, organism; reports are document-level audit material. | Manual citation to report number/organism/year only after human review. | Not evaluated as a tabular update stream; web archive/search surface. | Searchable web/PDF documents, not a stable row-level data feed for ingestion. | Context only. | Use for reviewed audit context, not machine joins. Do not treat audit findings as payment, certificate, reception, or amendment records without explicit cited report text. |
| AGN reports | https://agn.gob.ar/auditorias | Approved audit reports and summaries by audited body/topic/date. | Manual citation to report number/organism/year only after human review. | Not evaluated as a tabular update stream. | Web/PDF documents. | Context only. | Use as external control context. Not appropriate for automated payment-gap closure because reports are narrative and scope-specific. |

## Recommendation

Recommend one narrow ingest candidate:

Use Presupuesto Abierto `/api/v1/credito` as a read-only prototype for Mapa de
Inversiones cases that expose a non-empty official `codigobapin`. Query only the
columns needed for a defensible budget-execution receipt:

- `ejercicio_presupuestario`
- `impacto_presupuestario_fecha`
- `codigo_bapin_id`
- `codigo_bapin_desc`
- `jurisdiccion_id` / `jurisdiccion_desc`
- `entidad_id` / `entidad_desc`
- `programa_id` / `programa_desc`
- `proyecto_id` / `proyecto_desc`
- `obra_id` / `obra_desc`
- `credito_devengado`
- `credito_pagado`
- `ultima_actualizacion_fecha`
- unit/scale metadata from the official dictionary: the `credito_*` decimal
  values are expressed in millions of pesos and must not be displayed or
  compared as raw pesos without conversion.

Evidence label: `official_budget_execution_declared`.

Do not call this `payment_verified` until product review accepts the caveat that
Presupuesto Abierto proves budget execution at the selected official budget/BAPIN
aperture, not a contractor-level payment, certificate, invoice, or reception.

## Selected-Case Subset For Prototype

Start with five current Mapa de Inversiones cases already in Faro, all with an
official Mapa `codigobapin` value and a public Mapa profile. Keep the subset in
one source family to avoid inventing cross-source joins:

| Faro case id | Mapa `idproyecto` | Mapa `codigobapin` | Mapa `numeroobra` | Title | Why selected |
| --- | --- | --- | --- | --- | --- |
| `AR-MAPA-INV-1610` | `1610` | `10` | `NA70056` | CIERRE DE MALLA RINCON DE MILBERG - MODULO 3 | Completed Mapa case with 100% physical and financial progress; useful to test whether Presupuesto Abierto returns BAPIN-level devengado/pagado rows. |
| `AR-MAPA-INV-1617` | `1617` | `17` | `NA70196` | RED SECUNDARIA DE AGUA B PERUZOTTI MOD 2 | Physical progress differs from financial progress, useful for caveat wording. |
| `AR-MAPA-INV-1618` | `1618` | `18` | `NA70200` | RED SECUNDARIA DE AGUA BARRIO LA CHECHELA | Partial physical and financial progress, useful for non-complete progress comparison. |
| `AR-MAPA-INV-1619` | `1619` | `19` | `NA70201` | RED SECUNDARIA DE AGUA BARRIO LA CHECHELA VILLA BOTE | Zero progress case, useful as a negative/edge query. |
| `AR-MAPA-INV-1621` | `1621` | `21` | `NA70203` | RSA VILLA HIDALGO M2 | Partial progress with the same executing entity family, useful to control for agency/name variation. |

Prototype acceptance criteria:

1. The Presupuesto Abierto response contains the requested `codigo_bapin_id`.
2. `codigo_bapin_id` equals the Mapa `codigobapin` after numeric normalization
   only; no fuzzy name matching.
3. Store the Presupuesto Abierto query, response URL/API endpoint, requested
   columns, `ultima_actualizacion_fecha`, unit/scale metadata, row hash, and
   caveat.
4. If multiple rows return for the same BAPIN, keep them as multiple budget
   execution rows or aggregate only with a documented aggregation rule reviewed
   before production ingestion.
5. If no row returns for a BAPIN, record a data gap, not a zero payment.

## Explicit Non-Joins

- Do not join CONTRAT.AR contracts to Presupuesto Abierto by supplier CUIT.
  Presupuesto Abierto credit execution is budget-aperture data, not supplier
  payment data.
- Do not join Mapa `numeroobra` to CONTRAT.AR `numero_obra` unless a source
  explicitly documents they are the same identifier for the same work.
- Do not treat Mapa `avancefinanciero` as `credito_pagado`.
- Do not treat historical CONTRAT.AR `monto_certificado` as payment.
- Do not use AGN/SIGEN narrative reports as row-level source data.

## Handoff Notes

- A prototype script, if added later, should live under `scripts/research/` and
  be read-only. It should require an explicit Presupuesto Abierto token and
  write only inspection output, not generated production data.
- The first product label should be conservative: "Ejecucion presupuestaria
  declarada" with separate fields for `devengado` and `pagado`.
- The review question before production ingestion is whether BAPIN-level
  `credito_pagado` is sufficient to reduce the user-facing
  `payment_verification_gap`, or whether Faro should keep it as a separate
  budget-execution evidence lane until a certificate/payment-order source is
  found.
