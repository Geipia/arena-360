// Construit belges.json : tous les joueurs belges des clubs suivis par Arena 360, avec leurs buts et passes décisives
// par compétition (championnat, coupes d'Europe, coupes nationales), + les derniers buts belges.
// Lancé chaque jour par GitHub Actions (.github/workflows/belges.yml). Node 20+, aucune dépendance.
import { writeFileSync } from "node:fs";

const API = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const API_STD = "https://site.api.espn.com/apis/v2/sports/soccer";
const OUT = process.argv[2] || "belges.json";
const NATION = "BEL";

// championnats suivis (mêmes que l'appli) + noms affichés
const LEAGUES = {
  "bel.1": "Jupiler Pro League", "eng.1": "Premier League", "esp.1": "LaLiga", "fra.1": "Ligue 1", "ita.1": "Serie A", "ger.1": "Bundesliga",
  "ned.1": "Eredivisie", "por.1": "Liga Portugal", "tur.1": "Süper Lig", "sco.1": "Premiership", "aut.1": "Bundesliga (AUT)", "sui.1": "Super League",
  "gre.1": "Super League (GRE)", "den.1": "Superliga", "nor.1": "Eliteserien", "swe.1": "Allsvenskan", "cze.1": "Chance Liga", "rou.1": "SuperLiga",
  "rus.1": "Premier Liga", "cyp.1": "First Division", "isr.1": "Ligat ha'Al", "irl.1": "Premier Division", "fin.1": "Veikkausliiga",
  "wal.1": "Cymru Premier", "nir.1": "Premiership (NIR)", "mlt.1": "Premier League (MLT)",
  "eng.2": "Championship", "fra.2": "Ligue 2", "ger.2": "2. Bundesliga", "esp.2": "LaLiga 2", "ita.2": "Serie B", "ned.2": "Eerste Divisie",
};
const COMP_NAMES = {
  "uefa.champions": "Ligue des Champions", "uefa.europa": "Europa League", "uefa.europa.conf": "Conference League",
  "uefa.champions_qual": "Qualifs Ligue des Champions", "uefa.europa_qual": "Qualifs Europa League", "uefa.europa.conf_qual": "Qualifs Conference League",
  "uefa.super_cup": "Supercoupe d'Europe", "eng.fa": "FA Cup", "eng.league_cup": "Carabao Cup", "esp.copa_del_rey": "Copa del Rey",
  "fra.coupe_de_france": "Coupe de France", "ita.coppa_italia": "Coppa Italia", "ger.dfb_pokal": "DFB-Pokal", "ned.cup": "KNVB Beker",
  "por.taca.portugal": "Taça de Portugal", "sco.tennents": "Scottish Cup", "sco.cis": "League Cup (SCO)",
};
const kindOf = slug => slug.startsWith("uefa.") ? "europe" : LEAGUES[slug] ? "league" : "cup";

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, tries = 3) {
  for (let k = 0; k < tries; k++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); if (r.status === 404 || r.status === 400) return null; } catch {}
    await sleep(800 * (k + 1));
  }
  return null;
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
/* lundi 0 h de la semaine en cours, heure de Bruxelles */
function mondayBrussels(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(now).map(p => [p.type, p.value]));
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday);
  const local = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day - dow));
  const offsetH = Math.round((Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour) - Math.floor(now / 36e5) * 36e5) / 36e5);
  return new Date(+local - offsetH * 36e5);
}
const statsOf = a => {
  const s = {};
  for (const c of a?.statistics?.splits?.categories || []) for (const x of c.stats || []) s[x.name] = x.value;
  return s;
};

const players = new Map();   // id → joueur
const teamInfo = new Map();  // id → { name, logo, league }

