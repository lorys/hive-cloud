import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const options = {
    entryPoints: ["src/website/engine/main.ts"],
    bundle: true,
    minify: true,
    sourcemap: true,
    format: "iife",
    target: ["es2022"],
    outfile: "src/website/engine.js",
    logLevel: "info",
};

if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log("esbuild: watching client bundle…");
} else {
    await esbuild.build(options);
}
