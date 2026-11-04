// Marvel Champions offline — service worker.
//  * precaches the whole app (Python engine, Pyodide, UI) so it runs with no network
//  * adds COOP/COEP headers (needed for SharedArrayBuffer, i.e. for the blocking bridge to the Python engine)
//  * emulates the routes of the original server: clean URLs (/scene -> scene.html) and card pictures (/01001a)
//  * card pictures: user imported pack (Cache Storage) first, otherwise a generated SVG card
const VERSION = "f23f11a9d6";
const CACHE = "marvel-app-" + VERSION;
const USER_ASSETS = "marvel-user-assets";
const PRECACHE = [
"cards-index.json",
"engine.js",
"engine.zip",
"fflate.min.js",
"icons/icon-192.png",
"icons/icon-512.png",
"icons/maskable-512.png",
"index.html",
"manifest.webmanifest",
"pyodide/pyodide-lock.json",
"pyodide/pyodide.asm.mjs",
"pyodide/pyodide.asm.wasm",
"pyodide/pyodide.mjs",
"pyodide/python_stdlib.zip",
"shell.js",
"ui.zip",
"worker.js"
];
const SCOPE = new URL(self.registration.scope);

const PAGES = {
    "main": "main.html", "scene": "scene.html", "deck": "deck.html", "cards": "cards.html", "replay": "replay.html",
    "puzzle": "replay.html", "puzzle_test": "replay.html", "puzzle_editor": "puzzle_editor.html", "credits": "credits.html",
    "report": "report.html", "marvel": "marvel.html",
};
const ASPECT = { "": "#87939f", Aggression: "#ed3333", Justice: "#d9ca33", Leadership: "#5d9cbf", Protection: "#54ff95",
    "'Pool": "#c86699", Basic: "#aba499", Encounter: "#aa9a8b", Hero: "#bcb0a4" };
const BACKS = { player: "#0e4e8b", encounter: "#e67d22", villain: "#84296e", no_image: "#333333" };
const ROTATED = new Set(["SideScheme", "MainScheme", "PlayerSideScheme", "Status"]);
// Textures the original game loaded from its (not distributed) assets/textures folder
const TEXTURES = {
    "mask.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".4" stop-color="#000" stop-opacity=".9"/><stop offset="1" stop-color="#000"/></linearGradient></defs><rect width="100" height="140" fill="url(#g)"/></svg>`,
    "target": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="none" stroke="#ff3b30" stroke-width="5"><circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="6" fill="#ff3b30"/><path d="M32 2v14M32 48v14M2 32h14M48 32h14"/></g></svg>`,
    "equip": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 4 56 14v18c0 14-10 24-24 28C18 56 8 46 8 32V14z" fill="#2d8cff" fill-opacity=".85" stroke="#fff" stroke-width="4"/></svg>`,
    "sparkles.gif": `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>`,
};
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg" };

importScripts("fflate.min.js");   // used to unpack ui.zip (the whole UI travels as ONE file: easy to upload, nothing half-missing)

const MIME_BY_EXT = { html: "text/html", js: "text/javascript", mjs: "text/javascript", css: "text/css", json: "application/json", svg: "image/svg+xml",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", ico: "image/x-icon", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject", txt: "text/plain", map: "application/json" };
const mimeOf = (name) => MIME_BY_EXT[name.split(".").pop().toLowerCase()] || "application/octet-stream";

async function tell(message) {
    for (const client of await self.clients.matchAll({ includeUncontrolled: true, type: "window" })) client.postMessage(message);
}
// one file, 3 attempts (GitHub Pages / mobile networks drop requests now and then). 404 is final.
async function fetchInto(cache, relative) {
    const url = new URL(relative, SCOPE).href;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetch(new Request(url, { cache: "reload" }));
            if (response.ok) { await cache.put(url, response); return true; }
            if (response.status === 404) return false;
        } catch (error) { /* network hiccup: retry */ }
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    return false;
}
async function installApp() {
    const cache = await caches.open(CACHE);
    const total = PRECACHE.length + 1;
    let done = 0;
    const missing = [];
    const queue = PRECACHE.slice();
    const worker = async () => {
        for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
            if (await fetchInto(cache, next)) done++; else missing.push(next);
            tell({ type: "sw-progress", done, total, file: next });
        }
    };
    await Promise.all(Array.from({ length: 5 }, worker));       // a few at a time: friendlier to the host than 150 at once
    if (missing.length) {
        await tell({ type: "sw-error", missing });
        throw new Error("Faltan o no se pudieron descargar " + missing.length + " archivos: " + missing.slice(0, 10).join(", "));
    }
    // unpack the UI into the cache, one entry per file (the service worker serves them like normal files)
    const zipUrl = new URL("ui.zip", SCOPE).href;
    const zip = await cache.match(zipUrl);
    const files = self.fflate.unzipSync(new Uint8Array(await zip.arrayBuffer()));
    for (const name of Object.keys(files)) {
        if (name.endsWith("/")) continue;
        await cache.put(new URL("ui/" + name, SCOPE).href, new Response(files[name], { headers: { "Content-Type": mimeOf(name) } }));
    }
    await cache.delete(zipUrl);
    tell({ type: "sw-progress", done: total, total, file: "ui.zip" });
}
self.addEventListener("install", (event) => {
    event.waitUntil((async () => { await installApp(); await self.skipWaiting(); })());
});
self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) if (key.startsWith("marvel-app-") && key !== CACHE) await caches.delete(key);
        await self.clients.claim();
    })());
});
self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;
    event.respondWith(handle(request).catch((error) => new Response("Offline app error: " + error, { status: 500 })));
});

