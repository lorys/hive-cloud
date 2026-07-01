import Fastify from 'fastify'
import websocket from '@fastify/websocket';
import { serveStaticFiles } from './serveStaticFiles';
import { handleHiveWs } from './handleHiveWs';

const fastify = Fastify({
  logger: true
});

handleHiveWs(fastify);

serveStaticFiles(fastify);

fastify.listen({
  port: 3000
});