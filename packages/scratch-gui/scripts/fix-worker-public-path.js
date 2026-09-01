#!/usr/bin/env node
// Workaround for a webpack 5 gap: `new Worker(new URL('./x.worker', import.meta.url))`
// generates its own *nested* webpack runtime for resolving the worker chunk's URL
// (workers have no `document`, so the normal `output.publicPath` — even 'auto' — doesn't
// reach it), and that nested runtime's `.p` is hardcoded to "/" regardless of the outer
// bundle's publicPath config. That breaks worker-chunk loading (e.g. scratch-storage's
// fetch-worker) for any consumer not served from their own domain root — like us, loading
// this bundle from GitHub Pages into the student portal's own domain.
//
// This patches every nested-runtime publicPath in the built file to the same absolute
// URL passed via SPARKLAB_PUBLIC_PATH (see webpack.config.js's distStandaloneConfig).
// Run after `build:dist-standalone`, before publishing dist/.
const fs = require('fs');
const path = require('path');

const target = process.env.SPARKLAB_PUBLIC_PATH;
if (!target) {
    console.log('fix-worker-public-path: SPARKLAB_PUBLIC_PATH not set, skipping (nothing to patch for generic/local builds).');
    process.exit(0);
}

const file = path.join(__dirname, '..', 'dist', 'scratch-gui-standalone.js');
let code = fs.readFileSync(file, 'utf8');

const pattern = /(__nested_webpack_require_\d+__\.p=)"\/"/g;
const matches = code.match(pattern) || [];
if (matches.length === 0) {
    console.warn('fix-worker-public-path: no nested worker runtime publicPath found — either already fixed upstream, or this needs re-checking against the current build output.');
    process.exit(0);
}

code = code.replace(pattern, `$1"${target}"`);
fs.writeFileSync(file, code);
console.log(`fix-worker-public-path: patched ${matches.length} nested worker runtime publicPath(s) to ${target}`);
