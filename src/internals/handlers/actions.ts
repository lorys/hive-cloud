import { WebSocket } from '@fastify/websocket';
import { chunkIdToString } from 'commons';
import { categories, chunk_id_size, chunk_infos_size, chunk_size, chunk_start_redundancy, enums } from 'hiveCodes';
import { OPEN } from 'ws';
import { validatedChunks } from '../chunksRelay';

const actionsSet = new Set(Object.values(enums.client.actions));

export function isAction(type: number) {
    return (type & 0xF0) === categories.client.actions && actionsSet.has(type);
}

export const clientActionsHandlers = {
    async [enums.client.actions.broadcast_chunk](buffer: Uint8Array, _wsClient: WebSocket, allClients: Set<WebSocket>) {
        let askedTo = 0;

        const payload = new Uint8Array(buffer.byteLength);
        payload[0] = enums.server.actions.store_chunk;
        payload.set(buffer.subarray(1), 1);
        
        allClients.forEach(client => {
            if (askedTo > chunk_start_redundancy) return;
            
            const clientHasCapacity = ((client.hive.totalStorage || 0) - (client.hive.usedStorage || 0)) > 0;
            if (!clientHasCapacity) return;

            client.send(payload);
            askedTo++;
        });
    },
    async [enums.client.actions.send_chunk](buffer: Uint8Array, wsClient: WebSocket, allClients: Set<WebSocket>) {
        const askClientPayload = new Uint8Array(1 + chunk_id_size);
        const wantedChunkId = buffer.subarray(1, 1 + chunk_id_size);
        const wantedChunkIdStr = chunkIdToString(wantedChunkId);
        
        askClientPayload[0] = enums.server.questions.have_chunk_and_send;
        askClientPayload.set(wantedChunkId, 1);

        validatedChunks[wantedChunkIdStr] = false;

        // We don't wait more than 20 sec to get a chunk.
        const waitChunkDeadline = setTimeout(() => {
            delete validatedChunks[wantedChunkIdStr];
        }, 20_000);

        allClients.forEach(client => {
            if (client.readyState !== OPEN || !client.hive.hasChunks?.has(wantedChunkIdStr)) return;

            client.send(askClientPayload);
        });

        const wantedChunk: Uint8Array | false = await new Promise(async res => {
            while (validatedChunks[wantedChunkIdStr] === false) {
                await new Promise(t => setTimeout(t, 100));
            }
            res(validatedChunks[wantedChunkIdStr] || false);
        });

        // Chunk validation timed out
        if (!wantedChunk) {
            return;
        }

        clearTimeout(waitChunkDeadline);

        const payload = new Uint8Array(1 + chunk_infos_size + chunk_size);
        payload[0] = enums.client.actions.send_chunk;
        payload.set(wantedChunkId, 1);
        payload.set(wantedChunk, 1 + chunk_id_size);
        

        wsClient.send(payload);

        delete validatedChunks[wantedChunkIdStr];
    }
};