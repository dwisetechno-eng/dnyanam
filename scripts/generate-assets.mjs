/**
 * Generates all local demo cover art and banner art as SVG.
 * Run: npm run generate:covers
 *
 * Keeping art as local SVG means the storefront looks rich with zero
 * external image dependencies (great for offline demos + fast first paint).
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(root, "data/catalog.json"), "utf8"));
const banners = JSON.parse(readFileSync(join(root, "data/banners.json"), "utf8"));

mkdirSync(join(root, "public/covers"), { recursive: true });
mkdirSync(join(root, "public/banners"), { recursive: true });

const palettes = {
  fiction: ["#312E81", "#7C3AED", "#F472B6", "#FDE68A"],
  history: ["#3B2416", "#92400E", "#F59E0B", "#FDE68A"],
  spirituality: ["#2E1065", "#7E22CE", "#E879F9", "#FDE68A"],
  business: ["#042F2E", "#0F766E", "#2DD4BF", "#A7F3D0"],
  "competitive-exams": ["#0C1E3E", "#1D4ED8", "#38BDF8", "#BAE6FD"],
  "special-editions": ["#4C0519", "#BE123C", "#FB7185", "#FDE68A"],
  cooking: ["#431407", "#C2410C", "#FB923C", "#FED7AA"],
  poetry: ["#3B0764", "#A21CAF", "#F0ABFC", "#FDE68A"],
  "self-help": ["#052E16", "#15803D", "#4ADE80", "#D9F99D"],
  "current-affairs": ["#0F172A", "#334155", "#38BDF8", "#E2E8F0"],
  children: ["#172554", "#1D4ED8", "#F59E0B", "#FEF3C7"],
  magazine: ["#1E1B4B", "#4338CA", "#F59E0B", "#FEF3C7"],
};

const formatLabel = {
  physical_book: "PHYSICAL BOOK",
  ebook: "E-BOOK",
  magazine_digital: "DIGITAL MAGAZINE",
  magazine_print: "PRINT MAGAZINE",
};

const categoryLabel = {
  fiction: "FICTION",
  history: "HISTORY",
  spirituality: "SPIRITUALITY",
  business: "BUSINESS",
  "competitive-exams": "COMPETITIVE EXAMS",
  "special-editions": "SPECIAL EDITION",
  cooking: "COOKING",
  poetry: "POETRY",
  "self-help": "SELF-HELP",
  "current-affairs": "CURRENT AFFAIRS",
  children: "CHILDREN",
};

const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function wrap(text, maxChars, maxLines = 4) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s+\S*$/, "") + " …";
    return kept;
  }
  return lines;
}

function coverSvg(item) {
  const p = palettes[item.category] || palettes.fiction;
  const [deep, mid, accent, pale] = p;
  const titleLength = [...item.title].length;
  const titleSize = titleLength > 30 ? 44 : titleLength > 20 ? 50 : 58;
  const maxChars = titleSize > 54 ? 14 : titleSize > 46 ? 16 : 18;
  const titleLines = wrap(item.title, maxChars, 4);
  const titleStart = 320 - ((titleLines.length - 1) * titleSize * 0.58) / 2;
  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<tspan x="300" dy="${i === 0 ? 0 : titleSize * 1.18}">${esc(line)}</tspan>`,
    )
    .join("");
  const subtitle = item.subtitle_or_edition || "";
  const subtitleLines = wrap(subtitle, 30, 2);
  const subtitleStart =
    titleStart + (titleLines.length - 1) * titleSize * 1.18 + 54;
  const subtitleTspans = subtitleLines
    .map(
      (line, i) =>
        `<tspan x="300" dy="${i === 0 ? 0 : 26}">${esc(line)}</tspan>`,
    )
    .join("");

  const seed = [...item.slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  const circles = Array.from({ length: 5 }, (_, i) => {
    const cx = 80 + ((seed * (i + 3)) % 440);
    const cy = 120 + ((seed * (i + 2)) % 560);
    const r = 60 + ((seed * (i + 5)) % 170);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${pale}" stroke-opacity="${0.05 + i * 0.012}" stroke-width="1.5"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" role="img" aria-label="${esc(item.title)} cover">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${deep}"/>
      <stop offset="0.55" stop-color="${mid}"/>
      <stop offset="1" stop-color="#080B13"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.75" cy="0.18" r="0.8">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="0.55" stop-color="${accent}" stop-opacity="0.07"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#05070D" stop-opacity="0"/>
      <stop offset="1" stop-color="#05070D" stop-opacity="0.92"/>
    </linearGradient>
    <pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.7" fill="${pale}" fill-opacity="0.055"/>
    </pattern>
    <filter id="soft"><feGaussianBlur stdDeviation="26"/></filter>
  </defs>

  <rect width="600" height="900" fill="url(#bg)"/>
  <rect width="600" height="900" fill="url(#glow)"/>
  <rect width="600" height="900" fill="url(#grain)"/>
  <circle cx="470" cy="140" r="150" fill="${accent}" opacity="0.16" filter="url(#soft)"/>
  ${circles}
  <path d="M0 690 C150 610 320 760 600 640 L600 900 L0 900 Z" fill="${accent}" opacity="0.10"/>
  <path d="M0 720 C180 650 360 800 600 690" fill="none" stroke="${pale}" stroke-opacity="0.22" stroke-width="2"/>
  <rect width="600" height="900" fill="url(#fade)"/>

  <rect x="26" y="26" width="548" height="848" rx="4" fill="none" stroke="${pale}" stroke-opacity="0.28"/>
  <rect x="34" y="34" width="532" height="832" rx="2" fill="none" stroke="${pale}" stroke-opacity="0.08"/>

  <g font-family="'Plus Jakarta Sans', 'Noto Sans Devanagari', 'Nirmala UI', sans-serif">
    <text x="54" y="78" fill="${pale}" font-size="15" font-weight="800" letter-spacing="4">DNYANAM</text>
    <text x="54" y="102" fill="${pale}" fill-opacity="0.55" font-size="9.5" font-weight="600" letter-spacing="2.6">${formatLabel[item.item_type] || "BOOK"}</text>
    <line x1="54" y1="118" x2="200" y2="118" stroke="${pale}" stroke-opacity="0.35"/>
  </g>

  <text x="300" y="${titleStart}" text-anchor="middle" fill="#FFF8EC" font-size="${titleSize}" font-weight="800" letter-spacing="-0.5"
    font-family="'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Bengali', 'Noto Sans Telugu', 'Noto Sans Gujarati', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Noto Sans Gurmukhi', 'Noto Sans Oriya', 'Nirmala UI', 'Plus Jakarta Sans', sans-serif">${titleTspans}</text>

  <text x="300" y="${subtitleStart}" text-anchor="middle" fill="${pale}" fill-opacity="0.78" font-size="18" font-weight="500"
    font-family="'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Bengali', 'Nirmala UI', 'Plus Jakarta Sans', sans-serif">${subtitleTspans}</text>

  <g font-family="'Plus Jakarta Sans', 'Noto Sans Devanagari', 'Nirmala UI', sans-serif">
    <line x1="240" y1="780" x2="360" y2="780" stroke="${pale}" stroke-opacity="0.45"/>
    <text x="300" y="812" text-anchor="middle" fill="#FFF8EC" font-size="17" font-weight="700">${esc(item.author_or_publisher)}</text>
    <text x="300" y="848" text-anchor="middle" fill="${pale}" fill-opacity="0.55" font-size="9.5" font-weight="600" letter-spacing="2.4">${categoryLabel[item.category] || "BOOKS"}</text>
  </g>
</svg>`;
}

for (const item of catalog) {
  writeFileSync(join(root, "public/covers", `${item.slug}.svg`), coverSvg(item));
}

const bannerArt = {
  "hero-diwali": {
    wide: true,
    colors: ["#2A0718", "#7F1D1D", "#E11D48", "#F59E0B"],
    label: "DNYANAM · SPECIAL EDITIONS",
  },
  "hero-marathi": {
    wide: true,
    colors: ["#1C1206", "#78350F", "#F59E0B", "#FDE68A"],
    label: "DNYANAM · मराठी साहित्य",
  },
  "mid-latest": {
    wide: false,
    colors: ["#071A18", "#115E59", "#14B8A6", "#FDE68A"],
    label: "DNYANAM · NEW RELEASES",
  },
  "mid-ebooks": {
    wide: false,
    colors: ["#1E1033", "#5B21B6", "#A855F7", "#FDE68A"],
    label: "DNYANAM · INSTANT E-BOOKS",
  },
};

for (const [name, art] of Object.entries(bannerArt)) {
  const [deep, mid, accent, pale] = art.colors;
  const h = art.wide ? 800 : 460;
  const w = 1600;
  const fontSize = art.wide ? 64 : 44;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Dnyanam promotion">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${deep}"/>
      <stop offset="0.55" stop-color="${mid}"/>
      <stop offset="1" stop-color="#070A12"/>
    </linearGradient>
    <radialGradient id="r" cx="0.78" cy="0.2" r="0.8">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.7"/>
      <stop offset="0.6" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1.4" cy="1.4" r="1.2" fill="${pale}" fill-opacity="0.10"/>
    </pattern>
    <filter id="blur"><feGaussianBlur stdDeviation="42"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#b)"/>
  <rect width="${w}" height="${h}" fill="url(#r)"/>
  <rect width="${w}" height="${h}" fill="url(#dots)"/>
  <circle cx="1240" cy="${h * 0.42}" r="${h * 0.46}" fill="${accent}" opacity="0.15" filter="url(#blur)"/>
  <circle cx="1300" cy="${h * 0.48}" r="${h * 0.34}" fill="none" stroke="${pale}" stroke-opacity="0.18" stroke-width="2"/>
  <circle cx="1300" cy="${h * 0.48}" r="${h * 0.26}" fill="none" stroke="${pale}" stroke-opacity="0.12" stroke-width="1.5"/>
  <circle cx="1300" cy="${h * 0.48}" r="${h * 0.18}" fill="none" stroke="${pale}" stroke-opacity="0.08" stroke-width="1"/>
  <path d="M0 ${h * 0.82} C 380 ${h * 0.66}, 700 ${h * 0.98}, 1600 ${h * 0.72} L1600 ${h} L0 ${h} Z" fill="${accent}" opacity="0.16"/>
  <path d="M0 ${h * 0.9} C 420 ${h * 0.76}, 900 ${h * 1.02}, 1600 ${h * 0.8}" fill="none" stroke="${pale}" stroke-opacity="0.2" stroke-width="2"/>
  <text x="64" y="${h - 54}" fill="${pale}" fill-opacity="0.55" font-family="'Plus Jakarta Sans', sans-serif" font-size="${fontSize * 0.28}" font-weight="700" letter-spacing="6">${art.label}</text>
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="${pale}" stroke-opacity="0.12"/>
</svg>`;
  writeFileSync(join(root, "public/banners", `${name}.svg`), svg);
}

// Generic fallback cover used by search / missing-art scenarios.
writeFileSync(
  join(root, "public/covers/placeholder.svg"),
  coverSvg({
    title: "Dnyanam",
    slug: "placeholder",
    subtitle_or_edition: "भारतीय भाषांतील पुस्तके",
    author_or_publisher: "Dnyanam",
    item_type: "physical_book",
    category: "fiction",
  }),
);

console.log(
  `✔ Generated ${catalog.length} covers, ${Object.keys(bannerArt).length} banners + placeholder.`,
);
