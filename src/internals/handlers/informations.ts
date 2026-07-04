import { WebSocket } from '@fastify/websocket';
import { tmpHiveInformations } from "../informations";
import { enums } from 'hiveCodes';

export function isInfos(type: number) {
    return type === enums.client.infos;
}

export const clientInfosHandlers = {
    async [enums.client.infos](buffer: Uint8Array, wsClient: WebSocket, allClients: Set<WebSocket>) {
        if (wsClient.hive.sentInformations) return;

        const stored = (buffer[1]! << 16) + (buffer[2]! << 8) + buffer[3]!;
        tmpHiveInformations.totalUsedCapacity += stored;

        const total = (buffer[4]! << 16) + (buffer[5]! << 8) + buffer[6]!;
        tmpHiveInformations.totalStorageCapacity += total;
        
        wsClient.hive.sentInformations = true;
    }
};