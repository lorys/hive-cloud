import { FastifyInstance } from 'fastify'
import websocket from '@fastify/websocket';


export function handleHiveWs(fastify: FastifyInstance) {
    fastify.register(websocket);

    fastify.register(async function (fastify) {
      fastify.get('/hive', { websocket: true }, (socket) => {
            socket.on('message', (message, isBinary) => {
                console.log({
                    message, isBinary
                }, fastify.websocketServer.clients);
            });
        });
    });
}