import Fastify from 'fastify'
import { serveStaticFiles } from './serveStaticFiles';
import { handleWebsockets } from './internals/websockets';
import { retrieveAndBroadcastHiveInformations } from './internals/informations';

export const log = (...args: any) => {
  console.log(...args);
};

const fastify = Fastify({
  logger: true
});

handleWebsockets(fastify);

serveStaticFiles(fastify);

fastify.listen({
  host: '0.0.0.0',
  port: 3000
}, (err) => {
  if (err) {
    throw err;
  }
  setInterval(() => {
    retrieveAndBroadcastHiveInformations(fastify);
  }, 1000);
});