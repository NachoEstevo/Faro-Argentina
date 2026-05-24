# Aportes Operativos Y Busqueda Investigativa

## Objetivo

Cerrar dos pasos de profesionalizacion de Faro:

1. Convertir `Aportes` en un flujo operativo de revision privada.
2. Mejorar la busqueda de Explorer como herramienta concreta de investigacion, sin introducir AI search.

## Reglas De Producto

Faro no acusa. Un aporte de usuario no es expediente, no es prueba publica y no aparece automaticamente en mapa, Explorer, informes o exports.

El flujo visible para el equipo usa etiquetas humanas, manteniendo los valores tecnicos actuales:

- `submitted`: recibido
- `accepted_for_review`: en revision
- `needs_more_info`: necesita mas info
- `approved`: aprobado para cargar
- `rejected`: descartado

`approved` significa que el material queda listo para carga o vinculo privado. No publica nada por si solo.

## Paso 4: Profesionalizar Aportes

La bandeja admin debe leerse como una cola de trabajo, no como una lista plana:

- resumen por estado con etiquetas claras;
- orden operativo que prioriza recibido, en revision y necesita mas info;
- timeline interno por aporte;
- acciones guiadas: tomar en revision, pedir mas info, aprobar para cargar, descartar;
- vinculo privado a expediente o carpeta solo cuando el aporte esta aprobado;
- copy explicito de que el material sigue siendo privado.

La API ya esta role-gated por Clerk y guarda eventos/vinculos en Neon cuando `DATABASE_URL` existe. Esta mejora debe usar esa base, no reintroducir codigos privados.

## Paso 5: Busqueda Investigativa

Explorer debe ayudar a periodistas a empezar por entidades concretas:

- proveedor;
- CUIT/documento;
- organismo;
- expediente/procedimiento;
- senal;
- alias;
- fuente;
- provincia/localidad cuando el dato exista.

No se implementa vector DB ni AI search. Las sugerencias deben usar los datos estructurados que ya existen y devolver queries aplicables al buscador actual.

La UI debe mostrar sugerencias compactas debajo del input cuando el usuario escribe. Cada sugerencia debe tener categoria, etiqueta, detalle y accion simple.

## Fuera De Alcance

- Publicacion automatica de aportes.
- Notificaciones por email.
- Busqueda semantica/AI/vectorial.
- Cambios en el modelo oficial de expedientes.
- Geocoding o correccion automatica de coordenadas.

## Verificacion

- Tests unitarios de sugerencias y estado de aportes.
- Tests de integracion por lectura de componentes para asegurar que la UI muestra cola/timeline/sugerencias.
- `npm test`, `npm run typecheck`, `npm run build`.
