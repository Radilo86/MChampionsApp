# Publicar la app en GitHub Pages — paso a paso

> **Por qué se quedaba en «Instalando…»**: la app (versión anterior) eran ~150 archivos y la web de GitHub **solo deja subir 100 a la
> vez**. Si falta un solo archivo, la instalación del modo sin conexión falla y la pantalla no avanza. Esta versión tiene
> **~34 archivos** (la interfaz va dentro de `ui.zip`), reintenta las descargas y, si algo falta, **te dice exactamente qué**.

## 0. Qué vas a subir
La carpeta `app/` de este paquete. Dentro hay:

```
index.html  shell.js  engine.js  worker.js  sw.js  manifest.webmanifest
ui.zip  engine.zip  cards-index.json  fflate.min.js  app-files.json  diagnostico.html
icons/      (3 archivos)
pyodide/    (5 archivos, el más grande ≈ 9,6 MB)
images/     (12 trozos de ≈ 8 MB + manifest.json)   ← las ilustraciones (opcional)
.nojekyll   (archivo oculto, vacío)
```
Hay que subir **el contenido** de `app/`, de modo que `index.html` quede en la raíz del repositorio.

## 1. Crear el repositorio
1. En <https://github.com/new>: nombre, por ejemplo, `marvel-offline`. **Público** (Pages gratis exige que sea público).
2. Marca «Add a README» no hace falta. Pulsa **Create repository**.

## 2. Subir los archivos (elige UNA forma)

### Forma A — desde la web (sin instalar nada)
1. En el repositorio nuevo: **Add file → Upload files**.
2. Abre la carpeta `app/` en tu ordenador, **selecciona todo lo que hay dentro** (Ctrl/Cmd+A) y **arrástralo** a la página.
   - *No arrastres la carpeta `app` en sí* (si lo haces la web quedará en `…/marvel-offline/app/`; también funciona, pero la
     dirección cambia).
   - macOS oculta los archivos que empiezan por punto: pulsa **Cmd+Shift+.** en el Finder para ver `.nojekyll`.
     Si no lo subes, créalo después: **Add file → Create new file**, nombre `.nojekyll`, déjalo vacío, **Commit**.
3. Espera a que terminen **todas** las barras de subida y pulsa **Commit changes**.
4. Las ilustraciones (`images/`, ≈ 88 MB) pueden tardar o fallar en el navegador: **súbelas aparte**, en un segundo commit
   (Add file → Upload files → solo la carpeta `images`). Sin ellas la app funciona igual (cartas dibujadas) y las puedes
   importar luego desde el menú.

### Forma B — GitHub Desktop (recomendada si hay problemas con la A)
1. Instala <https://desktop.github.com>, inicia sesión, **File → Add local repository…** o **Clone** del repo vacío.
2. Copia el **contenido** de `app/` (incluido `.nojekyll`) dentro de la carpeta del repositorio.
3. En GitHub Desktop: escribe un mensaje → **Commit to main** → **Push origin**.

### Forma C — línea de comandos
```bash
git clone https://github.com/USUARIO/marvel-offline.git
cp -R app/. marvel-offline/          # el punto final copia también .nojekyll
cd marvel-offline
git add -A && git commit -m "Marvel Champions offline" && git push
```

## 3. Activar Pages
1. En el repositorio: **Settings → Pages**.
2. *Build and deployment* → **Source: Deploy from a branch**.
3. **Branch: `main`**, carpeta **`/ (root)`** → **Save**.
4. Espera 1–3 minutos. Arriba aparecerá *«Your site is live at https://USUARIO.github.io/marvel-offline/»*
   (también puedes ver el progreso en la pestaña **Actions → pages build and deployment**).

## 4. Comprobar ANTES de abrir la app
Abre **`https://USUARIO.github.io/marvel-offline/diagnostico.html`**.
- ✔ *«Los N archivos necesarios están en el alojamiento»* → todo está bien: abre la app.
- ✘ *«Faltan N archivos»* → te muestra la lista con la ruta exacta. Súbelos (misma carpeta y nombre), espera a que Pages
  se republique (1–2 min) y vuelve a comprobar.
- *«No se encuentra app-files.json»* → la subida no incluyó nada o la carpeta está en otra ruta.

## 5. Abrir la app en Chrome
1. Abre `https://USUARIO.github.io/marvel-offline/`.
2. Verás *«Instalando el modo sin conexión… 12/18 archivos»* (≈ 18 MB, solo la primera vez). **La página se recarga sola una vez**.
3. *«Cargando Python…»* (10–30 s la primera vez) y aparece el menú.
4. En el menú: **Descargar ilustraciones** (≈ 88 MB, mejor con Wi-Fi). Después prueba el modo avión.
5. Android: *Menú ⋮ → Instalar aplicación*. iPhone (Safari): *Compartir → Añadir a pantalla de inicio*.

## 6. Si se queda parado o da error
| Síntoma | Qué hacer |
|---|---|
| Error con una lista de archivos | Faltan en tu repositorio: súbelos (paso 4) |
| «La instalación tarda demasiado» | Conexión lenta o archivos que faltan: abre `diagnostico.html` |
| Se queda en «Instalando…» tras haber subido todo | `diagnostico.html` → **Borrar instalación y caché**; luego `Ctrl+Shift+R` |
| Página 404 de GitHub | Pages aún no publicó (espera) o la rama/carpeta del paso 3 no es `main` / `(root)` |
| Funciona en el PC pero no en el móvil | Abre exactamente la misma dirección `https://…` (no `http://`) y no en pestaña privada |
| Chrome: borrar a mano | `chrome://serviceworker-internals` → *Unregister*, o F12 → Application → Storage → **Clear site data** |

## 7. Actualizar a una versión nueva
Sube los archivos nuevos **reemplazando** los antiguos (todos los de `app/`), espera a que Pages publique y abre la app con
conexión: se actualiza sola. Si la ves igual, ciérrala del todo y ábrela otra vez (a veces hacen falta dos aperturas).
**Tus partidas, mazos y estadísticas no se borran al actualizar** (y puedes guardarlos antes con *Copia de seguridad*).
