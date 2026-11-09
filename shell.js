// Marvel Champions offline — app shell: service worker, cross-origin isolation, engine boot, extras (import pictures...).
import { EngineHost } from "./engine.js";

const $ = (id) => document.getElementById(id);
const splash = $("splash"), msg = $("msg"), bar = $("bar"), frame = $("app");
const base = new URL("./", location.href).href;
const T = {
    boot: "Preparando la app…", sw: "Instalando el modo sin conexión (solo la primera vez)…",
    err: "No se pudo iniciar", reload: "Reintentar",
};

function show(text, pct) { if (splash.classList.contains("error")) return; msg.textContent = text; if (pct != null) bar.value = pct; }   // never overwrite an error screen
function fail(title, detail) {
    splash.classList.add("error");
    $("title").textContent = title;
    msg.innerHTML = "";
    const p = document.createElement("pre"); p.textContent = detail; msg.appendChild(p);
    const b = document.createElement("button"); b.textContent = T.reload; b.onclick = () => location.reload(); msg.appendChild(b);
    const d = document.createElement("a"); d.href = "diagnostico.html"; d.textContent = "Abrir diagnóstico de archivos"; d.style.cssText = "display:block;margin-top:14px;color:#6cb6ff"; msg.appendChild(d);
    bar.hidden = true;
}

let swError = "";            // filled by the service worker when files are missing
const missingFiles = [];
navigator.serviceWorker && navigator.serviceWorker.addEventListener("message", (e) => {
    const m = e.data || {};
    if (m.type === "sw-progress") show(`Instalando el modo sin conexión (solo la primera vez)… ${m.done}/${m.total} archivos`, 3 + (m.done / m.total) * 12);
    if (m.type === "sw-error") { missingFiles.push(...m.missing); swError = "Faltan o no se pudieron descargar estos archivos en tu alojamiento:\n  • " + m.missing.join("\n  • "); }
});

// resolves when a worker is ACTIVE; rejects if the first installation fails (e.g. files missing on the host)
function whenActive(registration) {
    return new Promise((resolve, reject) => {
        if (registration.active && registration.active.state === "activated") return resolve();
        const watch = (worker) => {
            if (!worker) return;
            const check = () => {
                if (worker.state === "activated") resolve();
                else if (worker.state === "redundant") setTimeout(() => reject(new Error(swError || "El navegador descartó la instalación del modo sin conexión. Abre el diagnóstico para ver si falta algún archivo.")), 500);   // let the "sw-error" message (list of missing files) arrive first
            };
            worker.addEventListener("statechange", check); check();
        };
        watch(registration.installing || registration.waiting || registration.active);
        registration.addEventListener("updatefound", () => watch(registration.installing));
    });
}
const timeout = (ms, message) => new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

async function ensureServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        throw new Error("Este navegador no admite service workers. La app necesita abrirse desde una dirección https:// " +
            "(o http://localhost) y no en una pestaña privada.");
    }
    show(T.sw, 3);
    let registration;
    try { registration = await navigator.serviceWorker.register("sw.js", { scope: "./" }); }
    catch (error) { throw new Error("No se pudo registrar el service worker (sw.js): " + (error && error.message || error) + "\nComprueba que sw.js y fflate.min.js están subidos junto a index.html."); }
    await Promise.race([whenActive(registration), timeout(120000, "La instalación tarda demasiado (más de 2 minutos). Revisa tu conexión o abre diagnostico.html para ver qué archivos faltan.")]);
    // First visit: the page is not controlled yet, so it has no COOP/COEP headers. One reload fixes that.
    if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => {
            navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
            setTimeout(resolve, 4000);
        });
    }
    if (!crossOriginIsolated) {
        if (!sessionStorage.getItem("marvel-reloaded")) { sessionStorage.setItem("marvel-reloaded", "1"); location.reload(); return false; }
        throw new Error("El navegador no activó el aislamiento necesario (crossOriginIsolated=false).\n" +
            "Cierra la app y vuelve a abrirla. Si persiste, usa Chrome, Edge, Firefox o Safari 16.4+ y sirve la app por https.");
    }
    sessionStorage.removeItem("marvel-reloaded");
    return registration;
}

let installEvent = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvent = e; });

