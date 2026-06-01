# Faro Production Runbook

Estado: runbook operativo inicial para produccion Faro Argentina.
Ultima revision documental: 2026-06-01.

Este runbook no reemplaza una politica legal, de privacidad o de seguridad. Si
faltan responsables o contactos formales, registrar la decision pendiente; no
inventar nombres ni canales.

## Principios Operativos

- Faro no acusa. La operacion debe preservar fuentes oficiales, receipts,
  caveats y brechas visibles.
- Aportes son material privado de revision. Un aporte aprobado para
  investigacion no es evidencia publica.
- El mapa solo muestra expedientes con geometria oficial validada.
- No geocodificar, inferir ni corregir coordenadas para produccion.

## Checklist De Entorno

Configurar en Vercel Production y, cuando corresponda, en Preview:

| Variable | Uso | Requerida para |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL publica canonica para links y metadata. | Produccion publica |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client key. | Auth |
| `CLERK_SECRET_KEY` | Clerk server key. | Auth server-side |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Ruta de login. Default: `/sign-in`. | Auth |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Ruta de registro. Default: `/sign-up`. | Auth |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Destino post-login. | Auth |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Destino post-registro. | Auth |
| `DATABASE_URL` | Neon Postgres serverless connection string. | Carpetas privadas, Aportes review, audit |
| `FARO_ADMIN_EMAILS` | Emails admin separados por coma. | Admin interno |
| `FARO_REVIEWER_EMAILS` | Emails reviewer separados por coma. | Revision interna |
| `STORAGE_ENDPOINT` | Endpoint R2/S3 compatible. | Adjuntos Aportes |
| `STORAGE_BUCKET` | Bucket privado. Default recomendado: `faro`. | Adjuntos Aportes |
| `STORAGE_ACCESS_KEY` | Access key R2. | Adjuntos Aportes |
| `STORAGE_SECRET_KEY` | Secret key R2. | Adjuntos Aportes |
| `NEXT_PUBLIC_ARCGIS_API_KEY` | API key Esri opcional. | Wayback con mayor cuota |

No habilitar `FARO_ENABLE_TEST_AUTH` en produccion. El helper actual ignora ese
modo cuando `NODE_ENV=production`, pero la variable no debe quedar configurada
en Vercel Production.

## Clerk Admin Y Reviewer

Faro resuelve roles en este orden:

1. `role` en metadata publica o privada de Clerk, con valor `admin`,
   `reviewer` o `investigator`.
2. Email primario incluido en `FARO_ADMIN_EMAILS`.
3. Email primario incluido en `FARO_REVIEWER_EMAILS`.
4. Default `investigator`.

Checklist:

- Crear usuarios en Clerk con email verificado.
- Definir `role` en metadata si se quiere evitar depender de allowlists de env.
- Mantener `FARO_ADMIN_EMAILS` y `FARO_REVIEWER_EMAILS` como respaldo explicito.
- Verificar `/pais/AR?mode=investigations` con un usuario investigador.
- Verificar `/admin/aportes` con un usuario admin.
- Confirmar que un reviewer no admin no puede ejecutar acciones reservadas a
  admin.

## Neon Migration Checklist

Las migraciones viven en `data/product/migrations/*.sql` y se aplican en orden
lexicografico con:

```bash
npm run db:migrate
```

Antes de aplicar:

- Confirmar que `DATABASE_URL` apunta al branch/base correcto de Neon.
- Revisar el diff SQL que se va a ejecutar.
- Hacer backup o snapshot de Neon si el cambio no es trivial.
- Ejecutar primero contra Preview/Staging cuando exista.
- Para migraciones que agregan columnas leidas por el runtime, como
  `003_investigation_verification_tasks.sql`, aplicar la migracion antes de
  promover el deploy de codigo que depende de esa columna. Si se despliega el
  codigo primero, las superficies privadas pueden responder `503` hasta que la
  base tenga el schema esperado.

Despues de aplicar:

- Confirmar que el comando imprimio cada migracion aplicada sin error.
- Probar login y persistencia de carpetas privadas.
- Probar lectura de bandeja `/admin/aportes`.
- Revisar que las tablas esperadas existan: `faro_users`,
  `investigation_workspaces`, `contribution_review_events`,
  `contribution_review_links`, `contribution_audit_events` y
  `curated_contribution_evidence`.

## R2 Storage Smoke Check

R2 debe ser privado. Los adjuntos de Aportes no son evidencia publica ni deben
ser browsables por URL publica.

Checklist:

- Crear bucket privado.
- Configurar credenciales con permiso minimo para escribir, leer y listar el
  prefijo usado por Faro.
- Configurar `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY` y
  `STORAGE_SECRET_KEY`.
- Usar primero un bucket de Preview/staging o un prefijo descartable. El smoke
  test crea un aporte tecnico real; si se corre contra el mismo bucket/prefijo
  que produccion, puede aparecer en la bandeja privada de `/admin/aportes`.
- Ejecutar:

```bash
npm run verify:aportes-storage
```

El smoke test sube un aporte tecnico y verifica por `HEAD` que existen el
adjunto y el manifest en R2. Si devuelve `storageMode` distinto de `r2`, la app
no esta usando R2 para esa ejecucion. Si se ejecuto contra storage compartido
con produccion, borrar los objetos `APORTE-R2-SMOKE-*` o marcarlos como prueba
interna antes de revisar aportes reales.

## Release Verification

Para cambios de documentacion solamente:

```bash
git diff --check
```

Para cambios de producto o datos antes de release:

```bash
npm run data:build
npm run data:verify
npm run data:geo-report
npm run data:quality-report
npm test
npm run typecheck
npm run build
```

Para cambios de produccion privada:

```bash
npm run db:migrate
npm run typecheck
npm run build
```

Ejecutar `npm run verify:aportes-storage` solo contra Preview/staging o contra
un prefijo/bucket descartable, salvo que haya un paso explicito de limpieza del
aporte tecnico creado por el smoke test.

No usar `npm run data:fetch:all` como reparacion rutinaria: refresca fuentes
externas y puede cambiar la linea base de evidencia.

## Currentness De Datos

Linea base documentada para este runbook:

- Manifest principal generado: `2026-05-18T00:19:46.421Z`.
- Mapa de Inversiones agregado: `2026-05-21`.
- Expedientes Argentina: `7.932`.
- Receipts: `9.617`.
- Expedientes map-safe: `431`.
- Casos con geometria faltante reportados por `data:geo-report`: `7.441`.

La fuente vigente es el reporte generado, no este texto. Antes de comunicar
metricas publicas, volver a correr `npm run data:geo-report` y
`npm run data:quality-report`.

## Incidentes Y Decisiones Pendientes

Completar solo cuando haya responsables explicitos:

| Area | Responsable | Canal | Estado |
| --- | --- | --- | --- |
| Operacion tecnica | Pendiente de decision | Pendiente de decision | No publicar como contacto |
| Privacidad / datos personales | Pendiente de decision | Pendiente de decision | No publicar como contacto |
| Revision editorial de Aportes | Pendiente de decision | Pendiente de decision | No publicar como contacto |

Si ocurre un incidente antes de tener responsables formales, registrar hora,
impacto, superficie afectada, datos potencialmente involucrados, acciones
tomadas y decision pendiente. No prometer anonimato, borrado, asesoria legal o
plazos regulatorios sin validacion explicita.
