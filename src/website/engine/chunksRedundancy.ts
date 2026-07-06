import { chunk_id_size, chunk_redundancy } from "hiveCodes";
import { HiveCommunication } from "./communication";
import { HiveStorage } from "./storage";
import { chunkIdToString, numberToUint8Array, stringToChunkId, uint8ArrayToNumber } from "commons";

export async function chunkRedundancy(storage: HiveStorage, hive: HiveCommunication) {

    const chunksStored = storage.allIndexes;

    for (let a = 0; a < chunksStored.length; a++) {
        const chunkId = chunksStored[a];

        const holders = await hive.isFilePresentInHive(chunkId);
        
        if (holders < chunk_redundancy) {
            await hive.broadcastChunk(chunkId);
        }
        
        if (holders > chunk_redundancy) {
            const deleteChunk = Math.floor(Math.random() * 10) === 0;

            if (deleteChunk) {
                storage.deleteChunk(chunkId);
                continue; // we skip the full file check since we deleted it
            }
        }


        /*
            The issue with the following code below is that mid-upload, a file containing multiple chunks is not fully stored.
            We need to prevent chunk's deletion before full file is uploaded
        */
        // const chunkHeaders = storage.getChunkHeaders(chunkId);

        // for (let check = 0; check < chunkHeaders.totalChunks; check++) {
        //     if (chunkHeaders.currentIndex !== check) { // We have this chunk, no need to check if someone else also does.
        //         // Building chunk id
        //         const buildChunkId = new Uint8Array(chunk_id_size);
        //         buildChunkId.set(stringToChunkId(chunkId).subarray(0, chunk_id_size - 2), 0);
        //         buildChunkId.set(numberToUint8Array(check, 2), chunk_id_size - 2);

        //         const checkChunkId = chunkIdToString(buildChunkId);

        //         const holders = await hive.isFilePresentInHive(checkChunkId);
        //         console.log({ holders });
        //         if (!holders) {
        //             storage.deleteChunk(checkChunkId);
        //             console.log("🗑️ ❌ Deleting", {checkChunkId, holders});
        //         }
        //     }
        // }
    }

    // For each chunks, ask how many clients has them, if total < min_chunk_redundancy we broadcast them.
    // If a multiple chunk file has one missing chunk in the hive we delete all chunks

}