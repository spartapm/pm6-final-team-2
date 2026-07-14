import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "src", "lib", "works.data.json");
const cacheDir = path.join(root, "data");

const SHEET_ID = "1ZrLSqkNDWugAl2iLuAnQzihYjSg2wXOEzuxDWkyy4yQ";

/** Tab gid map — Allblu_media_content_database */
const SHEETS = {
  works: "119065602",
  schedule: "1057632304",
  serialDays: "479874657",
  ageRating: "1291272614",
  watchUrls: "747187607",
  staff: "663440471",
  workStaff: "1638760805",
  genres: "315950594",
  workGenres: "1763194831",
  tags: "289477746",
  workTags: "716750570",
  companies: "1155496548",
  workCompanies: "417395056",
};

const tones = [
  "from-[#d7dde8] to-[#b8c2d4]",
  "from-[#c9d6ea] to-[#9eb0cb]",
  "from-[#d5dceb] to-[#a9b6cd]",
  "from-[#cfd8e6] to-[#95a5bd]",
  "from-[#dbe3f0] to-[#a7b6cc]",
  "from-[#c4d0e2] to-[#8fa0ba]",
];

function parseCsv(text) {
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function rowsToObjects(text) {
  const table = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!table.length) return [];
  const headers = table[0].map((h) => h.trim());
  const out = [];
  for (let r = 1; r < table.length; r += 1) {
    const cells = table[r];
    if (!cells || !cells.some((c) => String(c ?? "").trim())) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    out.push(obj);
  }
  return out;
}

