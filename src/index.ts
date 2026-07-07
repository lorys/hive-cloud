import Fastify from 'fastify'
import { serveStaticFiles } from './serveStaticFiles';
import { handleWebsockets } from './internals/websockets';
import { broadcastHiveInformations } from './internals/informations';

if (!process.env['PORT']) {
  throw "No PORT Env";
}

const fastify = Fastify({
  logger: true
});

handleWebsockets(fastify);

serveStaticFiles(fastify);

fastify.listen({
  host: '0.0.0.0',
  port: parseInt(process.env['PORT']!)
}, (err) => {
  if (err) {
    throw err;
  }
  setInterval(() => {
    broadcastHiveInformations(fastify);
  }, 3000);
});