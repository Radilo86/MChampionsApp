# Cambios, errores corregidos y verificación

## 0. Esta versión: español, reglas verificadas en partida, revisión de cartas oficiales y pagos

### Interfaz y partida en español
* **Motor**: las 151 frases que escribe (avisos, registro de jugadas, fin de partida) traducidas (`data/translate_es.json`);
  se carga al arrancar según `settings/idioma.json`.
* **Interfaz**: `i18n.js` traduce lo que se **ve** (textos, botones, `placeholder`, `title`) con frases exactas, patrones y los botones
  OK/Cancelar de dos líneas. No cambia ningún dato: la interfaz original compara nombres internos en inglés (`'End Phase'`…), y se
  comprobó que ninguna lógica compara textos traducibles. Los desplegables sin `value` conservan el original para que los filtros sigan.
* Botón **Idioma** en el menú (español ⇄ inglés). Siguen en inglés: el texto y los nombres de las cartas (texto oficial), las abreviaturas
  impresas ATK/HP/SCH/THW, las descripciones de los desafíos semanales y las opciones propias de algunas cartas.
* Verificado en Chromium: menú, New Game, avisos de la partida, botones, registro, fin de partida; crear partida desde New Game; cambiar de idioma.

### Todas las reglas sin programar, jugadas en partida
* `tests/test_rules_play.py` **35/35**, `tests/test_rules_play2.py` **16/16**, `tests/test_rules_each_player.py` **2/2** (partida real de dos
  jugadores: los puzles solo preparan cartas del primero). Nuevos: acción de alter‑ego (y no usable en héroe), preparar, agotar un aliado,
  «al revelarse (héroe / alter‑ego)», el villano maquina / maquina y ataca a cada jugador, «ponla en juego», descartar hasta un esbirro,
  cada jugador roba / descarta / recibe, coste «descarta una carta de tu mano», curar a un personaje elegido.

### Revisión de las cartas oficiales (`tests/check_card_text.py`)
Compara lo que **anuncia el texto** de cada carta («When Defeated», «Hero Action», «Forced Response»…) con los tipos de habilidad que
**implementa su script**: 3.216 capacidades en 2.804 cartas. Resultado (45 diferencias, 1,4 %):
* **3 errores reales corregidos**: *Psychic Inertia* (40173), *The Hard Call* (50006) y *Stun Gun* (52020) dicen «Hero Action» y estaban
  como «Action»: se podían usar en forma de alter‑ego.
* ~30 diferencias de nombre que siguen la palabra de tiempo del texto («Response: **When**…» implementado como interrupción, «Forced
  Interrupt: **After**…» como respuesta) o efectos implementados como modificadores permanentes: funcionan según el momento indicado.
* ~12 capacidades **sin implementar en el juego original**, casi todas de las cajas más nuevas: *Spellbound* (55022), *The Mangog* (55041),
  *Enchantress* (55003), *Venom Blast* (56177), Iron Man líder (56061), preparación competitiva de *Civil War* (56172a/56199a/56200a),
  *Terrestrial Invasion* (16062a), *NeXt Evolution* (40140b–40142b). Necesitan programarse carta a carta.

### Pago que se queda corto después de gastar (corregido)
*Organizational Support* (50014) dice «agota **hasta** 3 aliados/apoyos… genera sus recursos»: el motor anuncia el máximo posible y el
jugador elige cuántos agota; si agota menos, el pago no alcanzaba, **después** de haber gastado las cartas (también podía pasarle a una
persona). Ahora el motor **deshace exactamente esa jugada** (repite el historial hasta justo antes), las cartas vuelven y avisa, para
volver a intentarlo. Se deshace la jugada **entera** (la decisión que la eligió y las elegidas al pagar, p. ej. qué cartas agotar): una
primera versión que deshacía solo la última decisión repetía el mismo pago y **dejaba la partida en bucle** (encontrado en *En Sabah Nur*);
además hay un seguro: si el mismo punto se deshace repetidamente, deja de hacerlo. Verificado: esa partida termina (5 deshacer correctos),
la partida original de los 7 casos termina, y 70 partidas generales (6.073 decisiones) sin excepciones ni cuelgues.

### Cartas de final de partida
* Bot táctico para el barrido (`BOT=tactico`: frustra con amenaza alta, ataca al villano o al guardián, se defiende y se recupera): alarga las
  partidas poco (media ~4 rondas frente a 3,5 del aleatorio, 30 % llegan a la ronda 5 frente a 25 %); ninguno gana.
