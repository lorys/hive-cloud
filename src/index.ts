import Fastify from 'fastify'
import websocket from '@fastify/websocket';
import { serveStaticFiles } from './serveStaticFiles';

const fastify = Fastify({
  logger: true
});

fastify.register(websocket);

fastify.register(async function (fastify) {
  fastify.get('/hive', { websocket: true }, (socket, req) => {
    socket.on('message', (message, isBinary) => {
      
    })
  })
});

serveStaticFiles(fastify);

fastify.listen({
  port: 3000
});