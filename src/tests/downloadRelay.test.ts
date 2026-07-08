import { describe, expect, it } from 'vitest';
import { clientActionsHandlers } from '../internals/handlers/actions';
import { clientAnswersHandlers } from '../internals/handlers/answers';
import { chunk_header_size, chunk_id_size, chunk_size, enums } from 'hiveCodes';
import { chunkIdToString } from 'commons';
import { OPEN } from 'ws';

describe('Download relay', () => {
    it('relays a held chunk to the requester even when a non-holder is connected', async () => {
        // The chunk the downloader is after.
        const wantedChunkId = new Uint8Array(chunk_id_size);
        for (let i = 0; i < chunk_id_size; i++) wantedChunkId[i] = (i * 7) % 251;
        const wantedChunkIdStr = chunkIdToString(wantedChunkId);

        // What a holder hands back when asked: [ chunkId | header | data ].
        const heldChunk = new Uint8Array(chunk_id_size + chunk_header_size + chunk_size);
        heldChunk.set(wantedChunkId, 0);
        heldChunk[chunk_id_size + chunk_header_size] = 42; // a recognisable first data byte

        const allClients = new Set<any>();

        // Holder: answers straight away when the server asks it for the chunk (0x00).
        const holder: any = {
            readyState: OPEN,
            hive: { hasChunks: new Set([wantedChunkIdStr]), totalStorage: 100, usedStorage: 0 },
            send: (payload: Uint8Array) => {
                if (payload[0] !== enums.server.questions.have_chunk_and_send) return;
                const answer = new Uint8Array(1 + heldChunk.length);
                answer[0] = enums.server.questions.have_chunk_and_send;
                answer.set(heldChunk, 1);
                clientAnswersHandlers[enums.server.questions.have_chunk_and_send]!(answer, holder, allClients);
            }
        };

        // The downloader: connected and in allClients, but holds nothing.
        const requesterSent: Uint8Array[] = [];
        const requester: any = {
            readyState: OPEN,
            hive: { hasChunks: new Set() },
            send: (payload: Uint8Array) => requesterSent.push(payload)
        };

        allClients.add(holder);
        allClients.add(requester);

        // Downloader asks for the chunk: [ send_chunk | chunkId ].
        const request = new Uint8Array(1 + chunk_id_size);
        request[0] = enums.client.actions.send_chunk;
        request.set(wantedChunkId, 1);

        await clientActionsHandlers[enums.client.actions.send_chunk]!(request, requester, allClients);

        // The requester must have received exactly the chunk it asked for.
        const relayed = requesterSent.find(p => p[0] === enums.client.actions.send_chunk);
        expect(relayed).toBeDefined();
        expect(chunkIdToString(relayed!.subarray(1, 1 + chunk_id_size))).toBe(wantedChunkIdStr);
        expect(relayed![1 + chunk_id_size + chunk_header_size]).toBe(42);
    });
});
