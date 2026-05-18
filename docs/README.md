# Mapa De Documentacion

Esta carpeta tiene dos audiencias:

1. **Lectores publicos / hackathon** que necesitan entender que es Faro, por que
   es creible y como correrlo.
2. **Equipo interno** que necesita handoffs historicos, planes de implementacion
   y notas de diseno.

La ruta publica debe ser corta y pulida. La ruta interna puede seguir completa,
pero no deberia ser lo primero que lee un jurado o colaborador nuevo.

## Empezar Aca

- [README](../README.md) - pitch publico del proyecto, demo flow, corpus actual
  y comandos locales.
- [Contexto de producto](product/faro-product-context.md) - reglas de producto,
  limites de evidencia y estado actual.
- [Onboarding tecnico](agent-onboarding.md) - orientacion para ingenieros y
  futuros agentes de codigo.
- [Deployment](deployment.md) - forma actual de Vercel y restricciones de
  hosting.

## Handoffs Vigentes

Estos documentos sirven para continuar el producto sin re-derivar cada decision:

- [Data quality and coverage](handoffs/2026-05-16-data-quality-and-coverage-handoff.md)
- [UI/UX expediente V1](handoffs/2026-05-16-ui-ux-expediente-faro-v1.md)
- [PE/CL data and geography sprint](handoffs/2026-05-17-pe-cl-data-geography-sprint-handoff.md)
- [Argentina contract expansion](handoffs/2026-05-17-argentina-contract-expansion-handoff.md)
- [Argentina historical-judicial cases](handoffs/2026-05-17-argentina-historical-judicial-cases-handoff.md)
- [Signals and filters UI](handoffs/2026-05-17-investigation-signals-and-filters-ui-handoff.md)
- [Peru historical contracts](handoffs/2026-05-17-peru-historical-contracts-handoff.md)

Los handoffs son documentos historicos de trabajo. Si un conteo o ruta difiere
del README, confiar en el README y volver a correr el reporte relevante.

## Archivo Interno

Los planes y specs largos de agentes ahora viven bajo:

```text
docs/internal/
```

Se conservan como historia de implementacion, pero no son lectura obligatoria
para la demo de hackathon.

Usarlos cuando haga falta recuperar el razonamiento original. No tratar planes
viejos como verdad actual del producto sin chequear el repo y los reportes
vigentes.

## Anclas De Verificacion

```bash
npm run data:verify
npm run data:geo-report
npm run data:quality-report
npm test
npm run typecheck
npm run build
```

Para cambios solo de documentacion, esta bien saltear el suite completo si el
cambio no toca codigo ni datos, pero hay que decirlo explicitamente en el
handoff o commit summary.
