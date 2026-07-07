import { WebSocket } from '@fastify/websocket';
import { categories, chunk_id_size, enums } from 'hiveCodes';
import { numberToUint8Array } from '../bitwise';
import { chunkIdToString } from 'commons';

const questionsSet = new Set(Object.values(enums.client.questions));

export function isQuestion(type: number) {
    return (type & 0xF0) === categories.client.questions && questionsSet.has(type);
}

export const clientQuestionsHandlers = {
    async [enums.client.questions.total_clients_having_chunk](buffer: Uint8Array, wsClient: WebSocket, allClients: Set<WebSocket>) {

        const broadcast = new Uint8Array(1 + chunk_id_size);
        broadcast[0] = enums.server.questions.have_chunk;
        broadcast.set(buffer.subarray(1), 1);
        
        allClients.forEach(client => client.send(broadcast));
        
        // Wait ~3 sec before sending answer so clients have time to answer
        await new Promise(res => setTimeout(res, 500));
        
        const chunkId = chunkIdToString(buffer.subarray(1));
        const answer = new Uint8Array(1 + chunk_id_size + 3);
        answer[0] = enums.client.questions.total_clients_having_chunk;
        answer.set(buffer.subarray(1), 1);
        answer.set(numberToUint8Array([...allClients].filter(client => client?.hive?.hasChunks?.has(chunkId)).length, 3), 1 + chunk_id_size);

        wsClient.send(answer);
    }
};