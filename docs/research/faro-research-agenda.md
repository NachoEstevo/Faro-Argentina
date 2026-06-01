# Agenda De Investigacion Faro

Estado: agenda inicial para ordenar trabajo academico y experimental. No define
sede de publicacion, no promete resultados y no convierte hipotesis en
afirmaciones de producto.

## Postura Recomendada

Documento base: [Esquema para paper fundacional](faro-base-paper-outline.md).

La secuencia mas responsable es:

1. escribir el paper fundacional de Faro como infraestructura de evidencia;
2. ejecutar una linea experimental de evaluacion humana sobre interfaces de
   evidencia civica;
3. sumar una linea de friccion de datos publicos o benchmark regional solo si el
   equipo puede sostener una matriz comparativa verificable.

La linea de LLMs como intermediarios investigativos queda diferida. Es relevante,
pero agrega riesgo de sobreinterpretacion, privacidad y evaluacion antes de que
el contrato base de evidencia este suficientemente documentado.

## Lineas Priorizadas

### Linea 1: Paper Base Sobre Infraestructura De Evidencia

Origen en candidatos:

- No acusacion, solo verificacion.
- Evidence packs as boundary objects.
- Caveats as alignment mechanisms.

Por que va primero:

- fija el vocabulario: pista, expediente, receipt, caveat, gap, carpeta privada,
  aporte privado y evidencia curada;
- permite explicar Faro sin apoyarse en promesas de impacto;
- crea una base comun para reviewers de producto, datos, investigacion y
  operaciones;
- reduce el riesgo de que futuras lineas experimentales midan algo ambiguo.

Preguntas de investigacion:

- Que estructura minima necesita un expediente verificable?
- Como se preserva trazabilidad desde UI hasta snapshot oficial?
- Donde debe vivir un caveat para cambiar la interpretacion del usuario?
- Como se separa trabajo privado de evidencia publica?

Artefactos esperados:

- paper outline convertido en borrador;
- glosario de entidades y estados de evidencia;
- diagrama de arquitectura;
- matriz fuente-campo-afirmacion;
- ejemplo de evidence pack publico o sintetico;
- protocolo etico para uso de casos y aportes.

Owners sugeridos:

- Producto: taxonomia, UI y lenguaje.
- Datos: fuentes, pipeline, receipts y limites de afirmacion.
- Investigacion: estructura academica, preguntas y metodologia.
- Legal/etica o asesor externo: privacidad, consentimiento y manejo de aportes.

Validacion necesaria:

- revision interna de no sobreafirmacion;
- revision de una muestra de receipts contra fuentes;
- lectura externa por alguien que no conozca Faro para detectar ambiguedades.

Riesgos:

- que el paper parezca marketing si usa resultados no medidos;
- que el concepto de evidence pack quede demasiado tecnico para audiencias
  civicas;
- que se mezclen aportes privados con evidencia publica por falta de lenguaje
  preciso.

### Linea 2: Evaluacion Humana De Interfaces De Evidencia Civica

Origen en candidatos:

- Human evaluation of civic evidence interfaces.
- Caveats as alignment mechanisms.
- Evidence packs as boundary objects.

Por que es la primera linea experimental:

- Faro necesita saber si su interfaz cambia comprension y confianza calibrada,
  no solo si se ve profesional;
- los caveats visibles son una decision fuerte de producto y deben medirse;
- puede ejecutarse con casos publicos o sinteticos sin usar aportes privados;
- ayuda a decidir si Explorer, expediente, carpeta y export estan separando bien
  pista, evidencia, gap y proximo paso.

Hipotesis a testear:

- usuarios con caveats visibles distinguen mejor entre contrato, pago, avance y
  verificacion pendiente;
- evidence packs reducen perdida de trazabilidad frente a capturas o tablas
  sueltas;
- una interfaz que evita lenguaje conclusivo puede seguir siendo accionable para
  periodistas y watchdogs.

Diseno inicial:

- tareas controladas con 6 a 12 participantes por ronda exploratoria;
- perfiles separados: periodista, auditor/watchdog, ciudadano informado;
- casos publicos seleccionados y casos sinteticos con receipts controlados;
- comparacion entre expediente Faro y una vista tipo tabla/portal;
- medicion de comprension, confianza calibrada, tiempo a fuente, identificacion
  de gaps y calidad de proximo paso.

Materiales permitidos:

- expedientes publicos ya incluidos en el repo;
- evidence packs sinteticos;
- fuentes oficiales publicas;
- carpetas demo sin informacion privada.

Materiales excluidos:

- aportes privados;
- carpetas reales de usuarios;
- archivos subidos por usuarios;
- datos de contacto;
- contenido con metadatos no revisados.

Owners sugeridos:

- Investigacion: protocolo, consentimiento, guion y analisis.
- Producto/UX: variantes de interfaz y tareas.
- Datos: seleccion de casos y verificacion de fuentes.
- Operaciones: almacenamiento minimo de resultados y control de acceso.

Artefactos esperados:

- protocolo de estudio;
- consentimiento informado;
- guion de tareas;
- rubrica de scoring;
- dataset de respuestas anonimizado o agregado;
- reporte de hallazgos con limites.

