import { FastifyInstance } from 'fastify'
import websocket, { WebSocket } from '@fastify/websocket';
import { routeWs } from './router';
import { chunk_infos_size, chunk_size } from 'hiveCodes';
import { log } from '..';

export function handleWebsockets(fastify: FastifyInstance) {
    fastify.register(websocket, {
        options: {
            maxPayload: 1 + chunk_infos_size + chunk_size
        } 
    });

    fastify.register(async function (fastify) {
        fastify.get('/hive', { websocket: true }, (socket) => {
            log("Device connected");
            socket.hive = {
                sentInformations: false,
                hasChunks: new Set()
            };

            socket.on('message', async (buffer: Buffer) => {
                if (!(buffer instanceof Buffer)) {
                    console.log("not binary", buffer);
                    return;
                }

                await routeWs(buffer, socket, fastify.websocketServer.clients as Set<WebSocket>);
            });
        });
    });
}