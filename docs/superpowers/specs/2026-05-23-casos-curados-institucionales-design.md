# Casos Curados Institucionales Design

Fecha: 2026-05-23
Estado: borrador aprobado para revision de plan
Scope: Faro Argentina, capa editorial de casos destacados

## Principio

La capa de casos curados no es una demo de la app ni una lista forzada de
ejemplos. Es una seleccion editorial minima de expedientes que ayuda a explicar
que hace Faro con evidencia oficial, caveats y proximos pasos de verificacion.

Si hay cuatro casos fuertes, se muestran cuatro. No se agregan casos para llenar
una grilla, un mapa o una narrativa.

Faro no acusa. Los casos curados muestran:

- que fuente oficial existe;
- por que vale mirar el expediente;
- que no prueba la fuente;
- que falta verificar;
- que accion concreta puede hacer un periodista, investigador o institucion.

## Objetivo

Convertir los casos destacados actuales en una capa institucional sobria,
defendible y facil de entender. Debe servir como entrada rapida para autoridades,
periodistas e investigadores sin reemplazar el Explorer ni presentar conclusiones
cerradas.

La experiencia debe comunicar:

```text
caso curado -> expediente -> fuente oficial -> caveats -> carpeta/export
```

## No Objetivos

- No crear un ranking de corrupcion, fraude, riesgo o sospecha.
- No prometer que Faro prueba pagos, ejecucion fisica o delitos.
- No geocodificar ni corregir coordenadas.
- No mezclar aportes privados con evidencia oficial.
- No sumar auth, base de datos ni colaboracion multiusuario en esta capa.
- No forzar cantidad minima de casos.

## Criterios De Entrada

Un caso puede ser curado si cumple al menos un rol institucional claro y conserva
evidencia/caveats suficientes.

Roles aceptados:

1. **Contexto judicial oficial**
   Fuente judicial o fiscal oficial. Sirve para explicar contexto documental,
   siempre separado de contratos modernos salvo match oficial exacto.

2. **Expediente territorial con geometria validada**
   Caso con coordenadas oficiales que pasan el gate de mapa. Sirve para mostrar
   mapa, expediente, receipt y limitaciones.

3. **Brecha de datos/verificacion**
   Caso con fuente oficial y dato relevante, pero con una ausencia visible:
   geometria, pagos, certificados, avance o match documental. El valor es mostrar
   donde falta informacion, no insinuar conducta.

4. **Patron investigable por entidad**
   Proveedor u organismo con senales de recurrencia, competencia o concentracion.
   Debe tener CUIT/documento o caveat explicito si el match es solo por nombre.

## Criterios De Exclusion

Excluir o dejar en reserva si:

- el caso depende de inferencias manuales;
- la coordenada no es oficial o no pasa el gate;
- el resumen podria leerse como acusacion;
- el caso solo es llamativo por monto sin buena trazabilidad;
- hay fuente periodistica sin receipt oficial que sostenga el expediente;
- la explicacion necesita demasiados caveats para una entrada institucional.

## Ficha Estandar

Cada caso curado debe tener:

- `caseId`
- `titulo corto`
- `rol`
- `fuente principal`
- `por que mirar`
- `que sostiene la fuente`
- `que no sostiene`
- `siguiente paso`
- `estado de mapa`
- `acciones`: abrir expediente, abrir fuente, guardar en carpeta/exportar

## Candidatos Iniciales

### 1. Ruta Nacional 3 Patagonia

- `caseId`: `AR-CONTRACT-46-1585-CON21`
- Rol: expediente territorial con geometria validada.
- Fuente principal: `AR-CONTRATAR-CONTRATOS`.
- Por que mirar: muestra contrato, obra, proveedor, monto, geometria oficial y
  receipts en un flujo entendible.
- Que sostiene: contrato oficial, ubicacion oficial validada y proveedor
  identificado.
- Que no sostiene: no confirma pago ni avance fisico por si solo.
- Siguiente paso: cruzar con certificados, pagos, recepciones o avance fisico
  cuando existan fuentes oficiales.
- Estado de mapa: map-ready.

### 2. Mapa de Inversiones: obra con avance declarado y sin geometria oficial

- `caseId`: `AR-MAPA-INV-1003129182`
- Rol: brecha de datos/verificacion.
- Fuente principal: `AR-MAPA-INVERSIONES-OBRAS`.
- Por que mirar: muestra que Faro no solo ilumina puntos de mapa; tambien
  preserva expedientes relevantes cuando falta geometria oficial validada.
- Que sostiene: monto, etapa, avance fisico/financiero declarado y perfil
  oficial segun la fuente.
