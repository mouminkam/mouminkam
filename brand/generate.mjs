#!/usr/bin/env node
/**
 * CAM_04 — the house style for github.com/mouminkam.
 *
 * Draws every banner, feed, panel and button as a self-contained SVG:
 * type is converted to outlines from the portfolio's own fonts (Hubot Sans,
 * Mona Sans, Martian Mono), screenshots are embedded, motion is plain CSS
 * that stops under prefers-reduced-motion. Nothing loads at view time, so
 * GitHub shows exactly what was drawn here. Output is deterministic: the
 * same inputs always produce byte-identical files.
 *
 *   node generate.mjs                → ../assets             (profile README)
 *   node generate.mjs --repos <dir>  → <dir>/<repo>/.github/assets for every repo in data.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";
import sharp from "sharp";
import { person, feeds, repos, stack, apiLog } from "./data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const at = (...p) => path.join(here, ...p);

/* ---------------------------------------------------------------- tokens */

/** Same values as the portfolio's @theme block. */
const C = {
  void: "#000000",
  line: "#1a1d1e",
  lineStrong: "#2a2f31",
  bone: "#e8e6e1",
  ash: "#8a9396",
  ashDim: "#717a7d",
  signal: "#47c6ce",
  signalDeep: "#0e3b42",
};

const face = (key, file) => ({ key, font: fontkit.openSync(at("fonts", file)) });
const F = {
  display: face("d", "HubotSans-Condensed-ExtraBold.ttf"),
  mono: face("m", "MartianMono-SemiCondensed-Regular.ttf"),
  sans: face("s", "MonaSans-Regular.ttf"),
};

const W = 1600; // every full-width asset shares one width, so type renders at one scale on GitHub
const G = 84; // gutter

/* --------------------------------------------------------------- helpers */

/** Strings that hit a glyph the font doesn't have; reported at the end of the build. */
const MISSING = new Set();

const n = (v) => String(Math.round(v * 10) / 10);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Collects glyph outlines once per document; text places them with <use>. */
class Book {
  defs = new Map();

