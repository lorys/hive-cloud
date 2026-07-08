import { chunkIdToString } from "commons";
import { chunk_id_size, chunk_state_treshold } from "hiveCodes";

const chunksReceived: {
    [key: string]: {
        reference: null | Uint8Array, // first chunk seen; the candidate we vote on
        agree: number,                // responders whose bytes match the reference
        disagree: number,             // responders whose bytes differ from the reference
        responders: number,           // total responders so far
        expected: number,             // how many holders the server asked
        timeout: NodeJS.Timeout
    }
} = {};

export const validatedChunks: { [key: string]: Uint8Array | false } = {};

// Called by the download handler once it knows how many holders it asked, so the
// relay can finalise as soon as they've all answered (instead of blocking until
// chunk_state_treshold holders exist).
export function expectChunk(chunkId: string, holders: number) {
    // We never exceed ~1Gio of chunks in RAM.
    if (chunksReceived[chunkId] || Object.keys(chunksReceived).length > 1_000) return;

    chunksReceived[chunkId] = {
        reference: null,
        agree: 0,
        disagree: 0,
        responders: 0,
        expected: holders,
        // No matter what, a chunk never lives more than 10 seconds in RAM.
        timeout: setTimeout(() => { delete chunksReceived[chunkId]; }, 10_000)
    };
}

export function relayReceivedChunk(chunk: Uint8Array) {
    const chunkId = chunkIdToString(chunk.subarray(0, chunk_id_size));

    // Only collect while a download is actually waiting for this chunk.
    if (validatedChunks[chunkId] !== false) return;

    const entry = chunksReceived[chunkId];
    if (!entry) return; // nobody asked for it

    const strippedChunk = chunk.subarray(chunk_id_size);
    entry.responders++;

    if (entry.reference === null) {
        entry.reference = strippedChunk;
        entry.agree = 1;
    } else {
        const isDifferent = Buffer.compare(entry.reference, strippedChunk) !== 0;

        if (isDifferent) {
            entry.disagree++;
            // A different chunk won the vote: switch to it and start over.
            if (entry.disagree > entry.agree) {
                entry.reference = strippedChunk;
                entry.agree = 1;
                entry.disagree = 0;
            }
        } else {
            entry.agree++;
        }
    }

    // Validate once a chunk has a decisive lead, or once every holder has answered.
    const decided = entry.agree >= chunk_state_treshold || entry.responders >= entry.expected;
    if (decided && entry.reference && entry.agree >= entry.disagree) {
        validatedChunks[chunkId] = entry.reference;
        clearTimeout(entry.timeout);
        delete chunksReceived[chunkId];
    }
}