- Que no sostiene: no permite ubicar la obra en mapa sin geometria oficial; no
  prueba pago ni ejecucion por si solo.
- Siguiente paso: buscar una fuente oficial de geometria o certificados/pagos
  antes de elevarlo como caso territorial.
- Estado de mapa: no map-ready.
- Limite editorial: no implica relacion con otros casos curados por compartir
  proveedor u organismo salvo match documental exacto.

### 3. Causa Vialidad CFP 5048/2016/TO1

- `caseId`: `AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME`
- Rol: contexto judicial oficial.
- Fuente principal: `AR-CIJ-VIALIDAD-VEREDICTO`.
- Por que mirar: muestra como Faro puede incorporar contexto judicial oficial
  sin convertirlo en una acusacion nueva.
- Que sostiene: existencia de fuente judicial oficial y estado documental de la
  causa.
- Que no sostiene: no identifica por si solo contratos actuales de Faro ni
  reemplaza el expediente administrativo de cada obra.
- Siguiente paso: abrir fuente judicial, revisar receipts relacionados y buscar
  matches administrativos exactos antes de relacionar obras modernas.
- Estado de mapa: no map-ready.
- Tratamiento UX: contexto documental sensible, separado del mapa.

### 4. Cuadernos / La Camarita - juicio oral TOF 7

- `caseId`: `AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026`
- Rol: contexto judicial oficial con menciones de entidades.
- Fuente principal: `AR-MPF-CUADERNOS-CAMARITA`.
- Por que mirar: explica una causa de interes publico con caveats fuertes sobre
  el alcance de los cruces.
- Que sostiene: fuente MPF y contexto judicial/fiscal documentado.
- Que no sostiene: no afirma que contratos Faro relacionados sean hechos del
  juicio ni que exista responsabilidad, pago o conducta sobre registros
  actuales.
- Siguiente paso: abrir la fuente MPF, revisar entidades mencionadas y separar
  match de proveedor de match documental de contrato.
- Estado de mapa: no map-ready.
- Tratamiento UX: contexto documental sensible, separado del mapa y con limite
  visible sobre juicio en curso.

## Casos En Reserva

Los siguientes pueden servir, pero no entran automaticamente:

- proveedores de La Camarita con coincidencia documentada por entidad;
- contratos con competencia baja y proveedor recurrente;
- obras con monto sobre presupuesto oficial;
- expedientes de Mapa de Inversiones de alto monto.

Estos candidatos necesitan una revision de lenguaje y de fuente antes de quedar
destacados.

## Experiencia De Usuario

La capa curada debe aparecer como una entrada editorial sobria:

- en mapa/home: solo callouts para casos con geometria validada; los casos sin
  punto viven en un panel editorial separado del canvas del mapa;
- en Explorer: filtro o preset "Casos curados";
- en expediente: sello discreto "Curado por Faro" con explicacion de criterio;
- en carpeta: accion para crear una carpeta desde un caso curado o agrupar dos
  casos relacionados.

El mapa no debe ser obligatorio. Un caso judicial o una brecha sin geometria
puede ser destacado aunque no tenga punto.

Cada tarjeta visible debe incluir, como minimo:

- documento fuente;
- limite/caveat en lenguaje comun;
- estado de mapa cuando corresponda;
- accion concreta para abrir el expediente.

## Reglas De Copy

Usar:

- "contexto judicial oficial";
- "brecha de datos";
- "geometria oficial validada";
- "requiere verificar pago/avance";
- "match a nivel proveedor";
- "siguiente paso de verificacion".

Evitar:

- "corrupcion";
- "fraude";
- "culpable";
- "sospechoso";
- "prueba de pago";
- "obra fantasma";
- "red de corrupcion".

## Validacion

Antes de implementar o publicar la capa:

1. Cada `caseId` debe existir en el corpus actual.
2. Cada caso debe tener receipt principal.
3. Cada caso debe mostrar caveat visible.
4. Los casos no map-ready no deben dibujarse en el mapa.
5. Los conteos globales deben estar alineados con `data:quality-report`.
6. La UI debe poder mostrar menos de cuatro casos sin verse rota.

## Plan De Revision

Revisar este spec con tres perspectivas:

1. **Datos/evidencia:** confirmar que los candidatos tienen receipt, caveat y
   fuente defendible.
2. **UX/editorial:** confirmar que la capa se entiende sin parecer una demo ni
   una acusacion.
3. **Riesgo institucional:** confirmar que el lenguaje y los limites son
   adecuados para presentar como transparencia de gobierno.
