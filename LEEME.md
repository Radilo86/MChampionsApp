# Marvel Champions — Digital Edition, versión OFFLINE (PWA)

La app del repositorio `marvel-lcg` convertida en una **aplicación instalable que funciona sin red**, también en móviles.
No hay servidor ni PC: el motor de juego original (Python, con sus 3.457 scripts de cartas) corre **dentro del navegador**
(Pyodide, Python 3.14 en WebAssembly), así que las reglas y las cartas se comportan igual que en el original.
Incluye tus **3.155 ilustraciones** (descarga opcional de una vez dentro de la app), un **importador de mazos de MarvelCDB** y
una adaptación táctil del tablero.

## 1. Contenido de esta carpeta

| Ruta | Para qué sirve |
|---|---|
| `app/` | **La aplicación lista para publicar**: ~34 archivos (≈ 18 MB) + `images/` (≈ 88 MB de ilustraciones en 12 trozos). |
| `servidor_local.py` | Servidor mínimo para probarla en tu ordenador (`python servidor_local.py`). |
| `CAMBIOS.md` | Errores corregidos, cambios y qué se ha verificado (y qué no). |
| `COMO_AÑADIR_CONTENIDO.md` | **Cómo crear campañas, escenarios y cartas nuevas**: el modo edición, el vocabulario de reglas sin programar y el formato de los paquetes. |
| `contenido_ejemplo.zip` | Paquete de ejemplo listo para *Importar contenido* (escenario nuevo contra Rhino, cartas nuevas con y sin reglas). |
| `IMAGENES_QUE_FALTAN.md` / `.csv` | Lista de las cartas sin ilustración en tu ZIP, con su número (id) y caja. |
| `GITHUB_PAGES.md` | **Guía paso a paso para publicarla en GitHub Pages** (y solución de problemas). |
| `cambios_python.diff` | Diferencias exactas respecto al zip original (Python y el único `.ts` tocado). |
| `fuentes/` | Código fuente de la capa nueva, scripts de build (`reconstruir.sh`) y pruebas. |

## 2. Cómo ponerla en tu móvil (una sola vez)

Los navegadores solo permiten el modo sin conexión en páginas **https** (o `localhost`), así que hay que publicar la carpeta
`app/` en un alojamiento estático gratuito. **Sigue `GITHUB_PAGES.md`**: explica paso a paso cómo subirla a GitHub Pages, cómo
comprobar con `diagnostico.html` que no falta ningún archivo y qué hacer si algo falla.

En resumen: sube **el contenido** de `app/` a un repositorio público, activa *Settings → Pages → main / (root)*, abre primero
`https://USUARIO.github.io/REPOSITORIO/diagnostico.html` y, si todo está en verde, abre la app.

**Privacidad de las ilustraciones**: si publicas la web en abierto, cualquiera podría descargar `app/images/`. Para evitarlo,
no subas esa carpeta y, en cada dispositivo, usa **Importar imágenes** con tu ZIP (se guardan solo en ese dispositivo).

En el móvil:
* **Android (Chrome/Edge)**: abre la dirección, espera a la primera carga (~18 MB; **se recarga sola una vez**) y *Menú ⋮ → Instalar aplicación*.
* **iPhone/iPad (Safari 16.4+)**: *Compartir → Añadir a pantalla de inicio* (instálala: Safari borra los datos de webs no usadas en 7 días).
* En el menú pulsa **Descargar ilustraciones** (≈ 88 MB, mejor con Wi-Fi). Después activa el *modo avión* y comprueba que todo funciona.

Probar en el ordenador: `python servidor_local.py` y abre <http://localhost:8080>.

## 3. Uso

* **Nueva partida**: toca un set → elige escenario → toca un hueco «＋» para **elegir héroe** (mazos de inicio y tus mazos
  importados, con buscador) → **▶ Jugar**. La pantalla se desplaza sola entre pasos. Con varios héroes se juega en el mismo dispositivo.
* **Tablero en móvil y tablet** (se adapta solo al tamaño de pantalla):
  * Barra lateral: **☰** (cajón con Log, Pause, Undo, Redo, QSave…), **Todo**, **Villano**, **Planes**, **Mesa**, **Mano**. Cada vista
    se ajusta a las cartas que hay en esa zona. También puedes **pellizcar** para hacer zoom y **arrastrar con dos dedos**.
  * **Enfoque automático**: cuando el juego te pide elegir un objetivo o pagar, el tablero se acerca solo a las cartas que puedes
    tocar y, al terminar, vuelve a tu vista.
  * Vista inicial: **Mano** en teléfonos, **Todo** en tablets en horizontal. En un **teléfono en vertical** el tablero se gira 90°
    para ocupar la pantalla (botón **⟳** para quitarlo); en una tablet en vertical, ⟳ lo activa si lo prefieres.
  * Toca una carta para verla en grande; toca una carta resaltada para jugarla; en el modo de pago toca las cartas con monedas.
    **OK** y **Cancelar** aparecen uno encima del otro. **Mantén pulsado** = clic derecho.
