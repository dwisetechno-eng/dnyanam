/**
 * Builds data/radio.json from GeetGanga's public catalogue.
 *
 *   npm run radio:sync                 # refresh every station
 *   node scripts/sync-radio.mjs bharat # refresh one station
 *
 * GeetGanga publishes one JSON-LD `MusicComposition` block per geet page,
 * including `recordedAs.audio.contentUrl`. We read a genre's listing for the
 * track list, then fetch only the geets that have a recording.
 *
 * The recordings are licensed CC BY-SA 2.5, so the app keeps the attribution
 * and source link visible wherever they are played.
 *
 * This is a build-time sync: the app never scrapes GeetGanga at runtime.
 * Re-run it whenever the stations should pick up new recordings.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://geetganga.org";
const USER_AGENT =
  "DnyanamRadioSync/1.0 (+https://github.com/dwisetechno-eng/dnyanam)";

const STATIONS = [
  {
    id: "prerana",
    genres: ["prerana", "inspiration", "motivational"],
    name_mr: "प्रेरणा के स्वर",
    name_hi: "प्रेरणा के स्वर",
    name_en: "Prerana · Songs of Inspiration",
    description_mr:
      "GeetGanga वरील प्रेरणा, स्फूर्ती आणि प्रोत्साहन या संग्रहांतील गीते — एकामागून एक, न थांबता ऐका.",
    description_hi:
      "GeetGanga के प्रेरणा, स्फूर्ति और प्रोत्साहन संग्रहों से गीत — लगातार सुनें।",
    description_en:
      "Inspirational geets from GeetGanga's Prerana, Inspiration and Motivational collections, played back to back.",
  },
  {
    id: "bharat",
    genres: ["bharat"],
    name_mr: "भारताचे स्वर",
    name_hi: "भारत के स्वर",
    name_en: "Bharat · Songs of the Nation",
    description_mr:
      "भारतमातेच्या गुणगानाची गीते — देशभक्तीचा ओघ सतत सुरू.",
    description_hi:
      "भारत माँ के गुणगान के गीत — देशभक्ति की धारा लगातार।",
    description_en:
      "Songs in praise of Bharat, streamed continuously from GeetGanga's Bharat collection.",
  },
];

const delayMs = 450;
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const firstArg = process.argv[2];
const onlyStation =
  firstArg && !firstArg.startsWith("--") ? firstArg : null;

const languageCodes = {
  hindi: "hi",
  marathi: "mr",
  sanskrit: "sa",
  telugu: "te",
  kannada: "kn",
  malayalam: "ml",
  gujarati: "gu",
  marwari: "mwr",
  oriya: "or",
  odia: "or",
  tamil: "ta",
  english: "en",
  bengali: "bn",
  punjabi: "pa",
  nepali: "ne",
  urdu: "ur",
  konkani: "kok",
  maithili: "mai",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getText(url, attempt = 1) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    if (attempt >= 3) throw error;
    await sleep(delayMs * attempt * 2);
    return getText(url, attempt + 1);
  }
}

/** Decode the React Server Component payload streamed into the page. */
function decodeFlightPayload(html) {
  const chunks = [];
  const pattern = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  for (const match of html.matchAll(pattern)) {
    try {
      chunks.push(JSON.parse(match[1]));
    } catch {
      // Ignore chunks that are not plain strings.
    }
  }
  return chunks.join("");
}

/** Bracket-match the `"geets":[ ... ]` array out of the decoded payload. */
function extractArray(payload, key) {
  const marker = `"${key}":[`;
  const start = payload.indexOf(marker);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  const arrayStart = start + marker.length - 1;

  for (let index = arrayStart; index < payload.length; index += 1) {
    const char = payload[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "[" || char === "{") depth += 1;
    else if (char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(payload.slice(arrayStart, index + 1));
      }
    }
  }

  return null;
}

