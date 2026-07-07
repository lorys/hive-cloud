import { hive } from "./main.js";
import { encryptChunk } from "./utils.js";

export async function copyChunkId() {
    const value = document.querySelector("#upload_steps .chunk-id")?.textContent?.trim();
    if (!value) return;

    const button = document.querySelector<HTMLButtonElement>("#copyButton");
    if (!button) return;

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

// Builds a shareable "?dl=" link for a file. The payload is unicode-safe base64 of
// { id, name }; totalChunks is discovered on the recipient's side by headlessDownload,
// so it isn't encoded here.
export function shareLink(chunkId: string, name: string): string {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ id: chunkId, name }))));
    return `${location.origin}${location.pathname}?dl=${encodeURIComponent(payload)}`;
}

// Copies a file's share link to the clipboard, flashing feedback on `el`.
export async function copyShareLink(chunkId: string, name: string, el: HTMLElement) {
    const label = el.innerHTML;
    try {
        await navigator.clipboard.writeText(shareLink(chunkId, name));
        el.innerHTML = "✅";
    } catch (e) {
        el.innerHTML = "❌";
        console.log("Could not copy share link", e);
    }
    setTimeout(() => { el.innerHTML = label; }, 1500);
}

export async function handleFileUpload(file: File) {
    const modal = document.querySelector<HTMLElement>("#encryption");
    if (!modal) return;

    const passwordInput = modal.querySelector<HTMLInputElement>("#encryptionPassword");
    const yesButton = modal.querySelector<HTMLButtonElement>("#encryptYes");
    const noButton = modal.querySelector<HTMLButtonElement>("#encryptNo");
    const fileName = modal.querySelector<HTMLElement>("#encryptionFileName");
    if (!passwordInput || !yesButton || !noButton || !fileName) return;

    fileName.textContent = file.name;
    passwordInput.value = "";
    modal.style.display = "block";
    passwordInput.focus();

    const { file: fileToUpload, encrypted } = await new Promise<{ file: File, encrypted: boolean }>((resolve) => {
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
            const encryptedFile = await encryptChunk(file, password);
            yesButton.innerHTML="Encryption done ✅";
            resolve({ file: encryptedFile, encrypted: true });
            close();
        };

        noButton.onclick = () => {
            close();
            resolve({ file, encrypted: false });
        };
    });

    const uploadStateModal = document.querySelector<HTMLButtonElement>("#upload_steps")!;
    const uploadStateText = document.querySelector<HTMLButtonElement>("#upload_steps #state")!;
    const uploadBoxes = document.querySelector<HTMLElement>("#upload_boxes")!;
    const uploadLink = document.querySelector<HTMLElement>("#upload_steps .chunk-id")!;
    const closeUploadSteps = document.querySelector<HTMLButtonElement>("#close_upload_steps")!;
    closeUploadSteps.onclick = () => {
        uploadStateModal.style.display = 'none';
    };
    uploadBoxes.innerHTML = "";
    uploadLink.textContent = "Preparing share link…";
    uploadStateModal.style.display = "block";

    const chunkInfos: {
        firstChunkId: string | null,
        totalChunks: number | null
    } = {
        firstChunkId: null,
        totalChunks: null
    };

    await hive.communication?.uploadFileToHive(fileToUpload, encrypted, (payload) => {
        const { state } = payload;

        if (state === 'splitting') {
            uploadStateText.innerHTML = `Splitting in ${payload.value} chunks`;
            // One checkbox per chunk; each flips to ✅ once broadcast.
            uploadBoxes.innerHTML = "";
            for (let i = 0; i < payload.value; i++) {
                const box = document.createElement("div");
                box.classList.add("upload-box");
                box.dataset.index = String(i);
                uploadBoxes.append(box);
            }
        } else if (state === 'broadcasting') {
            uploadStateText.innerHTML = `Broadcasting chunk n. ${payload.value}`;
            const box = uploadBoxes.querySelector<HTMLElement>(`[data-index="${payload.value}"]`);
            if (box) {
                box.textContent = "✅";
                box.classList.add("checked");
            }
        } else if (state === 'firstChunkId') {
            chunkInfos.firstChunkId = payload.value.firstChunkId;
            chunkInfos.totalChunks = payload.value.totalChunks;
            // The share link is ready as soon as we have the first chunk id.
            uploadLink.textContent = shareLink(payload.value.firstChunkId, file.name);
        } else if (state === 'no_space') {
            uploadStateText.innerHTML = `Not enough space in the Hive ☹️ Try again later`
        }
    });

    if (!chunkInfos.firstChunkId || !chunkInfos.totalChunks) {
        uploadStateText.innerHTML = `An error occurred, reload the page.`;
        return;
    }

    localStorage.setItem("hive_"+chunkInfos.firstChunkId, JSON.stringify({ name: file.name, totalChunks: chunkInfos.totalChunks }));
}
