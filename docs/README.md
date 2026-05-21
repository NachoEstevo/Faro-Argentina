# Mapa De Documentacion

Esta carpeta tiene dos audiencias:

1. **Lectores publicos / colaboradores** que necesitan entender que es Faro
   Argentina, por que es creible y como correrlo.
2. **Equipo interno** que necesita handoffs vigentes y notas de continuidad.

La ruta publica debe ser corta, pulida y consistente con el fork privado
enfocado en Argentina.

## Empezar Aca

- [README](../README.md) - pitch del proyecto, workflow, corpus actual y
  comandos locales.
- [Contexto de producto](product/faro-product-context.md) - reglas de producto,
  limites de evidencia y estado actual.
- [Onboarding tecnico](agent-onboarding.md) - orientacion para ingenieros y
  futuros agentes de codigo.
- [Deployment](deployment.md) - forma actual de Vercel y restricciones de
  hosting.

## Handoffs Vigentes

Estos documentos sirven para continuar el producto sin re-derivar cada decision:

- [Argentina contract expansion](handoffs/2026-05-17-argentina-contract-expansion-handoff.md)
- [Argentina historical-judicial cases](handoffs/2026-05-17-argentina-historical-judicial-cases-handoff.md)
- [Data integrity and quality](handoffs/2026-05-17-data-integrity-and-quality-sprint-handoff.md)
- [Argentina data spine expansion](handoffs/2026-05-21-argentina-data-spine-expansion.md)
- [Two week professionalization roadmap](roadmap/2026-05-21-two-week-faro-professionalization.md)

Los handoffs son documentos historicos de trabajo. Si un conteo o ruta difiere
del README, confiar en el README y volver a correr el reporte relevante.

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
