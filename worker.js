// Marvel Champions offline — Pyodide worker.
// Runs the ORIGINAL Python engine. Python "blocks" waiting for the UI with Atomics.wait on a SharedArrayBuffer
// mailbox (see engine/browser/runtime.py): the page writes requests into the mailbox, Python serves them and answers
// with postMessage. Works in browsers (module worker) and in Node (worker_threads) so it can be tested headless.

const IS_NODE = typeof process !== "undefined" && !!(process.versions && process.versions.node) && typeof WorkerGlobalScope === "undefined";

let post, fs;
let initHandler = null;
if (IS_NODE) {
    const wt = await import("node:worker_threads");
    fs = await import("node:fs/promises");
    post = (m, t) => wt.parentPort.postMessage(m, t || []);
    wt.parentPort.once("message", (m) => initHandler(m));
} else {
    post = (m, t) => self.postMessage(m, t || []);
    self.onmessage = (e) => { self.onmessage = null; initHandler(e.data); };
}

async function loadBytes(url) {
    if (IS_NODE) return new Uint8Array(await fs.readFile(url));
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
}

const HEADER_BYTES = 16;       // Int32: [0] flag (0 empty / 1 full), [1] length
const decoder = new TextDecoder();

initHandler = async (cfg) => {
    try {
        await boot(cfg);
    } catch (error) {
        post({ type: "fatal", error: String(error && error.stack || error) });
    }
};

async function boot(cfg) {
    const progress = (text, pct) => post({ type: "progress", text, pct });
    const ctrl = new Int32Array(cfg.sab, 0, 4);
    const data = new Uint8Array(cfg.sab, HEADER_BYTES);

    progress("Cargando Python…", 5);
    const { loadPyodide } = await import(cfg.pyodideModule);
    const lines = [];
    const py = await loadPyodide({
        indexURL: cfg.indexURL,
        stdout: (s) => { if (cfg.debug) post({ type: "log", text: s }); },
        stderr: (s) => { lines.push(s); if (lines.length > 200) lines.shift(); post({ type: "log", text: s }); },
    });

    progress("Cargando el motor y las 3.999 cartas…", 35);
    const zip = await loadBytes(cfg.engineZip);
    py.unpackArchive(zip, "zip", { extractDir: "/app" });

    // Files the user saved in previous sessions (decks, saves, statistics, autosave): written before the engine starts.
    for (const [path, bytes] of Object.entries(cfg.files || {})) {
        const full = "/app/" + path;
        py.FS.mkdirTree(full.substring(0, full.lastIndexOf("/")));
        py.FS.writeFile(full, bytes);
    }

    // ---- the bridge Python talks to (python: `js.bridge`) ----
    globalThis.bridge = {
        nextMessage(timeoutMs) {
            const deadline = timeoutMs < 0 ? Infinity : performance.now() + timeoutMs;
            for (;;) {
                if (Atomics.load(ctrl, 0) === 1) {
                    const length = Atomics.load(ctrl, 1);
                    const text = decoder.decode(data.slice(0, length));   // slice(): TextDecoder rejects shared memory
                    Atomics.store(ctrl, 0, 0);
                    post({ type: "slot-free" });
                    return text;
                }
                if (deadline === Infinity) {
                    Atomics.wait(ctrl, 0, 0);
                } else {
                    const left = deadline - performance.now();
                    if (left <= 0) return null;
                    Atomics.wait(ctrl, 0, 0, Math.min(left, 2000));
                }
            }
        },
        respond(id, status, contentType, body) { post({ type: "res", id, status, contentType, body }); },
        respondBinary(id, status, contentType, bytes) {
            const copy = new Uint8Array(bytes);
            post({ type: "res", id, status, contentType, body: copy }, [copy.buffer]);
        },
        frame(player, text) { post({ type: "frame", player, text }); },
        saveFile(path, bytes) { const copy = new Uint8Array(bytes); post({ type: "save", path, data: copy }, [copy.buffer]); },
        deleteFile(path) { post({ type: "delete", path }); },
        log(text) { post({ type: "log", text: String(text) }); },
    };

    progress("Arrancando el juego…", 80);
    py.runPython(`
import os, sys
os.chdir('/app')
sys.path[:0] = ['/app', '/app/vendor']
`);
    post({ type: "booted" });
    // Never returns while the app is open: the engine thread lives inside the blocking waits.
    py.runPython(`
from engine.browser.runtime import JsBridge
from engine.browser import boot
boot.main(JsBridge(), None)
`);
    post({ type: "stopped" });
}
