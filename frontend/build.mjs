import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(root, 'src', 'main.js');
const outfile = path.join(root, '..', 'app', 'static', 'js', 'app.js');

const buildOptions = {
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    legalComments: 'none',
    logLevel: 'info',
};

const watch = process.argv.includes('--watch');

if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log(`Watching ${path.relative(process.cwd(), entry)} → ${path.relative(process.cwd(), outfile)}`);
} else {
    await esbuild.build(buildOptions);
    console.log(`Bundled → ${path.relative(process.cwd(), outfile)}`);
}
