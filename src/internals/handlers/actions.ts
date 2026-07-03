import { WebSocket } from '@fastify/websocket';
import { categories, enums } from 'hiveCodes';

const actionsSet = new Set(Object.values(enums.client.actions));

export function isAction(type: number) {
    return (type & 0xF0) === categories.client.actions && actionsSet.has(type);
}

export const clientActionsHandlers = {
    async [enums.client.actions.broadcast_chunk](buffer: Uint8Array, wsClient: WebSocket, allClients: Set<WebSocket>) {

    }
};