* **▶ Continuar**: el juego **se pausa cada vez que se revela una carta** (opción del propio juego, en escritorio se continúa con la
  barra espaciadora). Toca el botón rojo para seguir.
* **Importar mazo de MarvelCDB** (menú, New Game o editor de mazos): pega el enlace, el número o el JSON. Necesita internet **solo
  esa vez**; el mazo se convierte, se guarda en «Mis mazos» y funciona sin conexión. Si MarvelCDB no responde a la app, abre el
  enlace que te muestra, copia el texto y pégalo.
* **Guardado**: autoguardado tras cada decisión y botón **Continuar partida** en el menú. Los *Save 1/2/3*, *Undo*, descargar/subir
  partida funcionan como en el original. Mazos, estadísticas y logros se guardan en el dispositivo.
* **Copia de seguridad / Restaurar copia** (menú): un ZIP con tus mazos, partidas, autoguardado, estadísticas y ajustes. En el
  móvil se abre el menú de compartir para guardarlo en Archivos, Drive, etc. Hazla de vez en cuando: esos datos solo existen en el navegador.
* **Partidas de otra versión**: si cargas una partida guardada con otra versión del juego (o con la versión de escritorio, que usa
  otro generador aleatorio), se restaura hasta el punto en que todavía coincide y la app te lo avisa; sigues jugando desde ahí.
* **Idioma**: la interfaz y los mensajes de la partida están en **español** (botón *Idioma* del menú para cambiar a inglés y volver).
  El texto de las cartas sigue en inglés (es el texto oficial y no hay base de datos en español incluida).
* **Modo edición** (menú → *Modo edición (crear cartas)*): crea cartas, escenarios y sets **sin programar**. Lo que hace cada carta se
  describe eligiendo en menús (*cuándo* → *coste* → *efectos*), p. ej. «Acción de héroe (ataque): inflige 4 de daño a un enemigo y roba 1
  carta.»; el motor lo revisa, lo instala y lo puedes **probar en partida** con un botón. Guía: `COMO_AÑADIR_CONTENIDO.md`.
* **Importar contenido** (menú): instala un paquete con campañas, escenarios, sets y cartas nuevas (ver `COMO_AÑADIR_CONTENIDO.md`).
  El motor lo comprueba antes; si tiene errores te dice cuáles. Lo instalado aparece en el menú con un botón **Quitar**.
* **Importar imágenes / carpeta** sigue disponible por si tienes otro pack (ZIP o carpeta; acepta `.jpg/.png/.webp`, sonidos y texturas).

## 4. Ilustraciones

Tu ZIP trae 3.155 imágenes, que cubren 3.355 de las 3.999 entradas del catálogo. Faltan **644**, casi todas de las cajas más
nuevas: *Agents of S.H.I.E.L.D.* (212), *Civil War* (199), *Trickster Takeover* (51), *Black Panther* (39), *Falcon* (36),
*Silk* (33), *Winter Soldier* (33), *Wonder Man* (13), *Hercules* (6); más 18 fichas/estados genéricos y 3 caras de
*Android Efficiency*. La lista completa, con cada número, está en `IMAGENES_QUE_FALTAN.md` (y `.csv`). Esas cartas se dibujan a
partir de sus datos; para añadirlas, guarda la imagen como `<número>.jpg` e impórtala con **Importar imágenes**. Las 495 apaisadas
(esquemas) se giran a vertical al empaquetar, igual que el servidor original. Las verticales no se tocan.

## 5. Limitaciones conocidas

* **Probado en Chromium con emulación de iPhone 13** (844×390 y 390×844), **no en Safari/iOS ni en un teléfono físico**.
  Pueden existir diferencias de rendimiento, gestos o memoria (la app usa ~300 MB).
* **Vertical**: el tablero va girado (hay que inclinar la cabeza o el teléfono); es la forma de que las cartas se lean.
* **MarvelCDB**: probé la importación con respuestas simuladas; no pude comprobar que marvelcdb.com acepte la petición desde el
  navegador (si no la acepta, queda la opción de pegar el JSON).
* No hay partida en red/LAN (sí varios jugadores en el mismo dispositivo), ni sonidos (no venían; se pueden importar), ni
  editor de cartas.
* Requiere un navegador moderno con `SharedArrayBuffer` (Chrome/Edge/Firefox actuales, Safari 16.4+).

## 6. Si algo falla

* Error al arrancar o se queda en «Instalando…» → abre `diagnostico.html` (junto a `index.html`): dice qué archivos faltan y
  permite borrar la instalación para empezar de cero. Más detalles en `GITHUB_PAGES.md`.
* Tras publicar una versión nueva, la app se actualiza sola la siguiente vez que se abre con conexión.
* Borrar tus datos: ajustes del navegador → datos del sitio. Añade `?debug` a la dirección para ver mensajes del motor en la consola.
* Reconstruir desde las fuentes: `fuentes/reconstruir.sh` (opcional: `PICS_DIR=/ruta/a/pics` para empaquetar tus imágenes).