async function main() {
    show(T.boot, 1);
    const ok = await ensureServiceWorker();
    if (ok === false) return;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

    const engine = new EngineHost({
        base,
        onProgress: (t, p) => show(t, p),
        onLog: (t) => { if (/Traceback|Error|FAILED/.test(t)) console.warn("[engine]", t); },
        onFatal: (e) => fail(T.err, e),
    });
    window.marvelEngine = engine;
    await engine.start();

    window.marvelShell = shellApi(engine);
    publishCustomIndex(engine);
    const hash = decodeURIComponent(location.hash.slice(1));
    // one-shot start page (e.g. the card editor asks to come back to it after installing a pack and restarting)
    const startPage = sessionStorage.getItem("marvel-start-page");
    if (startPage) sessionStorage.removeItem("marvel-start-page");
    frame.src = /^ui\//.test(hash) ? hash : (startPage && /^[a-z_]+\.html(\?[\w=&%-]*)?$/.test(startPage) ? "ui/" + startPage : "ui/main.html");
    frame.onload = () => { splash.classList.add("hidden"); frame.classList.add("visible"); };
    setupWakeLock();
}

// ---------------------------------------------------------------------------------------------------------------------
function shellApi(engine) {
    const api = {
        version: engine.version,
        canInstall: () => !!installEvent,
        install: async () => { if (!installEvent) return false; installEvent.prompt(); const r = await installEvent.userChoice; installEvent = null; return r.outcome === "accepted"; },
        isStandalone: () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
        fullscreen: async () => {
            const el = document.documentElement;
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
            try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch (e) {}
        },
        async importAssets(files, onProgress) { return importAssets(files, onProgress); },
        async assetCount() { const c = await caches.open("marvel-user-assets"); return (await c.keys()).length; },
        async clearAssets() { localStorage.removeItem("marvel-pack"); return caches.delete("marvel-user-assets"); },
        packInfo, installPack,
        portraitPhone, portraitTouch,
        language: () => localStorage.getItem("marvel-lang") || "es",
        setLanguage: async (lang) => {                 // interface (i18n.js) + engine texts (settings/idioma.json, read at boot)
            localStorage.setItem("marvel-lang", lang);
            await engine.store.put("settings/idioma.json", new TextEncoder().encode(JSON.stringify({ idioma: lang })));
            location.reload();
        },
        exportBackup: () => exportBackup(engine), importBackup: (file) => importBackup(engine, file),
        importContent: (file) => importContent(engine, file), removeContent: (id) => removeContent(engine, id),
        lastBackup: () => localStorage.getItem("marvel-last-backup"),
        toggleRotate: () => { localStorage.setItem("marvel-rotate", frame.classList.contains("rotated") ? "off" : "on"); applyRotation(); },
        reload: () => location.reload(),
        async resetUserData() { await engine.clearUserData(); },
    };
    return api;
}

// ----- Import of the user's own card pictures / sounds / textures (zip, folder or loose files) -----
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg" };
const extOf = (n) => (n.lastIndexOf(".") > 0 ? n.slice(n.lastIndexOf(".") + 1).toLowerCase() : "");
const baseOf = (n) => n.split(/[\\/]/).pop();

// The UI expects every card picture in portrait: landscape pictures (schemes) are rotated 90° counter-clockwise,
// exactly like the desktop server (and the build of the picture pack) did.
async function portrait(blob, ext) {
    if (!["jpg", "jpeg", "png", "webp"].includes(ext) || typeof createImageBitmap !== "function") return blob;
    try {
        const bmp = await createImageBitmap(blob);
        if (bmp.width <= bmp.height) { bmp.close && bmp.close(); return blob; }
        const canvas = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(bmp.height, bmp.width) : Object.assign(document.createElement("canvas"), { width: bmp.height, height: bmp.width });
        const ctx = canvas.getContext("2d");
        ctx.translate(0, bmp.width); ctx.rotate(-Math.PI / 2); ctx.drawImage(bmp, 0, 0);
        bmp.close && bmp.close();
        if (canvas.convertToBlob) return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
        return await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    } catch (e) { return blob; }
}

async function putAsset(cache, fileName, blob) {
    const name = baseOf(fileName);
    const ext = extOf(name);
    if (!MIME[ext] || name.startsWith("._")) return 0;
    blob = await portrait(blob, ext);
    const type = ["jpg", "jpeg", "png", "webp"].includes(ext) && blob.type === "image/jpeg" ? "image/jpeg" : MIME[ext];
    const headers = { "Content-Type": type };
    // card pictures are stored once, under their id ("01001a"); the service worker also resolves "01001a.jpg" to it
    const isPicture = ["jpg", "jpeg", "png", "webp"].includes(ext);
    const key = isPicture ? name.slice(0, name.lastIndexOf(".")).toLowerCase() : name.toLowerCase();
    await cache.put(new URL("__a/" + key, base).href, new Response(blob, { headers }));
    return 1;
}

