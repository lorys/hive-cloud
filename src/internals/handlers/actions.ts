import { WebSocket } from '@fastify/websocket';
import { categories, chunk_start_redundancy, enums } from 'hiveCodes';

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
        
        const start = Date.now();
        allClients.forEach(client => {
            if (askedTo > chunk_start_redundancy) return;
            
            const clientHasCapacity = ((client.hive.totalStorage || 0) - (client.hive.usedStorage || 0)) > 0;
            if (!clientHasCapacity) return;

            client.send(payload);
            askedTo++;
        });
    }
};