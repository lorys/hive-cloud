import { WebSocket } from '@fastify/websocket';
import { categories, codes } from "../codes";

const actionsSet = new Set(Object.values(codes.client.actions));

export function isAction(type: number) {
    return (type & 0xF0) === categories.client.actions && actionsSet.has(type);
}

export const clientActionsHandlers = {
    async [codes.client.actions.broadcast_chunk](buffer: Uint8Array, wsClient: WebSocket) {

    }
};