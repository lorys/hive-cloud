import { chunk_header_size, chunk_id_size, chunk_infos_size, chunk_size, enums } from "hiveCodes";
import { hiveInfos, informationsFromServerHandler } from "./handlers/informations.js";
import { questionsFromServerHandler } from "./handlers/questions.js";
import { HiveStorage } from "./storage.js";
import { numberToUint8Array, stringToChunkId, uint8ArrayToNumber } from "commons";
import { actionsFromServerHandler } from "./handlers/actions.js";
import { chunkIdToString } from "commons";

type PendingAnswer = { [key: string]: ((payload: Uint8Array) => void)[]; };

type PendingDownload = {
    totalChunks: number; // 0 until known — headless downloads learn it from the first chunk
    chunks: (Uint8Array | undefined)[]; // index -> header + data
    received: number;
    onInfo?: (totalChunks: number) => void; // fired once the first chunk reveals the count
    onChunk: (index: number) => void;
    resolve: (result: { bytes: Uint8Array<ArrayBuffer>; encrypted: boolean } | null) => void;
    timeout: ReturnType<typeof setTimeout>;
};

export class HiveCommunication {
    #ws: WebSocket | null = null;
    #storageInstance: HiveStorage;
    #waitingForAnswer: PendingAnswer = {};
    #downloads: Map<string, PendingDownload> = new Map();

    constructor(storage: HiveStorage) {
        this.#storageInstance = storage;
    }

    connect(): WebSocket | Promise<Event> {
        if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
            return this.#ws;
        }
        // Match the page's protocol
        const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${scheme}//${window.location.host}/hive`);
        this.#ws = ws;
        ws.binaryType = "arraybuffer";

        ws.onmessage = async (event: MessageEvent) => {
            const payload = new Uint8Array(event.data);
            
            await questionsFromServerHandler(payload, this);
            await informationsFromServerHandler(payload, this);
            await actionsFromServerHandler(payload, this);

            if (payload[0] === enums.client.actions.send_chunk) {
                this.#receiveDownloadChunk(payload);
            }

            if (this.#waitingForAnswer[payload[0]]) {
                await Promise.allSettled(this.#waitingForAnswer[payload[0]].map(fn => fn?.(payload.subarray(1))));

                // reset waitingForAnswer
                delete this.#waitingForAnswer[payload[0]];
            }
        };

        return new Promise<Event>((res, rej) => {
            ws.onopen = res;
            ws.onerror = rej;
        });
    }

    static async init(storage: HiveStorage): Promise<HiveCommunication> {
        const hive = new HiveCommunication(storage);
        await hive.connect();

        return hive;
    }