async function importAssets(fileList, onProgress) {
    const cache = await caches.open("marvel-user-assets");
    let imported = 0, seen = 0;
    const files = Array.from(fileList);
    for (const file of files) {
        const name = file.webkitRelativePath || file.name;
        if (extOf(file.name) === "zip") {
            const fflate = await loadFflate();
            await new Promise((resolve, reject) => {
                const unzip = new fflate.Unzip();
                unzip.register(fflate.UnzipInflate);
                const jobs = [];
                unzip.onfile = (entry) => {
                    if (entry.name.endsWith("/") || !MIME[extOf(entry.name)]) return;
                    const chunks = [];
                    entry.ondata = (err, chunk, final) => {
                        if (err) return reject(err);
                        chunks.push(chunk);
                        if (final) jobs.push(putAsset(cache, entry.name, new Blob(chunks)).then((n) => { imported += n; seen++; onProgress && onProgress(imported, seen); }));
                    };
                    entry.start();
                };
                (async () => {
                    try {
                        const reader = file.stream().getReader();
                        for (;;) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            unzip.push(value, false);
                            await Promise.all(jobs.splice(0));
                        }
                        unzip.push(new Uint8Array(0), true);
                        await Promise.all(jobs); resolve();
                    } catch (e) { reject(e); }
                })();
            });
        } else {
            imported += await putAsset(cache, name, file); seen++;
            onProgress && onProgress(imported, seen);
        }
    }
    return imported;
}

// ----- The card-picture pack shipped next to the app (images/manifest.json + images/pack-NN.zip) -----
async function packInfo() {
    let manifest;
    try {
        const r = await fetch(new URL("images/manifest.json", base), { cache: "no-store" });
        if (!r.ok) return { available: false };
        manifest = await r.json();
    } catch (e) {
        // offline: we can still report what is installed
        const st = JSON.parse(localStorage.getItem("marvel-pack") || "null");
        return st && st.complete ? { available: true, installed: true, count: st.count, bytes: st.bytes, version: st.version, offline: true } : { available: false };
    }
    const st = JSON.parse(localStorage.getItem("marvel-pack") || "{}");
    const same = st.version === manifest.version;
    return { available: true, version: manifest.version, count: manifest.count, bytes: manifest.bytes, installed: same && !!st.complete,
        doneChunks: same ? (st.chunks || []) : [], chunkCount: manifest.chunks.length };
}
let packRunning = false;
async function installPack(onProgress, signal) {
    if (packRunning) throw new Error("La descarga ya está en curso.");
    packRunning = true;
    try {
        const r = await fetch(new URL("images/manifest.json", base), { cache: "no-store" });
        if (!r.ok) throw new Error("No hay ilustraciones en este despliegue.");
        const manifest = await r.json();
        let state = JSON.parse(localStorage.getItem("marvel-pack") || "{}");
        if (state.version !== manifest.version) state = { version: manifest.version, chunks: [], complete: false };
        const total = manifest.bytes; let done = manifest.chunks.filter((c) => state.chunks.includes(c.file)).reduce((a, c) => a + c.bytes, 0);
        for (const chunk of manifest.chunks) {
            if (state.chunks.includes(chunk.file)) continue;
            const res = await fetch(new URL("images/" + chunk.file, base), { signal });
            if (!res.ok) throw new Error(`No se pudo descargar ${chunk.file} (${res.status}).`);
            const reader = res.body.getReader(); const parts = []; let got = 0;
            for (;;) { const { done: end, value } = await reader.read(); if (end) break; parts.push(value); got += value.length; onProgress && onProgress(Math.min(1, (done + got) / total), manifest.count); }
            await importAssets([new File([new Blob(parts)], chunk.file)], null);
            state.chunks.push(chunk.file); done += chunk.bytes;
            localStorage.setItem("marvel-pack", JSON.stringify(state));
        }
        state.complete = true; state.count = manifest.count; state.bytes = manifest.bytes;
        localStorage.setItem("marvel-pack", JSON.stringify(state));
        onProgress && onProgress(1, manifest.count);
        return manifest.count;
    } finally { packRunning = false; }
}

let fflatePromise = null;
function loadFflate() {
    if (window.fflate) return Promise.resolve(window.fflate);
    if (!fflatePromise) fflatePromise = new Promise((resolve, reject) => {
        const s = document.createElement("script"); s.src = new URL("fflate.min.js", base).href;
        s.onload = () => resolve(window.fflate); s.onerror = reject; document.head.appendChild(s);
    });
    return fflatePromise;
}