* Más eficaz: `LATE=1 ALL_SCEN=1` recorre **los 108 escenarios** preparándolos normal y dejando al villano a 1 de vida y el plan principal a 1
  de completarse, para que las fases avanzadas lleguen **por las reglas**: 101 de 209 fases de villano / planes posteriores llegaron a la
  mesa, **0 excepciones**. (Un primer intento que saltaba la fase I dio 2 errores artificiales: esas fases necesitan lo que coloca la fase I.)

## 0a. Versión anterior: modo edición, reglas sin programar, iconos y espacio en móvil/tablet

### Reglas sin programar (`engine/browser/rules.py`)
Frases en español (`Disparador [(condición)][, coste]: efecto y efecto…`) que el motor traduce a las mismas piezas de
`AbilityFactory` que usan las cartas oficiales: 11 disparadores, 2 costes, 32 efectos, objetivos fijos o elegidos. Errores con sugerencia.
* **Vocabulario**: las 85 combinaciones de prueba se interpretan y construyen correctamente (`tests/test_rules.py`).
* **En partida** (`tests/test_rules_play.py`, 6 partidas‑puzle deterministas, **35/35**): evento de ataque, de frustración y de acción;
  apoyo con «agota esta carta» que aturde; aliado al entrar en juego; traición al revelarse (daño a cada héroe, amenaza, confundir,
  dureza, robar, oleada); esbirro y plan secundario al ser derrotados («cada jugador roba»); el villano te ataca; recibir carta de
  encuentro; buscar por nombre y revelar; curar; descartar al azar; potenciación; villano y plan principal nuevos «al revelarse».
* **Solo comprobado que se construyen** (sin partida específica): preparar / agotar, «ponla en juego», descartar hasta un esbirro,
  «cada jugador descarta/recibe», el villano maquina/ataca a cada jugador, la acción de alter-ego y las variantes «al revelarse (héroe /
  alter-ego)» por separado.
* Límites: sin efectos permanentes, condiciones complejas, límites por ronda ni respuestas a otras cartas (para eso, script).

### Modo edición (`creador.html`)
Formulario táctil: paquete y caja, cartas (valores, palabras clave, constructor de reglas por menús con vista previa), escenarios (fases
de villano, plan principal de dos caras, cartas con copias, sets, versión experta), sets, comprobación por el motor, instalación con
vuelta automática al editor, **probar cada carta en una partida preparada**, descargar ZIP, abrir un paquete instalado o un ZIP.
Verificado en Chromium: una carta hecha solo con menús → instalada → probada (vida del villano 14→10); un escenario completo hecho con el
editor (villano propio, plan de dos caras, traición con reglas, set modular) → su caja en New Game y **normal y experto** arrancan; 0
controles pequeños ni desbordes en iPhone horizontal y vertical.

### Fallos encontrados y corregidos en esta revisión
| Fallo | Arreglo |
|---|---|
| Una carta de un paquete sin `subtitle`, `desc`, `traits` o `set_name` no se cargaba | Campos opcionales con valores por defecto (motor y catálogo de la interfaz) |
| Un valor impreso inexistente (p. ej. `ATKCost`) pasaba la validación y **rompía la partida al prepararse** | El validador solo admite las claves que usan las cartas oficiales de ese tipo y sugiere las válidas |
| Editor: tocar un botón justo después de escribir en un campo **perdía el toque** (el formulario se redibujaba) | Solo se actualiza la lista lateral |
| Robar/descartar «al revelarse» en el primer villano o plan principal (en la preparación) eliminaba a los jugadores | Aviso del validador |

### Iconos y espacio en móvil y tablet
* La capa de estadísticas y rasgos de cada carta (en escritorio se oculta con el ratón) **tapaba la ilustración** para siempre en táctil:
  ahora los rasgos (ya impresos en el arte) se ocultan y los números (estadísticas modificadas, vida, amenaza) son más pequeños y separados.