  #id(f, glyph) {
    const id = `${f.key}${glyph.id}`;
    if (!this.defs.has(id)) {
      const d = glyph.path.toSVG().replace(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g, (m) => String(Math.round(Number(m))));
      this.defs.set(id, `<path id="${id}" d="${d}"/>`);
    }
    return id;
  }

  /** Glyph ids with pen positions in font units, plus the advance in px. */
  run(f, text, size, tracking = 0) {
    const { font } = f;
    const layout = font.layout(text);
    const track = tracking * font.unitsPerEm;
    const placed = [];
    let pen = 0;
    layout.glyphs.forEach((g, i) => {
      if (g.id === 0) MISSING.add(text);
      if (g.path.commands.length) placed.push([this.#id(f, g), pen + layout.positions[i].xOffset]);
      pen += layout.positions[i].xAdvance + (i < layout.glyphs.length - 1 ? track : 0);
    });
    return { placed, width: (pen * size) / font.unitsPerEm, scale: size / font.unitsPerEm };
  }

  width(f, text, size, tracking = 0) {
    return this.run(f, text, size, tracking).width;
  }

  /** Text as outlines; y is the baseline. */
  text(f, text, { x = 0, y = 0, size, tracking = 0, anchor = "start", fill = C.bone, opacity, attrs = "" }) {
    const { placed, width, scale } = this.run(f, text, size, tracking);
    const x0 = anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
    const uses = placed.map(([id, px]) => `<use href="#${id}" x="${Math.round(px)}"/>`).join("");
    const op = opacity === undefined ? "" : ` opacity="${opacity}"`;
    return {
      width,
      x: x0,
      svg: `<g transform="translate(${n(x0)} ${n(y)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" fill="${fill}"${op}${attrs}>${uses}</g>`,
    };
  }

  get svg() {
    return [...this.defs.values()].join("");
  }
}

/** On-screen-display type: Martian Mono, uppercase, open tracking. */
const osd = (book, text, o) => book.text(F.mono, text.toUpperCase(), { tracking: 0.08, fill: C.ash, ...o });
const osdWidth = (book, text, size) => book.width(F.mono, text.toUpperCase(), size, 0.08);
/** Display type: Hubot Sans Condensed ExtraBold, uppercase. */
const display = (book, text, o) => book.text(F.display, text.toUpperCase(), { tracking: -0.01, fill: C.bone, ...o });

const brackets = (x, y, w, h, len) =>
  `M${n(x)} ${n(y + len)}V${n(y)}H${n(x + len)}` +
  `M${n(x + w - len)} ${n(y)}H${n(x + w)}V${n(y + len)}` +
  `M${n(x + w)} ${n(y + h - len)}V${n(y + h)}H${n(x + w - len)}` +
  `M${n(x + len)} ${n(y + h)}H${n(x)}V${n(y + h - len)}`;

const dot = (cx, cy, r, fill = C.signal) => `<circle class="blink" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"/>`;

const icons = {
  play: (x, y, s, c) => `<path d="M${n(x + s * 0.12)} ${n(y)}l${n(s * 0.8)} ${n(s / 2)}l${n(-s * 0.8)} ${n(s / 2)}z" fill="${c}"/>`,
  arrow: (x, y, s, c) =>
    `<path d="M${n(x + s * 0.1)} ${n(y + s * 0.9)}L${n(x + s * 0.9)} ${n(y + s * 0.1)}M${n(x + s * 0.32)} ${n(y + s * 0.1)}H${n(x + s * 0.9)}V${n(y + s * 0.68)}" stroke="${c}" stroke-width="${n(s * 0.14)}" fill="none"/>`,
  down: (x, y, s, c) =>
    `<path d="M${n(x + s / 2)} ${n(y)}V${n(y + s * 0.9)}M${n(x + s * 0.14)} ${n(y + s * 0.54)}L${n(x + s / 2)} ${n(y + s * 0.9)}L${n(x + s * 0.86)} ${n(y + s * 0.54)}" stroke="${c}" stroke-width="${n(s * 0.14)}" fill="none"/>`,
  back: (x, y, s, c) =>
    `<path d="M${n(x + s * 0.9)} ${n(y + s / 2)}H${n(x + s * 0.1)}M${n(x + s * 0.46)} ${n(y + s * 0.14)}L${n(x + s * 0.1)} ${n(y + s / 2)}L${n(x + s * 0.46)} ${n(y + s * 0.86)}" stroke="${c}" stroke-width="${n(s * 0.14)}" fill="none"/>`,
};

/* ---------------------------------------------------------------- motion */

const BASE_CSS =
  ".blink{animation:blink 1.6s steps(2,jump-none) infinite}@keyframes blink{50%{opacity:0}}" +
  ".lock{transform-box:fill-box;transform-origin:center;animation:lock .7s cubic-bezier(.16,1,.3,1) both}" +
  "@keyframes lock{from{opacity:0;transform:scale(1.18)}}" +
  ".chip{animation:chip .3s ease both}@keyframes chip{from{opacity:0}}" +
  "@media (prefers-reduced-motion:reduce){*{animation:none!important}}";

/** A document: outlines are gathered while the body is built, then emitted once in <defs>. */
function doc({ w = W, h, title, desc, book, css = "", defs = "", body }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="title desc">` +
    `<title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>` +
    `<style>${BASE_CSS}${css}</style><defs>${book.svg}${defs}</defs>${body}</svg>\n`
  );
}

/** HH:MM:SS:FF. Minutes, seconds and frames are clipped strips that step through their values. */
function timecode(book, { x, y, size, fill = C.bone, anchor = "start", id }) {
  const tr = 0.08;
  const step = book.width(F.mono, "0", size) + tr * size;
  const full = step * 11 - tr * size;
  const x0 = anchor === "end" ? x - full : anchor === "middle" ? x - full / 2 : x;
  const pitch = Math.round(size * 1.6);
  const svg = [
    book.text(F.mono, "00:", { x: x0, y, size, tracking: tr, fill }).svg,
    book.text(F.mono, ":", { x: x0 + 5 * step, y, size, fill }).svg,
    book.text(F.mono, ":", { x: x0 + 8 * step, y, size, fill }).svg,
  ];
  const defs = [];
  const css = [];
  for (const [col, count, secs] of [
    [3, 60, 3600],
    [6, 60, 60],
    [9, 25, 1],
  ]) {
    const clip = `${id}tc${col}`;
    const anim = `tc${count}s${secs}p${pitch}`;
    defs.push(
      `<clipPath id="${clip}"><rect x="${n(x0 + col * step - 2)}" y="${n(y - size)}" width="${n(2 * step + 2)}" height="${n(size * 1.3)}"/></clipPath>`,
    );
    const { scale } = book.run(F.mono, "00", size, tr);
    let uses = "";
    for (let v = 0; v < count; v++) {
      const { placed } = book.run(F.mono, String(v).padStart(2, "0"), size, tr);
      const fy = Math.round((-v * pitch) / scale);
      for (const [gid, px] of placed) uses += `<use href="#${gid}" x="${Math.round(px)}" y="${fy}"/>`;
    }
    svg.push(
      `<g clip-path="url(#${clip})"><g class="${anim}"><g transform="translate(${n(x0 + col * step)} ${n(y)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" fill="${fill}">${uses}</g></g></g>`,
    );
    css.push(`.${anim}{animation:${anim} ${secs}s steps(${count}) infinite}@keyframes ${anim}{to{transform:translateY(-${count * pitch}px)}}`);
  }
  return { svg: svg.join(""), defs: defs.join(""), css: [...new Set(css)].join(""), width: full };
}

/** ● REC 00:00:00:00, as one unit. */
function recRow(book, { x, y, size, anchor = "start", id, tail }) {
  const gap = size * 0.6;
  const r = size * 0.24;
  const recW = osdWidth(book, "REC", size);
  const tcW = timecode(new Book(), { x: 0, y: 0, size, id: "probe" }).width;
  const tailW = tail ? gap + osdWidth(book, tail, size) : 0;
  const total = 2 * r + gap + recW + gap + tcW + tailW;
  let cx = anchor === "end" ? x - total : anchor === "middle" ? x - total / 2 : x;
  const parts = [dot(cx + r, y - size * 0.4, r)];
  cx += 2 * r + gap;
  parts.push(osd(book, "REC", { x: cx, y, size, fill: C.bone }).svg);
  cx += recW + gap;
  const tc = timecode(book, { x: cx, y, size, id });
  parts.push(tc.svg);
  cx += tcW + gap;
  if (tail) parts.push(osd(book, tail, { x: cx, y, size, fill: C.ashDim }).svg);
  return { svg: parts.join(""), defs: tc.defs, css: tc.css, width: total };
}

/** Rain: deterministic streaks falling through the frame. */
function rain({ w, h, count, seed, len = [30, 90], opacity = [0.06, 0.18], speed = [0.55, 1.05], slant = 0.12, color = C.bone, width = 1.2 }) {
  const rnd = mulberry32(seed);
  const span = ([a, b]) => a + (b - a) * rnd();
  let lines = "";
  for (let i = 0; i < count; i++) {
    const x = -w * slant + (w * (1 + slant) * (i + rnd())) / count;
    const l = span(len);
    lines +=
      `<line x1="${n(x)}" y1="${n(-l)}" x2="${n(x + l * slant)}" y2="0" opacity="${span(opacity).toFixed(2)}" ` +
      `style="animation-duration:${span(speed).toFixed(2)}s;animation-delay:-${(rnd() * 2).toFixed(2)}s"/>`;
  }
  return {
    css: `.rain line{animation:fall linear infinite}@keyframes fall{to{transform:translate(${n((h + 120) * slant)}px,${n(h + 120)}px)}}`,
    svg: `<g class="rain" stroke="${color}" stroke-width="${width}" stroke-linecap="round">${lines}</g>`,
  };
}

const grainDef = `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .9 -.4"/></filter>`;
const vignetteDef = `<radialGradient id="vignette" cx="50%" cy="50%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></radialGradient>`;
const scanDef = `<linearGradient id="scanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.signal}" stop-opacity="0"/><stop offset="1" stop-color="${C.signal}" stop-opacity=".14"/></linearGradient>`;
const scan = (w, h, secs = 8) => ({
  css: `.scan{animation:scan ${secs}s linear infinite}@keyframes scan{to{transform:translateY(${h + 80}px)}}`,
  svg: `<g class="scan"><rect y="-70" width="${w}" height="68" fill="url(#scanG)"/><rect y="-2" width="${w}" height="2" fill="${C.signal}" opacity=".3"/></g>`,
});

/** YOLO-style detection: four corner brackets that lock on, then a label chip — the portfolio's DetectionBox. */
function detection(book, { x, y, w, h, label, score, tone = "signal", delay = 0, size = 24, len = 32, sw = 3, chipAt = "top" }) {
  const color = tone === "signal" ? C.signal : C.bone;
  const text = `${label} ${score.toFixed(2)}`;
  const tw = book.width(F.mono, text, size, 0.06);
  const px = size * 0.42;
  const ch = size * 1.5;
  const cw = tw + 2 * px;
  // "top" sits on the box edge like the portfolio; "right" tucks inside, for boxes stacked tightly.
  const cx = chipAt === "right" ? x + w - cw - len * 0.6 : x - sw / 2;
  const cy = chipAt === "right" ? y + (h - ch) / 2 : y - sw / 2 - ch;
  const t = book.text(F.mono, text, { x: cx + px, y: cy + ch * 0.73, size, tracking: 0.06, fill: C.void });
  return (
    `<g${tone === "signal" ? "" : ' opacity=".5"'}>` +
    `<path class="lock" style="animation-delay:${delay.toFixed(2)}s" d="${brackets(x, y, w, h, len)}" stroke="${color}" stroke-width="${sw}" fill="none"/>` +
    `<g class="chip" style="animation-delay:${(delay + 0.35).toFixed(2)}s"><rect x="${n(cx)}" y="${n(cy)}" width="${n(cw)}" height="${n(ch)}" fill="${color}"/>${t.svg}</g>` +
    `</g>`
  );
}

/** Wrap a list of short items into lines no wider than `max`, joined by a middle dot. */
function wrapItems(book, items, size, max) {
  const lines = [];
  let current = [];
  for (const item of items) {
    const next = [...current, item];
    if (current.length && osdWidth(book, next.join(" · "), size) > max) {
      lines.push(current);
      current = [item];
    } else current = next;
  }
  if (current.length) lines.push(current);
  return lines;
}

/** One line of items: bone labels, ash separators. */
function itemLine(book, items, { x, y, size, anchor = "start" }) {
  const sep = osdWidth(book, " · ", size);
  const total = osdWidth(book, items.join(" · "), size);
  let cx = anchor === "end" ? x - total : x;
  const out = [];
  items.forEach((item, i) => {
    const t = osd(book, item, { x: cx, y, size, fill: C.bone });
    out.push(t.svg);
    cx += t.width;
    if (i < items.length - 1) {
      out.push(osd(book, " · ", { x: cx, y, size, fill: C.ashDim }).svg);
      cx += sep;
    }
  });
  return out.join("");
}

/** JPEG, not WebP: every SVG renderer (browsers, GitHub's mobile apps, librsvg) decodes it inside an <image>. */
async function screenshot(file, width) {
  const buf = await sharp(at("screenshots", file))
    .resize(width, Math.round(width * 0.625))
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

/* ------------------------------------------------------------ the header */

function header() {
  const H = 800;
  const book = new Book();
  const css = [];
  const defs = [grainDef, vignetteDef, scanDef];
  const body = [];

  defs.push(
    `<filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="26"/></filter>`,
    `<filter id="haze" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="64"/></filter>`,
    `<filter id="halo" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="22"/></filter>`,
    `<filter id="wet" x="-5%" y="-10%" width="110%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>`,
  );

  // Night street, abstracted: blurred neon signage, bokeh, a wet glow on the ground.
  body.push(
    `<rect width="${W}" height="${H}" fill="${C.void}"/>`,
    `<g filter="url(#haze)"><ellipse cx="${W / 2}" cy="${H + 70}" rx="${W * 0.62}" ry="190" fill="${C.signalDeep}"/></g>`,
    `<g filter="url(#soft)">` +
      `<rect x="1352" y="96" width="58" height="286" rx="12" fill="${C.signal}" opacity=".34"/>` +
      `<rect x="1448" y="214" width="92" height="74" rx="10" fill="${C.signal}" opacity=".16"/>` +
      `<rect x="178" y="150" width="42" height="226" rx="10" fill="${C.signal}" opacity=".15"/>` +
      `<circle cx="452" cy="104" r="24" fill="${C.bone}" opacity=".14"/>` +
      `<circle cx="1172" cy="132" r="18" fill="${C.bone}" opacity=".1"/>` +
      `<circle cx="772" cy="88" r="14" fill="${C.signal}" opacity=".22"/>` +
      `<rect x="1366" y="560" width="30" height="240" rx="12" fill="${C.signal}" opacity=".1"/>` +
      `<rect x="186" y="600" width="26" height="200" rx="12" fill="${C.signal}" opacity=".07"/>` +
      `</g>`,
  );

  const back = rain({ w: W, h: H, count: 96, seed: 4, opacity: [0.05, 0.16] });
  css.push(back.css);
  body.push(back.svg);

  // The name, as big as the frame allows — like the hero.
  const size = (W - 2 * G) / book.width(F.display, "MOUMEN", 1, -0.01);
  const capH = (F.display.font.capHeight / F.display.font.unitsPerEm) * size;
  const top = 178;
  const base = top + capH;
  const name = display(book, "Moumen", { x: G, y: base, size });
  const nameGlow = display(book, "Moumen", { x: G, y: base, size, fill: C.signal });
  defs.push(
    `<linearGradient id="fade" x1="0" y1="${n(base)}" x2="0" y2="${n(base + capH * 0.52)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
    `<mask id="reflect" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>`,
  );
  css.push(".cut{animation:cut .9s cubic-bezier(.16,1,.3,1) .15s both}@keyframes cut{from{opacity:0;clip-path:inset(49.5% 0 49.5% 0)}}");
  body.push(
    `<g filter="url(#halo)" opacity=".2">${nameGlow.svg}</g>`,
    `<g mask="url(#reflect)"><g filter="url(#wet)" transform="translate(0 ${n(base)}) scale(1 -0.52) translate(0 ${n(-base)})">${name.svg}</g></g>`,
    `<g class="cut">${name.svg}</g>`,
  );

  // The detection that tracks him — the portfolio's id:moumen / track 001.
  const pad = 26;
  const box = { x: G - pad, y: top - pad, w: W - 2 * G + 2 * pad, h: capH + 2 * pad };
  body.push(detection(book, { ...box, label: "id:moumen", score: 0.97, delay: 1.1, size: 22, len: 34, sw: 3 }));
  body.push(osd(book, "track 001 · locked", { x: box.x + box.w, y: box.y + box.h + 40, size: 20, anchor: "end", attrs: ' class="chip" style="animation-delay:1.7s"' }).svg);

  // Top HUD.
  const hy = 74;
  const hs = 22;
  const mark = display(book, "Moumen", { x: G, y: hy, size: 27, tracking: 0.14 });
  body.push(mark.svg, osd(book, "Full-stack · Mobile", { x: G + mark.width + 22, y: hy, size: hs }).svg);
  const rec = recRow(book, { x: W / 2, y: hy, size: hs, anchor: "middle", id: "h", tail: person.timeZone });
  defs.push(rec.defs);
  css.push(rec.css);
  body.push(rec.svg, osd(book, "github / mouminkam", { x: W - G, y: hy, size: hs, anchor: "end" }).svg);

  // Bottom: role and thesis on the left, camera and the call to action on the right.
  const by = 612;
  body.push(
    dot(G + 5, by - hs * 0.4, 5),
    osd(book, person.role, { x: G + 26, y: by, size: hs, fill: C.bone, opacity: 0.8 }).svg,
    book.text(F.sans, person.thesis[0], { x: G, y: by + 70, size: 56, tracking: -0.015, fill: C.bone, opacity: 0.5 }).svg,
    book.text(F.sans, person.thesis[1], { x: G, y: by + 134, size: 56, tracking: -0.015, fill: C.bone }).svg,
  );
  body.push(osd(book, `${person.camera} · ${person.city}`, { x: W - G, y: by + 50, size: hs, anchor: "end" }).svg);
  const cta = "Play the work";
  const ctaW = osdWidth(book, cta, hs);
  const bw = 30 + 16 + 18 + ctaW + 30;
  const bx = W - G - bw;
  const bt = by + 78;
  body.push(
    `<path d="${brackets(bx, bt, bw, 58, 12)}" stroke="${C.bone}" stroke-opacity=".4" stroke-width="2" fill="none"/>`,
    icons.play(bx + 30, bt + 21, 16, C.signal),
    osd(book, cta, { x: bx + 30 + 16 + 18, y: bt + 37, size: hs, fill: C.bone }).svg,
  );

  const front = rain({ w: W, h: H, count: 22, seed: 9, opacity: [0.1, 0.22], speed: [0.45, 0.8], width: 1.5 });
  const sc = scan(W, H, 9);
  css.push(sc.css);
  body.push(
    front.svg,
    sc.svg,
    `<path d="${brackets(24, 24, W - 48, H - 48, 34)}" stroke="${C.lineStrong}" stroke-width="2" fill="none"/>`,
    `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`,
    `<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".22"/>`,
  );

  return {
    book,
    svg: doc({
      h: H,
      book,
      title: `${person.fullName} — ${person.role}`,
      desc: `${person.thesis.join(" ")} ${person.camera} · ${person.city}.`,
      css: css.join(""),
      defs: defs.join(""),
      body: body.join(""),
    }),
  };
}

/* -------------------------------------------------------------- the feeds */

/**
 * A monitor: the screen on top, a caption bar below it.
 * `variant: "wall"` is sized for the profile's two-column grid, `"hero"` for a repo README.
 */
async function feedTile({ feed, variant, active, title, kicker, scope, tag, screen }) {
  const wall = variant === "wall";
  const S = 1000;
  const B = wall ? 270 : 230;
  const H = S + B;
  const book = new Book();
  const css = [];
  const defs = [vignetteDef, scanDef, `<clipPath id="screen"><rect width="${W}" height="${S}"/></clipPath>`];
  const body = [`<rect width="${W}" height="${H}" fill="${C.void}"/>`];

  if (screen) {
    const custom = screen(book);
    css.push(custom.css ?? "");
    body.push(custom.svg);
  } else {
    body.push(
      `<image href="${await screenshot(feed.image, wall ? 1200 : 1600)}" width="${W}" height="${S}" preserveAspectRatio="xMidYMid slice"/>`,
      `<rect width="${W}" height="${S}" fill="#000" opacity=".1"/>`,
    );
    const size = wall ? 34 : 24;
    feed.detections.forEach((d, i) => {
      const [x, y, w, h] = d.box;
      const on = !active || active.includes(d.label);
      body.push(
        detection(book, {
          x: x * W,
          y: y * S,
          w: w * W,
          h: h * S,
          label: d.label,
          score: d.score,
          tone: on ? "signal" : "bone",
          delay: 0.5 + i * 0.35,
          size,
          len: wall ? 46 : 34,
          sw: wall ? 5 : 3.5,
        }),
      );
    });
  }

  const sc = scan(W, S, 7);
  css.push(sc.css);
  body.push(
    `<rect width="${W}" height="${S}" fill="url(#vignette)" opacity=".6"/>`,
    `<g clip-path="url(#screen)">${sc.svg}</g>`,
    `<path d="${brackets(22, 22, W - 44, S - 44, wall ? 52 : 40)}" stroke="${C.bone}" stroke-opacity=".5" stroke-width="${wall ? 4 : 3}" fill="none"/>`,
  );

  // Caption bar.
  const os = wall ? 32 : 24;
  const ts = wall ? 132 : 108;
  const r1 = S + (wall ? 66 : 54);
  const r2 = S + (wall ? 196 : 162);
  const r3 = S + (wall ? 244 : 202);
  body.push(`<rect y="${S}" width="${W}" height="2" fill="${C.lineStrong}"/>`);
  const id = osd(book, feed.feed, { x: G, y: r1, size: os, fill: C.signal });
  body.push(id.svg, osd(book, ` · ${tag}`, { x: G + id.width, y: r1, size: os }).svg);
  const rec = recRow(book, { x: W - G, y: r1, size: os, anchor: "end", id: "f" });
  defs.push(rec.defs);
  css.push(rec.css);
  body.push(rec.svg);
  body.push(display(book, title, { x: G - 4, y: r2, size: ts }).svg);
  body.push(osd(book, kicker, { x: G, y: r3, size: os }).svg);
  if (scope) body.push(osd(book, scope, { x: W - G, y: r3, size: os, anchor: "end", fill: C.ashDim }).svg);

  return doc({
    h: H,
    book,
    title: `${feed.feed} · ${title} — ${kicker}`,
    desc: screen ? `${title}: ${kicker}.` : `Screenshot of ${title} with detection boxes: ${feed.detections.map((d) => d.label).join(", ")}.`,
    css: css.join(""),
    defs: defs.join(""),
    body: body.join(""),
  });
}

/** The API has no screen of its own, so its feed is the traffic. */
function apiScreen(book) {
  const S = 1000;
  const size = 30;
  const pitch = 66;
  const first = 214;
  const cycle = 16;
  const css = [];
  const out = [
    `<rect width="${W}" height="${S}" fill="#030405"/>`,
    osd(book, "access · /api/v1", { x: 96, y: 116, size: 24, fill: C.ash }).svg,
    osd(book, "laravel 12 · sanctum", { x: W - 96, y: 116, size: 24, anchor: "end", fill: C.ashDim }).svg,
    `<rect x="96" y="146" width="${W - 192}" height="1" fill="${C.lineStrong}"/>`,
  ];
  apiLog.forEach(([method, route, status, ms, note], i) => {
    const y = first + i * pitch;
    const t0 = ((i * 0.85) / cycle) * 100;
    const k = `l${i}`;
    css.push(`.${k}{animation:${k} ${cycle}s linear infinite}@keyframes ${k}{0%,${t0.toFixed(1)}%{opacity:0}${(t0 + 0.6).toFixed(1)}%,93%{opacity:1}97%,100%{opacity:0}}`);
    const warn = status >= 400;
    const line = [
      book.text(F.mono, method, { x: 96, y, size, fill: warn ? C.signal : C.ash }).svg,
      book.text(F.mono, route, { x: 260, y, size, fill: C.bone }).svg,
      book.text(F.mono, String(status), { x: 1010, y, size, fill: warn ? C.signal : C.bone }).svg,
      book.text(F.mono, ms, { x: 1250, y, size, anchor: "end", fill: C.ash }).svg,
    ];
    out.push(`<g class="${k}">${line.join("")}</g>`);
    if (note) {
      const b = `b${i}`;
      css.push(
        `.${b}{transform-box:fill-box;transform-origin:center;animation:${b} ${cycle}s cubic-bezier(.16,1,.3,1) infinite}` +
          `@keyframes ${b}{0%,${(t0 + 2).toFixed(1)}%{opacity:0;transform:scale(1.1)}${(t0 + 5).toFixed(1)}%,93%{opacity:1;transform:scale(1)}97%,100%{opacity:0}}`,
      );
      out.push(
        `<g class="${b}">${detection(book, { x: 70, y: y - size * 0.95 - 10, w: W - 140, h: size * 1.25 + 20, label: note, score: 1, size: 22, len: 22, sw: 3, chipAt: "right" })}</g>`,
      );
    }
  });
  const end = first + apiLog.length * pitch;
  out.push(`<rect class="blink" x="96" y="${end - size + 4}" width="18" height="${size}" fill="${C.bone}" opacity=".8"/>`);
  return { svg: out.join(""), css: css.join("") };
}

/* ----------------------------------------------------- panels and chrome */

function chapter({ index, label, meta }) {
  const H = 120;
  const book = new Book();
  const size = 30;
  const y = 74;
  const num = osd(book, index, { x: G, y, size, fill: C.signal });
  const lab = osd(book, ` · ${label}`, { x: G + num.width, y, size, fill: C.bone });
  const m = osd(book, meta, { x: W - G, y, size: 24, anchor: "end" });
  const x1 = G + num.width + lab.width + 36;
  const x2 = W - G - m.width - 36;
  return doc({
    h: H,
    book,
    title: `${index} · ${label}`,
    desc: meta,
    body: `<rect width="${W}" height="${H}" fill="${C.void}"/>${num.svg}${lab.svg}<rect x="${n(x1)}" y="${y - 11}" width="${n(x2 - x1)}" height="2" fill="${C.lineStrong}"/>${m.svg}`,
  });
}

function stackPanel() {
  const book = new Book();
  const gap = 40;
  const colW = (W - 2 * G - 2 * gap) / 3;
  const size = 23;
  const cols = stack.map((s, i) => {
    const x = G + i * (colW + gap);
    const pad = 32;
    const lines = wrapItems(book, s.items, size, colW - 2 * pad);
    const parts = [
      osd(book, `0${i + 1}`, { x: x + pad, y: 92, size: 22, fill: C.signal }).svg,
      osd(book, "/03", { x: x + pad + osdWidth(book, "01", 22), y: 92, size: 22, fill: C.ashDim }).svg,
      display(book, s.verb, { x: x + pad - 3, y: 222, size: 116 }).svg,
      ...s.line.map((l, j) => book.text(F.sans, l, { x: x + pad, y: 284 + j * 40, size: 30, fill: C.ash }).svg),
      ...lines.map((items, j) => itemLine(book, items, { x: x + pad, y: 404 + j * 44, size })),
    ];
    return { x, parts, bottom: 404 + (lines.length - 1) * 44 };
  });
  const H = Math.max(...cols.map((c) => c.bottom)) + 70;
  const body = [`<rect width="${W}" height="${H}" fill="${C.void}"/>`];
  for (const c of cols) {
    body.push(`<path d="${brackets(c.x, 36, colW, H - 72, 22)}" stroke="${C.lineStrong}" stroke-width="2" fill="none"/>`, ...c.parts);
  }
  return doc({
    h: H,
    book,
    title: "Stack — build, serve, ship",
    desc: stack.map((s) => `${s.verb}: ${s.items.join(", ")}.`).join(" "),
    body: body.join(""),
  });
}

/** A repo's stack, on one or two lines. */
function stackStrip(items) {
  const book = new Book();
  const size = 26;
  const label = osd(book, "stack", { x: G, y: 0, size, fill: C.signal });
  const x = G + label.width + 40;
  const lines = wrapItems(book, items, size, W - G - x);
  const H = 64 + lines.length * 46;
  const body = [
    `<rect width="${W}" height="${H}" fill="${C.void}"/>`,
    osd(book, "stack", { x: G, y: 76, size, fill: C.signal }).svg,
    ...lines.map((l, i) => itemLine(book, l, { x, y: 76 + i * 46, size })),
    `<rect y="${H - 2}" width="${W}" height="2" fill="${C.lineStrong}"/>`,
  ];
  return doc({ h: H, book, title: "Stack", desc: items.join(", "), body: body.join("") });
}

function footer({ line, left, right }) {
  const H = 330;
  const book = new Book();
  const css = [];
  const defs = [grainDef];
  const r = rain({ w: W, h: H, count: 40, seed: 21, opacity: [0.04, 0.12] });
  css.push(r.css);
  const rec = recRow(book, { x: W - G, y: 104, size: 24, anchor: "end", id: "e" });
  defs.push(rec.defs);
  css.push(rec.css);
  const body = [
    `<rect width="${W}" height="${H}" fill="${C.void}"/>`,
    r.svg,
    `<rect width="${W}" height="2" fill="${C.lineStrong}"/>`,
    display(book, "End of feed", { x: G - 4, y: 196, size: 128 }).svg,
    osd(book, line, { x: G, y: 250, size: 24 }).svg,
    rec.svg,
    osd(book, person.camera, { x: W - G, y: 150, size: 24, anchor: "end", fill: C.ashDim }).svg,
    `<rect x="${G}" y="282" width="${W - 2 * G}" height="1" fill="${C.line}"/>`,
    osd(book, left, { x: G, y: 314, size: 20, fill: C.ashDim }).svg,
    osd(book, right, { x: W - G, y: 314, size: 20, anchor: "end", fill: C.ashDim }).svg,
    `<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".18"/>`,
  ];
  return doc({ h: H, book, title: "End of feed", desc: line, css: css.join(""), defs: defs.join(""), body: body.join("") });
}

function button({ label, icon }) {
  const H = 88;
  const book = new Book();
  const size = 24;
  const padX = 34;
  const iconS = 20;
  const gap = 16;
  const tw = osdWidth(book, label, size);
  const w = Math.round(padX + iconS + gap + tw + padX);
  const body = [
    `<rect width="${w}" height="${H}" fill="${C.void}"/>`,
    `<path d="${brackets(1.5, 1.5, w - 3, H - 3, 14)}" stroke="${C.bone}" stroke-opacity=".45" stroke-width="3" fill="none"/>`,
    icons[icon](padX, H / 2 - iconS / 2, iconS, C.signal),
    osd(book, label, { x: padX + iconS + gap, y: H / 2 + size * 0.38, size, fill: C.bone }).svg,
  ];
  return doc({ w, h: H, book, title: label, desc: label, body: body.join("") });
}

/* ------------------------------------------------------- linkedin banner */

/**
 * LinkedIn's cover, 1584×396. A still frame (LinkedIn shows a PNG), so the rain is
 * drawn where it falls rather than animated. The left third stays quiet: the profile
 * photo sits over it.
 */
function linkedinBanner() {
  const BW = 1584;
  const BH = 396;
  const book = new Book();
  const right = BW - 72;
  const rnd = mulberry32(31);
  let drops = "";
  for (let i = 0; i < 140; i++) {
    const x = rnd() * BW;
    const y = rnd() * BH;
    const l = 18 + rnd() * 48;
    drops += `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + l * 0.12)}" y2="${n(y + l)}" opacity="${(0.05 + rnd() * 0.13).toFixed(2)}"/>`;
  }
  const size = 82;
  const l1 = display(book, "Web, mobile and", { x: right, y: 150, size, anchor: "end", fill: C.bone, opacity: 0.45 });
  const l2 = display(book, "the API between them.", { x: right, y: 272, size, anchor: "end" });
  const capH = (F.display.font.capHeight / F.display.font.unitsPerEm) * size;
  const body = [
    `<rect width="${BW}" height="${BH}" fill="${C.void}"/>`,
    `<g filter="url(#haze)"><ellipse cx="${BW * 0.62}" cy="${BH + 60}" rx="${BW * 0.5}" ry="130" fill="${C.signalDeep}"/></g>`,
    `<g filter="url(#soft)">` +
      `<rect x="1330" y="20" width="40" height="190" rx="10" fill="${C.signal}" opacity=".22"/>` +
      `<rect x="560" y="60" width="30" height="150" rx="8" fill="${C.signal}" opacity=".12"/>` +
      `<circle cx="900" cy="40" r="14" fill="${C.bone}" opacity=".12"/>` +
      `</g>`,
    `<g stroke="${C.bone}" stroke-width="1.1" stroke-linecap="round">${drops}</g>`,
    l1.svg,
    l2.svg,
    detection(book, { x: l2.x - 22, y: 272 - capH - 18, w: l2.width + 44, h: capH + 36, label: "open to remote", score: 0.99, size: 19, len: 22, sw: 2.5 }),
  ];
  // A still frame has no running timecode: the REC row is just the camera and the clock zone.
  const recLabel = osd(book, `REC · ${person.camera} · ${person.city} · UTC+03:00`, { x: right, y: 58, size: 19, anchor: "end", fill: C.bone });
  body.push(
    `<circle cx="${n(recLabel.x - 18)}" cy="${n(58 - 19 * 0.4)}" r="5" fill="${C.signal}"/>`,
    recLabel.svg,
    osd(book, "Full-stack · Mobile", { x: 560, y: 58, size: 19 }).svg,
    itemLine(book, ["Next.js", "React", "TypeScript", "Node.js", "Laravel", "Flutter"], { x: right, y: 336, size: 19, anchor: "end" }),
    osd(book, "moumen-alkamsheh.vercel.app", { x: right, y: 368, size: 19, anchor: "end", fill: C.signal }).svg,
    `<path d="${brackets(18, 18, BW - 36, BH - 36, 26)}" stroke="${C.lineStrong}" stroke-width="2" fill="none"/>`,
    `<rect width="${BW}" height="${BH}" fill="url(#vignette)" opacity=".7"/>`,
    `<rect width="${BW}" height="${BH}" filter="url(#grain)" opacity=".16"/>`,
  );
  return doc({
    w: BW,
    h: BH,
    book,
    title: `${person.fullName} — LinkedIn cover`,
    desc: `${person.thesis.join(" ")} Open to remote work.`,
    defs:
      grainDef +
      vignetteDef +
      `<filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="24"/></filter>` +
      `<filter id="haze" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="56"/></filter>`,
    body: body.join(""),
  });
}

/* ------------------------------------------------------------------ build */

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
  return file;
}

