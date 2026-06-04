# Faro: Spec de profesionalizacion investigativa, datos y gobernanza

Fecha: 2026-06-04
Estado: aprobado para implementar primer corte
Alcance: puntos 2 a 5 del bloque de profesionalizacion

## Resumen

Faro ya tiene las piezas centrales: mapa prudente, Explorer, expedientes,
receipts, caveats, carpetas privadas, aportes privados y admin de revision. El
siguiente salto no debe ser agregar muchas pantallas ni prometer inteligencia
artificial. El salto correcto es convertir esas piezas en una herramienta de
trabajo que ayude a periodistas e investigadores a responder:

1. Que evidencia oficial existe?
2. En que tramo del ciclo de contratacion esta esa evidencia?
3. Que faltantes o brechas impiden tratar esto como hallazgo?
4. Que relaciones fueron declaradas por el usuario y con que base?
5. Que tareas concretas quedan antes de compartir, exportar o escalar?
6. Que material privado esta pendiente de revision y que nunca debe publicarse
   automaticamente?

La filosofia sigue siendo:

```text
Faro no acusa. Faro muestra donde mirar, por que mirar ahi, que evidencia
existe y que falta verificar.
```

## Investigacion externa usada

La referencia metodologica principal es el ciclo de contratacion abierta:
planificacion, licitacion, adjudicacion, contrato e implementacion. OCDS describe
que un proceso de contratacion puede tener etapas de tendering, awarding,
contracting e implementation, con datos de pagos, progreso, ubicacion,
enmiendas y cierre en implementacion.

Fuentes oficiales argentinas refuerzan el mismo enfoque:

- Datos Argentina publica CONTRAT.AR Obra Publica con recursos de
  procedimientos, circulares, ofertas, contratos, obras, ubicacion geografica y
  actas de apertura. La ficha declara que los datos se publican segun el
  Estardar de Datos para las Contrataciones Abiertas.
- El documento metodologico de CONTRAT.AR separa etapas de Licitaciones,
  Contrataciones y Ejecucion, y define joins por `procedimiento_numero` y
  `numero_obra`.
- Mapa de Inversiones Argentina aporta presupuesto, ejecucion, avance fisico,
  avance financiero, fechas, provincia/departamento y entidad ejecutora cuando
  esos campos existen.
- La Oficina Nacional de Contrataciones es el organo rector del Sistema de
  Contrataciones de la Administracion Publica Nacional.

Implicacion para Faro: no alcanza con mostrar "contrato". Hay que mostrar que
un contrato no prueba pago ni avance, que una obra con avance no siempre tiene
geometria util, que un contexto judicial es contexto y que la carpeta privada
debe documentar que falta pedir.

Referencias:

- https://standard.open-contracting.org/latest/en/primer/how/
- https://datos.gob.ar/dataset/jgm-procesos-contratacion-obra-publica-gestionados-plataforma-contratar
- https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.0/download/metodologia-contratar.pdf
- https://datos.gob.ar/dataset/obras-mapa-inversiones-argentina/archivo/obras_1.1
- https://www.argentina.gob.ar/jefatura/ejecutiva/oficina-nacional-de-contrataciones

## Principios de diseno de producto

### 1. Ciclo de evidencia, no score

Faro debe explicar si la fuente esta en licitacion, adjudicacion, contrato,
ejecucion, contexto judicial o aporte privado. No debe transformar esa etapa en
un score de irregularidad.

### 2. Datos faltantes como output util

Una brecha de geometria, proveedor, monto, pago, avance o fuente directa no es
un error cosmetico. Es informacion accionable para pedir documentos o revisar la
fuente original.

### 3. Carpeta como mesa de trabajo

Una carpeta no es un "caso publicado". Es un workspace privado para pregunta,
expedientes, relacion declarada, matriz, brechas, tareas, fuentes manuales,
analisis y export. Si una carpeta luego deriva en investigacion publica o fallo
judicial, eso exige una capa futura de curacion editorial, no una publicacion
automatica.

### 4. Aportes separados de evidencia oficial