* Etiqueta «New!» más pequeña.
* El aviso de la pregunta actual pasa del 32 % de la altura (encima de las cartas) al **borde superior**; las vistas reservan su franja.
* «▶ Continuar» en la esquina inferior derecha (al alcance del pulgar).
* Vista «Mesa» solo con aliados y apoyos (antes incluía al héroe y dejaba las cartas a ~68 px; ahora ~108 px).
* El tablero puede desplazarse un poco más allá de sus bordes para encuadrar zonas bajo el aviso o junto a la barra.
Auditoría tras los cambios: mano de 105 px (iPhone 13), 78 (SE), 105 (vertical girado), 72 (iPad, tablero completo), 96 (iPad
vertical); 0 controles < 30 px, 0 fuera de pantalla, 0 cartas bajo la barra; objetivos siempre visibles.

## 0b. Adaptación a móvil y tablet (versión anterior)

Medido en Chromium emulando cada pantalla, jugando solo con toques (mulligan, turno, pago, objetivos, pausa por carta
revelada, cajón, registro, vista ampliada, fin de partida) con una auditoría automática de tamaños:

| Pantalla | Cartas de la mano | Controles < 30 px | Controles fuera de pantalla | Cartas bajo la barra |
|---|---|---|---|---|
| iPhone 13 horizontal (844×390) | 106×146 px | 0 | 0 | 0 |
| iPhone SE horizontal (667×375) | 78 px | 0 | 0 | 0 |
| iPhone 13 vertical (tablero girado) | 106 px | 0 | 0 | 0 |
| iPad horizontal (1180×820, tablero completo) | 72 px | 0 | 0 | 0 |
| iPad vertical (820×1180) | 96 px | 0 | 0 | 0 |

Elegir objetivo: los objetivos quedaron **siempre** completamente visibles (mínimo 106 px en iPhone 13, 64 px en SE, 78 px en iPad).
Páginas (menú, New Game, editor de mazos, visor de cartas, repeticiones, créditos) y ventanas (selector de héroe, importador de
MarvelCDB): 0 controles < 30 px y 0 desbordes en iPhone 13 horizontal, iPhone vertical e iPad.

Cambios: clases de tamaño teléfono/tablet; vistas que se ajustan a las cartas de cada zona (nueva vista *Planes*); enfoque automático
al elegir objetivo o pagar; vista *Todo* junto a la barra (antes tapaba los mazos); vista ampliada de carta más grande y sin quedar bajo
la barra; panel de registro con botones de 34–44 px en una columna desplazable; tamaños de botones, avisos y notificaciones por
dispositivo; hoja táctil para las páginas de menú activada por tipo de pantalla (antes, por ancho, el iPhone en horizontal no la
recibía); campos con letra de 16 px (iOS amplía la página con menos); héroes con el mismo nombre se distinguen; giro automático solo
en teléfonos. Fallos corregidos: **Cancelar quedaba tapado por OK** (no se podía cancelar en el móvil), la vista inicial se calculaba
durante el reparto de cartas, al girar se mantenía una vista que ya no encajaba, y *Share replay* (servicio en línea con ventana
emergente) se oculta en táctil.

**No verificado**: Safari/iOS real ni un teléfono o tablet físico (gestos reales, rendimiento, memoria).

## 0a. Revisión completa (versión anterior)

**Errores encontrados y corregidos** (comprobador propio que importa los 4.259 módulos y busca nombres usados que no existen
en tiempo de ejecución; pyflakes no sirve aquí por los `import *`):

| Dónde | Error | Cartas afectadas |
|---|---|---|
| `game/card/face/model/face_gain.py` | `HasResourceIcon` sin importar: `NameError` al dar un icono de recurso | 45176 |
| `game/card/card_finder/helper.py` | `Minion` sin importar: `NameError` con el selector «YourEngagedMinions» | 34011, 43014, 40111 |
| `game/ability/factory/damage.py` | `BuffCannotTakeDamage` sin importar: `NameError` en «no puede recibir daño» | 39039, 39055, 38035 |
| `game/ability/factory/ability_factory.py` | `EncounterCard` sin importar: `NameError` al intentar adjuntar | 21139b |
| `game/ability/factory/.temp.py` | archivo suelto vacío | — (eliminado) |

Los otros 3 avisos son código muerto (tras un `return`) o de ejemplo, sin efecto.

**Datos**: 0 cartas inexistentes en los 184 sets, 135 escenarios/desafíos y 63 mazos; 0 ids duplicados. Contenido que el
original **no incluye** (aparece como no disponible en New Game, no es un fallo): el escenario *God of Lies* (Trickster
Takeover), los sets `age_of_apocalypse` y `mission` (hay un `age_of_apocalypse_WIP.json` a medias) y el desafío *2425 Boss Rush*.

