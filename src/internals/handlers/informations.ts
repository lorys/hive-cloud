import { WebSocket } from '@fastify/websocket';
import { tmpHiveInformations } from "../informations";
import { enums } from 'hiveCodes';
import { uint8ArrayToNumber } from '../bitwise';
import { log } from '../..';

export function isInfos(type: number) {
    return type === enums.client.infos;
}

export const clientInfosHandlers = {
    async [enums.client.infos](buffer: Uint8Array, wsClient: WebSocket, allClients: Set<WebSocket>) {
        log("infos");

        if (wsClient.hive.sentInformations) return;
        const stored = uint8ArrayToNumber(buffer.subarray(1, 4));
        const total = uint8ArrayToNumber(buffer.subarray(4));

        if (stored > total) {
            return;
        }

        tmpHiveInformations.totalUsedCapacity += stored;
        wsClient.hive.usedStorage = stored;

        tmpHiveInformations.totalStorageCapacity += total;
        wsClient.hive.totalStorage = total;
        
        wsClient.hive.sentInformations = true;
    }
};