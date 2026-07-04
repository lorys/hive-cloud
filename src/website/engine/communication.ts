import { chunk_infos_size, chunk_size, enums } from "hiveCodes";
import { hiveInfos, informationsFromServerHandler } from "./handlers/informations.js";
import { questionsFromServerHandler } from "./handlers/questions.js";
import { HiveStorage } from "./storage.js";
import { numberToUint8Array, uint8ArrayToNumber } from "./utils.js";
import { actionsFromServerHandler } from "./handlers/actions.js";

type PendingAnswer = { [key: string]: ((payload: Uint8Array) => void) | null; };

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

        ws.onmessage = (event: MessageEvent) => {
            const payload = new Uint8Array(event.data);
            
            questionsFromServerHandler(payload, this);
            informationsFromServerHandler(payload, this);
            actionsFromServerHandler(payload, this);

            if (this.#waitingForAnswer[payload[0]]) {
                this.#waitingForAnswer[payload[0]]?.(payload);

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
        if (!this.canStoreChunk || this.#storageInstance.findIndex(chunkId))
            throw { error: 104, message: "No space left or chunk already exists" };

        await this.#storageInstance.storeChunk(chunkId, chunk);
    }

    async pullChunk(index: string): Promise<Uint8Array> {
        return this.#storageInstance.pullChunk(index);
    }

    async uploadFileToHive(file: File, callback: (state: 'splitting' | 'broadcasting' | 'stored' | 'no_space', value?: number) => void) {
        if (!file) return;

        if (!this.#canUploadFileToHive(file)) {
            callback('no_space');
            return;
        }
        
        callback('splitting', file.size / chunk_size);
        const chunkId = await HiveStorage.getFileHash(file);
        const chunks = await HiveStorage.splitFileToChunks(file);

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const payload = new Uint8Array(1 + chunk_infos_size + chunk_size);
            payload[0] = enums.client.actions.broadcast_chunk;
            
            let cursor = 1;
            
            payload.set(chunkId, cursor);
            cursor += 32;
            
            payload.set(numberToUint8Array(chunkIndex, 2), cursor);
            cursor += 2;
            
            payload.set(numberToUint8Array(chunks.length, 2), cursor);
            cursor += 2;
            
            if (chunkIndex === chunks.length - 1) {
                payload.set(numberToUint8Array(file.size, 5), cursor);
                cursor += 5;
            }

            payload.set(chunks[chunkIndex], cursor);
            
            callback('broadcasting', chunkIndex);
            this.#ws?.send(payload);
        }
        
    }

    async answerHive(payload: Uint8Array<ArrayBuffer>) {
        console.log("Answering server with", payload);
        this.#ws?.send(payload);
    }

    waitForAnswer(type: number): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject("Answer took too long"), 4000);
            this.#waitingForAnswer[type] = (...args) => {
                resolve(...args);
                clearTimeout(t);
                delete this.#waitingForAnswer[type];
            };
        });
    }

    async isFilePresentInHive(chunkId: number) {
        const payload = new Uint8Array(33);
        payload[0] = enums.client.questions.total_clients_having_chunk;
        payload.set(numberToUint8Array(chunkId, 32), 1);
        this.#ws?.send(payload);
        const answer = await this.waitForAnswer(payload[0]);
        return uint8ArrayToNumber(answer);
    }

    async downloadFileFromHive(chunkId: number) {

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