async function scanRoster(slug, teamId) {
  const d = await get(`${API}/${slug}/teams/${teamId}/roster`);
  if (!d?.athletes) return 0;
  if (d.team) {
    const t = teamInfo.get(teamId) || {};
    teamInfo.set(teamId, { name: t.name || d.team.displayName, short: t.short || d.team.shortDisplayName || d.team.displayName, logo: t.logo || d.team.logo || d.team.logos?.[0]?.href, league: t.league || (LEAGUES[slug] ? slug : null) });
  }
  let n = 0;
  for (const a of d.athletes) {
    if (a.citizenshipCountry?.abbreviation !== NATION) continue;
    n++;
    const s = statsOf(a);
    const p = players.get(a.id) || {
      id: a.id, name: a.displayName, short: a.shortName || a.displayName, age: a.age || null,
      pos: a.position?.abbreviation || "", posName: a.position?.displayName || "", photo: a.headshot?.href || null,
      teamId, comps: {},
    };
    if (LEAGUES[slug] && !p.leagueSlug) { p.teamId = teamId; p.leagueSlug = slug; }
    const goals = s.totalGoals || 0, assists = s.goalAssists || 0, apps = s.appearances || 0;
    if (goals || assists || apps) p.comps[slug] = { goals, assists, apps, kind: kindOf(slug), name: LEAGUES[slug] || COMP_NAMES[slug] || slug };
    players.set(a.id, p);
  }
  return n;
}

