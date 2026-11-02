// ARENA 360 · effectifs des équipes World Tour et ProTeam → cycling-riders.json
// Donne au jeu tous les coureurs pros (même sans victoire), avec leur équipe, leur nationalité et leur date de naissance.
// Usage : node tools/build-riders.mjs [saison]   (par défaut : la saison la plus récente disponible sur Wikipédia)
import { writeFileSync } from "node:fs";

const API = "https://en.wikipedia.org/w/api.php?format=json&formatversion=2&redirects=1&";
const UA = { "User-Agent": "Arena360/1.0 (https://arena.eraz.ovh)" };
async function api(params) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(API + params, { headers: UA });
    if (r.status === 429) { await new Promise(res => setTimeout(res, 2000 * (i + 1))); continue; }
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  throw new Error("Wikipédia ne répond pas");
}
const page = async title => (await api("action=parse&prop=wikitext&page=" + encodeURIComponent(title))).parse?.wikitext || null;
const expand = async text => (await api("action=expandtemplates&prop=wikitext&text=" + encodeURIComponent(text))).expandtemplates.wikitext;

const linkText = s => String(s || "").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/\{\{[^}]*\}\}/g, "").replace(/<[^>]+>/g, "").trim();
// {{Cycling squad rider|name=[[X]]|nat=GER|birthdate={{birth date and age2|df=yes|2026|1|1|2001|1|16}}}}
function squad(text) {
  const out = [];
  for (const m of text.matchAll(/\{\{\s*Cycling squad rider\s*\|((?:[^{}]|\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\})*)\}\}/gi)) {
    const body = m[1];
    const name = linkText(body.match(/name\s*=\s*((?:\[\[[^\]]*\]\]|[^|{}])+)/)?.[1]);
    const nat = body.match(/nat\s*=\s*([A-Z]{3})/)?.[1] || null;
    const nums = (body.match(/birth date[^}]*\}\}/i)?.[0].match(/\|\s*(\d{1,4})\s*(?=\||\}\})/g) || []).map(x => +x.replace(/\D/g, ""));
    const [y, mo, d] = nums.slice(-3);
    const born = y > 1950 && mo && d ? `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
    if (name) out.push({ name, nat, born });
  }
  return out;
}

async function worldTeams(season) {
  const w = await page(`List of ${season} UCI WorldTeams and riders`);
  if (!w) return null;
  const riders = [];
  for (const sec of w.split(/\n===\s*/).slice(1)) {
    const team = linkText(sec.split("===")[0]);
    squad(sec).forEach(r => riders.push({ ...r, team, level: "WT" }));
  }
  return riders;
}

async function proTeams(season) {
  const w = await page(`List of ${season} UCI ProTeams and Continental teams`);
  if (!w) return [];
  const sec = w.split(/\n==[^=]/).find(s => /ProTeams\s*==/.test(s.split("\n")[0])) || "";
  const codes = [...sec.matchAll(/\{\{\s*UCI team code\s*\|([^|}]+)\|\s*\d{4}\s*\}\}/g)].map(m => m[1].trim());
  const riders = [];
  for (const code of codes) {
    const link = (await expand(`{{UCI team code|${code}|${season}}}`)).match(/\[\[([^\]|]+)/)?.[1];
    if (!link) continue;
    const art = await page(link);
    // premier effectif de la page (celui de la saison en cours)
    const block = art?.match(/\{\{\s*Cycling squad start[\s\S]*?\{\{\s*Cycling squad end/i)?.[0] || "";
    const list = squad(block);
    const team = linkText((await expand(`{{UCI team code|${code}|${season}}}`)).match(/\[\[[^\]]+\]\]/)?.[0]);
    list.forEach(r => riders.push({ ...r, team, level: "PRT" }));
    process.stdout.write(`\rProTeams : ${code} (${list.length})        `);
  }
  console.log();
  return riders;
}

let season = Number(process.argv[2]) || new Date().getFullYear() + 1;
let wt = null;
for (; season >= 2025 && !wt; season--) wt = await worldTeams(season);
season++;
if (!wt || wt.length < 300) throw new Error("Liste des WorldTeams introuvable ou incomplète");
const pro = await proTeams(season);
const seen = new Set();
const riders = [...wt, ...pro].filter(r => { const k = r.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
writeFileSync(new URL("../cycling-riders.json", import.meta.url), JSON.stringify({ season, updated: new Date().toISOString().slice(0, 10), riders }));
console.log(`cycling-riders.json écrit : saison ${season}, ${wt.length} coureurs World Tour, ${pro.length} coureurs ProTeam, ${riders.filter(r => r.born).length} avec date de naissance`);
