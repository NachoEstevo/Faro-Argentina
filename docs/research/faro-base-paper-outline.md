# Faro: Esquema Para Paper Fundacional

Estado: base de trabajo para investigacion. No contiene resultados empiricos
cerrados ni afirma que Faro haya sido validado en uso real.

## Proposito

Este documento ordena una posible linea academica para Faro Argentina sin
convertir una propuesta de investigacion en afirmaciones de producto. El paper deberia
explicar como una interfaz civica puede transformar datos publicos oficiales en
expedientes verificables, conservando receipts, caveats, hashes, rutas crudas,
URLs de fuente y brechas de datos como elementos centrales de confianza.

La tesis inicial es:

```text
Faro no determina conclusiones. Faro reduce la distancia entre una pregunta
publica y una ruta reproducible de verificacion.
```

Todo resultado sobre utilidad, precision, comprension, tiempo ahorrado o calidad
de decisiones debe marcarse como pendiente hasta tener evaluacion empirica.

## Pregunta Central

Como puede disenarse una infraestructura de evidencia publica para que
periodistas, auditores, instituciones y ciudadanos puedan explorar datos
oficiales sin perder los limites entre pista, fuente, caveat, brecha y
verificacion pendiente?

Preguntas secundarias:

- Como cambia la interpretacion del usuario cuando los caveats son visibles y no
  quedan relegados al pie tecnico?
- Que aporta un evidence pack reproducible frente a una tabla o dashboard
  convencional?
- Que decisiones de UI reducen sobreinterpretacion sin frenar la exploracion?
- Que partes del flujo requieren validacion humana antes de presentarse como
  conocimiento publico?

## Contribucion Esperada

El paper deberia aportar:

- un modelo de producto para evidencia civica verificable;
- una arquitectura reproducible basada en fuentes oficiales, pipeline de datos,
  receipts y exports;
- una metodologia para separar pistas, relaciones hipoteticas, fuentes,
  caveats, gaps y pasos de verificacion;
- una discusion de limites eticos y de privacidad para aportes privados,
  carpetas privadas y evaluaciones con usuarios;
- un programa de validacion empirica para medir comprension, confianza calibrada
  y accionabilidad.

No debe aportar comparaciones de personas, empresas u organismos, inferencias
automaticas sobre intenciones o responsabilidades, publicacion de aportes
privados, afirmaciones sobre impacto institucional sin evidencia externa ni
generalizaciones regionales sin benchmark documentado.

## Estructura Propuesta Del Paper

### 1. Relevancia

Describir el problema operativo: los datos publicos existen, pero estan
fragmentados entre portales, CSVs, APIs, PDFs, catalogos y registros con campos
inconsistentes. La friccion no es solo acceso; tambien es trazabilidad,
citabilidad, calidad de geometria, separacion entre contratos y pagos, y
capacidad de explicar lo que la fuente no prueba.

Punto a validar: medir con usuarios o tareas controladas si Faro reduce tiempo
de orientacion, errores de interpretacion o perdida de trazabilidad.

### 2. Principio De Producto

Explicar el contrato central:

```text
Faro muestra donde mirar, por que mirar ahi, que evidencia oficial existe y que
falta verificar.
```

Separar cuatro estados:

- dato oficial observado;
- pista investigativa;
- hipotesis privada de trabajo;
- evidencia publica curada y caveateada.

Punto a validar: si los usuarios entienden esa separacion en tareas reales.

### 3. Arquitectura E Infraestructura

Describir el sistema como capas:

1. snapshots oficiales versionados;
2. catalogo de fuentes;
3. normalizacion y generacion de expedientes;
4. gates de calidad, especialmente geometria oficial validada;
5. modelo de receipts;
6. repositorio de casos para UI y APIs;
7. superficies de exploracion: Explorer, mapa, expediente, carpetas privadas,
   aportes privados y exports.

Artefactos a citar:

- `data/official/`
- `data/sources/source-catalog.json`
- `src/lib/caseRepository.ts`
- `src/lib/data/evidenceReceipts.ts`
- `src/lib/data/coordinateQuality.ts`
- `src/lib/data/uiGates.ts`
- `src/app/api/export/[id]/`

Punto a validar: reproducibilidad de cada capa contra snapshots actuales y
estabilidad de hashes ante cambios controlados.

### 4. Fuentes Y Cobertura

Presentar las fuentes como evidencia oficial con alcances distintos, no como una
base completa del gasto publico. Describir, segun el estado vigente del repo:

- CONTRAT.AR para contratos, procedimientos, ofertas, ubicacion geografica y
  actas cuando existen;
- SIPRO para proveedores;
- BCRA Comunicacion A 3500 para conversiones historicas;
- CIJ y MPF para contexto historico-judicial curado;
- Mapa de Inversiones como cobertura de avance cuando sus campos permiten uso
  responsable;
- fuentes auxiliares historicas solo cuando el join es documentable.

Puntos a explicitar:

- un contrato no prueba pago ni ejecucion fisica;
- una adjudicacion no prueba avance;
- una coordenada invalida no debe dibujarse;
- una relacion por nombre normalizado tiene menor confianza que una relacion por
  documento fiscal;
- una fuente judicial contextual no convierte un contrato actual en un hecho
  validado por ese expediente.

Punto a validar: matriz fuente-campo-afirmacion para saber que afirmaciones permite
cada fuente y cuales quedan como gaps.

### 5. Metodologia De Evidencia

Definir el expediente como unidad de trabajo:

