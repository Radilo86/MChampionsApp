// Marvel Champions offline — page side of the engine (runs in the shell page, shared with the game iframes).
// Owns the worker, the SharedArrayBuffer mailbox, the emulated websockets and the IndexedDB mirror of user files.

const HEADER_BYTES = 16;
const MAILBOX_BYTES = 64 * 1024 * 1024;     // virtual; only touched pages are committed
const encoder = new TextEncoder();

// ---- tiny IndexedDB key/value mirror for the files the engine writes (decks, saves, statistics...) ----
const idb = {
    db: null,
    open() {
        if (this.db) return Promise.resolve(this.db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open("marvel-lcg", 1);
            req.onupgradeneeded = () => req.result.createObjectStore("files", { keyPath: "path" });
            req.onsuccess = () => { this.db = req.result; resolve(this.db); };
            req.onerror = () => reject(req.error);
        });
    },
    async all() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const req = db.transaction("files").objectStore("files").getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    async put(path, data) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("files", "readwrite");
            tx.objectStore("files").put({ path, data });
            tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
        });
    },
    async del(path) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("files", "readwrite");
            tx.objectStore("files").delete(path);
            tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
        });
    },
    async clear() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("files", "readwrite");
            tx.objectStore("files").clear();
            tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
        });
    },
};

export class EngineHost {
    /**
     * @param {object} opts
     * @param {string} opts.base            absolute URL of the app root (ends with "/")
     * @param {(text:string,pct:number)=>void} [opts.onProgress]
     * @param {(text:string)=>void} [opts.onLog]
     * @param {(error:string)=>void} [opts.onFatal]
     * @param {object} [opts.node]          test hooks: { WorkerClass, workerPath, pyodideModule, indexURL, engineZip, files, store }
     */
    constructor(opts) {
        this.opts = opts;
        this.worker = null;
        this.sab = null; this.ctrl = null; this.data = null;
        this.queue = [];
        this.nextRequestId = 1;
        this.pending = new Map();
        this.sockets = new Map();
        this.nextSocketId = 1;
        this.ready = false;
        this.version = "";
        this.store = (opts.node && opts.node.store) || idb;
    }

    static isSupported() {
        return typeof SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined" &&
            (typeof crossOriginIsolated === "undefined" || crossOriginIsolated === true);
    }

    async start() {
        const o = this.opts, node = o.node;
        this.sab = new SharedArrayBuffer(HEADER_BYTES + MAILBOX_BYTES);
        this.ctrl = new Int32Array(this.sab, 0, 4);
        this.data = new Uint8Array(this.sab, HEADER_BYTES);

        const stored = await this.store.all();
        const files = {};
        for (const item of stored) files[item.path] = item.data;

        const cfg = node ? {
            sab: this.sab, files, debug: false,
            pyodideModule: node.pyodideModule, indexURL: node.indexURL, engineZip: node.engineZip,
        } : {
            sab: this.sab, files, debug: /[?&]debug\b/.test(location.search),
            pyodideModule: new URL("pyodide/pyodide.mjs", o.base).href,
            indexURL: new URL("pyodide/", o.base).href,
            engineZip: new URL("engine.zip", o.base).href,
        };

        this.worker = node ? new node.WorkerClass(node.workerPath) : new Worker(new URL("worker.js", o.base), { type: "module" });
        const onMessage = (m) => this._onWorkerMessage(m);
        if (node) this.worker.on("message", onMessage); else this.worker.onmessage = (e) => onMessage(e.data);
        if (!node) this.worker.onerror = (e) => o.onFatal && o.onFatal(String(e.message || e));
        else this.worker.on("error", (e) => o.onFatal && o.onFatal(String(e && e.stack || e)));

        const ready = new Promise((resolve, reject) => { this._resolveReady = resolve; this._rejectReady = reject; });
        this.worker.postMessage(cfg, files ? Object.values(files).map((b) => b.buffer).filter((b) => b instanceof ArrayBuffer) : []);

        // The engine answers once its first wait loop is running
        await ready;
        const response = await this.request("GET", "get_version");
        this.version = response.body;
        this.ready = true;
        return this;
    }

    // ------------------------------------------------------------------------------------------------------------
    _onWorkerMessage(m) {
        switch (m.type) {
            case "progress": this.opts.onProgress && this.opts.onProgress(m.text, m.pct); break;
            case "booted": this._resolveReady && this._resolveReady(); break;
            case "slot-free": this._pump(); break;
            case "res": {
                const entry = this.pending.get(m.id);
                if (entry) {
                    this.pending.delete(m.id);
                    entry.resolve({ status: m.status, contentType: m.contentType, body: m.body });
                }
                break;
            }
            case "frame":
                for (const socket of this.sockets.values()) {
                    if (socket.players.includes(m.player) || socket.hotSeat) socket.onframe(m.text);
                }
                break;
            case "save": this.store.put(m.path, m.data); break;
            case "delete": this.store.del(m.path); break;
            case "log": this.opts.onLog && this.opts.onLog(m.text); break;
            case "fatal": this._rejectReady && this._rejectReady(new Error(m.error)); this.opts.onFatal && this.opts.onFatal(m.error); break;
            case "stopped": this.ready = false; break;
        }
    }

    _send(message) { this.queue.push(message); this._pump(); }

    _pump() {
        // one message in the mailbox at a time; the worker tells us ("slot-free") when it has consumed it
        if (!this.queue.length || Atomics.load(this.ctrl, 0) !== 0) return;
        const bytes = encoder.encode(JSON.stringify(this.queue.shift()));
        if (bytes.length > MAILBOX_BYTES) throw new Error("Message too large for the mailbox: " + bytes.length);
        this.data.set(bytes, 0);
        Atomics.store(this.ctrl, 1, bytes.length);
        Atomics.store(this.ctrl, 0, 1);
        Atomics.notify(this.ctrl, 0);
    }

    // ------------------------------------------------------------------------------------------------------------
    /** HTTP-like request served by the Python engine. Resolves { status, contentType, body }. */
    request(method, url, body = "") {
        return new Promise((resolve, reject) => {
            const id = this.nextRequestId++;
            this.pending.set(id, { resolve, reject });
            this._send({ kind: "http", id, method, url, body: typeof body === "string" ? body : String(body ?? "") });
        });
    }

    /** Emulated websocket. `onframe(text)` is called for every FrameDescriptor the engine pushes. */
    openSocket(query, onframe) {
        const sid = this.nextSocketId++;
        const params = new URLSearchParams(query);
        const players = (params.get("p") ?? "0").split(",").filter((x) => x !== "").map(Number);
        this.sockets.set(sid, { players: players.length ? players : [0], hotSeat: params.has("hot_seat"), onframe });
        this._send({ kind: "ws_open", sid, query });
        return sid;
    }
    socketSend(sid, data) { this._send({ kind: "ws_message", sid, data }); }
    closeSocket(sid) {
        if (this.sockets.delete(sid)) this._send({ kind: "ws_close", sid });
    }

    async clearUserData() { await this.store.clear(); }
}