function parseDuration(value) {
  if (!value) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return null;
  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function readGenrePage(genre, page) {
  const url = `${BASE}/genres/${genre}${page > 1 ? `?page=${page}` : ""}`;
  const html = await getText(url);
  const payload = decodeFlightPayload(html);
  return {
    geets: extractArray(payload, "geets") ?? [],
    totalPages: Number(/"totalPages":(\d+)/.exec(payload)?.[1] ?? "1"),
  };
}

async function collectGenre(genre) {
  const first = await readGenrePage(genre, 1);
  const geets = [...first.geets];

  for (let page = 2; page <= first.totalPages; page += 1) {
    await sleep(delayMs);
    const next = await readGenrePage(genre, page);
    geets.push(...next.geets);
    process.stdout.write(`    ${genre} page ${page}/${first.totalPages}\n`);
  }

  console.log(
    `  ${genre}: ${geets.length} geets, ${geets.filter((geet) => geet.hasAudio).length} with audio`,
  );
  return geets;
}

async function readTrack(geet, stationId) {
  const sourceUrl = `${BASE}/geets/${geet.canonicalSlug}`;
  const detailHtml = await getText(sourceUrl);

  const contentUrl = /"contentUrl":"([^"]+)"/.exec(detailHtml)?.[1];
  if (!contentUrl) return null;

  const durationFromLd = parseDuration(
    /"duration":"(PT[^"]+)"/.exec(detailHtml)?.[1] ?? "",
  );
  const durationFromList = (() => {
    const time = geet.playTime;
    if (!time || typeof time !== "string") return null;
    const [minutes, seconds] = time.split(":");
    if (minutes === undefined || seconds === undefined) return null;
    return Number(minutes) * 60 + Number(seconds);
  })();

  const native =
    clean(geet.titles?.native) ||
    clean(/alternateName":\["([^"]+)"/.exec(detailHtml)?.[1]);

  const languageName = clean(geet.languageName) || clean(geet.language);

  return {
    id: `${stationId}-${geet.canonicalSlug}`,
    title: clean(geet.title) || clean(geet.titles?.roman),
    title_native: native,
    language_name: languageName,
    language_code:
      languageCodes[languageName.toLowerCase()] ??
      languageName.toLowerCase().slice(0, 5),
    genre: clean(geet.genre) || "Prerana",
    duration_seconds: durationFromLd ?? durationFromList ?? 0,
    audio_url: contentUrl,
    source_url: sourceUrl,
    kind: "song",
  };
}

async function buildStation(station) {
  console.log(
    `\n→ Station ${station.id} (${station.genres.join(", ")})`,
  );

  const seen = new Set();
  const candidates = [];

  for (const genre of station.genres) {
    const geets = await collectGenre(genre);
    for (const geet of geets) {
      if (!geet.hasAudio || !geet.canonicalSlug || seen.has(geet.canonicalSlug)) {
        continue;
      }
      seen.add(geet.canonicalSlug);
      candidates.push(geet);
    }
    await sleep(delayMs);
  }

  const selected = candidates.slice(0, limit);
  const tracks = [];

  for (const [index, geet] of selected.entries()) {
    process.stdout.write(
      `    [${String(index + 1).padStart(3)}/${selected.length}] ${geet.title}… `,
    );
    try {
      const track = await readTrack(geet, station.id);
      if (track) {
        tracks.push(track);
        console.log("ok");
      } else {
        console.log("no recording, skipped");
      }
    } catch (error) {
      console.log(`failed (${error instanceof Error ? error.message : error})`);
    }
    await sleep(delayMs);
  }

  return {
    id: station.id,
    name_mr: station.name_mr,
    name_hi: station.name_hi,
    name_en: station.name_en,
    description_mr: station.description_mr,
    description_hi: station.description_hi,
    description_en: station.description_en,
    tracks,
  };
}

async function main() {
  const targets = onlyStation
    ? STATIONS.filter((station) => station.id === onlyStation)
    : STATIONS;

  if (targets.length === 0) {
    throw new Error(
      `Unknown station "${onlyStation}". Use one of: ${STATIONS.map((s) => s.id).join(", ")}`,
    );
  }

  const stations = [];
  for (const station of targets) {
    stations.push(await buildStation(station));
  }

  const output = {
    generated_at: new Date().toISOString(),
    source: {
      name: "GeetGanga",
      homepage: BASE,
      category_url: `${BASE}/genres/prerana`,
      license: "CC BY-SA 2.5",
      license_url: "https://creativecommons.org/licenses/by-sa/2.5/",
    },
    stations,
  };

  writeFileSync(
    join(process.cwd(), "data", "radio.json"),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );

  const total = stations.reduce((sum, station) => sum + station.tracks.length, 0);
  console.log(
    `\n✔ Wrote data/radio.json · ${stations.length} station(s) · ${total} tracks`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
