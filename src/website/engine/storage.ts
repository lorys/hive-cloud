import { chunk_size } from "hiveCodes";

export class HiveStorage {
    #storage: Uint8Array;
    #indexes: Uint32Array;
    lastIndex = -1;
    maxCapacity: number;

    constructor(size: number) {
        if (!size || typeof size !== 'number') {
            throw "No size specified.";
        }
        this.maxCapacity = size;
        this.#storage = new Uint8Array(size * chunk_size);
        this.#storage.fill(0);
        this.#indexes = new Uint32Array(size);
    }

    static async splitFileToChunks(file: File): Promise<Uint8Array[]> {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const chunks: Uint8Array[] = new Array(Math.ceil(bytes.byteLength / chunk_size));
        for (let a = 0; a < (bytes.byteLength / chunk_size); a++) {
            chunks[a] = bytes.subarray(a * chunk_size, (a * chunk_size) + chunk_size);
        }
        return chunks;
    }

    get remainingCapacity() {
        return this.maxCapacity - this.lastIndex;
    }

    findIndex(index: number): number | null {
        const found = this.#indexes.findIndex(e => e === index);
        if (found === -1) return null;
        return found;
    }

    #addIndex(index: number) {
        if (this.findIndex(index))
            throw { error: 101, message: "Index already exists" };
        this.#indexes[this.lastIndex + 1] = index;
    }

    async storeChunk(data: Uint8Array) {
        if (this.lastIndex + 1 >= this.maxCapacity)
            throw { error: 100, message: "No space left" };

        const index = new DataView(this.#storage.buffer).getUint32(0, true);
        this.#addIndex(index);

        this.#storage.set(data, (this.lastIndex + 1) * chunk_size);
        return true;
    }

    async pullChunk(index: number): Promise<Uint8Array> {
        const indexFound = this.findIndex(index);

        if (!indexFound)
            throw { error: 102, message: "Chunk not found" };

        return this.#storage.subarray(this.lastIndex * chunk_size, chunk_size);
    }
}
