import { enums } from "./config.js";
import { informationsFromServerHandler } from "./handlers/informations.js";
import { questionsFromServerHandler } from "./handlers/questions.js";
import { HiveStorage } from "./storage.js";
import { numberToUint8Array } from "./utils.js";


interface PendingAnswer {
    received: ((payload: Uint8Array) => void) | null;
    type: number | null;
}

export class HiveCommunication {
    #ws: WebSocket | null = null;
    #storageInstance: HiveStorage;
    #waitingForAnswer: PendingAnswer = { received: null, type: null };

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
            console.log("WS message", payload);
            questionsFromServerHandler(payload, this);
            informationsFromServerHandler(payload, this);

            if (this.#waitingForAnswer.type === payload[0]) {
                this.#waitingForAnswer.received?.(payload);
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
        const payload = new Uint8Array(2);
        payload[0] = file.size;
        this.#ws?.send(payload);
    }

    async pullChunk(index: number): Promise<Uint8Array> {
        return this.#storageInstance.pullChunk(index);
    }

    async uploadFileToHive(file?: File | null, callback?: (chunks: Uint8Array[]) => void) {
        if (!file) return;
        const chunks = await HiveStorage.splitFileToChunks(file);
        // TODO: broadcast each chunk across the hive.
        console.log("Uploading file to hive:", file.name, chunks.length, "chunk(s)");
        if (callback) callback(chunks);
    }

    async answerHive(payload: Uint8Array<ArrayBuffer>) {
        console.log("Answering server with", payload);
        this.#ws?.send(payload);
    }

    async waitForAnswer(type: number): Promise<Uint8Array> {
        return new Promise((resolve) => {
            this.#waitingForAnswer.received = resolve;
            this.#waitingForAnswer.type = type;
        });
    }

    async isFilePresentInHive(chunkId: number) {
        const payload = new Uint8Array(17);
        payload[0] = enums.client.questions.total_clients_having_chunk;
        payload.set(numberToUint8Array(chunkId, 16), 1);
        this.#ws?.send(payload);
        const answer = await this.waitForAnswer(payload[0]);
        console.log("Answer received !!!!!!", answer);
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
        return this.#storageInstance.lastIndex < this.#storageInstance.maxCapacity;
    }

    get storage() {
        return {
            used: this.#storageInstance.lastIndex < 0 ? 0 : this.#storageInstance.lastIndex,
            total: this.#storageInstance.maxCapacity
        };
    }
}
