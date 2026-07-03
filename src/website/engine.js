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
            broadcast_chunk: 0x49
        },
        infos: 0x51
    },
    server: {
        questions: {
            have_chunk_and_send: 0x00,
            have_chunk: 0x01
        },
        actions: {
            store_chunk: 0x11
        },
        infos: 0x21
    }
};

async function questionsFromServerHandler(payload, hive) {
    const type = payload[0];
    // the first byte contains the action code made from the server that we need to execute.

    const params = payload.subarray(1);
    
    const actions = {
        // Do we have a chunk ? If so, send it
        async [enums.server.questions.have_chunk_and_send](args) {
            const wantedChunkIndex = new DataView(args.buffer, 1, args.byteLength).getUint32(0, true);
            try {
                const chunk = await hive.pullChunk(wantedChunkIndex);
                const answer = new Uint8Array(4 + chunk_size);
                answer.set(args.subarray(0,3));
                answer.set(chunk, 4);
                return answer;
            } catch (e) {

            }
            return null;
        },
        
        // Do we have a chunk ? yes or no
        async [enums.server.questions.have_chunk](args) {
            const wantedChunkIndex = new DataView(args.buffer, 1, args.byteLength).getUint32(0, true);
            try {
                const chunk = await hive.pullChunk(wantedChunkIndex);
                const answer = new Uint8Array(4 + chunk_size);
                answer.set(args.subarray(0,3));
                answer.set(chunk, 4);
                return answer;
            } catch (e) {

            }
            return null;
        },
    };

    if (!Object.keys(actions).includes(type.toString())) return;

    try {
        const answer = await actions[type](params.buffer);
        const answerPayload = new Uint8Array(1 + answer.length);
        answerPayload[0] = type;
        answerPayload.set(answer, 1);
        await hive.answerHive(answerPayload);
    } catch (e) {
        console.log("Error while processing questions for type " + type, e);
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
}

async function informationsFromServerHandler(payload, hive) {
    const type = payload[0];
    if (type !== enums.server.infos) return;

    const totalCapacity = new DataView(payload.buffer).getUint32(1, false);
    let totalCapacityFormatted = totalCapacity * chunk_size;
    if (totalCapacityFormatted >= 1000*1000*chunk_size) totalCapacityFormatted = (totalCapacityFormatted / (1000*1000*chunk_size)).toFixed(1) + " TiB";
    else if (totalCapacityFormatted >= 1000*chunk_size) totalCapacityFormatted = (totalCapacityFormatted / (1000*chunk_size)).toFixed(1) + " GiB";
    else if (totalCapacityFormatted >= chunk_size) totalCapacityFormatted = (totalCapacityFormatted / chunk_size) + " MiB";

    const totalUsed = new DataView(payload.buffer).getUint32(5, false);
    let totalUsedFormatted = totalUsed * chunk_size;
    if (totalUsedFormatted >= 1000*1000*chunk_size) totalUsedFormatted = (totalUsedFormatted / (1000*1000*chunk_size)).toFixed(1) + " TiB";
    else if (totalUsedFormatted >= 1000*chunk_size) totalUsedFormatted = (totalUsedFormatted / (1000*chunk_size)).toFixed(1) + " GiB";
    else if (totalUsedFormatted >= chunk_size) totalUsedFormatted = (totalUsedFormatted / chunk_size) + " MiB";
    
    const totalClients = new DataView(payload.buffer).getUint32(9, false);

    document.querySelector("#available_storage").innerHTML=totalCapacityFormatted;
    document.querySelector("#used_storage").innerHTML=totalUsedFormatted;
    document.querySelector("#connected_devices").innerHTML=totalClients;

    document.querySelector("#used").style.width=(totalUsed*100/totalCapacity)+"%";
    document.querySelector("#used").innerHTML=(totalUsed*100/totalCapacity)+"%";
}

async function encryptChunk(file, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );

    const plaintext = new Uint8Array(await file.arrayBuffer());
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext)
    );

    const packaged = new Uint8Array(salt.length + iv.length + ciphertext.length);
    packaged.set(salt, 0);
    packaged.set(iv, salt.length);
    packaged.set(ciphertext, salt.length + iv.length);

    return new File([packaged], file.name + ".enc", { type: "application/octet-stream" });
}

// Copies the uploaded file's URL (shown in the .copy tool) to the clipboard
// and gives the user a short visual confirmation on the button.
async function copyChunkId() {
    const value = document.querySelector("#upload_steps .chunk-id").textContent.trim();
    if (!value) return;

    const button = document.querySelector("#copyButton");
    const label = button.innerHTML;
    try {
        await navigator.clipboard.writeText(value);
        button.innerHTML = "✅ Copied";
    } catch (e) {
        button.innerHTML = "❌ Failed";
        console.log("Could not copy to clipboard", e);
    }
    setTimeout(() => { button.innerHTML = label; }, 1500);
}

