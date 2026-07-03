import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";

const WEBSITE_DIR = join(process.cwd(), "src/website");
const ASSETS_DIR = join(process.cwd(), "assets");
const INDEX_FILE = join(WEBSITE_DIR, "index.html");
const ENGINE_FILE = join(WEBSITE_DIR, "engine.js");

let engineHashCache: { mtimeMs: number; hash: string } | null = null;

async function getEngineVersion(): Promise<string> {
    const { mtimeMs } = await stat(ENGINE_FILE);
    if (engineHashCache?.mtimeMs === mtimeMs) {
        return engineHashCache.hash;
    }
    const content = await readFile(ENGINE_FILE);
    const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
    engineHashCache = { mtimeMs, hash };
    return hash;
}

async function renderIndex(): Promise<string> {
    const [template, version] = await Promise.all([
        readFile(INDEX_FILE, "utf8"),
        getEngineVersion(),
    ]);
    return template.replaceAll("__ENGINE_VERSION__", version);
}

export function serveStaticFiles(fastify: FastifyInstance) {
    const sendIndex = async (_request: FastifyRequest, reply: FastifyReply) => {
        const html = await renderIndex();
        return reply
            .header("Cache-Control", "no-cache")
            .type("text/html; charset=utf-8")
            .send(html);
    };
    fastify.get("/", sendIndex);
    fastify.get("/index.html", sendIndex);

    fastify.register(fastifyStatic, {
        root: WEBSITE_DIR,
        index: false,
        cacheControl: true,
        maxAge: "1y",
        immutable: true,
    });

    fastify.register(fastifyStatic, {
        root: ASSETS_DIR,
        prefix: "/assets/",
        decorateReply: false, // reply.sendFile is already decorated by the first registration
    });
}
