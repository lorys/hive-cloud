import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** Client: bundle + minify — it's shipped over the wire to browsers. */
/** @type {import("esbuild").BuildOptions} */
const client = {
    entryPoints: ["src/website/engine/main.ts"],
    bundle: true,
    minify: true,
    sourcemap: true,
    format: "iife",
    target: ["es2022"],
    outfile: "dist/engine.js",
    logLevel: "info",
};

/** Server: bundle only — NO minify. Keep deps external so Fastify's
 *  dynamic plugin loading doesn't break, and stack traces stay readable. */
/** @type {import("esbuild").BuildOptions} */
const server = {
    entryPoints: ["src/index.ts"],
    bundle: true,
    minify: false,
    sourcemap: true,
    platform: "node",
    format: "cjs",          // matches current tsc output (package is CommonJS)
    target: ["node22"],
    packages: "external",   // leave node_modules out of the bundle
    outfile: "dist/index.js",
    logLevel: "info",
};

if (watch) {
    const cctx = await esbuild.context(client);
    const sctx = await esbuild.context(server);
    await Promise.all([cctx.watch(), sctx.watch()]);
    console.log("esbuild: watching client + server…");
} else {
    await Promise.all([esbuild.build(client), esbuild.build(server)]);
}