function isolate(response) {
    if (!response || response.status === 0 || response.type === "opaque") return response;
    const headers = new Headers(response.headers);
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function fromCache(relative) {
    const cache = await caches.open(CACHE);
    return cache.match(new URL(relative, SCOPE).href, { ignoreSearch: true });
}

async function handle(request) {
    const url = new URL(request.url);
    if (url.origin !== location.origin) return fetch(request);            // e.g. marvelcdb.com deck import (online only)
    const scopePath = SCOPE.pathname;
    let rel;
    if (url.pathname.startsWith(scopePath)) rel = decodeURIComponent(url.pathname.slice(scopePath.length));
    else rel = "ui/" + decodeURIComponent(url.pathname.replace(/^\/+/, ""));      // absolute paths of the original server layout

    // 1. app shell
    if (rel === "" || rel === "index.html") return isolate(await fromCache("index.html"));

    // 2. clean routes of the original server (/scene, /deck, /?p=0 ...)
    if (rel === "ui" || rel === "ui/") return isolate(await fromCache(url.search ? "ui/marvel.html" : "ui/main.html"));
    if (rel.startsWith("ui/")) {
        const rest = rel.slice(3);
        if (PAGES[rest]) return isolate(await fromCache("ui/" + PAGES[rest]));
        if (rest === "watch") return isolate(await fromCache("ui/marvel.html"));
    }

    // 3. exact files. The original server looked in several folders ("/lib/x.js" -> public/js/lib/x.js,
    //    "/effects/.." -> public/effects/..): reproduce those search paths.
    const rest = rel.startsWith("ui/") ? rel.slice(3) : rel;
    const fileName = rest.split("/").pop();
    const extension = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";
    const candidates = [rel, "ui/" + rest, "ui/public/" + rest];
    if (extension === "js") candidates.push("ui/public/js/" + rest);
    if (extension === "css") candidates.push("ui/public/css/" + rest);
    if (["ttf", "woff", "eot"].includes(extension)) candidates.push("ui/public/fonts/" + fileName);
    let hit = null;
    for (const candidate of candidates) { hit = await fromCache(candidate); if (hit) break; }
    if (hit) return isolate(hit);

    // the picture pack lives next to the app but is not precached: download it from the network (the shell stores it)
    if (rel.startsWith("images/")) return isolate(await fetch(request));

    // 4. things the original server generated: card pictures, set icons, sounds, textures
    const last = fileName;
    const dot = last.lastIndexOf(".");
    const ext = extension;
    if (rel.startsWith("ui/")) {
        let userFile = await userAsset(last);
        if (!userFile && ["jpg", "jpeg", "png", "webp"].includes(ext)) userFile = await userAsset(last.slice(0, dot));   // pictures are stored under their card id
        if (userFile) return isolate(userFile);
        if (TEXTURES[last]) return isolate(svgResponse(TEXTURES[last]));
        if (rel.startsWith("ui/sets/") && !["jpg", "jpeg", "png", "webp"].includes(ext)) return isolate(svgResponse(setIcon(last)));   // "1. Core Set" has a dot but no extension
        if (!ext) return isolate(await cardPicture(last));
        if (["jpg", "jpeg", "png", "webp"].includes(ext)) return isolate(await cardPicture(last.slice(0, dot)));
        if (["mp3", "wav", "ogg"].includes(ext)) return new Response(null, { status: 404 });    // sounds are not part of the package
        if (ext === "svg" || ext === "gif") return isolate(svgResponse(blankIcon()));
    }
    if (!rel.startsWith("ui/")) return isolate(await fetch(request));       // diagnostico.html, app-files.json, ...
    return new Response("Not found: " + rel, { status: 404 });
}

// ------------------------------------------------------------------------------------------------------------------
// Imported assets (the user's own card pictures / sounds / textures, see "Importar imágenes" in the main menu)
async function userAsset(name) {
    const cache = await caches.open(USER_ASSETS);
    for (const key of new Set([name, name.toLowerCase(), name.toUpperCase()])) {
        const hit = await cache.match(new URL("__a/" + key, SCOPE).href);
        if (hit) return hit;
    }
    return null;
}

let indexPromise = null;
function cardsIndex() {
    if (!indexPromise) indexPromise = fromCache("cards-index.json").then((r) => (r ? r.json() : {})).catch(() => ({}));
    return indexPromise;
}

async function customInfo(id) {
    const hit = await userAsset("__index_custom.json");
    if (!hit) return null;
    try { const index = await hit.json(); return index[id] || index[id.toLowerCase()] || null; } catch (e) { return null; }
}

async function cardPicture(id) {
    const index = await cardsIndex();
    const info = index[id] || index[id.toLowerCase()] || (BACKS[id] ? null : await customInfo(id));
    if (info && info.l) {                      // "linked" cards share the picture of another card
        const linked = await userAsset(info.l);
        if (linked) return linked;
    }
    if (BACKS[id]) return svgResponse(cardBack(id));
    return svgResponse(cardSvg(id, info));
}

function svgResponse(svg) {
    return new Response(svg, { status: 200, headers: { "Content-Type": "image/svg+xml", "Cache-Control": "max-age=86400" } });
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrap(text, width) {
    const lines = [];
    for (const paragraph of String(text || "").split(/\n+/)) {
        let line = "";
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            if ((line + " " + word).trim().length > width) { if (line) lines.push(line); line = word; }
            else line = (line + " " + word).trim();
        }
        if (line) lines.push(line);
    }
    return lines;
}

function cardBack(id) {
    const color = BACKS[id];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="254" height="352" viewBox="0 0 254 352">
<rect width="254" height="352" rx="14" fill="${color}"/><rect x="10" y="10" width="234" height="332" rx="9" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>
<text x="127" y="186" font-family="sans-serif" font-size="22" font-weight="700" fill="#fff" fill-opacity=".85" text-anchor="middle">${esc(id.toUpperCase().replace("_", " "))}</text></svg>`;
}

function cardSvg(id, info) {
    const name = info ? info.n : id;
    const type = info ? info.t : "";
    const color = ASPECT[(info && info.a) || ""] || ASPECT[""];
    const rotated = info && ROTATED.has(info.t);
    const W = rotated ? 352 : 254, H = rotated ? 254 : 352;
    const per = rotated ? 52 : 36;
    const body = wrap(info ? info.x : "", per).slice(0, rotated ? 11 : 20)
        .map((l, i) => `<tspan x="14" dy="${i ? 14 : 0}">${esc(l)}</tspan>`).join("");
    const traits = info && info.tr ? esc(info.tr) : "";
    const cost = info && info.c !== undefined && info.c !== null && info.c !== "" ? `<circle cx="${W - 26}" cy="26" r="17" fill="#fff" stroke="#222" stroke-width="2"/><text x="${W - 26}" y="32" font-family="sans-serif" font-size="18" font-weight="700" text-anchor="middle" fill="#222">${esc(info.c)}</text>` : "";
    const inner = `<rect width="${W}" height="${H}" rx="14" fill="#f4f1ea"/>
<rect width="${W}" height="64" rx="14" fill="${color}"/><rect y="40" width="${W}" height="24" fill="${color}"/>
<text x="14" y="30" font-family="sans-serif" font-size="${name.length > 24 ? 13 : 17}" font-weight="700" fill="#111">${esc(name)}</text>
<text x="14" y="52" font-family="sans-serif" font-size="12" fill="#111" fill-opacity=".8">${esc(type)}${info && info.s ? " · " + esc(info.s) : ""}</text>${cost}
<text x="14" y="80" font-family="sans-serif" font-size="11" font-style="italic" fill="#444">${traits}</text>
<text x="14" y="104" font-family="sans-serif" font-size="11.5" fill="#1b1b1b">${body}</text>
<text x="${W - 10}" y="${H - 9}" font-family="monospace" font-size="10" text-anchor="end" fill="#777">${esc(id)}</text>
<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="13" fill="none" stroke="#222" stroke-width="3"/>`;
    // the original generator draws scene cards on a landscape canvas and stores them rotated 90° counter-clockwise
    const group = rotated ? `<g transform="rotate(-90) translate(-${W},0)">${inner}</g>` : inner;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="254" height="352" viewBox="0 0 254 352">${group}</svg>`;
}

function setIcon(name) {
    const label = name.replace(/^\d+\.\s*/, "").replace(/[_-]/g, " ");
    const lines = wrap(label, 14).slice(0, 4);
    const y0 = 150 - (lines.length - 1) * 15;
    const text = lines.map((l, i) => `<tspan x="150" y="${y0 + i * 30}">${esc(l)}</tspan>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f4b"/><stop offset="1" stop-color="#1c1f27"/></linearGradient></defs>
<rect width="300" height="300" rx="18" fill="url(#g)"/><rect x="10" y="10" width="280" height="280" rx="12" fill="none" stroke="#e23636" stroke-opacity=".7" stroke-width="3"/>
<text font-family="sans-serif" font-size="25" font-weight="700" fill="#fff" text-anchor="middle">${text}</text></svg>`;
}
function blankIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>`; }
