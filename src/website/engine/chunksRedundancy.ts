import { chunk_redundancy } from "hiveCodes";
import { HiveCommunication } from "./communication";
import { HiveStorage } from "./storage";


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

        const chunkHeaders = storage.getChunkHeaders(chunkId);

        console.log({ chunkHeaders });
    }

    // For each chunks, ask how many clients has them, if total < min_chunk_redundancy we broadcast them.
    // If a multiple chunk file has one missing chunk in the hive we delete all chunks

}