// keep the screen on while playing
let lock = null;
function setupWakeLock() {
    async function request() { try { if ("wakeLock" in navigator && document.visibilityState === "visible") lock = await navigator.wakeLock.request("screen"); } catch (e) {} }
    document.addEventListener("visibilitychange", request); request();
}

// ----- Content packs (new campaigns / scenarios / cards): validated by the engine, then installed in the device -----
async function readPack(file) {
    const fflate = await loadFflate();
    const all = fflate.unzipSync(new Uint8Array(await file.arrayBuffer()));
    let names = Object.keys(all).filter((n) => !n.endsWith("/") && !n.includes("__MACOSX") && !baseOf(n).startsWith("."));
    let strip = "";
    if (!names.includes("contenido.json")) {                    // a ZIP of the folder: drop its top folder
        const roots = new Set(names.map((n) => n.split("/")[0]));
        if (roots.size === 1) strip = [...roots][0] + "/";
    }
    const files = {}, images = [], bytes = {};
    for (const n of names) {
        const rel = n.startsWith(strip) ? n.slice(strip.length) : n;
        bytes[rel] = all[n];
        if (/\.(jpe?g|png|webp)$/i.test(rel)) images.push(rel); else files[rel] = fflate.strFromU8(all[n]);
    }
    return { files, images, bytes };
}

async function importContent(engine, file) {
    const fflate = await loadFflate();
    let pack;
    try { pack = await readPack(file); } catch (e) { return { ok: false, errors: ["El archivo no es un ZIP válido."], warnings: [] }; }
    const r = await engine.request("POST", "content_check", JSON.stringify({ files: pack.files, images: pack.images }));
    const report = JSON.parse(r.body);
    if (!report.ok) return report;
    try { engine.worker.terminate(); } catch (e) {}          // nothing may write while the pack is installed
    for (const [target, source] of Object.entries(report.plan)) await engine.store.put(target, fflate.strToU8(pack.files[source]));
    const cache = await caches.open("marvel-user-assets");
    for (const source of Object.values(report.images)) await putAsset(cache, baseOf(source), new Blob([pack.bytes[source]]));
    await engine.store.put(report.manifest_path, fflate.strToU8(JSON.stringify({ ...report.pack, installed: new Date().toISOString(),
        files: Object.keys(report.plan), images: Object.keys(report.images), summary: report.summary })));
    report.installed = true;
    return report;
}

async function removeContent(engine, id) {
    const list = JSON.parse((await engine.request("GET", "content_list")).body);
    const pack = list.find((p) => p.id === id);
    if (!pack) throw new Error("Ese contenido no está instalado.");
    if (pack.builtin) throw new Error("Este contenido viene incluido en la app y no se puede quitar.");
    try { engine.worker.terminate(); } catch (e) {}
    for (const path of pack.files || []) await engine.store.del(path);
    const cache = await caches.open("marvel-user-assets");
    for (const cid of pack.images || []) await cache.delete(new URL("__a/" + String(cid).toLowerCase(), base).href);
    await engine.store.del("content/" + id + ".json");
    return pack;
}

// cards of content packs have no entry in cards-index.json: give the service worker their data to draw them
async function publishCustomIndex(engine) {
    try {
        const r = await engine.request("GET", "cards_index_custom");
        const cache = await caches.open("marvel-user-assets");
        await cache.put(new URL("__a/__index_custom.json", base).href, new Response(r.body, { headers: { "Content-Type": "application/json" } }));
    } catch (e) { /* drawing is a convenience */ }
}

// ----- Backup: ONE zip with everything the app keeps on the device (decks, saves, autosave, statistics, settings) -----
const PERSIST_PREFIXES = ["replays/", "deck/", "statistics.json", "settings/", "save_", "data/scenarios_custom/",
    "data/cards_custom/", "cards/custom/", "data/encounter_sets_custom/", "data/sets_custom/", "content/"];   // content packs travel in the backup too
const safePath = (p) => !p.includes("..") && !p.startsWith("/") && !p.includes("\\") && PERSIST_PREFIXES.some((x) => p.startsWith(x));
const SKIP_LOCAL = new Set(["marvel-pack", "marvel-last-backup", "marvel-reloaded", "marvel-rotate"]);
function uiDocument() { try { return frame.contentDocument; } catch (e) { return null; } }

