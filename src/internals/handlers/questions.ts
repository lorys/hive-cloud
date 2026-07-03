import { WebSocket } from '@fastify/websocket';
import { categories, enums } from 'hiveCodes';
import { numberToUint8Array, uint8ArrayToNumber } from '../bitwise';

const questionsSet = new Set(Object.values(enums.client.questions));

export function isQuestion(type: number) {
    return (type & 0xF0) === categories.client.questions && questionsSet.has(type);
}

export const clientQuestionsHandlers = {
    async [enums.client.questions.total_clients_having_chunk](buffer: Uint8Array, wsClient: WebSocket, allClients: Set<WebSocket>) {
        const broadcast = new Uint8Array(17);
        broadcast[0] = enums.server.questions.have_chunk;
        broadcast.set(buffer.subarray(1));
        allClients.forEach(client => client.send(broadcast));
        
        // Wait ~1 sec before sending answer so clients have time to answer
        await new Promise(res => setTimeout(res, 1000));
        
        const answer = new Uint8Array(4);
        answer[0] = enums.client.questions.total_clients_having_chunk;
        const chunkId = uint8ArrayToNumber(buffer.subarray(1));
        answer.set(numberToUint8Array([...allClients].filter(client => client.hive.hasChunks.has(chunkId)).length, 3), 1);
        wsClient.send(answer);
    }
};