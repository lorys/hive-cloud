const hive = {
    communication: null,
    storage: null
};

const chunk_size = 1_048_576;

const enums = {
    client: {
        questions: {
            total_clients_having_chunk: 0x37,
            have_space_to_store_file: 0x38
        },
        actions: {

        }
    },
    server: {
        questions: {
            have_chunk_and_send: 0x00,
            have_chunk: 0x01,
            can_store_chunk: 0x02,
            used_space: 0x03,
            total_capacity: 0x04
        },
        actions: {
            store_chunk: 0x11
        },
        infos: 0x21
    }
}

async function questionsFromServerHandler(payload, hive) {
    const type = payload[0];
    // the first byte contains the action code made from the server that we need to execute.

    const params = payload.subarray(1);

    const actions = {
        // Do we have a chunk ? If so, send it
        async [enums.server.questions.have_chunk_and_send](args) {
            const wantedChunkIndex = new DataView(args).getUint32(0, true);
            try {
                const chunk = await hive.pullChunk(new DataView(args).getUint32(0, true));
                const answer = new Uint8Array(4 + chunk_size);
                answer.set(payload.subarray(0,3));
                answer.set(chunk, 4);
                return answer;
            } catch (e) {

            }
            return null;
        },
        
        // Do we have a chunk ? yes or no
        async [enums.server.questions.have_chunk](args) {
            const wantedChunkIndex = new DataView(args).getUint32(0, true);
            try {
                const chunk = await hive.pullChunk(new DataView(args).getUint32(0, true));
                const answer = new Uint8Array(4 + chunk_size);
                answer.set(payload.subarray(0,3));
                answer.set(chunk, 4);
                return answer;
            } catch (e) {

            }
            return null;
        },
        
        // Can we store a chunk ? 
        [enums.server.questions.can_store_chunk]() {
            return hive.canStoreChunk;
        },

        // How many chunks do we have ?
        [enums.server.questions.used_space]() {
            return hive.storage.used;
        },

        // How many chunks can we have ?
        [enums.server.questions.total_capacity]() {
            return hive.storage.capacity - hive.storage.used;
        }
    };

    try {
        const answer = await actions[type](params);
        await hive.answerHive(answer);
    } catch (e) {
    }
}

async function answersFromServerHandler(payload, hive) {
    const type = payload[0];

    if (![
        enums.client.questions.total_clients_having_chunk,
        enums.client.questions.have_space_to_store_file
    ].includes(type)) {
        return;
    }

    console.log("received answer from server", payload);
}

class HiveStorage {
    #storage;
    #indexes;
    #lastIndex = -1;
    maxCapacity;

    constructor(size) {
        this.maxCapacity = size;
        this.storage = new Uint8Array(size * chunk_size);
        this.storage.fill(0);
        this.indexes = new Uint32Array(size);
    }

    static splitFileToChunks(file) {
        const bytes = new Uint8Array(await (file.arrayBuffer()));
        let chunks = new Array(file.length/chunk_size);
        for (let a = 0; a < (bytes.byteLength / chunk_size); a++) {
            chunks[a] = bytes.subarray(a * chunk_size, (a * chunk_size) + chunk_size);
        }
        return chunks;
    }

    get remainingCapacity() {
        return this.maxCapacity - this.lastIndex;
    }

    findIndex(index) {
        const found = this.#indexes.findIndex(e => e === index);
        if (found === -1) return null;
        return found;
    }

    #addIndex(index) {
        if (this.findIndex(index))
            throw { error: 101, message: "Index already exists" };
        this.#indexes[lastIndex + 1] = index;
    }

    async storeChunk(data) {
        if (this.lastIndex + 1 >= this.maxCapacity)
            throw { error: 100, message: "No space left" };

        const index = new DataView(this.#storage).getUInt32(0, true);
        this.#addIndex(index);

        this.#storage.set(data, (this.lastIndex + 1) * chunk_size);
        return true;
    }

    async pullChunk(index) {
        const indexFound = this.findIndex(index);

        if (!indexFound)
            throw { error: 102, message: "Chunk not found" };

        return this.#storage.subarray(this.lastIndex * chunk_size, chunk_size);
    }
}

class HiveCommunication {
    #ws;
    #config = { allowedChunks: 1024 };
    #storage;
    #waitingForAnswer;

    constructor(storage) {
        this.#config.allowedChunks = allowedChunks;
    }

    connect() {
        if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
            return this.#ws;
        }
        this.#ws = new WebSocket("ws://"+window.location.host+"/hive");
        this.#ws.binaryType = "arraybuffer";

        this.#ws.onmessage = (event) => {
            questionsFromServerHandler(event.data, this);
            answersFromServerHandler(event.data, this);
        };

        return new Promise((res, rej) => {
            this.#ws.onopen = res;
            this.#ws.onerror = rej;
        });
    }

    static async init(allowedChunks, storage) {
        const hive = new HiveCommunication(allowedChunks, storage);
        await hive.connect();

        return hive;
    }

    async #canUploadFileToHive(file) {
        const payload = new Uint8Array(2);
        payload[0] = file.length;
        this.#ws.send();
    }

    async uploadFileToHive(file, callback) {
        const answer = new Uint8Array(10);
        answer[0] = 255;
        answer[2] = 255;
        answer[4] = 255;
        answer[6] = 255;
        answer[8] = 255;
        this.#ws.send(answer);
    }

    async answerHive(payload) {
        this.#ws.send(payload);
    }

    async waitForAnswerTo(type) {

    }

    async isFilePresentInHive(firstChunkId) {
        const payload = new Uint8Array();
        this.ws.send();
    }

    async downloadFileFromHive(chunkId) {

    }

    get canStoreChunk() {
        return this.storage.lastIndex < this.storage.maxCapacity;
    }

    get storage() {
        return {
            used: this.storage.lastIndex,
            total: this.storage.maxCapacity
        };
    }
}

const start = async () => {
    document.querySelector('#confirmation').style.display='none';
    const allowedChunks = document.querySelector("#allowedChunks").value;
    if (!hive.storage && !hive.communication) {
        hive.storage = new HiveStorage();
        hive.communication = await HiveCommunication.init(parseInt(allowedChunks));
        document.querySelector("#upload").onclick = () => {
            hive.communication.uploadFileToHive();
        };
    }
}