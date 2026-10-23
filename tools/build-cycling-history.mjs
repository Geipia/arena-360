// ARENA 360 · résultats cyclisme des saisons passées → cycling-history.json
// Sert à calculer le prix des coureurs du jeu sur plusieurs saisons (pas seulement la dernière).
// Usage : node tools/build-cycling-history.mjs 2025 2024
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const CyclingLive = createRequire(import.meta.url)("../cycling-live.js");

const years = process.argv.slice(2).map(Number).filter(Boolean);
if (!years.length) throw new Error("Donne au moins une saison, ex. : node tools/build-cycling-history.mjs 2025 2024");

const API = "https://en.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&redirects=1&prop=wikitext&page=";
async function fetchText(title) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(API + encodeURIComponent(title), { headers: { "User-Agent": "Arena360/1.0 (https://arena.eraz.ovh)" } });
    if (r.status === 429) { await new Promise(res => setTimeout(res, 2000 * (i + 1))); continue; }
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    return d.parse ? d.parse.wikitext : null;
  }
  return null;
}
// on ne garde que ce qui sert au calcul des points (vainqueurs, podiums, étapes, maillots)
const slimRider = a => a ? { name: a.name, nat: a.nat || null, ...(a.team ? { team: a.team } : {}) } : null;
const slimRace = r => ({
  race: r.race, date: r.date, ...(r.rating ? { rating: r.rating } : {}), ...(r.level ? { level: r.level } : {}),
  winner: slimRider(r.winner), ...(r.second ? { second: slimRider(r.second) } : {}), ...(r.third ? { third: slimRider(r.third) } : {}),
  ...(r.stages ? { stages: r.stages.map(s => ({ n: s.n, date: s.date, winner: slimRider(s.winner) })) } : {}),
  ...(r.jerseys ? { jerseys: r.jerseys.map(j => ({ cls: j.cls, name: j.name })) } : {}),
});

const out = {};
for (const y of years) {
  const D = await CyclingLive.loadSeason(y, { fetchText, concurrency: 3, onProgress: (a, b) => process.stdout.write(`\r${y} : étapes ${a}/${b}   `) });
  out[y] = {
    season: y,
    worldtour: D.worldtour.filter(r => r.winner).map(slimRace),
    proseries: D.proseries.filter(r => r.winner).map(slimRace),
    europetour: D.europetour.filter(r => r.winner).map(slimRace),
    championships: D.championships,
  };
  const n = k => out[y][k].length;
  console.log(`\n${y} : ${n("worldtour")} World Tour, ${n("proseries")} ProSeries, ${n("europetour")} Europe Tour, ${n("championships")} championnats`);
  if (n("worldtour") < 20) throw new Error(`${y} : trop peu de courses World Tour, Wikipédia a peut-être changé`);
}
writeFileSync(new URL("../cycling-history.json", import.meta.url), JSON.stringify(out));
console.log("cycling-history.json écrit");
