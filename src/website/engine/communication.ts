import { chunk_header_size, chunk_id_size, chunk_infos_size, chunk_size, enums } from "hiveCodes";
import { hiveInfos, informationsFromServerHandler } from "./handlers/informations.js";
import { questionsFromServerHandler } from "./handlers/questions.js";
import { HiveStorage } from "./storage.js";
import { numberToUint8Array, stringToChunkId, uint8ArrayToNumber } from "commons";
import { actionsFromServerHandler } from "./handlers/actions.js";
import { chunkIdToString } from "commons";

type PendingAnswer = { [key: string]: ((payload: Uint8Array) => void)[]; };

export class HiveCommunication {
    #ws: WebSocket | null = null;
    #storageInstance: HiveStorage;
    #waitingForAnswer: PendingAnswer = {};

    constructor(storage: HiveStorage) {
        this.#storageInstance = storage;
    }

    connect(): WebSocket | Promise<Event> {
        if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
            return this.#ws;
        }
        const ws = new WebSocket("ws://"+window.location.host+"/hive");
        this.#ws = ws;
        ws.binaryType = "arraybuffer";

        ws.onmessage = async (event: MessageEvent) => {
            const payload = new Uint8Array(event.data);
            
            await questionsFromServerHandler(payload, this);
            await informationsFromServerHandler(payload, this);
            await actionsFromServerHandler(payload, this);

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

    async uploadFileToHive(file: File, callback: (payload: { state: 'firstChunkId', value: { firstChunkId: string, totalChunks: number } } | { state: 'splitting' | 'broadcasting', value: number } | { state: 'no_space' } ) => void) {
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

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const payload = new Uint8Array(1 + chunk_infos_size + chunk_size);
            payload[0] = enums.client.actions.broadcast_chunk;
            
            chunkId.set(numberToUint8Array(chunkIndex, 2), chunk_id_size - 2);

            let cursor = 1;
            
            payload.set(chunkId, cursor);
            cursor += chunk_id_size;
            
            payload.set(numberToUint8Array(chunks.length, 2), cursor);
            cursor += 2;
            
            payload.set(numberToUint8Array(file.size, 5), cursor);
            cursor += 5;

            payload.set(chunks[chunkIndex], cursor);
            
            callback({ state: 'broadcasting', value: chunkIndex });
            this.#ws?.send(payload);
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

    waitForAnswer(type: number): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject("Answer took too long"), 4000);
            if (!this.#waitingForAnswer[type]) {
                this.#waitingForAnswer[type] = [];
            }
            this.#waitingForAnswer[type].push((...args) => {
                resolve(...args);
                clearTimeout(t);
            });
        });
    }

    async isChunkPresentInHive(chunkId: string) {
        const payload = new Uint8Array(1 + chunk_id_size);
        payload[0] = enums.client.questions.total_clients_having_chunk;

        payload.set(stringToChunkId(chunkId), 1);
        this.#ws?.send(payload);
        const answer = await this.waitForAnswer(payload[0]);
        
        return uint8ArrayToNumber(answer);
    }

    async downloadFileFromHive(chunkId: string, totalChunks: number) {
        const payload = new Uint8Array(1 + chunk_id_size);
        payload[0] = enums.client.actions.send_chunk;
        payload.set(stringToChunkId(chunkId).subarray(0, chunk_id_size - 2), 1);
        for (let a = 0; a < totalChunks; a++) {
            payload.set(numberToUint8Array(a, 2), 1 + chunk_id_size - 2);
            const chunk = this.#ws!.send(payload);
        }
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
