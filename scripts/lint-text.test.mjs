// Tests for scripts/lint-text.mjs: npm run test:lint
// Each case builds a small fixture site in a temporary folder and runs the linter on it.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const page = ({ title = "Method", head = "", body = "<p>A qualitative simulation.</p>" } = {}) =>
    `<!doctype html><html><head><title>${title}</title>${head}</head><body>${body}</body></html>`;

const cases = [
    // [name, files, expected exit code, text expected in the output]
    ["clean page", { "x/index.html": page() }, 0, "clean"],
    ["fixed formula in text, with protected characters", { "x/index.html": page({ body: "<p>Wall: DIN 4108‑2 convention, angelehnt an DIN 4108-2.</p>" }) }, 0, "clean"],
    ["free-standing DIN in text", { "x/index.html": page({ body: "<p>Based on DIN.</p>" }) }, 1, "[text]: DIN"],
    ["DIN in the title", { "x/index.html": page({ title: "DIN 4108-2 convention" }) }, 1, "[meta]"],
    // 1 · llms.txt
    ["llms.txt clean", { "llms.txt": "# RoomXDynamics\n- A qualitative simulation. It is not a measurement and not an expert report.\n" }, 0, "clean"],
    ["llms.txt blocked word", { "llms.txt": "- Accurate room climate.\n" }, 1, "[llms.txt]: Accurate"],
    ["llms.txt DIN even in the formula", { "llms.txt": "- Wall: DIN 4108-2 convention.\n" }, 1, "[llms.txt]: DIN"],
    // 2 · JSON-LD
    ["JSON-LD clean", { "x/index.html": page({ head: '<script type="application/ld+json">{"description":"A qualitative simulation. Not a measurement, not an expert report."}</script>' }) }, 0, "clean"],
    ["JSON-LD blocked word", { "x/index.html": page({ head: '<script type="application/ld+json">{"description":"Healthy room air."}</script>' }) }, 1, "[json-ld]: Healthy"],
    ["JSON-LD DIN", { "x/index.html": page({ head: '<script type="application/ld+json">{"keywords":"DIN 4108-2 convention"}</script>' }) }, 1, "[json-ld]: DIN"],
    // 3 · alt, aria-label, title
    ["alt blocked word", { "x/index.html": page({ body: '<img src="a.png" alt="Mould-free wall">' }) }, 1, "[attributes]: Mould-free"],
    ["aria-label blocked word", { "x/index.html": page({ body: '<a href="/" aria-label="Exact values">x</a>' }) }, 1, "[attributes]: Exact"],
    ["title attribute blocked word", { "x/index.html": page({ body: '<abbr title="landlord check">x</abbr>' }) }, 1, "[attributes]: landlord"],
    // 4 · never call the model simple
    ["simple in text", { "x/index.html": page({ body: "<p>A simple model of the room.</p>" }) }, 1, "[text]: simple"],
    ["simplified in llms.txt", { "llms.txt": "- A simplified picture.\n" }, 1, "[llms.txt]: simplified"],
    ["basic in meta", { "x/index.html": page({ head: '<meta name="description" content="A basic simulation.">' }) }, 1, "[meta]: basic"],
    ["einfaches in text", { "x/index.html": page({ body: "<p>Ein einfaches Modell.</p>" }) }, 1, "[text]: einfaches"],
    ["vereinfacht in alt", { "x/index.html": page({ body: '<img src="a.png" alt="Vereinfachtes Bild">' }) }, 1, "[attributes]: Vereinfachtes"],
    ["Vereinfachung in JSON-LD", { "x/index.html": page({ head: '<script type="application/ld+json">{"description":"Eine Vereinfachung."}</script>' }) }, 1, "[json-ld]: Vereinfachung"],
    ["Einfachverglasung allowed", { "x/index.html": page({ body: "<p>Einfachverglasung und Einfachglas.</p>" }) }, 0, "clean"],
    ["attribute with fixed formula", { "x/index.html": page({ body: '<img src="a.png" alt="Wall badge: DIN 4108-2 convention">' }) }, 0, "clean"],
];

let failed = 0;
for (const [name, fs, code, expect] of cases) {
    const dir = mkdtempSync(join(tmpdir(), "rx-lint-"));
    for (const [p, c] of Object.entries(fs)) {
        mkdirSync(join(dir, p, ".."), { recursive: true });
        writeFileSync(join(dir, p), c);
    }
    const r = spawnSync(process.execPath, [new URL("./lint-text.mjs", import.meta.url).pathname, dir], { encoding: "utf8" });
    rmSync(dir, { recursive: true, force: true });
    const ok = r.status === code && r.stdout.includes(expect);
    if (!ok) { failed++; console.log(`FAIL ${name}: exit ${r.status}, expected ${code} with "${expect}"\n${r.stdout}`); }
    else console.log(`ok   ${name}`);
}
console.log(failed ? `test:lint: ${failed} failed` : `test:lint: ${cases.length} passed`);
process.exit(failed ? 1 : 0);
