import { FastifyInstance } from "fastify";

export const hiveInformations = {
    totalStorageCapacity: 0,
    totalUsedCapacity: 0,
    totalConnectedClients: 0
};

export async function broadcastHiveInformations(fastify: FastifyInstance) {
    fastify.websocketServer.clients.forEach((client) => {
        const payload = new Uint8Array(13);
        payload[0] = 5;

        payload[1] = hiveInformations.totalStorageCapacity >> 24;
        payload[2] = (hiveInformations.totalStorageCapacity & 0x00FF0000) >> 16;
        payload[3] = (hiveInformations.totalStorageCapacity & 0x0000FF00) >> 8;
        payload[4] = hiveInformations.totalStorageCapacity & 0x000000FF;

        payload[5] = hiveInformations.totalUsedCapacity >> 24;
        payload[6] = (hiveInformations.totalUsedCapacity & 0x00FF0000) >> 16;
        payload[7] = (hiveInformations.totalUsedCapacity & 0x0000FF00) >> 8;
        payload[8] = hiveInformations.totalUsedCapacity & 0x000000FF;

        payload[9] = hiveInformations.totalConnectedClients >> 24;
        payload[10] = (hiveInformations.totalConnectedClients & 0x00FF0000) >> 16;
        payload[11] = (hiveInformations.totalConnectedClients & 0x0000FF00) >> 8;
        payload[12] = (hiveInformations.totalConnectedClients & 0x000000FF);

        client.send(payload);
    });
};