**Paquetes de contenido** (nuevo): importar/quitar desde el menú, validación con el propio motor (cartas, scripts —que se
ejecutan—, escenarios, sets, mazos, caja e imágenes), inclusión en el build (`--content`) y validador de línea de comandos.
Verificado: el ejemplo se instala, su caja aparece en New Game con normal y experto, la carta nueva se dibuja, el escenario
se juega (12 partidas, 944 decisiones, 0 excepciones, el script de la carta nueva se ejecutó 7 veces), un paquete con errores
se rechaza con los motivos, y al quitarlo desaparece.

## 0b. Novedades de la versión anterior

| Tema | Qué se ha hecho | Cómo se ha verificado |
|---|---|---|
| **Instalación en GitHub Pages que se quedaba en «Instalando…»** | La app eran ~150 archivos y la web de GitHub sube 100 a la vez; si faltaba uno, `cache.addAll` fallaba en silencio. Ahora: la interfaz va en un solo `ui.zip` (la app son ~34 archivos), descargas con 3 reintentos y de 5 en 5, error que **nombra los archivos que faltan**, límite de tiempo, y `diagnostico.html` + `app-files.json` para comprobar el alojamiento | Chromium con la app servida bajo una subruta (como GitHub Pages): instalación normal; 2 archivos ausentes → error con la lista; servidor que falla 2 veces por archivo → se recupera; `ui.zip` ausente → error claro; diagnóstico lista lo que falta |
| **Vertical** | El tablero se gira 90° automáticamente en un teléfono en vertical (botón ⟳ para desactivarlo) | iPhone 13 390×844: el tablero ocupa la pantalla (844×390 por dentro), los toques funcionan girado, el botón lo desactiva |
| **Mano cortada** | En táctil el tablero es 80 px más alto y la mano se apoya en el borde (en escritorio colgaba un 25 % por debajo y subía con el ratón) | Borde inferior de las cartas en 382 de 390 px; el héroe no queda tapado; los mazos del jugador ya no se recortan |
| **Partidas guardadas entre versiones** | Si una partida deja de reproducirse igual (otra versión o versión de escritorio), el motor se detiene en ese punto, descarta lo que queda, **lo explica** y el jugador sigue | Prueba con otro generador aleatorio: no se rompe, avisa, y la partida sigue siendo jugable |
| **Entradas inválidas** | (1) Validador antes del motor: opción inexistente u obsoleta, opción no jugable, objetivo ilegal, nº de objetivos, pago con algo que no es fuente. (2) El controlador deshace lo que una decisión rechazada ya había cambiado. (3) **Pago atómico**: el pago se comprueba con el propio predicado de coste del motor **antes** de mover la carta o gastar nada (antes la carta acababa descartada y se gastaban los recursos) | Cinco decisiones inválidas seguidas dejan el estado idéntico, la jugada correcta funciona después y la repetición reproduce el estado. Barridos: predicción del pago = resultado real en 1.444 de 1.444 (modo sombra); con la protección activa, 5.122 decisiones, 0 excepciones, 1.623 pagos insuficientes rechazados sin tocar nada |
| **Copia de seguridad** | Exportar / restaurar un ZIP con mazos, partidas, autoguardado, estadísticas y ajustes; rechaza ZIP ajenos y rutas peligrosas | Exportar → borrar datos → restaurar → reiniciar: el mazo y los ajustes vuelven |

Límites de lo anterior (con honestidad):
* Una primera versión del validador también comprobaba «el coste está cubierto» y **rechazó 12 jugadas legales** de 3.600
  (el motor admite pagos más baratos: costes reducidos, reglas especiales). Esa regla se retiró; ahora, 0 falsos rechazos en 4.755.
* Queda **1 caso residual** en 5.122 decisiones en que la predicción del pago fue optimista y el motor rechazó el pago
  después de gastar (antes eran todos). La interfaz oficial no envía pagos insuficientes; solo puede pasar con entradas anómalas.
* No he podido probar con GitHub Pages real (no tengo acceso a internet): reproduje sus condiciones (subruta, archivos que
  faltan, errores intermitentes) en local.

## 1. Cómo funciona (resumen técnico)

El original es un servidor Python (aiohttp + hilos) con un cliente web. Un navegador no tiene hilos ni sockets, y portar a
mano ~160.000 líneas (53.000 de lógica + 102.000 en 3.457 scripts de cartas) a JavaScript habría perdido fidelidad. Por eso:

