import Fastify from 'fastify'
import { serveStaticFiles } from './serveStaticFiles';
import { handleWebsockets } from './internals/websockets';
import { retrieveAndBroadcastHiveInformations } from './internals/informations';

const fastify = Fastify({
  logger: true
});

handleWebsockets(fastify);

serveStaticFiles(fastify);

fastify.listen({
  port: 3000
}, (err) => {
  setInterval(() => {
    retrieveAndBroadcastHiveInformations(fastify);
  }, 1000);
});