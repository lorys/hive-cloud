import { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";

const WEBSITE_DIR = join(process.cwd(), "src/website");
const ASSETS_DIR = join(process.cwd(), "assets");

export function serveStaticFiles(fastify: FastifyInstance) {
    // Website root: serves index.html at "/" and engine.js at "/engine.js".
    fastify.register(fastifyStatic, {
        root: WEBSITE_DIR,
    });

    // Assets root, mounted under /assets (logo, banner, ...).
    fastify.register(fastifyStatic, {
        root: ASSETS_DIR,
        prefix: "/assets/",
        decorateReply: false, // reply.sendFile is already decorated by the first registration
    });
}
