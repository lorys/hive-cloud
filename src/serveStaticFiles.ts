import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";

/** Resolve a required path env var against cwd, failing fast if it's unset. */
export function envPath(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing env var ${name} (set it in .env.local / .env.production)`);
    }
    return join(process.cwd(), value);
}

const INDEX_FILE = envPath("WEBPAGE_PATH");
const ENGINE_FILE = envPath("ENGINE_PATH");
const ASSETS_DIR = envPath("ASSETS_PATH");

let engineCache: { mtimeMs: number; hash: string; content: Buffer } | null = null;

async function getEngine(): Promise<{ hash: string; content: Buffer }> {
    const { mtimeMs } = await stat(ENGINE_FILE);
    if (engineCache?.mtimeMs === mtimeMs) {
        return engineCache;
    }
    const content = await readFile(ENGINE_FILE);
    const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
    engineCache = { mtimeMs, hash, content };
    return engineCache;
}

async function renderIndex(): Promise<string> {
    const [template, { hash }] = await Promise.all([
        readFile(INDEX_FILE, "utf8"),
        getEngine(),
    ]);
    return template.replaceAll("__ENGINE_VERSION__", hash);
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

    // Explicit route rather than a static mount: in production dist/ is flat, so
    // engine.js sits next to the server bundle (index.js) — a directory mount would
    // expose the server code. The ?v=<hash> query lets us cache it immutably.
    fastify.get("/engine.js", async (_request, reply) => {
        const { content } = await getEngine();
        return reply
            .header("Cache-Control", "public, max-age=31536000, immutable")
            .type("application/javascript; charset=utf-8")
            .send(content);
    });

    fastify.register(fastifyStatic, {
        root: ASSETS_DIR,
        prefix: "/assets/",
    });
}