Aportes sigue siendo material privado. Aun aprobado para investigacion, no se
vuelve evidencia publica sin curacion manual, redaccion, caveat, alt text si hay
imagen, permiso/fuente y responsable.

### 5. Determinismo antes que IA

La busqueda investigativa, indices estables, pivots, readiness y matrices de
fuente-campo-afirmacion aportan mas valor hoy que "AI search". La IA puede
ayudar despues como lectura auxiliar, pero solo sobre paquetes acotados y con
acceso gated.

## Punto 2: Robustez del Explorer

### Problema

El Explorer ya busca por provincia, localidad, proveedor, CUIT, organismo,
fuente, senal e identificadores. El proximo problema no es solo encontrar
resultados, sino entender que tipo de evidencia se esta viendo y que filtros
acercan a una pregunta investigativa real.

### Objetivo

Convertir el Explorer en una herramienta de orientacion investigativa:

- busqueda rapida y estable;
- resultados categorizados por match;
- pivots por entidad/lugar/fuente/senal;
- lectura visible de etapa de evidencia;
- salida natural hacia expediente o carpeta;
- export que preserve receipts y caveats.

### Requisitos funcionales

1. Mantener indices precomputados y `useDeferredValue` para evitar recomputar
   todo por tecla.
2. Mantener sugerencias por:
   - provincia, departamento, localidad;
   - proveedor y CUIT/documento;
   - organismo y unidad contratante;
   - expediente, procedimiento, obra, contrato;
   - fuente;
   - senal;
   - alias controlados.
3. Agregar, en fase posterior, perfiles de entidad:
   - perfil proveedor;
   - perfil organismo;
   - perfil provincia/departamento;
   - perfil fuente;
   - perfil senal.
4. Cada perfil debe mostrar:
   - cantidad de expedientes;
   - total de montos cuando sean comparables;
   - fuentes involucradas;
   - señales principales;
   - brechas principales;
   - ejemplos de expedientes;
   - caveat sobre la base de relacion.
5. Evitar perfiles que sugieran culpa, ranking de sospechosos o acusacion.
6. Cuando el usuario guarda en carpeta desde Explorer, preservar motivo y nota
   si ya existen; el guardado rapido no debe pisar contexto manual.

### No objetivos

- No "AI search" en esta etapa.
- No ranking de corrupcion o sospecha.
- No inferir relaciones por geocoding, domicilios o nombres dudosos.
- No mostrar aportes privados en resultados.

### Criterios de aceptacion

- Buscar "Buenos Aires" muestra matches de ubicacion y filas filtrables sin
  congelar la UI.
- Buscar un CUIT o proveedor encuentra expedientes y permite abrir carpeta.
- Un resultado explica si es contrato, obra con avance, contexto judicial u otra
  pieza.
- El usuario puede pasar de search -> expediente -> carpeta en menos de un
  minuto sin perder caveats.

## Punto 3: Datos

### Problema

La plataforma tiene buenos datos, pero al usuario le falta entender cobertura y
limites. "7.932 expedientes" no alcanza: hay que explicar que fuentes cubren
que parte del ciclo y que campos habilitan que afirmaciones.

### Objetivo

Construir una matriz de utilidad de datos que se pueda mostrar en `/datos`,
metodologia, docs y eventualmente en Explorer/Carpetas:

```text
fuente -> tramo del ciclo -> campos disponibles -> afirmaciones permitidas
-> brechas -> proxima accion
```

### Requisitos funcionales

1. Mantener source catalog como fuente de verdad documental.
2. Mostrar fuentes principales con:
   - fuente;
   - organismo/mantenedor;
   - etapa del ciclo;
   - frecuencia declarada;
   - formato;
   - campos utiles;
   - caveats.
3. Derivar metricas reales desde datasets generados:
   - casos por fuente;
   - raw rows;
   - casos map-ready;
   - casos con receipts;
   - casos con monto;
   - casos con proveedor;
   - casos con geometria.
4. Separar "disponible en Explorer/export" de "dibujable en mapa".
5. Hacer visible que Mapa de Inversiones puede aportar avance/presupuesto pero
   el snapshot actual no debe forzar puntos de mapa si la geometria no pasa el
   gate.
