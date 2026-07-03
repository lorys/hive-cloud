import { FastifyInstance } from 'fastify'
import websocket, { WebSocket } from '@fastify/websocket';
import { routeWs } from './router';

export function handleWebsockets(fastify: FastifyInstance) {
    fastify.register(websocket, {
        options: {
            maxPayload: 1048608
        } 
    });

    fastify.register(async function (fastify) {
        fastify.get('/hive', { websocket: true }, (socket) => {

            socket.hive = {
                sentInformations: false,
                hasChunks: new Set()
            };

            socket.on('message', async (buffer: Buffer, isBinary) => {
                if (!(buffer instanceof Buffer)) {
                    console.log("not binary", buffer);
                    return;
                }

                await routeWs(buffer, socket, fastify.websocketServer.clients as Set<WebSocket>);
            });
        });
    });
}