```
 index.html (shell) ──► Worker ──► Pyodide (CPython 3.14 / WebAssembly) ──► motor ORIGINAL (game/ y cards/ intactos)
      │  ▲                 ▲
      │  └── postMessage ──┘        petición de la UI ──► buzón SharedArrayBuffer ──► Atomics.wait despierta a Python
      ▼
   <iframe> con la UI original (TypeScript compilado) + shim.js
   shim.js: sustituye fetch / XMLHttpRequest / WebSocket / window.open por llamadas al motor local
```

* **Bloqueo cooperativo** (`engine/browser/runtime.py`): el motor espera al jugador con `Condition.Wait`. En el navegador
  eso significa "atiende peticiones de la UI hasta que se cumpla la condición", que es justo cuando el servidor original
  las atendía desde otro hilo. No hay hilos: un solo flujo, sin carreras.
* **Servidor virtual** (`engine/browser/server.py`): todas las rutas HTTP/WebSocket del servidor original, con la misma
  semántica (`get_world`, `get_ask`, `post`, `client_updated`, `new`, `debug`, `list_*`, `get_*`...).
* **Persistencia**: lo que el motor escribe (partidas, mazos, estadísticas, autoguardado) se copia a IndexedDB desde la
  página (IDBFS no sirve: mientras Python espera con `Atomics.wait`, el worker no atiende a IndexedDB).
* **Service worker**: descarga la app (~18 MB, la interfaz en un solo `ui.zip` que desempaqueta), reintenta, informa de lo que falta, añade COOP/COEP (necesarios para `SharedArrayBuffer`), emula las rutas
  limpias del servidor (`/scene` → `scene.html`) y dibuja las cartas sin ilustración como SVG (o sirve las importadas).
* **Autoguardado y «Continuar partida»** (nuevo): usa el mecanismo de reproducción determinista que el propio motor ya
  empleaba para Deshacer/Cargar (semilla + lista de decisiones).

## 2. Errores del código original corregidos

| # | Dónde | Problema | Efecto |
|---|---|---|---|
| 1 | `game/ability/factory/do_attack.py` `UnitCannotDefend` | `assert isinstance(which_unit, CardFinder)` fallaba con las cadenas/clases que pasan las cartas | **6 cartas rotas**: Tracking Display (27152), Rollin', Rollin' (28030), Permanently Phased (32055), Wrapped in Metal (32150), Puppet Master (55061), Love Triangle (55062) |
| 2 | `game/ability/factory/environment.py` | `Leader` nunca se importaba | **Going Underground (56200b)** lanzaba `NameError` |
| 3 | `cards/database.py` `FindAbilities` | `except: pass` desnudo al importar el script de la carta | Una carta con error quedaba **sin habilidades en silencio**. Ahora se avisa en el log |
| 4 | `game/statistics/game_statistics.py` | `lstrip('achievement_')` quita *caracteres*, no un prefijo | El logro *triple kill* se mostraba como "RIPLE_KILL" |
| 5 | `engine/file/manager.py` `ListFiles` | Precedencia `A and B or C and D` | `check_file_name` se ignoraba si no había extensión; no se filtraban directorios con extensión. También ahora se lista ordenado |
| 6 | `engine/lib/random.py` + `mt19937.py` | `shuffle` sesgado (intercambios aleatorios, no Fisher-Yates); `Random.Undo` no hacía nada sin numpy; lista de estados sin límite | Barajado no uniforme. Sustituido por `random.Random` (mismo MT19937, sin numpy, `Undo` real) |
| 7 | `core/utility/system.py` | `SetTitle` imprimía el sistema operativo | Ruido en el log |

### Errores de mi propia capa, descubiertos al probar en un navegador real y corregidos

| Fallo | Efecto | Arreglo |
|---|---|---|
| Ping-pong de tramas: la espera cooperativa reevaluaba la condición tras *cada* petición y cada evaluación reenviaba «GetInput» | La interfaz rehacía los botones de opción sin parar y **borraba la selección** (el OK nunca se habilitaba); CPU/batería | «GetInput» se envía una vez por pregunta (`engine/browser/device.py`) |
| Reescritura de rutas dejaba `import "public/…"` (sin `./`) | **La pantalla New Game no cargaba** (error de módulo ES) | Se usa `./public/…` |
| `MarvelApp.shell` apuntaba a la ventana en vez de a su API | Error en el menú | Corregido |
| `sets/1. Core Set` (nombre con punto) daba 404 | Carátulas de cajas rotas | El service worker genera la carátula |
| `mask.svg`, `target`, `equip` (texturas no distribuidas) | Una máscara vacía habría ocultado las imágenes | SVG sustitutos en el service worker |
| El `save_replay_data` devolvía JSON en vez de cadena JSON | «Save file» guardaba `[object Object]` | Misma forma que el servidor original |