6. Registrar potenciales proximas fuentes con estado:
   - candidata;
   - en evaluacion;
   - bloqueada;
   - integrada.

### No objetivos

- No refrescar fuentes externas automaticamente como reparacion rutinaria.
- No incorporar datos sin receipt, caveat y test de parser.
- No publicar metricas publicas sin correr reportes actuales.
- No comparar instituciones con una matriz no revisada.

### Criterios de aceptacion

- `/datos` explica para usuarios no tecnicos que fuentes existen y que limites
  tienen.
- El equipo puede decidir la proxima fuente sin depender de memoria oral.
- Cada nueva fuente debe pasar por matriz fuente-campo-afirmacion.

## Punto 4: Carpetas como herramienta profesional

### Problema

Carpetas ya guarda expedientes, notas, fuentes, tareas, analisis y export. Pero
cuando crece el contenido, la carpeta necesita decir si el dossier esta listo
para handoff interno, que falta y por que no se debe compartir como conclusion.

### Objetivo

Agregar una lectura de preparacion de carpeta:

```text
pregunta -> evidencia oficial -> relaciones declaradas -> brechas ->
tareas -> material manual -> handoff/export
```

### Requisitos funcionales

1. Mantener carpeta privada por defecto.
2. Mostrar "Preparacion del dossier" en Resumen:
   - nivel: inicial, en armado o listo para handoff interno;
   - checks por dimension;
   - proximas acciones;
   - blockers reales.
3. Dimensiones minimas:
   - evidencia oficial cargada;
   - notas de relacion;
   - cobertura de fuentes;
   - brechas de datos;
   - plan de verificacion;
   - fuentes/manuales pendientes.
4. Un check puede ser:
   - `ready`: suficiente para este corte;
   - `review`: util pero requiere atencion;
   - `blocked`: impide handoff responsable.
5. La preparacion no debe decir "caso fuerte" o "probado"; debe hablar de
   "handoff interno" y "pendientes".
6. Export debe incluir esta lectura para que el ZIP no salga sin contexto.
7. La matriz de evidencia debe seguir siendo collapsible/densa, no una sabana
   de texto.
8. En fase posterior, agregar modos:
   - Vista resumen ejecutiva;
   - Matriz completa;
   - Tareas;
   - Fuentes;
   - Export.

### No objetivos

- No hacer carpetas publicas.
- No publicar carpetas creadas por periodistas.
- No entrenar ML con carpetas privadas.
- No convertir una carpeta en expediente oficial.

### Criterios de aceptacion

- Con 2 o mas expedientes, el usuario sabe que falta completar antes del
  handoff.
- El ZIP incluye estado, blockers y proximas acciones.
- Los checks no usan lenguaje acusatorio.

## Punto 5: Admin y gobernanza

### Problema

Admin de Aportes ya existe, pero la plataforma necesita gobernanza documentada
para sostener produccion: roles, auditoria, estados, curacion publica,
retencion, removidos, adjuntos e incidentes.

### Objetivo

Hacer que el equipo pueda operar Aportes sin ambiguedad:

```text
recibido -> revision -> decision privada -> vinculo privado -> candidato
publico -> evidencia curada -> retiro
```

### Requisitos funcionales

1. Mantener `review_status`, `inbox_state` y `publication_status` separados.
2. Mantener auditoria para:
   - apertura de bandeja;
   - apertura de adjuntos;
   - cambios de revision;
   - archive/remove/restore;
   - vinculos;
   - promocion;
   - retiro.
3. Prohibir acciones repetidas sin efecto.
4. Hacer visible que `removed` es remocion blanda operativa, no borrado fisico.
5. Evidencia curada publica:
   - solo admin;
   - solo aporte aprobado para investigacion;
   - solo vinculado a expediente;
   - titulo neutral;
   - caption neutral;
   - caveat;
   - fuente/permiso;
   - media alt text si hay imagen;
   - copia publica separada del adjunto privado.
