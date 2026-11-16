// Word check for the built site (_site). Run after the build: npm run lint:text
// Checks visible page text, the attributes alt, aria-label and title, JSON-LD, titles and metadata,
// and llms.txt against the word rules of RoomXDynamics (no claims of accuracy or
// measurement, no comfort, health or mould-free claims, no verdict words for walls, no landlord topics).
// Legal pages are excluded: their legal wording ("adequate level of protection", "certified under
// the EU-US Data Privacy Framework") is not a product statement.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SITE = process.argv[2] || "_site";   // a fixture directory for the tests (scripts/lint-text.test.mjs)
const EXCLUDE = ["privacy/", "imprint/", "de/datenschutz/", "de/impressum/"];

// Phrases that contain a blocked word but are allowed (negated or fixed formulas).
// Longer phrases first, so that a shorter allowed phrase does not cut a longer one apart.
const ALLOWED = [
    /replace an? (on-site measurement or an )?expert report/gi, /not a measurement/gi, /not an expert report/gi,
    /on-site measurement/gi, /take measurements\?/gi,
    /ersetzt (keine Messung vor Ort und )?kein Gutachten/gi, /keine Messung/gi, /Messung vor Ort/gi,
    /Ist das eine Messung\?/gi, /kein Gutachten/gi,
    /no comfort rating/gi, /keine Komfortbewertung/gi,
    /does not derive statements about draughts/gi,
    /angelehnt an DIN 4108-2/gi, /DIN 4108-2 convention/gi,
    /\bDRAFT ·/g   // the draft banner while site.json has draft=true (word rule means draughts, not this)
];

const BLOCKED = [
    /\baccurate(ly)?\b/i, /\bexact(ly)?\b/i, /\bprecise(ly)?\b/i, /\bgenau\b/i,
    /\bmeasur(e|es|ed|ing|ement)\b/i, /\bmisst\b/i, /\bMessung\b/i,
    /\bproof\b/i, /\bBeweis\b/i, /\bhealthy?\b/i, /\bgesund\b/i,
    /\bmou?ld[- ]free\b/i, /\bschimmelfrei\b/i, /\bmou?ld (check|test)\b/i, /Schimmel-?(Check|Test)/i,
    /\bexpert report\b/i, /\bGutachten\b/i,
    /DIN-(konform|geprüft|compliant)/i, /\bnormgerecht\b/i, /\bcertified\b/i, /\bvalidated\b/i,
    /\bcomfort\b/i, /\bKomfort/i, /\bfelt\b/i, /\bfeels\b/i, /\bdraughts?\b/i, /\bdrafts?\b/i,
    /\benergy\b/i, /\bsaves?\b/i, /\bcost\b/i, /\befficien/i,
    /\blandlord\b/i, /\btenants?\b/i, /\brent\b/i, /\bVermieter/i, /\bMieter/i,
    /\bfault\b/i, /\bdefect/i, /\bdeficien/i, /\bviolation\b/i, /\bMangel\b/i, /\bmangelhaft\b/i, /\bVerstoß\b/i,
    /\b(in)?sufficient\b/i, /\b(in)?adequate\b/i, /\bpassed\b/i, /\bpass\/fail\b/i, /\bfail(ed|s)?\b/i, /\bcompliant\b/i,
    /\bOK\b/, /\bsafe\b/i, /\bausreichend\b/i, /\bunzureichend\b/i, /Mindestwärmeschutz/i,
    /\bstreamlines?\b/i, /\breal[- ]time\b/i, /\bgood approximation\b/i,
    /\bDIN\b/,   // anything left after the two fixed formulas were removed is a free-standing "DIN"
    // never call the model simple; compounds like "Einfachverglasung" stay allowed
    /\b(simple|simply|simplif\w*|simplistic|basic)\b/i,
    /(?<![\p{L}])(einfach(e[mnrs]?)?|vereinfach\p{L}*|Vereinfachung\p{L}*)(?![\p{L}])/iu
];

function files(dir) {
    return readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) return files(p);
        return p.endsWith(".html") || p.endsWith("llms.txt") ? [p] : [];
    });
}

// Normalize protected spaces and non-breaking hyphens first, so the fixed DIN formulas and the
// blocked forms are recognized however they are typeset.
const norm = (t) => t.replace(/&nbsp;/g, " ").replace(/[  ]/g, " ").replace(/‑/g, "-");
const strip = (t) => t.replace(/<[^>]+>/g, " ");

// Titles, metadata and headings: full word rule, and never "DIN", not even in the fixed formula.
function metaText(html) {
    const parts = [];
    for (const m of html.matchAll(/<title>([\s\S]*?)<\/title>/gi)) parts.push(m[1]);
    for (const m of html.matchAll(/<meta[^>]+content="([^"]*)"/gi)) parts.push(m[1]);
    for (const m of html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)) parts.push(strip(m[1]));
    return parts.join(" \n ");
}

// Structured data (JSON-LD) is metadata as well: full word rule, never "DIN".
function jsonLdText(html) {
    return [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
        .map((m) => m[1]).join(" \n ");
}

// alt, aria-label and title attributes: full word rule, the fixed DIN formulas are allowed as in the text.
function attrText(html) {
    return [...html.matchAll(/\s(?:alt|aria-label|title)="([^"]*)"/gi)].map((m) => m[1]).join(" \n ");
}

function visibleText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ");
}

let problems = 0;
function check(rel, where, raw, dinNever) {
    let text = norm(raw).replace(/\s+/g, " ");
    if (dinNever) {
        const d = text.match(/\bDIN\b/g);
        if (d) { problems += d.length; console.log(`${rel} [${where}]: DIN in title, metadata, heading, JSON-LD or llms.txt`); }
    }
    for (const a of ALLOWED) text = text.replace(a, " ");
    for (const b of BLOCKED) {
        if (dinNever && b.source === "\\bDIN\\b") continue;   // already counted above
        const m = text.match(new RegExp(b.source, b.flags.includes("g") ? b.flags : b.flags + "g"));
        if (m) { problems += m.length; console.log(`${rel} [${where}]: ${[...new Set(m)].join(", ")}`); }
    }
}

for (const f of files(SITE)) {
    const rel = f.slice(SITE.length + 1);
    if (EXCLUDE.some((e) => rel.startsWith(e))) continue;
    const content = readFileSync(f, "utf8");
    if (rel.endsWith("llms.txt")) { check(rel, "llms.txt", content, true); continue; }
    check(rel, "text", visibleText(content), false);
    check(rel, "attributes", attrText(content), false);
    check(rel, "meta", metaText(content), true);
    check(rel, "json-ld", jsonLdText(content), true);
}
console.log(problems ? `lint:text: ${problems} finding(s)` : "lint:text: clean");
process.exit(problems ? 1 : 0);
