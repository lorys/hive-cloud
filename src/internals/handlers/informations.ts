import { codes } from "../codes";
import { tmpHiveInformations } from "../informations";

export function isInfos(type: number) {
    return (type & 0xF0) === codes.client.infos;
}

export const clientInfosHandlers = {
    async [codes.client.infos](buffer: Uint8Array) {
        const stored = (buffer[1]! << 16) + (buffer[2]! << 8) + buffer[3]!;
        console.log(`Client has ${stored} chunks stored.`);
        tmpHiveInformations.totalUsedCapacity += stored;

        const total = (buffer[1]! << 16) + (buffer[2]! << 8) + buffer[3]!;
        console.log(`Client has a total capacity of ${total} chunks.`);
        tmpHiveInformations.totalStorageCapacity += total;
    }
};