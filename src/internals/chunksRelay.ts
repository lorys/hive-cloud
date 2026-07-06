import { chunkIdToString } from "commons";
import { chunk_header_size, chunk_id_size, chunk_size, chunk_state_treshold } from "hiveCodes";

const chunksReceived: {
    [key: string]: {
        same: number,
        different: number,
        chunk: null | Uint8Array,
        timeout: NodeJS.Timeout
    }
} = {

};

export const validatedChunks: { [key: string]: Uint8Array | false } = {};

export function relayReceivedChunk(chunk: Uint8Array) {

    // We never exceed ~1Gio of chunks in RAM
    if (Object.keys(chunksReceived).length > 1_000) return;

    const chunkId = chunkIdToString(chunk.subarray(0,chunk_id_size));

    // We don't check chunks if nobody asked for it.
    if (!validatedChunks[chunkId]) return;

    if (!chunksReceived[chunkId]) {
        chunksReceived[chunkId] = {
            same: 0,
            different: 0,
            chunk: null,
            // No matter what, a chunk never lives more than 10 seconds in RAM.
            timeout: setTimeout(() => {
                if (chunksReceived[chunkId]) {
                    delete chunksReceived[chunkId];
                }
            }, 10_000)
        };
    }


    const strippedChunk = chunk.subarray(chunk_id_size);

    if (chunksReceived[chunkId].chunk === null) {
        chunksReceived[chunkId].chunk = strippedChunk;
        return;
    }

    let isDifferent = false;
    for (let a = 0; a < chunk_header_size + chunk_size; a++) {
        if (chunksReceived[chunkId].chunk[a] !== strippedChunk[a]) {
            isDifferent = true;
            break;
        }
    }

    if (isDifferent) {
        chunksReceived[chunkId].different++;
    } else {
        chunksReceived[chunkId].same++;
    }

    if (chunksReceived[chunkId].same+chunksReceived[chunkId].different >= chunk_state_treshold) {
        if (chunksReceived[chunkId].same > chunksReceived[chunkId].different) {
            validatedChunks[chunkId] = chunksReceived[chunkId].chunk;

            clearTimeout(chunksReceived[chunkId].timeout);
            delete chunksReceived[chunkId];
        } else if (chunksReceived[chunkId].different > chunksReceived[chunkId].same && isDifferent) {
            chunksReceived[chunkId] = {
                same: 0,
                different: 0,
                chunk: strippedChunk,
                timeout: chunksReceived[chunkId].timeout
            };
        }
    }
}