import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "src", "lib", "works.data.json");
const cacheCsvPath = path.join(root, "data", "Allblu_media_content_database.csv");

/** Google Sheet: Allblu_media_content_database */
const SHEET_ID = "1ZrLSqkNDWugAl2iLuAnQzihYjSg2wXOEzuxDWkyy4yQ";
const SHEET_GID = "119065602";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

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

async function loadCsvText() {
  console.log(`Fetching Google Sheet…\n  ${SHEET_CSV_URL}`);
  const res = await fetch(SHEET_CSV_URL, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Sheet export failed: HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text.includes("content_id") || text.includes("<!DOCTYPE html")) {
    throw new Error(
      "Sheet export did not return CSV. Make sure the sheet is shared as “Anyone with the link can view”."
    );
  }
  fs.mkdirSync(path.dirname(cacheCsvPath), { recursive: true });
  fs.writeFileSync(cacheCsvPath, text, "utf8");
  console.log(`Cached CSV → ${cacheCsvPath}`);
  return text;
}

const raw = (await loadCsvText()).replace(/^\uFEFF/, "");
const table = parseCsv(raw);
const headers = table[0];
const works = [];

for (let r = 1; r < table.length; r += 1) {
  const cells = table[r];
  if (!cells || !cells.length) continue;
  const obj = Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? ""]));
  const cid = (obj.content_id || "").trim();
  if (!cid) continue;
  const title = (obj.title || "").trim() || cid;
  const summary = (obj.summary || "").trim();
  const thumb = (obj.thumbnail_url || "").trim() || undefined;
  const wtype = (obj.content_type || "").trim() === "웹툰" ? "webtoon" : "anime";
  const status = (obj.status || "").trim() || "미정";
  const original = (obj.original_title || "").trim() || undefined;
  const h = parseInt(crypto.createHash("md5").update(cid).digest("hex").slice(0, 8), 16);
  works.push({
    id: cid,
    title,
    type: wtype,
    thumbnailUrl: thumb,
    coverTone: tones[(r - 1) % tones.length],
    rating: Math.round((3.5 + (h % 15) / 10) * 10) / 10,
    ratingCount: 200 + (h % 5000),
    genres: [],
    overview: summary || `${title}에 대한 정보가 준비 중입니다.`,
    platform: [],
    statusLabel: status,
    meta: {
      original,
      episodes: "",
      period: "",
    },
  });
}

fs.writeFileSync(outPath, JSON.stringify(works), "utf8");
const anime = works.filter((w) => w.type === "anime").length;
const webtoon = works.filter((w) => w.type === "webtoon").length;
console.log(`Wrote ${works.length} works (${anime} anime / ${webtoon} webtoon) → ${outPath}`);