async function fetchSheet(name, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  console.log(`  · ${name}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${name} export failed: HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.includes("<!DOCTYPE html")) {
    throw new Error(
      `${name}: not CSV. Share the spreadsheet as “Anyone with the link can view”.`
    );
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, `${name}.csv`), text, "utf8");
  return rowsToObjects(text);
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const id = row[key];
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
  }
  return map;
}

function formatPeriod(start, end) {
  if (!start && !end) return "";
  if (start && end) return `${start} ~ ${end}`;
  if (start) return `${start} ~`;
  return `~ ${end}`;
}

console.log("Fetching Google Sheets…");
const [
  workRows,
  scheduleRows,
  serialDayRows,
  ageRows,
  watchRows,
  staffRows,
  workStaffRows,
  genreRows,
  workGenreRows,
  tagRows,
  workTagRows,
  companyRows,
  workCompanyRows,
] = await Promise.all([
  fetchSheet("works", SHEETS.works),
  fetchSheet("schedule", SHEETS.schedule),
  fetchSheet("serialDays", SHEETS.serialDays),
  fetchSheet("ageRating", SHEETS.ageRating),
  fetchSheet("watchUrls", SHEETS.watchUrls),
  fetchSheet("staff", SHEETS.staff),
  fetchSheet("workStaff", SHEETS.workStaff),
  fetchSheet("genres", SHEETS.genres),
  fetchSheet("workGenres", SHEETS.workGenres),
  fetchSheet("tags", SHEETS.tags),
  fetchSheet("workTags", SHEETS.workTags),
  fetchSheet("companies", SHEETS.companies),
  fetchSheet("workCompanies", SHEETS.workCompanies),
]);

const staffById = new Map(staffRows.map((r) => [r.staff_id, r.staff_name]));
const genreById = new Map(genreRows.map((r) => [r.genre_id, r.genre_name_ko]));
const tagById = new Map(tagRows.map((r) => [r.tag_id, r.tag_name_ko]));
const companyById = new Map(companyRows.map((r) => [r.company_id, r.company_name]));

const scheduleBy = new Map(scheduleRows.map((r) => [r.content_id, r]));
const ageBy = groupBy(ageRows, "content_id");
const serialBy = groupBy(serialDayRows, "content_id");
const watchBy = groupBy(watchRows, "content_id");
const staffLinkBy = groupBy(workStaffRows, "content_id");
const genreLinkBy = groupBy(workGenreRows, "content_id");
const tagLinkBy = groupBy(workTagRows, "content_id");
const companyLinkBy = groupBy(workCompanyRows, "content_id");

const works = [];

for (let i = 0; i < workRows.length; i += 1) {
  const row = workRows[i];
  const cid = row.content_id;
  if (!cid) continue;

  const title = row.title || cid;
  const summary = row.summary || "";
  const thumb = row.thumbnail_url || undefined;
  const wtype = row.content_type === "웹툰" ? "webtoon" : "anime";
  const status = row.status || "미정";
  const original = row.original_title || undefined;

  const genres = (genreLinkBy.get(cid) ?? [])
    .map((link) => genreById.get(link.genre_id))
    .filter(Boolean);
  const uniqueGenres = [...new Set(genres)];

  const tags = (tagLinkBy.get(cid) ?? [])
    .map((link) => tagById.get(link.tag_id))
    .filter(Boolean);
  const uniqueTags = [...new Set(tags)];

  const platforms = [];
  const seenPlatform = new Set();
  for (const link of watchBy.get(cid) ?? []) {
    const name = link.platform;
    if (!name || seenPlatform.has(name)) continue;
    seenPlatform.add(name);
    platforms.push({
      name,
      url: link.watch_url || undefined,
      offerType: link.offer_type || undefined,
    });
  }

  const staffLinks = staffLinkBy.get(cid) ?? [];
  const directors = [];
  const writers = [];
  const illustrators = [];
  const otherStaff = [];
  for (const link of staffLinks) {
    const name = staffById.get(link.staff_id);
    if (!name) continue;
    const role = link.role || "";
    if (role.includes("감독")) directors.push(name);
    else if (role.includes("글") || role.includes("원작") || role.includes("각본")) writers.push(name);
    else if (role.includes("그림") || role.includes("작화")) illustrators.push(name);
    else otherStaff.push(`${name}${role ? `(${role})` : ""}`);
  }

  const companies = (companyLinkBy.get(cid) ?? [])
    .map((link) => companyById.get(link.company_id))
    .filter(Boolean);
  const uniqueCompanies = [...new Set(companies)];

  const schedule = scheduleBy.get(cid);
  const episodes = schedule?.total_count
    ? `${schedule.total_count}화`
    : "";
  const period = formatPeriod(schedule?.start_date, schedule?.end_date);

  const serialRows = serialBy.get(cid) ?? [];
  const serialDayCodes = [
    ...new Set(serialRows.map((r) => String(r.day_code ?? "").trim().toUpperCase()).filter(Boolean)),
  ];
  const serialDays = [
    ...new Set(serialRows.map((r) => String(r.day_name ?? "").trim()).filter(Boolean)),
  ];

  const ageKr = (ageBy.get(cid) ?? []).find((r) => r.country_code === "KR")
    ?? (ageBy.get(cid) ?? [])[0];
  const ageRating = ageKr?.rating || undefined;

  works.push({
    id: cid,
    title,
    type: wtype,
    thumbnailUrl: thumb,
    coverTone: tones[i % tones.length],
    rating: 0,
    ratingCount: 0,
    genres: uniqueGenres,
    tags: uniqueTags,
    overview: summary || `${title}에 대한 정보가 준비 중입니다.`,
    platforms,
    /** @deprecated use platforms — kept for older UI that expects string[] */
    platform: platforms.map((p) => p.name),
    statusLabel: status,
    ageRating,
    serialDays,
    serialDayCodes,
    meta: {
      original,
      studio: uniqueCompanies[0] || undefined,
      studios: uniqueCompanies,
      director: directors[0] || undefined,
      directors,
      writer: writers[0] || undefined,
      writers,
      illustrator: illustrators[0] || undefined,
      illustrators,
      episodes,
      period,
      staffExtra: otherStaff.slice(0, 5),
    },
  });
}

fs.writeFileSync(outPath, JSON.stringify(works), "utf8");
const anime = works.filter((w) => w.type === "anime").length;
const webtoon = works.filter((w) => w.type === "webtoon").length;
const withGenre = works.filter((w) => w.genres.length).length;
const withPlatform = works.filter((w) => w.platforms.length).length;
console.log(
  `Wrote ${works.length} works (${anime} anime / ${webtoon} webtoon) → ${outPath}`
);
console.log(`  genres filled: ${withGenre}, platforms filled: ${withPlatform}`);