Observado pero **no** modificado: (b) `core/utility/cast.py`
tiene código muerto tras un `return` (inocuo); (c) `build.py` sobrescribe `release` con `True`.

## 3. Cambios para el navegador y el móvil

Python (ver `cambios_python.diff`): nuevo paquete `engine/browser/` (runtime, device, server, boot);
`engine/task|job` en modo cooperativo; Pillow y `requests` pasan a ser opcionales; `engine/engine.py` admite
`device="browser"`; hooks de persistencia en `engine/file`; `launch.browser.json`.
`game/` y `cards/` solo cambian en los dos arreglos de la sección 2.

Frontend: el TypeScript original compila sin errores con TS 5.8 y **solo se ha tocado `scene.ts`** (zoom/desplazamiento del tablero
y overlays desacoplados del zoom). El build reescribe rutas
absolutas, añade `shim.js` / `touch.js` / `touch.css`, el aviso de móvil, los botones del menú y el guardado de mazos en el
dispositivo (`deck.html`).

## 4. Qué se ha verificado (automáticamente)

| Prueba | Resultado |
|---|---|
| Import + `GetAbilities()` de todas las cartas | 3.781 scripts OK, 0 errores (218 cartas sin script: esbirros/recursos sin texto) |
| Barrido de partidas automáticas (bot) | 40 partidas, 1.812 decisiones, 39 héroes y 33 villanos distintos: **0 excepciones** (barrido largo: ver final de este fichero) |
| Motor bajo **Pyodide real** (Python 3.14.2) en Node, con el puente `Atomics` | Arranca en ~5 s; ~7 ms por trama; partida, decisiones, autoguardado |
| Cerrar y reabrir (motor nuevo + almacén persistente) | Reanuda **exactamente** en la decisión guardada |
| Deshacer, slots `save_N`, descarga/subida de partida, autoguardado | Estado restaurado idéntico |
| `shim.js` contra un `window` simulado | 14/14 (fetch, XHR, WebSocket, window.open, cookie de versión) |
| `sw.js` en un entorno simulado | 12/12 (rutas limpias, COOP/COEP, cartas SVG, imágenes importadas, texturas) |
| Referencias estáticas | 129 referencias de HTML/CSS y 180 imports ES resuelven |
| Compilación TypeScript | 0 errores |
| **Chromium real + emulación iPhone 13** (844×390 y 390×844, táctil), sobre el artefacto final | Arranque con service worker y aislamiento `crossOriginIsolated`; **recarga completa sin conexión**; menú sin desbordes; New Game completo con toques (set → escenario → héroe → ▶ Jugar); mulligan, jugar una carta pagando con toques, fin de turno, ▶ Continuar, elección entre opciones y llegada al turno 2; selector de héroes; importador MarvelCDB (API simulada) con guardado; descarga de las 3.155 ilustraciones (todas servidas, esquemas verticales) |
| Pyodide: `list_heroes`, `convert_marvelcdb`, `save_deck`, mazo que sobrevive al reinicio y se juega | OK |

## 5. Qué NO se ha verificado

* **Safari/iOS y un teléfono físico**: solo se probó Chromium emulando un iPhone 13 (no reproduce el comportamiento de WebKit, ni el
  tacto real, ni el rendimiento/memoria de un móvil concreto, ni la instalación como PWA).
* La descarga **real** de MarvelCDB (no tengo acceso a internet): se probó con respuestas simuladas.
* La publicación en un alojamiento concreto (GitHub Pages, Netlify, Cloudflare).
* Partidas completas hasta el final con toques (se probó hasta el turno 2); el barrido masivo se hizo con un bot sin interfaz.
* Las 3.457 cartas **no se han leído una a una**: se han validado mecánicamente (importación y ejecución) y con partidas
  automáticas. Un fallo de *reglas* (no de excepción) en una carta concreta no se detectaría así.
