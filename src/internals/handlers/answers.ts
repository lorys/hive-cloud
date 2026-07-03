import { WebSocket } from '@fastify/websocket';
import { categories, codes } from "../codes";

const answersSet = new Set(Object.values(codes.server.questions));

export function isAnswer(type: number) {
    return (type & 0xF0) === categories.server.questions && answersSet.has(type);
}

export const clientAnswersHandlers = {
    async [codes.server.questions.have_chunk_and_send](buffer: Uint8Array, wsClient: WebSocket) {
        
    },
    async [codes.server.questions.have_chunk](buffer: Uint8Array, wsClient: WebSocket) {
        
    }
};