- resumen legible;
- entidad, proveedor, monto, fecha y territorio cuando existen;
- razon por la cual aparece;
- fuente oficial publica;
- receipts reproducibles;
- caveats;
- brechas de datos;
- pasos de verificacion;
- export tecnico.

Definir carpetas como espacios privados:

- pregunta de investigacion;
- expedientes relacionados;
- motivo de relacion declarado;
- nota o pendiente de verificacion;
- matriz de evidencia;
- gaps;
- proximos pasos;
- export.

Definir aportes como material privado de revision:

- un aporte no es evidencia publica;
- una relacion sugerida por usuario no es una relacion validada;
- incluso un aporte aprobado para investigacion requiere curacion, redaccion,
  caveat y publicacion manual antes de aparecer publicamente.

Punto a validar: si esta taxonomia reduce confusion entre evidencia, hipotesis y
tarea pendiente.

### 6. Receipts, Hashes Y Reproducibilidad

Explicar que el receipt es una pieza de producto, no una nota tecnica. Debe
preservar:

- source id y source name;
- URL cruda para reproducibilidad;
- URL publica de portal/catalogo cuando exista;
- raw path;
- snapshot hash;
- row hash;
- record id;
- locator type;
- parser version;
- extracted timestamp.

El paper deberia mostrar un ejemplo de evidence pack con campos anonimizados o
de caso publico no sensible.

Punto a validar: verificacion row-level para una muestra de fuentes, incluyendo
row match exacto, fila ausente, duplicado y mismatch de hash.

### 7. Caveats Como Mecanismo De Alineacion

Plantear los caveats como controles de interpretacion:

- impiden convertir ausencia de datos en conclusion;
- separan contratos, pagos, avance y ejecucion fisica;
- mantienen visible la calidad de geometria;
- diferencian relacion fuerte por identificador de relacion debil por nombre;
- obligan a mostrar limites de fuente en UI y export.

Punto a validar: evaluar si los caveats visibles calibran mejor la confianza del
usuario o si generan friccion excesiva.

### 8. Pipeline De Datos

Describir el flujo:

```text
fetch controlado -> snapshot oficial -> manifest -> build deterministico
-> verificacion de fuente/hash -> reporte de calidad -> gates UI/export
```

Comandos relevantes:

```bash
npm run data:verify
npm run data:geo-report
npm run data:quality-report
npm run typecheck
```

Nota metodologica: `data:fetch` no debe tratarse como reparacion rutinaria
porque puede cambiar la linea base de evidencia.

Punto a validar: documentar que partes del pipeline son deterministicas y que
partes dependen de disponibilidad o cambios en fuentes externas.

### 9. Decisiones De UI Y Producto

Explicar las decisiones de superficie:

- Explorer como ruta primaria para casos con y sin geometria;
- mapa solo para geometria oficial validada;
- expediente como unidad central de lectura;
- evidence pack como salida verificable;
- carpetas privadas para ordenar hipotesis y tareas;
- aportes privados como bandeja de revision, no como publicacion;
- lenguaje neutral para senales y relaciones.

Punto a validar: test de comprension por tareas, no solo entrevistas generales.

### 10. Limitaciones

Limitaciones que deben figurar:

- cobertura parcial de fuentes;
- ausencia de pagos o certificaciones en ciertos casos;
- joins incompletos o no documentables;
- geometria faltante o invalida;
- riesgo de sobreinterpretacion por usuarios;
- disponibilidad desigual de datos oficiales;
- snapshots que pueden quedar desactualizados.

### 11. Etica Y Privacidad

Reglas minimas:

- no usar aportes privados en investigacion publica sin consentimiento,
  curacion, redaccion y caveat;
- no usar carpetas privadas de usuarios como dataset de evaluacion sin
  consentimiento informado;
- preferir casos publicos, sinteticos o ya curados para estudios;
- evitar tareas que pidan inferir conclusiones no soportadas;
- separar evaluacion de interfaz de cualquier conclusion sustantiva sobre
  personas, empresas u organismos;
- registrar protocolos de manejo de archivos, metadatos EXIF/PDF y contacto;
- retirar o corregir material curado si cambia la fuente.

Punto a validar: protocolo de consentimiento, minimizacion de datos y revision
por pares o asesor externo antes de estudios con usuarios reales.

## Plan De Trabajo Para Drafting

| Area | Owner sugerido | Pregunta abierta | Artefacto |
| --- | --- | --- | --- |
| Producto | Producto/UX | La taxonomia pista-expediente-carpeta-aporte se entiende sin entrenamiento? | Diagrama de flujo y glosario |
| Datos | Data engineering | Que afirmaciones permite cada fuente y cuales quedan como gaps? | Matriz fuente-campo-afirmacion |
| Reproducibilidad | Data/infra | Que receipts pueden verificarse row-level hoy? | Muestra verificada y reporte |
| UI | Producto/UX | Caveats visibles calibran confianza o reducen accionabilidad? | Protocolo de estudio por tareas |
| Etica | Investigacion | Como evitar uso indebido de aportes privados? | Protocolo de consentimiento y redaccion |

## Criterio De Listo Para Un Primer Borrador

- matriz de fuentes y afirmaciones completada para las fuentes principales;
- un ejemplo de evidence pack revisado;
- diagrama de arquitectura actualizado;
- protocolo de evaluacion humana definido;
- lista de limitaciones revisada por producto y datos;
- lenguaje revisado para asegurar que no acusa ni sobreafirma.