    async #canUploadFileToHive(file: File) {
        return (hiveInfos.totalUsed + file.size) < hiveInfos.totalCapacity;
    }

    async storeChunk(chunkId: string, chunk: Uint8Array) {
        if (!this.canStoreChunk || this.#storageInstance.findChunkId(chunkId))
            throw { error: 104, message: "No space left or chunk already exists" };
        await this.#storageInstance.storeChunk(chunkId, chunk);
    }

    async pullChunk(index: string): Promise<Uint8Array> {
        return this.#storageInstance.pullChunk(index);
    }

    async uploadFileToHive(file: File, encrypted: boolean, callback: (payload: { state: 'firstChunkId', value: { firstChunkId: string, totalChunks: number } } | { state: 'splitting' | 'broadcasting', value: number } | { state: 'no_space' } ) => void) {
        if (!file) return;

        if (!this.#canUploadFileToHive(file)) {
            callback({ state: 'no_space' });
            return;
        }
        
        callback({ state: 'splitting', value: Math.floor(file.size / chunk_size) < (file.size / chunk_size) ? Math.floor(file.size / chunk_size) + 1 : Math.floor(file.size / chunk_size) });
        const fileHash = await HiveStorage.getFileHash(file);
        const chunks = await HiveStorage.splitFileToChunks(file);
        const chunkId = new Uint8Array(chunk_id_size);
        chunkId.fill(0);
        chunkId.set(fileHash, 0);

        callback({
            state: 'firstChunkId',
            value: {
                firstChunkId: chunkIdToString(chunkId),
                totalChunks: chunks.length
            }
        });

        const payload = new Uint8Array(1 + chunk_infos_size + chunk_size);
        payload[0] = enums.client.actions.broadcast_chunk;
        payload.set(chunkId, 1);
        payload.set(numberToUint8Array(chunks.length, 2), 1 + chunk_id_size);
        payload.set(numberToUint8Array(file.size, 5), 1 + chunk_id_size + 2);
        payload[1 + chunk_id_size + 7] = encrypted ? 1 : 0;
        const dataOffset = 1 + chunk_infos_size;

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            payload.set(numberToUint8Array(chunkIndex, 2), 1 + chunk_id_size - 2);
            // Zero the tail left from the previous chunk before writing a shorter one.
            if (chunks[chunkIndex].length < chunk_size) payload.fill(0, dataOffset + chunks[chunkIndex].length);
            payload.set(chunks[chunkIndex], dataOffset);

            callback({ state: 'broadcasting', value: chunkIndex });
            this.#ws?.send(payload);
            await new Promise(res => setTimeout(res, 100));
        }
        
    }

    async broadcastChunk(chunkId: string) {
        const payload = new Uint8Array(1 + chunk_infos_size + chunk_size);
        payload[0] = enums.client.actions.broadcast_chunk;
        payload.set(stringToChunkId(chunkId), 1);
        payload.set(this.#storageInstance.pullChunk(chunkId), 1 + chunk_id_size);
        this.#ws?.send(payload);
    }

    async answerHive(payload: Uint8Array<ArrayBuffer>) {
        this.#ws?.send(payload);
    }

    waitForAnswer(type: number, isWantedAnswer?: (payload: Uint8Array) => boolean): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject("Answer took too long"), 10_000);
            if (!this.#waitingForAnswer[type]) {
                this.#waitingForAnswer[type] = [];
            }
            this.#waitingForAnswer[type].push((arr) => {
                if ((isWantedAnswer && isWantedAnswer(arr)) || !isWantedAnswer) {
                    clearTimeout(t);
                    resolve(arr);
                }
            });
        });
    }

    async isChunkPresentInHive(chunkId: string) {
        const payload = new Uint8Array(1 + chunk_id_size);
        payload[0] = enums.client.questions.total_clients_having_chunk;

        payload.set(stringToChunkId(chunkId), 1);
        this.#ws?.send(payload);
        const answer = await this.waitForAnswer(payload[0], data => chunkIdToString(data.subarray(0,chunk_id_size)) === chunkId);
        const totalHolders = uint8ArrayToNumber(answer.subarray(chunk_id_size));

        return totalHolders;
    }

    // Asks the hive for one chunk: [ send_chunk | fileHash(32) | index(2) ].
    #requestChunk(hash: Uint8Array, index: number) {
        const payload = new Uint8Array(1 + chunk_id_size);
        payload[0] = enums.client.actions.send_chunk;
        payload.set(hash, 1);
        payload.set(numberToUint8Array(index, 2), 1 + chunk_id_size - 2);
        this.#ws?.send(payload);
    }

    // Requests every chunk of a file, collects the deliveries, and assembles the
    // original bytes. `onChunk` fires for each chunk that arrives (for UI feedback).
    // Resolves null if the whole file didn't arrive within the timeout.
    downloadFileFromHive(
        firstChunkId: string,
        totalChunks: number,
        onChunk: (index: number) => void
    ): Promise<{ bytes: Uint8Array<ArrayBuffer>; encrypted: boolean } | null> {
        const hash = stringToChunkId(firstChunkId).subarray(0, chunk_id_size - 2);
        const key = chunkIdToString(hash);

        return new Promise((resolve) => {
            this.#downloads.set(key, {
                totalChunks,
                chunks: new Array(totalChunks),
                received: 0,
                onChunk,
                resolve,
                timeout: setTimeout(() => {
                    this.#downloads.delete(key);
                    resolve(null);
                }, 30_000)
            });

            for (let a = 0; a < totalChunks; a++) {
                this.#requestChunk(hash, a);
            }
        });
    }

    // Downloads a file we only know the first chunk id of (e.g. from a share link):
    // we don't know totalChunks/encrypted yet, so we fetch chunk 0 first, read the
    // count from its header, then request the rest. `onInfo` fires once the count is
    // known (for the UI to lay out its grid); `onChunk` fires per delivered chunk.
    headlessDownload(
        firstChunkId: string,
        onInfo: (totalChunks: number) => void,
        onChunk: (index: number) => void
    ): Promise<{ bytes: Uint8Array<ArrayBuffer>; encrypted: boolean } | null> {
        const hash = stringToChunkId(firstChunkId).subarray(0, chunk_id_size - 2);
        const key = chunkIdToString(hash);

        return new Promise((resolve) => {
            this.#downloads.set(key, {
                totalChunks: 0, // unknown until the first chunk arrives
                chunks: [],
                received: 0,
                onInfo,
                onChunk,
                resolve,
                timeout: setTimeout(() => {
                    this.#downloads.delete(key);
                    resolve(null);
                }, 30_000)
            });

            this.#requestChunk(hash, 0);
        });
    }

    #receiveDownloadChunk(payload: Uint8Array) {
        const id = payload.subarray(1, 1 + chunk_id_size);
        const key = chunkIdToString(id.subarray(0, chunk_id_size - 2));
        const download = this.#downloads.get(key);
        if (!download) return;

        const index = uint8ArrayToNumber(id.subarray(chunk_id_size - 2));
        if (download.chunks[index]) return; // already collected

        download.chunks[index] = payload.subarray(1 + chunk_id_size); // header + data
        download.received++;
        download.onChunk(index);

        // Headless download: the first chunk reveals the real count. Learn it, tell
        // the UI, then request the remaining chunks (the first one is already in).
        if (download.totalChunks === 0) {
            download.totalChunks = uint8ArrayToNumber(download.chunks[index]!.subarray(0, 2));
            download.onInfo?.(download.totalChunks);
            const hash = id.subarray(0, chunk_id_size - 2);
            for (let a = 0; a < download.totalChunks; a++) {
                if (a !== index) this.#requestChunk(hash, a);
            }
        }

        if (download.received < download.totalChunks) return;

        // Every chunk is in: assemble to exactly totalBytes (drops the last chunk's padding).
        const first = download.chunks[0]!;
        const totalBytes = uint8ArrayToNumber(first.subarray(2, 7));
        const encrypted = first[chunk_header_size - 1] === 1;

        const bytes = new Uint8Array(totalBytes);
        for (let i = 0; i < download.totalChunks; i++) {
            const data = download.chunks[i]!.subarray(chunk_header_size);
            bytes.set(data.subarray(0, Math.min(chunk_size, totalBytes - i * chunk_size)), i * chunk_size);
        }

        clearTimeout(download.timeout);
        this.#downloads.delete(key);
        download.resolve({ bytes, encrypted });
    }

    async sendInfos() {
        const infos = new Uint8Array(7);
        infos[0] = enums.client.infos;

        infos.set(numberToUint8Array(this.storage.used, 3), 1);
        infos.set(numberToUint8Array(this.storage.total, 3), 4);

        this.#ws?.send(infos);
    }

    get canStoreChunk() {
        return this.#storageInstance.remainingCapacity > 0;
    }

    get storage() {
        return {
            used: this.#storageInstance.stored,
            total: this.#storageInstance.maxCapacity
        };
    }
}