(async () => {
  const t0 = Date.now();
  // 1) tous les clubs des championnats suivis (via les classements)
  const leagueTeams = [];
  await pool(Object.keys(LEAGUES), 6, async slug => {
    const d = await get(`${API_STD}/${slug}/standings`);
    const groups = d?.children?.length ? d.children : d?.standings ? [{ standings: d.standings }] : [];
    for (const g of groups) for (const e of g.standings?.entries || []) {
      leagueTeams.push({ slug, id: e.team.id });
      teamInfo.set(e.team.id, { name: e.team.displayName, short: e.team.shortDisplayName || e.team.displayName, logo: e.team.logos?.[0]?.href, league: slug });
    }
  });
  console.log("clubs :", leagueTeams.length);
  // 2) effectifs → joueurs belges + stats de championnat
  const withBelgians = new Set();
  await pool(leagueTeams, 8, async ({ slug, id }) => { if (await scanRoster(slug, id)) withBelgians.add(id); });
  console.log("clubs avec des Belges :", withBelgians.size, "· joueurs :", players.size);
  // 3) autres compétitions de ces clubs (coupes d'Europe, coupes nationales) d'après leur calendrier
  const extra = [];
  await pool([...withBelgians], 8, async id => {
    const sch = await get(`${API}/all/teams/${id}/schedule`);
    const slugs = new Set((sch?.events || []).map(e => e.league?.slug).filter(s => s && !/friendly/.test(s) && !LEAGUES[s]));
    slugs.forEach(s => extra.push({ slug: s, id }));
  });
  await pool(extra, 8, ({ slug, id }) => scanRoster(slug, id));
  // 4) derniers buts belges (10 derniers jours, toutes compétitions des clubs suivis)
  const belgianIds = new Set(players.keys());
  const recent = [];
  const weekEvents = new Map();   // matchs depuis lundi qui concernent un club avec des Belges
  const monday = mondayBrussels();
  const days = [...Array(10)].map((_, k) => { const d = new Date(Date.now() - k * 864e5); return d.toISOString().slice(0, 10).replace(/-/g, ""); });
  const comps = [...new Set([...Object.keys(LEAGUES), ...Object.keys(COMP_NAMES)])];
  await pool(comps.flatMap(c => days.map(d => [c, d])), 10, async ([c, day]) => {
    const d = await get(`${API}/${c}/scoreboard?dates=${day}`);
    for (const e of d?.events || []) {
      const comp = e.competitions?.[0];
      if (!comp?.status?.type?.completed && comp?.status?.type?.state !== "in") continue;
      const home = comp.competitors.find(x => x.homeAway === "home"), away = comp.competitors.find(x => x.homeAway === "away");
      if (comp.status.type.completed && new Date(e.date) >= monday && (withBelgians.has(home.team.id) || withBelgians.has(away.team.id) || (comp.details || []).some(x => belgianIds.has(x.athletesInvolved?.[0]?.id))))
        weekEvents.set(e.id, { slug: c, e, home, away });
      for (const det of comp.details || []) {
        if (!det.scoringPlay || det.shootout) continue;
        const scorer = det.athletesInvolved?.[0];
        if (!scorer || !belgianIds.has(scorer.id)) continue;
        recent.push({ playerId: scorer.id, eventId: e.id, league: c, comp: LEAGUES[c] || COMP_NAMES[c] || c, date: e.date, minute: det.clock?.displayValue || "",
          pen: !!det.penaltyKick, og: !!det.ownGoal, teamId: det.team?.id,
          match: { home: home.team.shortDisplayName || home.team.displayName, away: away.team.shortDisplayName || away.team.displayName, hs: home.score, as: away.score,
            homeLogo: home.team.logo, awayLogo: away.team.logo } });
      }
    }
  });
  recent.sort((a, b) => new Date(b.date) - new Date(a.date));
  // 4b) la semaine (depuis lundi, heure belge) : buts ET passes décisives, lus dans la fiche de chaque match
  const week = { from: monday.toISOString(), goals: [], assists: [] };
  await pool([...weekEvents.values()], 8, async ({ slug, e, home, away }) => {
    const d = await get(`${API}/${slug}/summary?event=${e.id}`);
    const match = { home: home.team.shortDisplayName || home.team.displayName, away: away.team.shortDisplayName || away.team.displayName, hs: home.score, as: away.score,
      homeLogo: home.team.logo, awayLogo: away.team.logo };
    for (const k of d?.keyEvents || []) {
      if (!k.scoringPlay || /shootout/i.test(k.type?.type || "")) continue;
      const [scorer, assist] = (k.participants || []).map(x => x.athlete?.id);
      const base = { eventId: e.id, league: slug, comp: LEAGUES[slug] || COMP_NAMES[slug] || slug, date: e.date, minute: k.clock?.displayValue || "", match,
        pen: /penalty/i.test(k.type?.text || "") };
      if (scorer && belgianIds.has(scorer) && k.type?.type !== "own-goal") week.goals.push({ playerId: scorer, ...base });
      if (assist && belgianIds.has(assist)) week.assists.push({ playerId: assist, ...base, scorer: k.participants?.[0]?.athlete?.displayName || "" });
    }
  });
  week.goals.sort((a, b) => new Date(b.date) - new Date(a.date));
  week.assists.sort((a, b) => new Date(b.date) - new Date(a.date));
  // 5) sortie : joueurs ayant joué cette saison, avec totaux
  const list = [...players.values()].map(p => {
    const c = Object.entries(p.comps).map(([slug, v]) => ({ slug, ...v }));
    const tot = k => c.reduce((s, x) => s + (x[k] || 0), 0);
    const t = teamInfo.get(p.teamId) || {};
    return { ...p, comps: c.sort((a, b) => b.goals - a.goals || b.assists - a.assists), goals: tot("goals"), assists: tot("assists"), apps: tot("apps"),
      team: t.short || t.name || "", teamLogo: t.logo || null, league: p.leagueSlug || t.league || null, leagueName: LEAGUES[p.leagueSlug || t.league] || "" };
  }).filter(p => p.apps || p.goals || p.assists)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.apps - a.apps);
  const data = { generatedAt: new Date().toISOString(), season: "2026-27", players: list, recent: recent.slice(0, 60), week };
  writeFileSync(OUT, JSON.stringify(data));
  console.log(`belges.json : ${list.length} joueurs, ${data.players.reduce((s, p) => s + p.goals, 0)} buts, ${recent.length} buts récents, semaine : ${week.goals.length} buts et ${week.assists.length} passes D (${weekEvents.size} matchs), ${Math.round((Date.now() - t0) / 1000)} s`);
})();
