import { hive } from "../main.js";
import { decryptFile } from "../utils.js";

function saveBlob(bytes: Uint8Array<ArrayBuffer>, name: string) {
    const url = URL.createObjectURL(new Blob([bytes]));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

type DownloadModal = {
    modal: HTMLElement;
    boxes: HTMLElement;
    passwordSection: HTMLElement;
    passwordInput: HTMLInputElement;
    decryptButton: HTMLButtonElement;
    status: HTMLElement;
    close: () => void;
};

// Grabs and resets the shared download modal. Returns null if the DOM is missing.
function openDownloadModal(): DownloadModal | null {
    const modal = document.querySelector<HTMLElement>("#download");
    const boxes = document.querySelector<HTMLElement>("#download_boxes");
    const passwordSection = document.querySelector<HTMLElement>("#download_password");
    const passwordInput = document.querySelector<HTMLInputElement>("#downloadPassword");
    const decryptButton = document.querySelector<HTMLButtonElement>("#downloadDecrypt");
    const status = document.querySelector<HTMLElement>("#download_status");
    const closeButton = document.querySelector<HTMLButtonElement>("#close_download");
    if (!modal || !boxes || !passwordSection || !passwordInput || !decryptButton || !status || !closeButton) return null;

    boxes.innerHTML = "";
    passwordSection.style.display = "none";
    passwordInput.value = "";
    decryptButton.onclick = null;
    modal.style.display = "block";

    const close = () => { modal.style.display = "none"; };
    closeButton.onclick = close;

    return { modal, boxes, passwordSection, passwordInput, decryptButton, status, close };
}

// One box per chunk; each becomes a bee once its chunk is found.
function buildBoxes(boxes: HTMLElement, totalChunks: number) {
    boxes.innerHTML = "";
    for (let i = 0; i < totalChunks; i++) {
        const box = document.createElement("div");
        box.classList.add("download-box");
        box.dataset.index = String(i);
        boxes.append(box);
    }
}

function markBox(boxes: HTMLElement, index: number) {
    const box = boxes.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (box) {
        box.textContent = "🐝";
        box.classList.add("found");
    }
}

// Handles the tail of any download: failure, plain save, or password + decrypt.
function finishDownload(
    result: { bytes: Uint8Array<ArrayBuffer>; encrypted: boolean } | null | undefined,
    name: string,
    m: DownloadModal
) {
    if (!result) {
        m.status.innerHTML = `Download failed 😔 Some chunks are missing.`;
        return;
    }

    if (!result.encrypted) {
        saveBlob(result.bytes, name);
        m.close();
        return;
    }

    // Encrypted: we need the password to recover the original file.
    m.status.innerHTML = `This file is encrypted 🔒`;
    m.passwordSection.style.display = "block";
    m.passwordInput.focus();
    m.decryptButton.onclick = async () => {
        const password = m.passwordInput.value;
        if (!password) {
            m.passwordInput.focus();
            return;
        }
        try {
            saveBlob(await decryptFile(result.bytes, password), name);
            m.close();
        } catch (e) {
            m.status.innerHTML = `Wrong password ❌ Try again.`;
            m.passwordInput.focus();
        }
    };
}

// Opens the download modal, animates a box -> 🐝 per chunk as it arrives, then
// concatenates the file. If it was encrypted, asks for the password before saving.
export async function startDownload(fileId: string, name: string, totalChunks: number) {
    const m = openDownloadModal();
    if (!m) return;

    m.status.innerHTML = `Looking for ${totalChunks} chunk(s)...`;
    buildBoxes(m.boxes, totalChunks);

    const result = await hive.communication?.downloadFileFromHive(fileId, totalChunks, (index) => markBox(m.boxes, index));
    finishDownload(result, name, m);
}

// Same as startDownload but for a shared link where we only know the first chunk id:
// we fetch chunk 0 to learn the chunk count (onInfo), then lay out the grid and finish.
export async function startHeadlessDownload(firstChunkId: string, name: string) {
    const m = openDownloadModal();
    if (!m) return;

    m.status.innerHTML = `Fetching file info... 🐝`;

    const result = await hive.communication?.headlessDownload(
        firstChunkId,
        (totalChunks) => {
            m.status.innerHTML = `Looking for ${totalChunks} chunk(s)...`;
            buildBoxes(m.boxes, totalChunks);
        },
        (index) => markBox(m.boxes, index)
    );
    finishDownload(result, name, m);
}
