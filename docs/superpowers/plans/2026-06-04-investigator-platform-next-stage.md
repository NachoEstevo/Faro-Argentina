# Plan: profesionalizacion investigativa puntos 2 a 5

> Para agentes: este plan sigue el spec
> `docs/superpowers/specs/2026-06-04-investigator-platform-next-stage-design.md`.
> No agregar lenguaje acusatorio, no publicar aportes automaticamente y no
> inferir coordenadas.

## Objetivo

Implementar el corte productivo integral del spec: una capa de preparacion de
dossier para Carpetas, una pagina de datos mas util, perfiles investigativos en
Explorer, pipeline de fuentes candidatas y auditoria admin visible.

## Decision de alcance

El spec completo cubre varios meses de producto. Este corte implementa una base
que agrega valor inmediato sin crear mocks ni promesas:

- Explorer: perfiles investigativos por proveedor, organismo, provincia, fuente
  y senal desde el indice existente.
- Carpetas: estado de preparacion verificable.
- Datos: matriz de fuentes/cobertura/limites con datos reales del repo y
  candidatos de ingestion.
- Admin: auditoria visible con metadata redaccionada y apertura de bandeja
  auditada en entornos productivos.
- Export: incluir preparacion del dossier.
- Docs: dejar secuencia posterior para perfiles dedicados, export de auditoria
  y prototipo Presupuesto Abierto.

No se implementa todavia:

- AI search.
- scoring de riesgo;
- publicacion de carpetas;
- borrado fisico de aportes;
- nuevas fuentes externas.

## Tareas

### 1. Modelo de preparacion de dossier

Archivos:

- Crear: `src/lib/data/investigationReadiness.ts`
- Modificar: `tests/investigationReadiness.test.ts`

Pasos:

- [ ] Crear tipos `InvestigationDossierReadiness`, `InvestigationReadinessCheck`
  y `InvestigationReadinessStatus`.
- [ ] Implementar `buildInvestigationDossierReadiness(workspace, packs)`.
- [ ] Evaluar dimensiones:
  - evidencia oficial;
  - notas de relacion;
  - cobertura de fuentes;
  - brechas de datos;
  - plan de verificacion;
  - material manual;
  - limite publico/privado.
- [ ] Asegurar que el resultado no use copy de fraude, culpa, delito,
  corrupcion ni publicacion automatica.
- [ ] Agregar tests con carpeta completa, carpeta incompleta y carpeta con
  fuentes manuales.

### 2. UI compacta en Carpetas

Archivos:

- Modificar: `src/components/Investigations/InvestigationsView.tsx`
- Modificar: `src/components/Investigations/InvestigationsChrome.tsx`
- Modificar: `src/components/Investigations/InvestigationsView.module.css`
- Modificar: tests de integracion si corresponde.

Pasos:

- [ ] Calcular `dossierReadiness` con los evidence packs disponibles.
- [ ] Pasarlo a `WorkspaceOverviewPanel` y `WorkspaceExportPanel`.
- [ ] Mostrar una tarjeta compacta "Preparacion del dossier":
  - nivel;
  - checks por dimension;
  - proximas acciones;
  - sin iconografia agresiva ni colores de acusacion.
- [ ] Mantener responsive y no duplicar la matriz de evidencia.

### 3. Export ZIP

Archivos:

- Modificar: `src/lib/client/investigationZip.ts`
- Modificar: `tests/investigationZip.test.ts`

Pasos:

- [ ] Incluir seccion `Preparacion del dossier` en `dossier.md`.
- [ ] Incluir checks y proximas acciones.
- [ ] Mantener "handoff interno", no "publicar".

### 4. Pagina Datos

Archivos:

- Modificar: `src/app/datos/page.tsx`
- Modificar estilos del documento solo si hace falta.

Pasos:

- [ ] Importar `dataSpineCoverage`, `sourceCatalogEntries` y datasets desde
  `caseRepository`.
- [ ] Construir una matriz compacta por fuente con casos, raw rows,
  map-ready, etapa, formato, frecuencia y caveats.
- [ ] Explicar el ciclo de evidencia con lenguaje sencillo.
- [ ] No usar metricas que no salen del repo.

### 5. Perfiles investigativos del Explorer