const written = [];
const out = at("..", "assets");
const head = header();
written.push(await write(path.join(out, "header.svg"), head.svg));
written.push(await write(path.join(out, "chapter-work.svg"), chapter({ index: "01", label: "Work", meta: "six feeds · all live" })));
written.push(await write(path.join(out, "chapter-stack.svg"), chapter({ index: "02", label: "Stack", meta: "grouped by what the tools do" })));
written.push(await write(path.join(out, "chapter-path.svg"), chapter({ index: "03", label: "Path", meta: "2023 — now" })));
written.push(await write(path.join(out, "chapter-signal.svg"), chapter({ index: "04", label: "Signal", meta: `${person.city} · UTC+03:00` })));
written.push(await write(path.join(out, "stack.svg"), stackPanel()));
written.push(
  await write(
    path.join(out, "footer.svg"),
    footer({ line: `${person.fullName} · ${person.role} · ${person.city}`, left: "moumen-alkamsheh.vercel.app", right: "github.com/mouminkam" }),
  ),
);
for (const [file, label, icon] of [
  ["btn-portfolio.svg", "Portfolio", "play"],
  ["btn-linkedin.svg", "LinkedIn", "arrow"],
  ["btn-email.svg", "Email", "arrow"],
  ["btn-cv.svg", "CV", "down"],
]) {
  written.push(await write(path.join(out, file), button({ label, icon })));
}
for (const feed of feeds) {
  written.push(
    await write(
      path.join(out, "feeds", `${feed.slug}.svg`),
      await feedTile({ feed, variant: "wall", title: feed.title, kicker: feed.kicker, scope: feed.scope, tag: person.camera }),
    ),
  );
}

