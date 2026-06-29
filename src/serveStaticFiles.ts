import { FastifyInstance } from "fastify";
import { readFile } from "node:fs/promises";

const WEBSITE_DIR = process.cwd() + "/src/website";

export function serveStaticFiles(fastify: FastifyInstance) {
    fastify.get('/engine', async (_, reply) => {
        const engineJsFile = await readFile(WEBSITE_DIR + '/engine.js');

        reply.type('text/javascript');
        reply.send(engineJsFile);
    });

    fastify.get('/', async (_, reply) => {
        const engineJsFile = await readFile(WEBSITE_DIR + '/index.html');

        reply.type('text/html; charset=utf-8');
        reply.send(engineJsFile);
    });
}