Archivos:

- Modificar: `src/lib/data/investigatorExplorer.ts`
- Modificar: `src/components/Explorer/ExplorerView.tsx`
- Modificar: `src/components/Explorer/Explorer.module.css`
- Modificar: `tests/investigatorExplorer.test.ts`

Pasos:

- [ ] Exponer perfiles desde `InvestigatorExplorerView`.
- [ ] Construirlos desde rows ya indexadas para preservar performance.
- [ ] Cubrir proveedor, organismo, provincia, fuente y senal.
- [ ] Mostrar cantidad de expedientes, fuentes, brechas de geometria, monto
  comparable y caveat.
- [ ] Hacerlos accionables: entidad como pivot, provincia como query oficial.
- [ ] Evitar ranking, acusacion o score.

### 6. Pipeline de fuentes candidatas

Archivos:

- Crear: `src/lib/data/sourceCandidatePipeline.ts`
- Modificar: `src/app/datos/page.tsx`
- Crear: `tests/sourceCandidatePipeline.test.ts`

Pasos:

- [ ] Registrar candidatos con estado, URL oficial, campos, regla de join,
  afirmacion permitida, caveat y proximo paso.
- [ ] Usar Presupuesto Abierto credito/BAPIN como prototipo recomendado.
- [ ] Mantener SIGEN/AGN como bloqueadas para ingestion automatica hasta tener
  flujo editorial de citas.
- [ ] Mostrar reglas de admision en `/datos`.

### 7. Auditoria admin visible

Archivos:

- Crear: `src/lib/server/contributionAuditView.ts`
- Modificar: `src/app/api/admin/audit/route.ts`
- Modificar: `src/app/api/admin/aportes/route.ts`
- Modificar: `src/components/Admin/AdminAportesView.tsx`
- Modificar: `src/components/Admin/AdminAportesView.module.css`
- Modificar: tests admin/audit.

Pasos:

- [ ] Redactar metadata sensible en backend antes de enviarla a UI.
- [ ] Mostrar auditoria contextual del aporte seleccionado.
- [ ] Explicar cuando el entorno local no conserva auditoria persistente.
- [ ] Auditar apertura de bandeja cuando hay base productiva.
- [ ] Evitar duplicar vinculos repetidos al mismo expediente/carpeta.

### 8. Documentacion viva

Archivos:

- Modificar: `docs/product/faro-product-context.md`
- Modificar: `docs/operations/production-runbook.md`

Pasos:

- [ ] Agregar la nueva lectura de preparacion de dossier.
- [ ] Registrar que datos y admin se profesionalizan con matriz de cobertura,
  readiness y auditoria, no con scoring.

### 9. Validacion

Comandos:

```bash
npm test tests/investigationReadiness.test.ts tests/investigationZip.test.ts tests/investigationsViewIntegration.test.ts
npm run typecheck
npm test
npm run build
git diff --check
```

Browser:

- Abrir `/pais/AR?mode=investigations` y revisar una carpeta con y sin casos si
  hay estado local disponible.
- Abrir `/datos` y revisar desktop/mobile si el cambio visual es significativo.

## Review critica del plan

### Objecion 1

"Esto no arregla todo Explorer."

Respuesta: correcto. Explorer ya tiene busqueda por provincia, zona, proveedor,
CUIT y fuente con indices. El primer valor faltante no es mas UI de search, sino
que las carpetas y datos expliquen calidad/cobertura. Los perfiles Explorer
quedan como siguiente corte.

### Objecion 2

"Readiness puede parecer una aprobacion."

Respuesta: por eso el copy dice "preparacion", "handoff interno" y "proximas
acciones". No usa "caso listo", "publicable" ni "probado".

### Objecion 3

"La pagina Datos puede quedar estatica."

Respuesta: se nutre de exports reales del repo (`caseRepository`) y no de mocks.
Las metricas publicas finales igualmente requieren correr reportes antes de
comunicar.

### Objecion 4

"Admin necesita mas UI ahora."

Respuesta: Admin ya recibio una pasada fuerte. Este corte documenta gobernanza y
mantiene la separacion review/inbox/publicacion. La vista de auditoria dedicada
debe ser el siguiente PR si el equipo necesita operacion diaria.
