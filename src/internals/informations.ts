import { FastifyInstance } from "fastify";
import { OPEN } from "ws";
import { WebSocket } from "@fastify/websocket";
import { enums } from "hiveCodes";

export const hiveInformations = {
    totalStorageCapacity: 0,
    totalUsedCapacity: 0,
    totalConnectedClients: 0
};

export const tmpHiveInformations = {
    totalStorageCapacity: 0,
    totalUsedCapacity: 0,
    totalConnectedClients: 0
};

export async function retrieveAndBroadcastHiveInformations(fastify: FastifyInstance) {
    hiveInformations.totalStorageCapacity = tmpHiveInformations.totalStorageCapacity;
    hiveInformations.totalUsedCapacity = tmpHiveInformations.totalUsedCapacity;

    tmpHiveInformations.totalStorageCapacity = 0;
    tmpHiveInformations.totalUsedCapacity = 0;

    const totalConnectedClients = fastify.websocketServer.clients.size;

    fastify.websocketServer.clients.forEach((client) => {
        if (client.readyState !== OPEN) return;

        const payload = new Uint8Array(13);
        payload[0] = enums.server.infos;

        payload[1] = hiveInformations.totalStorageCapacity >> 24;
        payload[2] = (hiveInformations.totalStorageCapacity & 0x00FF0000) >> 16;
        payload[3] = (hiveInformations.totalStorageCapacity & 0x0000FF00) >> 8;
        payload[4] = hiveInformations.totalStorageCapacity & 0x000000FF;

        payload[5] = hiveInformations.totalUsedCapacity >> 24;
        payload[6] = (hiveInformations.totalUsedCapacity & 0x00FF0000) >> 16;
        payload[7] = (hiveInformations.totalUsedCapacity & 0x0000FF00) >> 8;
        payload[8] = hiveInformations.totalUsedCapacity & 0x000000FF;


        payload[9] = totalConnectedClients >> 24;
        payload[10] = (totalConnectedClients & 0x00FF0000) >> 16;
        payload[11] = (totalConnectedClients & 0x0000FF00) >> 8;
        payload[12] = (totalConnectedClients & 0x000000FF);

        client.send(payload);
    });

    fastify.websocketServer.clients.forEach(client => {
        (client as WebSocket).hive.sentInformations = false;
    })

};