const banner = linkedinBanner();
written.push(await write(path.join(out, "linkedin-banner.svg"), banner));
const bannerPng = path.join(out, "linkedin-banner.png");
await sharp(Buffer.from(banner), { density: 144 }).resize(3168, 792).png({ compressionLevel: 9 }).toFile(bannerPng);
written.push(bannerPng);

const reposAt = process.argv.includes("--repos") ? process.argv[process.argv.indexOf("--repos") + 1] : null;
if (reposAt) {
  for (const r of repos) {
    const feed = feeds.find((f) => f.slug === r.feed);
    const dir = path.resolve(here, reposAt, r.repo, ".github", "assets");
    const api = r.kind === "api";
    written.push(
      await write(
        path.join(dir, "feed.svg"),
        await feedTile({
          feed,
          variant: "hero",
          active: r.active,
          title: feed.title,
          kicker: `${r.surface} — ${feed.kicker}`,
          scope: feed.scope,
          tag: r.repo.toLowerCase(),
          screen: api ? apiScreen : null,
        }),
      ),
    );
    written.push(await write(path.join(dir, "stack.svg"), stackStrip(r.stack)));
    written.push(
      await write(
        path.join(dir, "footer.svg"),
        footer({
          line: `${feed.feed} · ${feed.title} — ${r.surface} · by ${person.fullName}`,
          left: `github.com/mouminkam/${r.repo}`,
          right: "moumen-alkamsheh.vercel.app",
        }),
      ),
    );
    const buttons = [
      r.live && ["btn-live.svg", "Live demo", "play"],
      ["btn-case.svg", "Case study", "arrow"],
      api && ["btn-docs.svg", "API reference", "arrow"],
      ["btn-work.svg", "All work", "back"],
    ].filter(Boolean);
    for (const [file, label, icon] of buttons) written.push(await write(path.join(dir, file), button({ label, icon })));
  }
}

if (MISSING.size) console.warn(`! glyphs missing for: ${[...MISSING].join(" | ")}`);
for (const f of written) {
  const { size } = await fs.stat(f);
  console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${path.relative(path.resolve(here, ".."), f)}`);
}