Validacion necesaria:

- piloto con 1 a 2 participantes antes de recolectar datos;
- revision de que las tareas no empujen a inferir conclusiones no soportadas;
- registro de incidentes si un participante intenta usar datos privados o
  sensibles.

Riesgos:

- medir preferencia visual en lugar de comprension;
- inducir respuestas por wording de tareas;
- usar ejemplos demasiado faciles que no representen friccion real;
- publicar fragmentos de sesiones con informacion sensible.

### Linea 3: Friccion De Datos Publicos Y Benchmark Regional

Origen en candidatos:

- Public data friction.
- Latin American public transparency benchmark.

Por que es viable si se acota:

- conecta directamente con el problema que Faro intenta reducir;
- permite comparar fuentes por criterios observables, no por percepciones;
- puede empezar con Argentina y ampliarse solo cuando haya capacidad;
- alimenta decisiones de producto y datos sin requerir afirmaciones de impacto.

Alcance recomendado:

- empezar con una matriz Argentina de fuentes oficiales usadas por Faro;
- medir fricciones concretas: estabilidad de URL, campos clave, identificadores,
  licencia, frecuencia, machine readability, historial, documentacion, hashes,
  joins, geometria, pagos/certificaciones y citabilidad;
- comparar 2 o 3 jurisdicciones latinoamericanas solo como extension posterior y
  con criterios identicos.

Preguntas de investigacion:

- Que fricciones bloquean convertir un registro publico en expediente
  verificable?
- Que fuentes permiten afirmaciones fuertes y cuales solo contexto?
- Donde se rompe la trazabilidad: descarga, schema, identificador, join,
  geometria, fuente publica o versionado?
- Como deberia reportarse una brecha sin convertirla en conclusion?

Owners sugeridos:

- Datos: matriz tecnica de fuentes y criterios de scoring.
- Producto: traduccion de fricciones a caveats y UI.
- Investigacion: comparabilidad y limites metodologicos.
- Relaciones institucionales: contacto con fuentes si se requiere aclaracion.

Artefactos esperados:

- matriz de fuente por criterio;
- taxonomia de fricciones;
- ejemplos de good path y broken path;
- recomendacion de proxima fuente a integrar;
- anexo metodologico para comparaciones futuras.

Validacion necesaria:

- doble revision de criterios antes de puntuar fuentes;
- evidencia archivada para cada calificacion;
- separacion entre disponibilidad tecnica y calidad institucional;
- actualizacion fechada, porque los portales pueden cambiar.

Riesgos:

- parecer evaluacion institucional sin suficiente base;
- mezclar paises o jurisdicciones con marcos legales distintos;
- sobrevalorar machine readability sobre calidad sustantiva;
- dejar obsoleta la matriz si no hay ciclo de mantenimiento.

## Lineas No Priorizadas Ahora

### LLMs Como Intermediarios Investigativos

Motivo para diferir:

- requiere guardrails fuertes para no transformar pistas en conclusiones;
- puede exponer aportes o carpetas privadas si se integra antes de tiempo;
- necesita evaluacion de alucinacion, citabilidad, privacidad y trazabilidad;
- depende de que el modelo base de evidence packs este estable.

Condicion para retomarla:

- paper base escrito;
- protocolo de evaluacion humana definido;
- evidence packs con receipts y caveats suficientemente estructurados;
- politica clara de que el sistema no produce conclusiones sustantivas.

### No Acusacion, Solo Verificacion Como Linea Independiente

Motivo para no separarla:

- es el principio transversal de Faro, no un experimento aislado;
- debe aparecer en todas las lineas;
- si se vuelve slogan, puede debilitar la precision metodologica.

Condicion para convertirla en paper propio:

- evidencia empirica de que el encuadre cambia comprension, confianza calibrada
  o calidad de proximo paso.

## Roadmap De 90 Dias

### Dias 1-30

- cerrar glosario y outline del paper base;
- completar matriz fuente-campo-afirmacion para fuentes principales;
- seleccionar 2 expedientes publicos y 1 sintetico para ejemplos;
- definir protocolo etico para estudios;
- revisar lenguaje para asegurar que no acusa ni sobreafirma.

### Dias 31-60

- convertir outline en borrador;
- preparar diagrama de arquitectura y ejemplo de evidence pack;
- disenar piloto de evaluacion humana;
- ejecutar piloto pequeno y ajustar tareas;
- iniciar matriz de friccion de datos para fuentes Argentina.

### Dias 61-90

- completar primera ronda de evaluacion humana si el protocolo esta aprobado;
- escribir reporte de resultados con limites;
- cerrar benchmark Argentina v0;
- decidir si la extension regional tiene suficiente base;
- preparar version revisada del paper base con evidencia empirica marcada como
  preliminar.

## Criterios De Decision

Continuar una linea si:

- produce un artefacto reusable para producto o investigacion;
- puede validar una pregunta sin usar material privado;
- mantiene caveats y gaps visibles;
- no requiere afirmar impacto no medido.

Pausar una linea si:

- depende de datos privados o aportes no curados;
- exige afirmaciones que las fuentes no soportan;
- no tiene owner claro;
- no puede sostener trazabilidad de evidencia.