6. Crear o documentar una vista de auditoria interna legible.
7. Registrar responsables operativos pendientes sin inventarlos.
8. En fase posterior, agregar export interno de auditoria por submission.

### No objetivos

- No borrar fisicamente aportes desde la bandeja comun.
- No mostrar object keys privados en APIs publicas.
- No exponer contacto o metadata de aportes.
- No publicar automaticamente imagenes aprobadas.

### Criterios de aceptacion

- Admin puede limpiar bandeja sin perder trazabilidad.
- Reviewer no puede publicar ni retirar evidencia curada.
- Expediente publico muestra aportes curados separados de evidencia oficial.
- Runbook explica que queda pendiente antes de promocionar masivamente.

## Valor que si agrega

- Menos tiempo para entender si una pista tiene evidencia suficiente.
- Menos riesgo de sobreinterpretar contratos como pagos o avance.
- Mejor handoff entre periodista, editor, auditor o equipo institucional.
- Mejor defensa metodologica en una presentacion publica.
- Mejor base para papers y evaluaciones humanas.
- Menos dependencia de memoria del equipo para explicar fuentes y caveats.

## Valor que no agrega ahora

- Modelos de ML sin ground truth.
- Redes neuronales para "descubrir corrupcion".
- Galerias grandes de casos no curados.
- Publicar carpetas privadas.
- Integrar aportes privados como si fueran oficiales.
- Geocodificar coordenadas faltantes.
- Hacer comparaciones institucionales sin criterios revisados.

## Critica del spec inicial y mejoras aplicadas

### Riesgo 1: alcance demasiado grande

El primer impulso seria implementar perfiles, matriz de datos, carpeta pro,
auditoria y nuevas fuentes al mismo tiempo. Eso es riesgoso. Se corrige
separando el spec completo del primer corte implementable.

### Riesgo 2: confundir readiness con aprobacion publica

Una carpeta "lista" podria sonar como "caso listo para publicar". Se corrige
usando siempre "handoff interno", "preparacion" y "pendientes".

### Riesgo 3: convertir brechas en errores

Las brechas son parte del producto. Se corrige modelandolas como checks
`review`, no como blockers automaticos salvo que falte evidencia basica o plan
de verificacion.

### Riesgo 4: duplicar logica de senales y calidad

El repo ya tiene signals, data quality, coverage, search indexes y dossier. Se
corrige reutilizando esas capas y agregando solo una lectura de preparacion.

### Riesgo 5: prometer gobernanza sin responsables reales

El runbook ya indica responsables pendientes. Se corrige documentando roles y
estados sin inventar personas, canales ni SLAs.

## Implementacion de este goal

Implementado en este bloque:

1. Spec y plan versionados.
2. Nueva lectura de preparacion de dossier basada en carpeta + evidence packs.
3. UI compacta en Carpetas para ver nivel, checks y proximas acciones.
4. Export ZIP con preparacion del dossier.
5. Pagina `/datos` mejorada con matriz fuente-etapa-limites usando datos reales
   del repo.
6. Tests para no romper el contrato de no acusacion.
7. Perfiles investigativos compactos en Explorer para proveedor, organismo,
   provincia, fuente y senal. Son agrupaciones accionables del resultado actual,
   no rankings ni acusaciones.
8. Matriz de fuentes candidatas con estados de integracion, regla de join,
   afirmacion permitida, caveat y proximo paso. Presupuesto Abierto queda como
   prototipo recomendado solo para BAPIN oficial.
9. Auditoria admin visible desde la bandeja de Aportes con metadata
   redaccionada y evento de apertura de bandeja cuando hay base productiva.
10. No-op de vinculos repetidos al mismo expediente/carpeta para evitar ensuciar
    trazabilidad.

Fases posteriores:

1. Paginas dedicadas de perfil por entidad si el uso del panel compacto lo
   justifica.
2. Export interno de auditoria por submission o expediente.
3. Prototipo read-only de Presupuesto Abierto con token explicito y sin escribir
   datos productivos.
4. Study protocol para evaluacion humana de interfaces de evidencia civica.
