import { HiveStorage } from "./storage.js";
import { HiveCommunication } from "./communication.js";
import { handleFileUpload, copyChunkId } from "./ui.js";
import { byId } from "./utils.js";
import { chunk_size } from "hiveCodes";
import { manageUserFiles } from "./handlers/manageUsersFiles.js";
import { chunkRedundancy } from "./chunksRedundancy.js";

export interface HiveState {
    communication: HiveCommunication | null;
    storage: HiveStorage | null;
}

// Shared client-side state, populated by start().
export const hive: HiveState = {
    communication: null,
    storage: null
};

// for debugging
(window as any).hive = hive;

const start = async () => {
    byId("confirmation").style.display = 'none';
    const allowedChunks = parseInt(byId<HTMLInputElement>("allowedChunks").value, 10);
    if (hive.storage || hive.communication) return;

    let providedStorage: string | number = allowedChunks * chunk_size;
    if (providedStorage >= 1000*1000*chunk_size) providedStorage = (providedStorage / (1000*1000*chunk_size)).toFixed(1) + " TiB";
    else if (providedStorage >= 1000*chunk_size) providedStorage = (providedStorage / (1000*chunk_size)).toFixed(1) + " GiB";
    else if (providedStorage >= chunk_size) providedStorage = (providedStorage / chunk_size) + " MiB";

    byId("provided_storage").innerHTML = String(providedStorage);
    hive.storage = new HiveStorage(allowedChunks);
    hive.communication = await HiveCommunication.init(hive.storage);
    const uploadZone = byId("upload");
    uploadZone.onclick = () => {
        const fileField = document.createElement("input");
        fileField.type="file";
        fileField.click();
        fileField.onchange = () => {
            const file = fileField.files?.[0];
            if (file) handleFileUpload(file);
        }
    };

    ["dragenter", "dragover"].forEach((eventName) => {
        uploadZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
    });
    uploadZone.addEventListener("drop", (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer?.files[0];
        if (file) handleFileUpload(file);
    });

    setInterval(() => {
        hive.communication?.sendInfos();
    }, 1000);

    let managingUsersFiles = false;


    setInterval(() => {
        if (managingUsersFiles) return;
        managingUsersFiles = true;
        try {
            manageUserFiles();
        } catch (err) {
            console.log("Manage user file error", err);
        }
        managingUsersFiles = false;
    }, 500);

    let redundancyCheckRunning = false;

    setInterval(async () => {
        if (redundancyCheckRunning || !hive.storage || !hive.communication) return;
        redundancyCheckRunning = true;
        try {
            await chunkRedundancy(hive.storage, hive.communication);
        } catch (err) {
            console.log("Redundancy check error", err);
        }
        redundancyCheckRunning = false;
    }, 250);
}

byId("agreed").onclick = start;
byId<HTMLInputElement>("allowedChunks").value = "300";
byId<HTMLButtonElement>("copyButton").onclick = copyChunkId;
