/**
 * LinkedIn comparison card, 1080×1350 (4:5), in the CAM_04 house style.
 *
 *   node postcard.mjs <card.json> <out.png>
 *
 * card.json:
 * {
 *   "kicker": "State management",            // small signal label on top
 *   "title": "Zustand vs Redux Toolkit",     // display title, wraps to 3 lines
 *   "subtitle": "Same job, very different weight.",
 *   "left":  { "name": "Zustand", "tag": "~1 KB" },
 *   "right": { "name": "Redux Toolkit", "tag": "~13 KB" },
 *   "rows": [                                // 3–7 rows
 *     { "label": "Boilerplate", "left": "Almost none", "right": "Slices + store", "winner": "left" }
 *   ],
 *   "verdict": "Small app: Zustand. Big team with strict flows: RTK."
 * }
 * `winner` is "left", "right" or omitted. Text is English (the brand fonts carry no Arabic).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("usage: node postcard.mjs <card.json> <out.png>");
  process.exit(1);
}
const card = JSON.parse(await fs.readFile(input, "utf8"));

const C = { void: "#000", line: "#1a1d1e", lineStrong: "#2a2f31", bone: "#e8e6e1", ash: "#8a9396", ashDim: "#717a7d", signal: "#47c6ce", deep: "#0e3b42", panel: "#0b0e0f" };
const font = (f) => fontkit.openSync(path.join(here, "fonts", f));
const F = { d: font("HubotSans-Condensed-ExtraBold.ttf"), m: font("MartianMono-SemiCondensed-Regular.ttf"), s: font("MonaSans-Regular.ttf") };
const W = 1080;
const H = 1350;
const n = (v) => String(Math.round(v * 10) / 10);
const missing = new Set();

const defs = new Map();
function run(f, text, size, tracking = 0) {
  const lay = f.layout(text);
  const sc = size / f.unitsPerEm;
  let pen = 0;
  const placed = [];
  lay.glyphs.forEach((g, i) => {
    if (g.id === 0) missing.add(text);
    if (g.path.commands.length) {
      const id = `${f === F.d ? "d" : f === F.m ? "m" : "s"}${g.id}`;
      if (!defs.has(id)) defs.set(id, `<path id="${id}" d="${g.path.toSVG().replace(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g, (x) => String(Math.round(+x)))}"/>`);
      placed.push([id, pen + lay.positions[i].xOffset]);
    }
    pen += lay.positions[i].xAdvance + (i < lay.glyphs.length - 1 ? tracking * f.unitsPerEm : 0);
  });
  return { placed, width: pen * sc, sc };
}
function text(f, str, { x, y, size, fill = C.bone, anchor = "start", tracking = 0, opacity }) {
  const r = run(f, str, size, tracking);
  const x0 = anchor === "end" ? x - r.width : anchor === "middle" ? x - r.width / 2 : x;
  const op = opacity === undefined ? "" : ` opacity="${opacity}"`;
  return {
    width: r.width,
    svg: `<g transform="translate(${n(x0)} ${n(y)}) scale(${r.sc.toFixed(5)} ${(-r.sc).toFixed(5)})" fill="${fill}"${op}>${r.placed.map(([id, px]) => `<use href="#${id}" x="${Math.round(px)}"/>`).join("")}</g>`,
  };
}
const width = (f, str, size, tracking = 0) => run(f, str, size, tracking).width;
const osd = (str, o) => text(F.m, str.toUpperCase(), { tracking: 0.08, fill: C.ash, ...o });
function wrap(f, str, size, max, tracking = 0, upper = false) {
  const lines = [];
  let cur = "";
  for (const w of String(str).split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && width(f, upper ? next.toUpperCase() : next, size, tracking) > max) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
const brackets = (x, y, w, h, l) =>
  `M${n(x)} ${n(y + l)}V${n(y)}H${n(x + l)}M${n(x + w - l)} ${n(y)}H${n(x + w)}V${n(y + l)}M${n(x + w)} ${n(y + h - l)}V${n(y + h)}H${n(x + w - l)}M${n(x + l)} ${n(y + h)}H${n(x)}V${n(y + h - l)}`;

const L = 72;
const R = W - 72;
const body = [];
body.push(
  `<rect width="${W}" height="${H}" fill="${C.void}"/>`,
  `<ellipse cx="${W * 0.15}" cy="${H * 1.02}" rx="${W * 0.7}" ry="${H * 0.36}" fill="url(#glow)"/>`,
  `<ellipse cx="${W * 0.9}" cy="${-H * 0.04}" rx="${W * 0.5}" ry="${H * 0.26}" fill="url(#glow)" opacity=".7"/>`,
);
// still rain
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let drops = "";
for (let i = 0; i < 120; i++) {
  const x = rnd() * W;
  const y = rnd() * H;
  const l = 16 + rnd() * 40;
  drops += `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + l * 0.12)}" y2="${n(y + l)}" opacity="${(0.04 + rnd() * 0.08).toFixed(2)}"/>`;
}
body.push(`<g stroke="${C.bone}" stroke-width="1.2" stroke-linecap="round">${drops}</g>`);

// Top bar: REC, kicker, date.
const date = new Date().toISOString().slice(0, 10);
body.push(`<circle cx="${L + 7}" cy="${80 - 7}" r="7" fill="${C.signal}"/>`);
const rec = osd("REC · CAM_04", { x: L + 24, y: 80, size: 18, fill: C.bone });
body.push(rec.svg, osd(date, { x: R, y: 80, size: 18, anchor: "end", fill: C.ashDim }).svg);
body.push(osd(card.kicker || "Tech", { x: L, y: 150, size: 20, fill: C.signal }).svg);

// Title.
let y = 150;
const ts = card.title.length > 28 ? 84 : 100;
const capH = (F.d.capHeight / F.d.unitsPerEm) * ts;
const tLines = wrap(F.d, card.title, ts, R - L, -0.01, true).slice(0, 3);
tLines.forEach((l, i) => {
  y = 150 + 34 + capH + i * (capH + 14);
  body.push(text(F.d, l.toUpperCase(), { x: L - 3, y, size: ts, tracking: -0.01 }).svg);
});
if (card.subtitle) {
  wrap(F.s, card.subtitle, 30, R - L).slice(0, 2).forEach((l, i) => {
    body.push(text(F.s, l, { x: L, y: y + 58 + i * 42, size: 30, fill: C.bone, opacity: 0.8 }).svg);
  });
  y += 58 + (wrap(F.s, card.subtitle, 30, R - L).slice(0, 2).length - 1) * 42;
}

// Comparison table.
const rows = (card.rows || []).slice(0, 7);
const top = y + 56;
const labelW = 230;
const colW = (R - L - labelW - 24) / 2;
const xLeft = L + labelW + 12;
const xRight = xLeft + colW + 12;
const headH = 92;
const cellSize = rows.length > 5 ? 22 : 24;
const pill = (cx, cy, name, tag, active) => {
  const t = name.toUpperCase();
  const tw = width(F.d, t, 40, -0.01);
  const out = [text(F.d, t, { x: cx, y: cy, size: tw > colW - 30 ? 32 : 40, anchor: "middle", tracking: -0.01, fill: active ? C.signal : C.bone }).svg];
  if (tag) out.push(osd(tag, { x: cx, y: cy + 30, size: 15, anchor: "middle", fill: C.ashDim }).svg);
  return out.join("");
};
const wins = { left: rows.filter((r) => r.winner === "left").length, right: rows.filter((r) => r.winner === "right").length };
body.push(
  `<rect x="${xLeft}" y="${top}" width="${n(colW)}" height="${headH}" rx="16" fill="${C.panel}" stroke="${C.lineStrong}" stroke-width="1.5"/>`,
  `<rect x="${n(xRight)}" y="${top}" width="${n(colW)}" height="${headH}" rx="16" fill="${C.panel}" stroke="${C.lineStrong}" stroke-width="1.5"/>`,
  pill(xLeft + colW / 2, top + 52, card.left.name, card.left.tag, wins.left > wins.right),
  pill(xRight + colW / 2, top + 52, card.right.name, card.right.tag, wins.right > wins.left),
  osd("vs", { x: L + labelW / 2, y: top + 56, size: 22, anchor: "middle", fill: C.ashDim }).svg,
);
let ry = top + headH + 18;
const avail = H - 250 - ry;
const rowH = Math.min(118, avail / Math.max(rows.length, 1));
for (const r of rows) {
  body.push(`<rect x="${L}" y="${n(ry + rowH - 1)}" width="${R - L}" height="1" fill="${C.line}"/>`);
  const lab = wrap(F.m, String(r.label).toUpperCase(), 17, labelW - 10, 0.06).slice(0, 2);
  const mid = ry + rowH / 2;
  lab.forEach((l, i) => body.push(osd(l, { x: L, y: mid + 6 - (lab.length - 1) * 12 + i * 24, size: 17 }).svg));
  for (const [side, x] of [["left", xLeft], ["right", xRight]]) {
    const win = r.winner === side;
    const lines = wrap(F.s, String(r[side]), cellSize, colW - 40).slice(0, 2);
    lines.forEach((l, i) =>
      body.push(text(F.s, l, { x: x + colW / 2, y: mid + 8 - (lines.length - 1) * (cellSize * 0.62) + i * cellSize * 1.24, size: cellSize, anchor: "middle", fill: win ? C.bone : C.bone, opacity: win ? 1 : 0.6 }).svg),
    );
    if (win) body.push(`<path d="${brackets(x + 8, ry + 10, colW - 16, rowH - 20, 14)}" stroke="${C.signal}" stroke-width="3" fill="none"/>`);
  }
  ry += rowH;
}

// Verdict.
if (card.verdict) {
  const vy = H - 210;
  const vl = wrap(F.s, card.verdict, 28, R - L - 64).slice(0, 2);
  const vh = 60 + vl.length * 40;
  body.push(
    `<rect x="${L}" y="${vy}" width="${R - L}" height="${vh}" rx="18" fill="${C.deep}" fill-opacity=".55" stroke="${C.signal}" stroke-opacity=".6" stroke-width="1.5"/>`,
    `<rect x="${L + 24}" y="${vy - 15}" width="${n(width(F.m, "VERDICT", 16, 0.08) + 24)}" height="30" fill="${C.signal}"/>`,
    text(F.m, "VERDICT", { x: L + 36, y: vy + 6, size: 16, tracking: 0.08, fill: C.void }).svg,
    ...vl.map((l, i) => text(F.s, l, { x: L + 32, y: vy + 58 + i * 40, size: 28 }).svg),
  );
}

// Footer.
body.push(
  osd("Moumen Alkamsheh · Full-stack & mobile", { x: L, y: H - 44, size: 16, fill: C.ashDim }).svg,
  osd("moumen-alkamsheh.vercel.app", { x: R, y: H - 44, size: 16, anchor: "end", fill: C.signal }).svg,
  `<path d="${brackets(20, 20, W - 40, H - 40, 30)}" stroke="${C.bone}" stroke-opacity=".28" stroke-width="2" fill="none"/>`,
);

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<defs>${[...defs.values()].join("")}<radialGradient id="glow"><stop offset="0" stop-color="${C.deep}" stop-opacity=".95"/><stop offset=".55" stop-color="${C.deep}" stop-opacity=".35"/><stop offset="1" stop-color="${C.deep}" stop-opacity="0"/></radialGradient></defs>` +
  body.join("") +
  `</svg>`;
await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
await sharp(Buffer.from(svg), { density: 144 }).resize(W, H).flatten({ background: "#000" }).png({ compressionLevel: 9 }).toFile(output);
if (missing.size) console.warn(`! glyphs missing for: ${[...missing].join(" | ")}`);
console.log(`card written: ${output}`);