async function exportBackup(engine) {
    const fflate = await loadFflate();
    const items = await engine.store.all();
    const entries = {};
    for (const item of items) entries["files/" + item.path] = [new Uint8Array(item.data), { level: 6 }];
    // UI settings live in cookies and localStorage of the game pages
    const cookies = {}, local = {};
    const doc = uiDocument();
    if (doc) for (const c of doc.cookie.split("; ")) { const i = c.indexOf("="); if (i > 0 && c.slice(0, i) !== "app_version") cookies[c.slice(0, i)] = c.slice(i + 1); }
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!SKIP_LOCAL.has(k)) local[k] = localStorage.getItem(k); }
    entries["settings.json"] = fflate.strToU8(JSON.stringify({ cookies, local }));
    entries["meta.json"] = fflate.strToU8(JSON.stringify({ app: "marvel-champions-offline", format: 1, created: new Date().toISOString(), version: engine.version, files: items.length }, null, 1));
    const zipped = fflate.zipSync(entries);
    const d = new Date(), pad = (n) => String(n).padStart(2, "0");
    const name = `marvel-champions-copia-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.zip`;
    const file = new File([zipped], name, { type: "application/zip" });
    let via = "download";
    if (navigator.canShare && navigator.canShare({ files: [file] })) {          // phones: share sheet -> "Save to Files", Drive...
        try { await navigator.share({ files: [file], title: "Copia de seguridad — Marvel Champions" }); via = "share"; }
        catch (e) { if (e && e.name === "AbortError") return { cancelled: true }; via = "download"; }
    }
    if (via === "download") {
        const url = URL.createObjectURL(file), a = document.createElement("a");
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    localStorage.setItem("marvel-last-backup", new Date().toISOString());
    return { name, via, files: items.length, bytes: zipped.length };
}

async function importBackup(engine, file) {
    const fflate = await loadFflate();
    let entries;
    try { entries = fflate.unzipSync(new Uint8Array(await file.arrayBuffer())); }
    catch (e) { throw new Error("El archivo no es una copia de seguridad (no es un ZIP válido)."); }
    let meta;
    try { meta = JSON.parse(fflate.strFromU8(entries["meta.json"])); } catch (e) { meta = null; }
    if (!meta || meta.app !== "marvel-champions-offline") throw new Error("Este ZIP no es una copia de seguridad de Marvel Champions Offline.");
    const accepted = [], skipped = [];
    for (const [name, bytes] of Object.entries(entries)) {
        if (!name.startsWith("files/") || name.endsWith("/")) continue;
        const path = name.slice(6);
        (safePath(path) ? accepted : skipped).push([path, bytes]);
    }
    if (!accepted.length && !entries["settings.json"]) throw new Error("La copia no contiene datos.");
    // stop the engine first: it must not write over what is being restored
    try { engine.worker.terminate(); } catch (e) {}
    for (const [path, bytes] of accepted) await engine.store.put(path, bytes);
    if (entries["settings.json"]) {
        try {
            const st = JSON.parse(fflate.strFromU8(entries["settings.json"])), doc = uiDocument();
            for (const [k, v] of Object.entries(st.local || {})) if (!SKIP_LOCAL.has(k)) localStorage.setItem(k, v);
            if (doc) for (const [k, v] of Object.entries(st.cookies || {})) doc.cookie = `${k}=${v}; max-age=31536000`;
        } catch (e) { /* settings are a convenience: never fail the restore because of them */ }
    }
    return { restored: accepted.length, skipped: skipped.length, created: meta.created };
}

// Portrait phone + game board: rotate the board 90 degrees (it is a landscape layout) so it uses the whole screen.
// A ⟳ button in the board toolbar turns it off / on; the choice is remembered.
const portraitPhone = () => matchMedia("(orientation: portrait)").matches && Math.min(innerWidth, innerHeight) < 500;
const portraitTouch = () => matchMedia("(orientation: portrait)").matches && matchMedia("(pointer: coarse)").matches;
function inGame() {
    try { return /marvel\.html/.test(frame.contentWindow.location.pathname) && !!frame.contentDocument.getElementById("scene"); } catch (e) { return false; }
}
function applyRotation() {
    // phones rotate by default (the board is unreadable otherwise); tablets only when the player asks (⟳)
    const pref = localStorage.getItem("marvel-rotate");
    const on = inGame() && portraitTouch() && (portraitPhone() ? pref !== "off" : pref === "on");
    if (frame.classList.contains("rotated") !== on) {
        frame.classList.toggle("rotated", on);
        // the iframe changed size: let the board recompute its scale
        setTimeout(() => { try { frame.contentWindow.dispatchEvent(new Event("resize")); } catch (e) {} }, 60);
    }
}
setInterval(applyRotation, 600); addEventListener("resize", applyRotation); addEventListener("orientationchange", () => setTimeout(applyRotation, 200));

main().catch((e) => fail(T.err, String(e && e.message || e)));