async function handleFileUpload(file) {
    const modal = document.querySelector("#encryption");
    const passwordInput = modal.querySelector("#encryptionPassword");
    const yesButton = modal.querySelector("#encryptYes");
    const noButton = modal.querySelector("#encryptNo");

    modal.querySelector("#encryptionFileName").textContent = file.name;
    passwordInput.value = "";
    modal.style.display = "block";
    passwordInput.focus();

    const fileToUpload = await new Promise((resolve) => {
        const close = () => {
            modal.style.display = "none";
            yesButton.onclick = null;
            noButton.onclick = null;
        };

        yesButton.onclick = async () => {
            const password = passwordInput.value;
            if (!password) {
                passwordInput.focus();
                return;
            }
            yesButton.innerHTML="Encryption ...";
            const encrypted = await encryptFile(file, password);
            yesButton.innerHTML="Encryption done ✅";
            resolve(encrypted);
            close();
        };

        noButton.onclick = () => {
            close();
            resolve(file);
        };
    });

    await hive.communication.uploadFileToHive(fileToUpload);
}

class HiveStorage {
    #storage;
    #indexes;
    lastIndex = -1;
    maxCapacity;

    constructor(size) {
        if (!size || typeof size !== 'number') {
            throw "No size specified.";
        }
        this.maxCapacity = size;
        this.storage = new Uint8Array(size * chunk_size);
        this.storage.fill(0);
        this.indexes = new Uint32Array(size);
    }

    static async splitFileToChunks(file) {
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
    #storageInstance;
    #waitingForAnswer = { received: null, type: null };

    constructor(storage) {
        this.#storageInstance = storage;
    }

    connect() {
        if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
            return this.#ws;
        }
        this.#ws = new WebSocket("ws://"+window.location.host+"/hive");
        this.#ws.binaryType = "arraybuffer";

        this.#ws.onmessage = (event) => {
            const payload = new Uint8Array(event.data);
            console.log("WS message", payload);
            questionsFromServerHandler(payload, this);
            answersFromServerHandler(payload, this);
            informationsFromServerHandler(payload, this);

            if (this.#waitingForAnswer.type === payload[0]) {
                this.#waitingForAnswer.received(payload);
            }
        };

        return new Promise((res, rej) => {
            this.#ws.onopen = res;
            this.#ws.onerror = rej;
        });
    }

    static async init(storage) {
        const hive = new HiveCommunication(storage);
        await hive.connect();

        return hive;
    }

    async #canUploadFileToHive(file) {
        const payload = new Uint8Array(2);
        payload[0] = file.length;
        this.#ws.send();
    }

    async uploadFileToHive(file, callback) {
        if (!file) return;
        const chunks = await HiveStorage.splitFileToChunks(file);
        // TODO: broadcast each chunk across the hive.
        console.log("Uploading file to hive:", file.name, chunks.length, "chunk(s)");
        if (callback) callback(chunks);
    }

    async answerHive(payload) {
        console.log("Answering server with", payload);
        this.#ws.send(payload);
    }

    async waitForAnswer(type) {
        return new Promise((resolve, rej) => {
            this.#waitingForAnswer.received = resolve;
            this.#waitingForAnswer.type = type;
        });
    }

    async isFilePresentInHive(firstChunkId) {
        const payload = new Uint8Array();
        this.ws.send();
    }

    async downloadFileFromHive(chunkId) {

    }

    async sendInfos() {
        const infos = new Uint8Array(7);
        infos[0] = enums.client.infos;

        infos[1] = this.storage.used >> 16;
        infos[2] = (this.storage.used & 0x00FF00) >> 8;
        infos[3] = (this.storage.used & 0x0000FF);

        infos[4] = this.storage.total >> 16;
        infos[5] = (this.storage.total & 0x00FF00) >> 8;
        infos[6] = (this.storage.total & 0x0000FF);
        
        this.#ws.send(infos);
    }

    get canStoreChunk() {
        return this.storageInstance.lastIndex < this.storageInstance.maxCapacity;
    }

    get storage() {
        return {
            used: this.#storageInstance.lastIndex < 0 ? 0 : this.#storageInstance.lastIndex,
            total: this.#storageInstance.maxCapacity
        };
    }
}

const start = async () => {
    document.querySelector('#confirmation').style.display='none';
    const allowedChunks = document.querySelector("#allowedChunks").value;
    if (!hive.storage && !hive.communication) {
        let providedStorage = allowedChunks * chunk_size;
        if (providedStorage >= 1000*1000*chunk_size) providedStorage = (providedStorage / (1000*1000*chunk_size)).toFixed(1) + " TiB";
        else if (providedStorage >= 1000*chunk_size) providedStorage = (providedStorage / (1000*chunk_size)).toFixed(1) + " GiB";
        else if (providedStorage >= chunk_size) providedStorage = (providedStorage / chunk_size) + " MiB";

        document.querySelector("#provided_storage").innerHTML=providedStorage;
        hive.storage = new HiveStorage(parseInt(allowedChunks));
        hive.communication = await HiveCommunication.init(hive.storage);
        const uploadZone = document.querySelector("#upload");
        uploadZone.onclick = () => {
            const fileField = document.createElement("input");
            fileField.type="file";
            fileField.click();
            fileField.onchange = ({ target }) => {
                const file = target.files[0];
                if (file) handleFileUpload(file);
            }
        };

        // Drag & drop: dropping a file opens the encryption modal.
        ["dragenter", "dragover"].forEach((eventName) => {
            uploadZone.addEventListener(eventName, (event) => {
                event.preventDefault();
                event.stopPropagation();
            });
        });
        uploadZone.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const file = event.dataTransfer.files[0];
            if (file) handleFileUpload(file);
        });

        setInterval(() => {
            hive.communication.sendInfos();
        }, 1000);
    }
}