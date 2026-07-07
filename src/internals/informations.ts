import { FastifyInstance } from "fastify";
import { OPEN } from "ws";
import { WebSocket } from "@fastify/websocket";
import { enums } from "hiveCodes";
import { numberToUint8Array } from "./bitwise";

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

export async function broadcastHiveInformations(fastify: FastifyInstance) {
    hiveInformations.totalStorageCapacity = tmpHiveInformations.totalStorageCapacity;
    hiveInformations.totalUsedCapacity = tmpHiveInformations.totalUsedCapacity;

    tmpHiveInformations.totalStorageCapacity = 0;
    tmpHiveInformations.totalUsedCapacity = 0;

    const totalConnectedClients = fastify.websocketServer.clients.size;

    fastify.websocketServer.clients.forEach((client) => {
        if (client.readyState !== OPEN) return;

        const payload = new Uint8Array(13);
        payload[0] = enums.server.infos;

        payload.set(numberToUint8Array(hiveInformations.totalStorageCapacity, 4), 1);
        payload.set(numberToUint8Array(hiveInformations.totalUsedCapacity, 4), 5);
        payload.set(numberToUint8Array(totalConnectedClients, 4), 9);

        client.send(payload);
    });

    fastify.websocketServer.clients.forEach(client => {
        (client as WebSocket).hive.sentInformations = false;
    })

};