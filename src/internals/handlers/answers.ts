import { WebSocket } from '@fastify/websocket';
import { categories, enums } from 'hiveCodes';
import { chunkIdToString } from 'commons';
import { relayReceivedChunk } from '../chunksRelay';

const answersSet = new Set(Object.values(enums.server.questions));

export function isAnswer(type: number) {
    return (type & 0xF0) === categories.server.questions && answersSet.has(type);
}

export const clientAnswersHandlers = {
    async [enums.server.questions.have_chunk_and_send](buffer: Uint8Array, _wsClient: WebSocket, _allClients: Set<WebSocket>) {
        relayReceivedChunk(buffer.subarray(1));
    },
    async [enums.server.questions.have_chunk](buffer: Uint8Array, wsClient: WebSocket, _allClients: Set<WebSocket>) {
        const chunkId = chunkIdToString(buffer.subarray(1));
        
        wsClient.hive.hasChunks!.add(chunkId);
    }
};