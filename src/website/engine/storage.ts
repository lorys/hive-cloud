import { uint8ArrayToNumber } from "commons";
import { chunk_header_size, chunk_infos_size, chunk_size } from "hiveCodes";

export class HiveStorage {
    #storage: Uint8Array;
    #indexes: Array<string>; // contains index (32 bytes) + current chunk index (2 bytes)
    stored: number = 0;
    maxCapacity: number;

    constructor(size: number) {
        if (!size || typeof size !== 'number') {
            throw "No size specified.";
        }
        this.maxCapacity = size;
        this.#storage = new Uint8Array(size * (chunk_header_size + chunk_size));
        this.#storage.fill(0);
        this.#indexes = new Array(size);
    }

    static async splitFileToChunks(file: File): Promise<Uint8Array[]> {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const chunks: Uint8Array[] = new Array(Math.ceil(bytes.byteLength / chunk_size));
        for (let a = 0; a < (bytes.byteLength / chunk_size); a++) {
            chunks[a] = bytes.subarray(a * chunk_size, (a * chunk_size) + chunk_size);
        }
        return chunks;
    }

    static async getFileHash(file: File): Promise<Uint8Array> {
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        console.log({ digest, uintarray: new Uint8Array(digest) });
        return new Uint8Array(digest);
    }

    get remainingCapacity() {
        return this.maxCapacity - this.stored;
    }

    findChunkId(chunkId: string): number | false {
        const found = this.#indexes.findIndex(e => e === chunkId);
        return found > -1 ? found : false;
    }

    #deleteIndex(chunkId: string) {
        const indexFound = this.findChunkId(chunkId);

        if (indexFound === false)
            throw { error: 102, message: "Chunk not found" };

        this.#indexes[indexFound]
    }

    #addIndex(chunkId: string) {
        console.log("Storing chunkId");
        if (this.findChunkId(chunkId))
            throw { error: 101, message: "Index already exists" };
        const firstFree = this.#indexes.findIndex(e => !e);
        console.log({ firstFree });
        this.#indexes[firstFree] = chunkId;
        return firstFree;
    }

    get allIndexes() {
        return this.#indexes.filter(e => !!e);
    }

    async storeChunk(chunkId: string, data: Uint8Array) {
        if (this.remainingCapacity <= 0)
            throw { error: 100, message: "No space left" };

        // If chunk is not one of these two length, it's in a wrong format
        if (data.byteLength !== chunk_header_size + chunk_size)
            throw { error: 103, message: `Bad chunk format (expected ${chunk_header_size + chunk_size} but got ${data.byteLength})` };

        if (this.findChunkId(chunkId))
            throw { error: 105, message: `Chunk already stored` };

        const chunkIdIndex = this.#addIndex(chunkId);

        this.#storage.set(data, chunkIdIndex * (chunk_header_size + chunk_size));
        this.stored++;
        return true;
    }

    pullChunk(chunkId: string): Uint8Array {
        const indexFound = this.findChunkId(chunkId);

        if (indexFound === false)
            throw { error: 102, message: "Chunk not found" };

        return this.#storage.subarray(indexFound * (chunk_header_size + chunk_size), (chunk_header_size + chunk_size));
    }

    getChunkHeaders(chunkId: string) {
        const chunk = this.pullChunk(chunkId);

        return {
            currentIndex: uint8ArrayToNumber(chunk.subarray(0, 2)),
            totalChunks: uint8ArrayToNumber(chunk.subarray(2, 4)),
            totalBytes: uint8ArrayToNumber(chunk.subarray(4, 9)),
        };
    }

    deleteChunk(chunkId: string) {
        const indexFound = this.findChunkId(chunkId);

        if (indexFound === false)
            throw { error: 102, message: "Chunk not found" };

        this.#deleteIndex(chunkId);
    }
}
