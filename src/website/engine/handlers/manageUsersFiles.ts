import { chunkIdToString, numberToUint8Array, stringToChunkId } from "commons";
import { chunk_id_size } from "hiveCodes";
import { hive } from "../main";
import { startDownload } from "./downloadFile.js";
import { copyShareLink } from "../ui.js";

type StoredFile = { name: string; totalChunks: number };

let usersChunkIds: { [key: string]: StoredFile } = {};

function holderElement(fileId: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`#user_files [data-holders="${fileId}"]`);
}

function chunksFoundElement(fileId: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`#user_files [data-chunksfound="${fileId}"]`);
}

function actionButton(fileId: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`#user_files [data-action="${fileId}"]`);
}

// Healthy file: shows how many times it's fully stored and offers a download.
function updateChunksFound(fileId: string, chunksFound: number, total: number) {
    const el = chunksFoundElement(fileId);
    if (el) el.innerHTML = `${chunksFound}/${total} 📦`;

    const button = actionButton(fileId);
    if (button) {
        button.innerHTML = `⬇️ Download`;
        button.onclick = () => startDownload(fileId, usersChunkIds[fileId].name, usersChunkIds[fileId].totalChunks);
    }
}

// Healthy file: shows how many times it's fully stored and offers a download.
function updateFileHolders(fileId: string, holders: number) {
    const el = holderElement(fileId);
    if (el) el.innerHTML = `${holders} 🐝`;

    const button = actionButton(fileId);
    if (button) {
        button.innerHTML = `⬇️ Download`;
        button.onclick = () => startDownload(fileId, usersChunkIds[fileId].name, usersChunkIds[fileId].totalChunks);
    }
}

// Lost file (a chunk nobody holds): we don't remove it, we let the user delete it.
function markFileLost(fileId: string) {
    const el = holderElement(fileId);
    if (el) el.innerHTML = `lost 💀`;

    const button = actionButton(fileId);
    if (button) {
        button.innerHTML = `🗑️ Delete`;
        button.onclick = () => deleteUserFile(fileId);
    }
}

// Only ever triggered by the user clicking "Delete" on a lost file.
function deleteUserFile(fileId: string) {
    localStorage.removeItem("hive_" + fileId);
    delete usersChunkIds[fileId];
    holderElement(fileId)?.closest(".link")?.remove();
}

function renderUserFiles() {
    const userFilesDOM = document.querySelector<HTMLDivElement>("#user_files");
    if (!userFilesDOM) {
        console.error("user files DOM not found");
        return;
    }

    let newRender: Node[] = [];

    Object.keys(usersChunkIds).forEach(chunk => {
        const sanityCheck = /^[a-zA-Z0-9\,]+$/;
        if (chunk.match(sanityCheck) === null) {
            return;
        }

        const el = document.createElement('div');
        const nameEl = document.createElement('span');
        const holdersEl = document.createElement('span');
        const chunksFoundEl = document.createElement('span');
        const actionsEl = document.createElement('div');
        const buttonEl = document.createElement('span');
        const shareEl = document.createElement('span');

        nameEl.classList.add('name');
        nameEl.innerHTML = usersChunkIds[chunk]?.name || chunk;
        holdersEl.classList.add('holders');
        holdersEl.innerHTML = `searching for 🐝...`;
        holdersEl.dataset.holders = chunk;
        chunksFoundEl.classList.add('holders');
        chunksFoundEl.innerHTML = `0/${usersChunkIds[chunk]?.totalChunks} 📦`;
        chunksFoundEl.dataset.chunksfound = chunk;
        buttonEl.classList.add('download');
        buttonEl.innerHTML = `⬇️ Download`;
        buttonEl.dataset.action = chunk;
        buttonEl.onclick = () => startDownload(chunk, usersChunkIds[chunk]?.name, usersChunkIds[chunk]?.totalChunks);
        shareEl.classList.add('share');
        shareEl.innerHTML = `🔗`;
        shareEl.dataset.share = chunk;
        shareEl.onclick = () => copyShareLink(chunk, usersChunkIds[chunk]?.name, shareEl);

        actionsEl.classList.add('actions');
        actionsEl.append(buttonEl, shareEl);
        el.classList.add('link');
        el.append(nameEl, holdersEl, chunksFoundEl, actionsEl);

        newRender.push(el);
    });

    userFilesDOM.innerHTML = '';
    userFilesDOM.append(...newRender);
}

export function manageUserFiles() {
    const locallyStoredFiles: { [key: string]: StoredFile } = Object.keys(localStorage)
        .filter(e => e.startsWith("hive_"))
        .reduce((acc, e) => ({ ...acc, [e.replace("hive_", "")]: JSON.parse(localStorage.getItem(e) as string) }), {});

    const needToUpdate = Object.keys(locallyStoredFiles).length !== Object.keys(usersChunkIds).length;

    if (!needToUpdate) {
        return;
    }
    usersChunkIds = locallyStoredFiles;

    renderUserFiles();
}

// Finds how many times a whole file is stored across the hive.
// A file is only as available as its least held chunk, so we keep the lowest holder count.
// A count of 0 means at least one chunk is gone: the file is lost.
async function checkFileHolders(chunkId: string) {
    const communication = hive.communication;
    if (!communication) return;

    const totalChunks = usersChunkIds[chunkId]?.totalChunks;
    let minHolders = Infinity;
    let chunksFound = 0;
    
    await Promise.allSettled(new Array(totalChunks).fill(0).map(async (_, index) => {
        let holders: number | undefined;

        if (minHolders === 0) return;

        const tryCheckPresence = async (retries: number) => {
            try {
                const wantedChunkId = new Uint8Array(chunk_id_size);
                wantedChunkId.set(stringToChunkId(chunkId), 0);
                wantedChunkId.set(numberToUint8Array(index, 2), chunk_id_size - 2);
                holders = await communication.isChunkPresentInHive(chunkIdToString(wantedChunkId));
                if (minHolders === 0) return 0;

                return holders;
            } catch (e) {
                if (retries < 10) return tryCheckPresence(retries + 1);
                return undefined;
            }
        };

        holders = await tryCheckPresence(0);

        // Network hiccup or timeout: don't touch the file, we'll retry next tick.
        if (holders === undefined) {
            return;
        }

        minHolders = Math.min(minHolders, holders);
        if (holders === 0) minHolders = 0; // one missing chunk is enough to lose the file
        else {
            chunksFound++;
            updateChunksFound(chunkId, chunksFound, totalChunks);
        }
    }));

    if (minHolders === 0) {
        markFileLost(chunkId);
    } else {
        updateFileHolders(chunkId, minHolders);
    }
}

let checkingInFlight = false;

export async function checkUserFiles() {
    if (checkingInFlight || !hive.communication) return;
    checkingInFlight = true;
    try {
        for (const chunkId of Object.keys(usersChunkIds)) {
            await checkFileHolders(chunkId);
        }
    } finally {
        checkingInFlight = false;
    }
}
