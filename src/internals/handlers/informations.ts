import { WebSocket } from '@fastify/websocket';
import { tmpHiveInformations } from "../informations";
import { enums } from 'hiveCodes';

export function isInfos(type: number) {
    return type === enums.client.infos;
}

export const clientInfosHandlers = {
    async [enums.client.infos](buffer: Uint8Array, wsClient: WebSocket) {
        if (wsClient.hive.sentInformations) return;

        const stored = (buffer[1]! << 16) + (buffer[2]! << 8) + buffer[3]!;
        console.log(`Client has ${stored} chunks stored.`);
        tmpHiveInformations.totalUsedCapacity += stored;

        const total = (buffer[4]! << 16) + (buffer[5]! << 8) + buffer[6]!;
        console.log(`Client has a total capacity of ${total} chunks.`);
        tmpHiveInformations.totalStorageCapacity += total;
        
        wsClient.hive.sentInformations = true;
    }
};