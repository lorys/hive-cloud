import { WebSocket } from '@fastify/websocket';
import { categories, enums } from 'hiveCodes';

const questionsSet = new Set(Object.values(enums.client.questions));

export function isQuestion(type: number) {
    return (type & 0xF0) === categories.client.questions && questionsSet.has(type);
}

export const clientQuestionsHandlers = {
    async [enums.client.questions.total_clients_having_chunk](buffer: Uint8Array, wsClient: WebSocket) {

    },
    async [enums.client.questions.have_space_to_store_file](buffer: Uint8Array, wsClient: WebSocket) {

    }
};