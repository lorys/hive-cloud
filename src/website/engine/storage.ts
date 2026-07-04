import { chunk_infos_size, chunk_size } from "hiveCodes";

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
        this.#storage = new Uint8Array(size * chunk_size);
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

    findIndex(index: string): number | false {
        const found = this.#indexes.findIndex(e => e === index);
        return found > -1 ? found : false;
    }

    #addIndex(index: string) {
        console.log("Storing index");
        if (this.findIndex(index))
            throw { error: 101, message: "Index already exists" };
        const firstFree = this.#indexes.findIndex(e => !e);
        console.log({ firstFree });
        this.#indexes[firstFree] = index;
        return firstFree;
    }

    async storeChunk(chunkId: string, data: Uint8Array) {
        if (this.remainingCapacity <= 0)
            throw { error: 100, message: "No space left" };

        // If chunk is not one of these two length, it's in a wrong format
        if (data.byteLength !== 9 + chunk_size && data.byteLength !== 7 + chunk_size)
            throw { error: 103, message: `Bad chunk format (expected ${9 + chunk_size} or ${7 + chunk_size} but got ${data.byteLength})` };

        if (this.findIndex(chunkId))
            throw { error: 105, message: `Chunk already stored` };

        const chunkIdIndex = this.#addIndex(chunkId);

        this.#storage.set(data, chunkIdIndex * chunk_size);
        this.stored++;
        console.log("Stored !!!");
        return true;
    }

    async pullChunk(index: string): Promise<Uint8Array> {
        const indexFound = this.findIndex(index);

        if (!indexFound)
            throw { error: 102, message: "Chunk not found" };

        return this.#storage.subarray(indexFound * chunk_size, chunk_size);
    }
}
