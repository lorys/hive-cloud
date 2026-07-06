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

    const fileToUpload = await new Promise<File>((resolve) => {
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
            const encrypted = await encryptChunk(file, password);
            yesButton.innerHTML="Encryption done ✅";
            resolve(encrypted);
            close();
        };

        noButton.onclick = () => {
            close();
            resolve(file);
        };
    });

    const uploadStateModal = document.querySelector<HTMLButtonElement>("#upload_steps")!;
    const uploadStateText = document.querySelector<HTMLButtonElement>("#upload_steps #state")!;
    const closeUploadSteps = document.querySelector<HTMLButtonElement>("#close_upload_steps")!;
    closeUploadSteps.onclick = () => {
        uploadStateModal.style.display = 'none';
    };
    uploadStateModal.style.display = "block";

    const chunkInfos: {
        firstChunkId: string | null,
        totalChunks: number | null
    } = {
        firstChunkId: null,
        totalChunks: null
    };

    await hive.communication?.uploadFileToHive(fileToUpload, (payload) => {
        const { state } = payload;

        if (state === 'splitting') {
            uploadStateText.innerHTML = `Splitting in ${payload.value} chunks`;
        } else if (state === 'broadcasting') {
            uploadStateText.innerHTML = `Broadcasting chunk n. ${payload.value}`;
        } else if (state === 'firstChunkId') {
            chunkInfos.firstChunkId = payload.value.firstChunkId;
            chunkInfos.totalChunks = payload.value.totalChunks;
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
