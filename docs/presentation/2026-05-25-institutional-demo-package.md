# Faro: Recorrido institucional

## Narrativa

Faro es una mesa de trabajo para revisar obra publica con evidencia oficial. El producto parte del mapa, permite abrir expedientes, leer el rastro economico, distinguir fuente oficial de contexto, recibir aportes privados y armar carpetas descargables para investigacion. Faro no acusa: muestra donde mirar, por que mirar y que falta verificar.

## Recorrido

1. Abrir `/` y mostrar el mapa como entrada principal.
2. Entrar a `/pais/AR?mode=explorer&preset=selected` desde `Expedientes seleccionados`.
3. Abrir `AR-CONTRACT-74-0052-CON23` para mostrar expediente, presupuesto, adjudicacion, proveedor, caveats y punto de mapa.
4. Abrir `/expediente/AR-CONTRACT-74-0052-CON23/informe` para mostrar el informe descargable.
5. Volver a `/pais/AR?mode=aportes` para explicar aporte privado y modo sin contacto.
6. Abrir `/pais/AR?mode=investigations` para mostrar carpetas de investigacion.
7. Abrir `/admin/aportes` solo como vista interna de revision: recibido, en revision, necesita mas info, aprobado para cargar o descartado.

## Casos seleccionados

| Caso | Fechas y dato fuerte | Por que entra | Limite |
| --- | --- | --- | --- |
| `AR-CONTRACT-46-1585-CON21` Ruta Nacional 3 Patagonia | Publicado 02/09/2021; apertura 15/10/2021; ARS 6.692,98 M; 2 oferentes. | Caso con punto oficial, contrato, proveedor, monto y fuente. | El contrato no confirma pago ni avance fisico por si solo. No afirmar fecha de firma si la fila contractual no la trae. |
| `AR-MAPA-INV-1003129182` Acueducto Rio Colorado | Inicio 2023; fin previsto 2026; ARS 124.165,7 M; avance fisico 6,11%. | Muestra una brecha real: hay datos de fuente oficial, pero no punto confiable para mapa. | No debe dibujarse como ubicacion territorial hasta tener geometria oficial validada. |
| `AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME` Causa Vialidad | Procesos 2003-2015; veredicto 06/12/2022; firmeza 10/06/2025; 51 procesos viales. | Sirve para separar contexto judicial oficial de contratos administrativos actuales. | No reemplaza expedientes administrativos ni crea relaciones automaticas. La carga completa de las 51 obras requiere otro sprint de datos. |
| `AR-HIST-JUD-CUADERNOS-CAMARITA-TOF7-2026` Cuadernos / La Camarita | Causa base 2018; requerimiento 2019; lectura 09/12/2025; juicio en curso al snapshot. | Permite mostrar contexto oficial y cruces documentales posibles. | Una mencion contextual no alcanza para relacionar contratos. No presentarlo como sentencia. |
| `AR-CONTRACT-74-0052-CON23` Sistema cloacal en Parque Nacional Campos del Tuyu | Publicado 29/09/2022; apertura 18/11/2022; contrato 31/01/2023; 1 oferente. | Suma otro organismo y un expediente chico, completo y con geometria validada. | Requiere revisar actas, ampliaciones, certificados y recepcion para avanzar. No presentar baja competencia como conclusion. |

## Frontera de evidencia

| Capa | Que muestra | Como se presenta |
| --- | --- | --- |
| Evidencia oficial | Dataset, recibo, ruta de archivo, hash, fuente publica y caveats. | Como base verificable del expediente. |
| Contexto documental | Material judicial, fiscal o periodistico citado como apoyo. | Como contexto separado de la fuente oficial del expediente. |
| Aporte privado | Material enviado por usuarios para revision. | Como pista interna, nunca como publicacion automatica. |
| Carpeta | Seleccion de expedientes y notas de trabajo. | Como paquete de investigacion para revisar y descargar. |

## Guion de tres minutos

1. "Faro empieza en el mapa porque la obra publica necesita territorio, pero el mapa solo muestra puntos con geometria oficial validada."
2. "El Explorer permite pasar del territorio al expediente: monto, proveedor, organismo, fuente y caveats."
3. "El rastro economico compara presupuesto oficial, adjudicacion y variacion sin convertir eso en conclusion."
4. "La evidencia oficial y el contexto se separan: una fuente judicial o periodistica ayuda, pero no reemplaza el expediente."
5. "Los aportes entran a revision privada; el modo sin contacto reduce datos pedidos, pero no promete anonimato absoluto."
6. "Las carpetas permiten reunir expedientes relacionados y descargar un informe para trabajo periodistico o institucional."

## Checklist del presentador

- Usar casos seleccionados, no buscar casos al azar durante la reunion.
- Mostrar caveats antes de explicar proximo paso.
- Abrir al menos un informe PDF.
- Explicar que los aportes no se publican automaticamente.
- Cerrar con que Faro ordena la evidencia y acelera el trabajo de investigacion, pero no reemplaza verificacion documental ni trabajo de campo.

## Que no afirmar

- No afirmar delitos, responsabilidades personales ni hechos no verificados.
- No presentar una variacion de monto como conclusion.
- No decir que todo punto del Explorer esta en el mapa.
- No prometer anonimato absoluto en Aportes.
- No decir que un aporte aprobado ya es publico o verdadero.
