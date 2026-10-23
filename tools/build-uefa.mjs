// ARENA 360 · coefficients UEFA (pays + clubs) → uefa.json
// L'API de l'UEFA refuse les appels venant d'un autre site : GitHub Actions la lit et publie un petit fichier.
// Usage : node tools/build-uefa.mjs [saison]   (saison = année de fin, ex. 2027 pour 2026-27)
import { writeFileSync } from "node:fs";

const now = new Date();
const SEASON = +process.argv[2] || (now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear());
const url = type => `https://comp.uefa.com/v2/coefficients?coefficientRange=OVERALL&coefficientType=${type}&seasonYear=${SEASON}&page=1&pagesize=500&language=EN`;

async function get(type) {
  const r = await fetch(url(type), { headers: { "User-Agent": "Arena360 (https://arena.eraz.ovh)" } });
  if (!r.ok) throw new Error(`${type} HTTP ${r.status}`);
  return (await r.json()).data;
}
const r3 = x => Math.round(x * 1000) / 1000;
const seasons = s => Object.fromEntries((s || []).map(x => [x.seasonYear, r3(x.totalValue)]));

const [A, C] = await Promise.all([get("MEN_ASSOCIATION"), get("MEN_CLUB")]);
const assoc = A.members.map(m => ({
  code: m.member.countryCode, name: m.member.displayName, pos: m.overallRanking.position, total: r3(m.overallRanking.totalValue),
  seasons: seasons(m.seasonRankings), teams: m.overallRanking.numberOfTeams, inPlay: m.overallRanking.numberOfTeamsStillInPlaying,
  trend: m.overallRanking.trend,
})).sort((a, b) => a.pos - b.pos);
const clubs = C.members.map(m => ({
  id: m.member.id, name: m.member.displayName, official: m.member.displayOfficialName, country: m.member.countryCode, pos: m.overallRanking.position, total: r3(m.overallRanking.totalValue),
  seasons: seasons(m.seasonRankings), comp: m.competition?.displayName || null, trend: m.overallRanking.trend,
})).sort((a, b) => a.pos - b.pos);

if (assoc.length < 40 || clubs.length < 200) throw new Error(`données incomplètes (${assoc.length} pays, ${clubs.length} clubs)`);
writeFileSync(new URL("../uefa.json", import.meta.url), JSON.stringify({ updated: C.lastUpdateDate, season: SEASON, assoc, clubs }));
console.log(`uefa.json : saison ${SEASON}, ${assoc.length} pays, ${clubs.length} clubs (UEFA ${C.lastUpdateDate})`);
