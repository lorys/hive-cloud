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

// Opens the download modal, animates a box -> 🐝 per chunk as it arrives, then
// concatenates the file. If it was encrypted, asks for the password before saving.
export async function startDownload(fileId: string, name: string, totalChunks: number) {
    const modal = document.querySelector<HTMLElement>("#download");
    const boxes = document.querySelector<HTMLElement>("#download_boxes");
    const passwordSection = document.querySelector<HTMLElement>("#download_password");
    const passwordInput = document.querySelector<HTMLInputElement>("#downloadPassword");
    const decryptButton = document.querySelector<HTMLButtonElement>("#downloadDecrypt");
    const status = document.querySelector<HTMLElement>("#download_status");
    const closeButton = document.querySelector<HTMLButtonElement>("#close_download");
    if (!modal || !boxes || !passwordSection || !passwordInput || !decryptButton || !status || !closeButton) return;

    // Reset the modal.
    boxes.innerHTML = "";
    passwordSection.style.display = "none";
    passwordInput.value = "";
    decryptButton.onclick = null;
    status.innerHTML = `Looking for ${totalChunks} chunk(s)...`;
    modal.style.display = "block";

    const close = () => { modal.style.display = "none"; };
    closeButton.onclick = close;

    // One box per chunk; each becomes a bee once its chunk is found.
    for (let i = 0; i < totalChunks; i++) {
        const box = document.createElement("div");
        box.classList.add("download-box");
        box.dataset.index = String(i);
        boxes.append(box);
    }

    const result = await hive.communication?.downloadFileFromHive(fileId, totalChunks, (index) => {
        const box = boxes.querySelector<HTMLElement>(`[data-index="${index}"]`);
        if (box) {
            box.textContent = "🐝";
            box.classList.add("found");
        }
    });

    if (!result) {
        status.innerHTML = `Download failed 😔 Some chunks are missing.`;
        return;
    }

    if (!result.encrypted) {
        saveBlob(result.bytes, name);
        close();
        return;
    }

    // Encrypted: we need the password to recover the original file.
    status.innerHTML = `This file is encrypted 🔒`;
    passwordSection.style.display = "block";
    passwordInput.focus();
    decryptButton.onclick = async () => {
        const password = passwordInput.value;
        if (!password) {
            passwordInput.focus();
            return;
        }
        try {
            saveBlob(await decryptFile(result.bytes, password), name);
            close();
        } catch (e) {
            status.innerHTML = `Wrong password ❌ Try again.`;
            passwordInput.focus();
        }
    };
}
