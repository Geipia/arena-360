/* ARENA 360 — « Je parie » Football : 3 équipes, un budget, des points à chaque victoire et chaque semaine en tête.
   Prix = force sur plusieurs saisons (championnat cette saison et la passée, coefficient UEFA du club et du pays). Points calculés en direct avec les résultats ESPN. */
"use strict";

const FOOT = {
  season: "2026-27",
  start: new Date(2027, 0, 1),            // début du jeu : mercato de janvier (avant, choix et changements libres)
  end: new Date(2027, 4, 31, 23, 59),     // fin de la saison du jeu
  budget: 75,
  size: 3,
  maxChanges: 5,
};
const FBAREME = [
  { key: "league", label: "Match de championnat", w: 3, d: 1 },
  { key: "uefa.champions", label: "Ligue des Champions", w: 6, d: 2 },
  { key: "uefa.europa", label: "Europa League", w: 5, d: 2 },
  { key: "uefa.europa.conf", label: "Conference League", w: 4, d: 1 },
  { key: "qual", label: "Qualifications européennes", w: 2, d: 1 },
  { key: "big", label: "Supercoupe d'Europe, Coupe du monde des clubs", w: 6, d: 2 },
  { key: "cup", label: "Coupes nationales et supercoupes", w: 3, d: 1 },
];
const LEADER_PTS = 3, CHAMPION_PTS = 25;

function compKind(slug, teamLeague) {
  if (!slug || /friendly/.test(slug)) return null;
  if (slug === teamLeague || BY_SLUG[slug]?.g === "d1") return FBAREME[0];
  if (/_qual$|conf_qual/.test(slug)) return FBAREME[4];
  if (slug === "uefa.champions") return FBAREME[1];
  if (slug === "uefa.europa") return FBAREME[2];
  if (slug === "uefa.europa.conf") return FBAREME[3];
  if (slug === "uefa.super_cup" || slug === "fifa.cwc") return FBAREME[5];
  return FBAREME[6];
}

// ---------------------------------------------------------------- marché des équipes (prix sur plusieurs saisons)
/* Prix d'une équipe = force sur plusieurs saisons :
   - championnat : points par match cette saison, mélangés avec la saison passée (qui pèse moins à mesure que la saison avance),
     multipliés par le niveau du championnat (coefficient UEFA du pays sur 5 ans) ;
   - Europe : coefficient UEFA du club (ses résultats européens des 5 dernières saisons). */
const PRICE_MIN = 5, PRICE_MAX = 40;
const PREV_WEIGHT = 12;        // la saison passée compte comme 12 matchs
let FMARKET = null;
const normTeam = n => String(n || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " ")
  .replace(/\bkobenhavn\b/g, "copenhagen").replace(/^h /, "hapoel ").replace(/^m /, "maccabi ")
  .replace(/\b(fc|fk|nk|sk|hnk|gnk|ks|cf|sc|ac|afc|pfc|bc|club|football|futbol|futebol|calcio|de|the|cd|sd|ud|rc|as|ss|ssc|sv|vfb|vfl|tsg|bv|kv|krc|rsc|kaa|royal|sporting)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ").trim();
function nameSim(names, club) {
  const bi = s => { const t = s.replace(/ /g, ""), m = new Map(); for (let i = 0; i < t.length - 1; i++) m.set(t.slice(i, i + 2), (m.get(t.slice(i, i + 2)) || 0) + 1); return m; };
  const dice = (a, b) => { const A = bi(a), B = bi(b); let n = 0, na = 0, nb = 0; A.forEach(v => na += v); B.forEach(v => nb += v); A.forEach((v, k) => n += Math.min(v, B.get(k) || 0)); return na + nb ? 2 * n / (na + nb) : 0; };
  let best = 0;
  for (const a of names.map(normTeam)) for (const b of [club.name, club.official].map(normTeam)) {
    if (!a || !b) continue;
    let s = a === b ? 1 : dice(a, b);
    if ((" " + b + " ").includes(" " + a + " ") || (" " + a + " ").includes(" " + b + " ")) s = Math.max(s, .85);
    best = Math.max(best, s);
  }
  return best;
}
/* relie chaque équipe du marché à son club UEFA (même pays, noms les plus proches d'abord) */
function attachUefa(list, U) {
  if (!U) return;
  const isoToCode = {};
  U.assoc.forEach(a => { const iso = UEFA_ISO[a.code]; if (iso) isoToCode[iso] = a.code; });
  const assoc = new Map(U.assoc.map(a => [a.code, a]));
  const byCountry = new Map();
  list.forEach(t => { t.ucode = isoToCode[t.flag] || null; t.assoc = assoc.get(t.ucode) || null; if (t.ucode) (byCountry.get(t.ucode) || byCountry.set(t.ucode, []).get(t.ucode)).push(t); });
  byCountry.forEach((teams, code) => {
    const clubs = U.clubs.filter(c => c.country === code);
    const pairs = [];
    teams.forEach(t => clubs.forEach(c => { const s = nameSim([t.name, t.short], c); if (s >= .7) pairs.push([s, t, c]); }));
    pairs.sort((a, b) => b[0] - a[0]);
    const usedT = new Set(), usedC = new Set();
    for (const [, t, c] of pairs) { if (usedT.has(t) || usedC.has(c)) continue; usedT.add(t); usedC.add(c); t.club = c; }
  });
}
function priceTeams(list, U) {
  attachUefa(list, U);
  const maxAssoc = U ? U.assoc[0].total : 1, maxClub = U ? U.clubs[0].total : 1;
  for (const t of list) {
    const now = t.gp ? t.pts / t.gp : null;
    const prev = t.prevGp ? t.prevPts / t.prevGp : 1.3;                      // sans saison passée connue : niveau moyen
    const ppg = now == null ? prev : (now * t.gp + prev * PREV_WEIGHT) / (t.gp + PREV_WEIGHT);
    const level = t.assoc ? Math.pow(t.assoc.total / maxAssoc, .8) : t.wiki ? .3 : .4;
    const dom = Math.pow(Math.min(ppg, 2.6) / 2.6, 1.2) * level;
    const eur = t.club ? Math.pow(t.club.total / maxClub, .8) : 0;
    const s = .5 * dom + .5 * eur;
    t.ppgMix = Math.round(ppg * 100) / 100;
    t.coef = t.club ? t.club.total : null;
    t.price = Math.min(PRICE_MAX, Math.max(PRICE_MIN, Math.round(PRICE_MIN + 36 * Math.pow(s, 1.15))));
  }
}
const standingRows = d => (d?.children?.length ? d.children : d?.standings ? [{ standings: d.standings }] : [])
  .flatMap(g => (g.standings?.entries || []).map(e => ({ e, st: Object.fromEntries(e.stats.map(s => [s.name, s])) })));
async function loadFootMarket() {
  if (FMARKET && Date.now() - FMARKET.at < 15 * 60e3) return FMARKET;
  const leagues = LEAGUES.filter(l => l.g === "d1");
  const prevYear = FOOT.start.getFullYear() - 2;   // saison 2025-26 (ou 2025 pour les championnats sur l'année civile)
  const [res, prevRes, U] = await Promise.all([
    pool(leagues, 8, l => getJSON(`${API_STD}/${l.s}/standings`, 15 * 60e3)),
    pool(leagues, 8, l => getJSON(`${API_STD}/${l.s}/standings?season=${prevYear}`, 24 * 3600e3).catch(() => null)),
    window.loadUefa ? window.loadUefa().catch(() => null) : null,
  ]);
  const list = [];
  leagues.forEach((l, i) => {
    // saison passée : on additionne les groupes (ex. play-offs belges) pour avoir toute la saison
    const prev = new Map();
    standingRows(prevRes[i]).forEach(({ e, st }) => {
      const p = prev.get(e.team.id) || { gp: 0, pts: 0 };
      p.gp += +(st.gamesPlayed?.value || 0); p.pts += +(st.points?.value || 0);
      prev.set(e.team.id, p);
    });
    standingRows(res[i]).forEach(({ e, st }) => {
      const p = prev.get(e.team.id);
      list.push({ id: e.team.id, name: e.team.displayName, short: e.team.shortDisplayName || e.team.displayName, logo: e.team.logos?.[0]?.href,
        league: l.s, lname: l.n, country: l.c, flag: l.f, rank: +(st.rank?.value || 0), pts: +(st.points?.value || 0), gp: +(st.gamesPlayed?.value || 0),
        gd: st.pointDifferential?.displayValue || "0", prevGp: p?.gp || 0, prevPts: p?.pts || 0 });
    });
  });
  // championnats lus sur Wikipédia (pays absents d'ESPN)
  const espnByName = await europeanTeamIds();
  const wl = WikiLeagues.WIKI_LEAGUES;
  const wres = await pool(wl, 4, l => WikiLeagues.current(l));
  wl.forEach((l, i) => {
    (wres[i]?.teams || []).forEach(t => {
      list.push({ id: `${l.s}:${t.code}`, code: t.code, wiki: true, name: t.name, short: t.name, logo: null, espn: espnByName.get(normTeam(t.name)) || null,
        league: l.s, lname: l.n, country: l.c, flag: l.f, rank: t.rank, pts: t.pts, gp: t.gp, gd: String(t.gf - t.ga), prevGp: 0, prevPts: 0 });
    });
  });
  priceTeams(list, U);
  list.sort((a, b) => b.price - a.price || (b.coef || 0) - (a.coef || 0) || a.rank - b.rank);
  FMARKET = { at: Date.now(), list, by: new Map(list.map(t => [t.id, t])), leagues: [...LEAGUES.filter(l => l.g === "d1"), ...wl].sort((a, b) => a.c.localeCompare(b.c, "fr")) };
  return FMARKET;
}
/* identifiants ESPN des clubs engagés en coupe d'Europe (pour compter leurs matchs européens) */
async function europeanTeamIds() {
  const slugs = ["uefa.champions", "uefa.europa", "uefa.europa.conf", "uefa.champions_qual", "uefa.europa_qual", "uefa.europa.conf_qual"];
  // (l'adresse « /teams » d'ESPN est refusée par le navigateur : on lit les équipes dans les matchs de la saison)
  const months = [];
  for (let d = new Date(2026, 6, 1); d <= new Date() && d <= FOOT.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(ym(d));
  const jobs = slugs.flatMap(sl => months.map(m => [sl, m]));
  const res = await pool(jobs, 6, ([sl, m]) => getJSON(`${API}/${sl}/scoreboard?dates=${m}`, 6 * 3600e3).catch(() => null));
  const map = new Map();
  res.forEach(d => (d?.events || []).forEach(e => (e.competitions?.[0]?.competitors || []).forEach(({ team }) => {
    if (team) [team.displayName, team.shortDisplayName, team.name, team.location].filter(Boolean).forEach(n => map.set(normTeam(n), team.id));
  })));
  return map;
}

// ---------------------------------------------------------------- points
const teamSchedule = id => getJSON(`${API}/all/teams/${id}/schedule`, 10 * 60e3).catch(() => null);
const teamFixtures = id => getJSON(`${API}/all/teams/${id}/schedule?fixture=true`, 30 * 60e3).catch(() => null);

function teamResult(ev, id) {
  const c = ev.competitions?.[0];
  if (!c || !c.status?.type?.completed) return null;
  const me = c.competitors.find(x => x.team?.id === id || x.id === id), op = c.competitors.find(x => x !== me);
  if (!me || !op) return null;
  const sc = x => +(x.score?.value ?? x.score ?? 0);
  const res = me.winner ? "w" : op.winner ? "l" : sc(me) > sc(op) ? "w" : sc(me) < sc(op) ? "l" : "d";
  return { res, gf: sc(me), ga: sc(op), opp: op.team?.shortDisplayName || op.team?.displayName || "", home: me.homeAway === "home", date: new Date(ev.date), slug: ev.league?.slug };
}

/* tableau du championnat reconstruit à une date donnée (pour les bonus « en tête ») */
const leagueSeasonCache = new Map();
async function leagueSeason(slug) {
  const hit = leagueSeasonCache.get(slug);
  if (hit && Date.now() - hit.at < 30 * 60e3) return hit.m;
  const months = [];
  for (let d = new Date(2026, 6, 1); d <= new Date() && d <= FOOT.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(ym(d));
  const res = await pool(months, 4, k => getJSON(`${API}/${slug}/scoreboard?dates=${k}`, 30 * 60e3));
  const m = [];
  res.forEach(d => (d?.events || []).forEach(e => {
    const c = e.competitions[0];
    if (!c.status?.type?.completed) return;
    const h = c.competitors.find(x => x.homeAway === "home"), a = c.competitors.find(x => x.homeAway === "away");
    m.push({ date: new Date(e.date), h: h.team.id, a: a.team.id, hs: +h.score, as: +a.score });
  }));
  leagueSeasonCache.set(slug, { at: Date.now(), m });
  return m;
}
function leaderAt(matches, date) {
  const t = {};
  const row = id => (t[id] = t[id] || { id, p: 0, gd: 0, gf: 0 });
  for (const x of matches) {
    if (x.date >= date) continue;
    const H = row(x.h), A = row(x.a);
    H.gf += x.hs; A.gf += x.as; H.gd += x.hs - x.as; A.gd += x.as - x.hs;
    if (x.hs > x.as) H.p += 3; else if (x.hs < x.as) A.p += 3; else { H.p++; A.p++; }
  }
  return Object.values(t).sort((a, b) => b.p - a.p || b.gd - a.gd || b.gf - a.gf)[0]?.id || null;
}
function mondays() {
  const out = [];
  const end = new Date(Math.min(Date.now(), +FOOT.end + 864e5));
  const first = new Date(FOOT.start); first.setDate(first.getDate() + ((8 - first.getDay()) % 7 || 7));   // premier lundi après le début
  for (let d = first; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) out.push(d);
  return out;
}

/* points d'une entrée : liste d'événements { teamId, pts, date, label } */
async function wikiTeamEvents(h, from, to) {
  const evs = [];
  const l = WikiLeagues.WIKI_LEAGUES.find(x => x.s === h.league);
  const code = h.id.split(":").pop();
  const now = new Date();
  const end = new Date(Math.min(+(to || FOOT.end), +now, +FOOT.end));
  if (!l || from >= end) return evs;
  const [a, b] = await Promise.all([WikiLeagues.at(l, from), end >= now ? WikiLeagues.current(l) : WikiLeagues.at(l, end)]);
  const t1 = a?.teams?.find(t => t.code === code) || { w: 0, d: 0 }, t2 = b?.teams?.find(t => t.code === code);
  if (t2) {
    const w = Math.max(0, t2.w - t1.w), d = Math.max(0, t2.d - t1.d);
    if (w || d) evs.push({ teamId: h.id, pts: 3 * w + d, date: end, res: "w", label: `Championnat : ${w} victoire${w > 1 ? "s" : ""} et ${d} nul${d > 1 ? "s" : ""} depuis le ${from.toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}` });
  }
  for (const mon of mondays()) {
    if (mon < from || (to && mon >= to)) continue;
    const [cur, prev] = await Promise.all([WikiLeagues.at(l, mon), WikiLeagues.at(l, new Date(+mon - 7 * 864e5))]);
    const played = x => (x?.teams || []).reduce((s, t) => s + t.gp, 0);
    if (cur?.teams?.[0]?.code === code && played(cur) > played(prev))
      evs.push({ teamId: h.id, pts: LEADER_PTS, date: mon, res: "lead", label: `En tête du championnat (classement du ${mon.toLocaleDateString("fr-BE", { day: "numeric", month: "short" })})` });
  }
  if (now > FOOT.end && (!to || to > FOOT.end)) {
    const fin = await WikiLeagues.at(l, new Date(+FOOT.end + 864e5));
    if (fin?.teams?.[0]?.code === code) evs.push({ teamId: h.id, pts: CHAMPION_PTS, date: FOOT.end, res: "champ", label: "Champion !" });
  }
  return evs;
}

async function footEvents(entry) {
  const evs = [];
  for (const h of entry.history || []) {
    const from = new Date(Math.max(+new Date(h.from), +FOOT.start)), to = h.to ? new Date(h.to) : null;
    if (to && to <= from) continue;
    const wiki = h.id.startsWith("w:");
    if (wiki) evs.push(...await wikiTeamEvents(h, from, to));
    const espnId = wiki ? (h.espn || FMARKET?.by.get(h.id)?.espn) : h.id;
    const sched = espnId ? await teamSchedule(espnId) : null;
    for (const ev of sched?.events || []) {
      const r = teamResult(ev, espnId);
      if (!r || r.date < from || (to && r.date >= to) || r.date > FOOT.end) continue;
      if (wiki && !/^(uefa|fifa)\./.test(r.slug || "")) continue;   // le championnat est compté via Wikipédia
      const k = compKind(r.slug, h.league);
      if (!k) continue;
      const pts = r.res === "w" ? k.w : r.res === "d" ? k.d : 0;
      evs.push({ teamId: h.id, pts, date: r.date, res: r.res,
        label: `${r.res === "w" ? "Victoire" : r.res === "d" ? "Nul" : "Défaite"} ${r.gf}-${r.ga} ${r.home ? "contre" : "à"} ${r.opp} · ${BY_SLUG[r.slug]?.n || k.label}` });
    }
    if (wiki) continue;
    // semaines en tête du championnat
    const matches = await leagueSeason(h.league);
    for (const mon of mondays()) {
      if (mon < from || (to && mon >= to)) continue;
      const week = matches.some(x => x.date < mon && x.date >= new Date(+mon - 7 * 864e5));
      if (week && leaderAt(matches, mon) === h.id) evs.push({ teamId: h.id, pts: LEADER_PTS, date: mon, res: "lead", label: `En tête du championnat (classement du ${mon.toLocaleDateString("fr-BE", { day: "numeric", month: "short" })})` });
    }
    if (Date.now() > +FOOT.end && (!to || to > FOOT.end) && leaderAt(matches, new Date(+FOOT.end + 864e5)) === h.id)
      evs.push({ teamId: h.id, pts: CHAMPION_PTS, date: FOOT.end, res: "champ", label: "Champion !" });
  }
  return evs.sort((a, b) => b.date - a.date);
}
const fscoreCache = new Map();
async function footScore(entry) {
  const key = JSON.stringify(entry.history || []);
  const hit = fscoreCache.get(entry.id);
  if (hit && hit.key === key && Date.now() - hit.at < 5 * 60e3) return hit.v;
  const evs = await footEvents(entry);
  const v = { total: evs.reduce((s, e) => s + e.pts, 0), evs };
  fscoreCache.set(entry.id, { key, at: Date.now(), v });
  return v;
}

function applyFootTeams(entry, ids, mkt, now = new Date()) {
  if (now > FOOT.end) throw new Error("La saison du jeu est terminée.");
  if (ids.length > FOOT.size) throw new Error(`${FOOT.size} équipes maximum.`);
  const old = new Set(entry.teams || []);
  const removed = [...old].filter(id => !ids.includes(id));
  const added = ids.filter(id => !old.has(id));
  const before = now < FOOT.start;   // avant le mercato de janvier : changements libres, rien n'est compté
  const changes = (entry.changes || 0) + (before ? 0 : removed.length);
  if (changes > FOOT.maxChanges) throw new Error(`Tu as déjà utilisé tes ${FOOT.maxChanges} changements de la saison.`);
  let hist = (entry.history || []).map(h => ({ ...h }));
  const t = now.toISOString();
  const pick = id => { const tm = mkt.by.get(id); return { id, league: tm.league, price: tm.price, from: t, ...(tm.espn ? { espn: tm.espn } : {}) }; };
  if (before) {
    hist = ids.map(id => hist.find(h => h.id === id && !h.to) || pick(id));
  } else {
    removed.forEach(id => { const h = hist.find(h => h.id === id && !h.to); if (h) h.to = t; });
    added.forEach(id => hist.push(pick(id)));
  }
  const cost = ids.reduce((s, id) => s + (hist.find(h => h.id === id && !h.to)?.price || 0), 0);
  if (cost > FOOT.budget) throw new Error(`Budget dépassé : ${cost} / ${FOOT.budget}.`);
  return { ...entry, teams: [...ids], history: hist, changes };
}

// ---------------------------------------------------------------- interface
const fg = { tab: "teams", me: null, draft: [], league: "all", q: "", sort: "price", limit: 10, players: [], scores: new Map(), msg: null, busy: false, form: new Map(), next: new Map() };

function priceOf(id) {
  const h = (fg.me?.history || []).find(h => h.id === id && !h.to);
  return h ? h.price : FMARKET?.by.get(id)?.price || 0;
}

function formHTML(id) {
  const f = fg.form.get(id);
  if (!f) return `<div class="tform"></div>`;
  return `<div class="tform">${f.map(r => `<i class="fm-${r}">${{ w: "V", d: "N", l: "D" }[r]}</i>`).join("")}</div>`;
}
/* charge la forme + le prochain match des équipes pas encore connues ; renvoie le nombre d'équipes nouvellement chargées */
const formPending = new Set();
async function loadForms(ids) {
  const todo = ids.filter(id => !id.startsWith("w:") && !fg.form.has(id) && !formPending.has(id));
  if (!todo.length) return 0;
  todo.forEach(id => formPending.add(id));
  await pool(todo, 6, async id => {
    const s = await teamSchedule(id);
    const rs = (s?.events || []).map(e => teamResult(e, id)).filter(r => r && !/friendly/.test(r.slug || "")).sort((a, b) => b.date - a.date).slice(0, 5).reverse();
    fg.form.set(id, rs.map(r => r.res));
    const fx = await teamFixtures(id);
    const n = (fx?.events || []).map(e => ({ e, d: new Date(e.date) })).filter(x => x.d > new Date()).sort((a, b) => a.d - b.d)[0];
    if (n) {
      const c = n.e.competitions[0], op = c.competitors.find(x => x.team?.id !== id);
      fg.next.set(id, `${n.d.toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })} · ${op?.homeAway === "away" ? "vs" : "à"} ${op?.team?.shortDisplayName || op?.team?.displayName || ""}`);
    }
    formPending.delete(id);
  });
  return todo.length;
}

function teamCard(t, { picked, canAdd, pts, compact } = {}) {
  const tier = t.price >= 28 ? "legend" : t.price >= 18 ? "star" : t.price >= 10 ? "pro" : "rookie";
  return `
    <article class="tcard rcard tier-${tier} ${picked ? "picked" : ""}">
      <header>
        <span class="tier tier-${tier}">${flagImg(t.flag)} ${esc(t.country)}</span>
        <span class="price"><b>${priceOf(t.id) || t.price}</b><small>pts</small></span>
      </header>
      <div class="tlogo">${t.logo ? `<img src="${t.logo}" alt="" loading="lazy">` : `<span class="tmono">${esc(initials(t.name))}</span>${flagImg(t.flag, "flag lg")}`}</div>
      <h4 title="${esc(t.name)}">${esc(t.short)}</h4>
      <div class="rteam">${t.rank ? `${t.rank}${t.rank === 1 ? "er" : "e"} · ${t.pts} pts en ${t.gp} matchs` : esc(t.country)}</div>
      ${t.coef != null ? `<div class="tcoef" title="Coefficient UEFA du club : ses résultats européens des 5 dernières saisons">Coef. UEFA <b>${String(t.coef).replace(".", ",")}</b></div>` : ""}
      ${formHTML(t.id)}
      ${pts != null ? `<dl class="rstats"><div class="live"><dt>Points gagnés</dt><dd>${pts}</dd></div></dl>` : ""}
      ${fg.next.get(t.id) ? `<div class="tnext">Prochain : ${esc(fg.next.get(t.id))}</div>` : ""}
      ${compact ? "" : picked ? `<button class="rbtn remove" data-fremove="${t.id}">Retirer</button>`
        : canAdd ? `<button class="rbtn add" data-fadd="${t.id}">Choisir · ${t.price}</button>`
        : `<button class="rbtn" disabled>${canAdd === false ? "Budget insuffisant" : "3 équipes déjà choisies"}</button>`}
    </article>`;
}

async function footInit() {
  fg.me = await Backend.myFoot(game.me);
  fg.draft = [...(fg.me.teams || [])];
  await loadFootMarket();
  footDraw();
  loadForms(fg.draft).then(n => { if (n) footDrawSoft(); });
  refreshFootPlayers();
}
async function refreshFootPlayers() {
  try { fg.players = await Backend.listFoot(); } catch { fg.players = []; }
  await pool(fg.players, 3, async p => fg.scores.set(p.id, await footScore(p)));
  if (fg.me) fg.scores.set(fg.me.id, await footScore(fg.me));
  footDraw();
}

function footHeroHTML(mine = null, changesLeft = FOOT.maxChanges) {
  return `
    <section class="g-hero foot">
      <div class="g-hero-text">
        <div class="eyebrow">Jeu · saison ${FOOT.season}</div>
        <h1>Je parie · Foot</h1>
        <p>Choisis ${FOOT.size} équipes parmi tous les championnats d'Europe avec ${FOOT.budget} points de budget. Le jeu démarre au <b>mercato de janvier</b> (1er janvier 2027) : d'ici là, tu changes tes équipes autant que tu veux. Ensuite, chaque victoire rapporte des points (plus en coupe d'Europe), et chaque semaine en tête de son championnat aussi. Le meilleur total au ${FOOT.end.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })} gagne.</p>
      </div>
      <div class="g-hero-side">
        ${new Date() < FOOT.start
          ? `<div class="countdown"><b>${Math.ceil((FOOT.start - new Date()) / 864e5)}</b><span>jours avant le mercato</span></div>
             <div class="phase open">Changements illimités jusqu'au 1er janvier</div>`
          : `<div class="countdown"><b>${mine ? mine.total : "–"}</b><span>points cette saison</span></div>
             <div class="phase open">${changesLeft} changement${changesLeft > 1 ? "s" : ""} d'équipe restant${changesLeft > 1 ? "s" : ""}</div>`}
        <div class="mode">${ONLINE ? "🌐 Classement en ligne" : "💻 Mode local · ce PC"}</div>
      </div>
    </section>`;
}
function footRulesHTML(mk) {
  return `
      <section class="rules">
        <div class="section-title"><h2>Règles</h2></div>
        <ul class="rule-list">
          <li><b>${FOOT.size} équipes</b> parmi ${mk.leagues.length} championnats européens (première division), avec <b>${FOOT.budget} points</b> de budget.</li>
          <li>Le jeu démarre au <b>mercato de janvier</b> : les points comptent du 1er janvier 2027 au ${FOOT.end.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}. Avant, tu peux changer tes équipes sans limite.</li>
          <li>Ensuite, tu as <b>${FOOT.maxChanges} changements</b>. Une équipe retirée garde les points déjà gagnés, une nouvelle équipe compte à partir du jour où tu la prends.</li>
          <li>Pour les championnats lus sur Wikipédia (Pologne, Croatie, Serbie, Ukraine…), les points de championnat sont calculés à partir du classement, et les matchs de coupe d'Europe viennent d'ESPN. Leurs coupes nationales ne sont pas comptées.</li>
          <li>Toutes les compétitions officielles comptent : championnat, coupes d'Europe, coupes nationales. Les matchs amicaux non.</li>
          <li>Une victoire aux tirs au but compte comme une victoire.</li>
          <li><b>Prix des équipes</b> (de ${PRICE_MIN} à ${PRICE_MAX}) : moitié <b>championnat</b> (points par match cette saison, mélangés avec la saison passée, multipliés par le niveau du championnat selon le coefficient UEFA du pays), moitié <b>Europe</b> (coefficient UEFA du club, ses résultats des 5 dernières saisons).</li>
        </ul>
        <div class="section-title"><h2>Barème</h2></div>
        <div class="table-wrap"><table class="race-table bareme">
          <thead><tr><th>Compétition</th><th>Victoire</th><th>Nul</th></tr></thead>
          <tbody>${FBAREME.map(b => `<tr><td>${esc(b.label)}</td><td>${b.w}</td><td>${b.d}</td></tr>`).join("")}
            <tr><td>En tête de son championnat (chaque lundi, s'il y a eu des matchs dans la semaine)</td><td colspan="2">+${LEADER_PTS}</td></tr>
            <tr><td>Champion (en tête le ${FOOT.end.toLocaleDateString("fr-BE", { day: "numeric", month: "long" })})</td><td colspan="2">+${CHAMPION_PTS}</td></tr>
          </tbody>
        </table></div>
      </section>`;
}

function footDraw() {
  const main = $("#jeu-main");
  if (game.mode !== "foot") return;
  const mk = FMARKET;
  if (!mk || !fg.me) { main.innerHTML = modeSwitchHTML() + `<div class="loading"><div class="spinner"></div>Chargement des équipes de toute l'Europe…</div>`; return; }
  const cost = fg.draft.reduce((s, id) => s + priceOf(id), 0);
  const left = FOOT.budget - cost;
  const dirty = JSON.stringify(fg.draft) !== JSON.stringify(fg.me.teams || []);
  const mine = fg.scores.get(fg.me.id);
  const changesLeft = FOOT.maxChanges - (fg.me.changes || 0);

  const hero = footHeroHTML(mine, changesLeft);
  const msg = fg.msg ? `<div class="g-msg ${fg.msg.err ? "err" : "ok"}">${esc(fg.msg.t)}</div>` : "";
  const tabs = `
    <nav class="tabs g-tabs">
      <button class="tab ${fg.tab === "teams" ? "active" : ""}" data-ftab="teams">Mes équipes</button>
      <button class="tab ${fg.tab === "market" ? "active" : ""}" data-ftab="market">Marché des équipes</button>
      <button class="tab ${fg.tab === "rank" ? "active" : ""}" data-ftab="rank">Classement</button>
      <button class="tab ${fg.tab === "rules" ? "active" : ""}" data-ftab="rules">Règles & barème</button>
      <span class="grow"></span>
      <span class="who">${esc(game.me.pseudo)} · <button class="linkbtn" data-logout>Déconnexion</button></span>
    </nav>`;
  const budgetBar = `
    <div class="budget">
      <div class="b-row"><span>Budget</span><b class="${left < 0 ? "neg" : ""}">${left} <small>/ ${FOOT.budget} restants</small></b><span class="b-count">${fg.draft.length}/${FOOT.size} équipes</span></div>
      <div class="b-track"><i style="width:${Math.min(100, cost / FOOT.budget * 100)}%"></i></div>
      ${dirty ? `<div class="b-actions"><button class="cta" data-fsave ${fg.busy ? "disabled" : ""}>Valider mes équipes</button><button class="ghost" data-freset>Annuler les changements</button></div>` : ""}
    </div>`;

  let body = "";
  if (fg.tab === "teams") {
    const per = {};
    (mine?.evs || []).forEach(e => { per[e.teamId] = (per[e.teamId] || 0) + e.pts; });
    const slots = Array.from({ length: FOOT.size }, (_, i) => {
      const t = mk.by.get(fg.draft[i]);
      return t ? teamCard(t, { picked: true, pts: (fg.me.teams || []).includes(t.id) ? per[t.id] || 0 : null })
        : `<button class="slot" data-ftab="market"><span>+</span>Choisir une équipe</button>`;
    }).join("");
    const evs = (mine?.evs || []).slice(0, 15);
    body = budgetBar + `
      <div class="slots tslots">${slots}</div>
      <div class="section-title"><h2>Derniers points</h2></div>
      ${evs.length ? `<div class="table-wrap"><table class="race-table">${evs.map(e => {
        const t = mk.by.get(e.teamId);
        return `<tr><td class="rd">${e.date.toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}</td><td><div class="rw">${t?.logo ? `<img class="tmini" src="${t.logo}" alt="">` : ""}${esc(t?.short || "")}</div></td><td class="sm">${esc(e.label)}</td><td class="pts-cell">${e.pts ? "+" + e.pts : "0"}</td></tr>`;
      }).join("")}</table></div>`
      : `<div class="empty">${fg.me.teams?.length ? "Tes équipes n'ont pas encore joué depuis que tu les as choisies. Les points arrivent au prochain match." : "Choisis tes 3 équipes dans le marché pour commencer à marquer des points."}</div>`}`;
  } else if (fg.tab === "market") {
    const q = fg.q.trim().toLowerCase();
    let list = mk.list.filter(t => (fg.league === "all" || t.league === fg.league) && (!q || (t.name + " " + t.country).toLowerCase().includes(q)));
    if (fg.sort === "rank") list = [...list].sort((a, b) => a.league.localeCompare(b.league) || a.rank - b.rank);
    if (fg.sort === "cheap") list = [...list].sort((a, b) => a.price - b.price);
    const shown = list.slice(0, fg.limit);
    const leagues = mk.leagues;
    body = budgetBar + `
      <div class="toolbar">
        <input class="search" id="f-q" type="search" placeholder="Équipe ou pays…" value="${esc(fg.q)}">
        <select id="f-league" class="select" aria-label="Championnat">
          <option value="all" ${fg.league === "all" ? "selected" : ""}>Tous les championnats</option>
          ${leagues.map(l => `<option value="${l.s}" ${fg.league === l.s ? "selected" : ""}>${esc(l.c)} · ${esc(l.n)}</option>`).join("")}
        </select>
        <select id="f-sort" class="select" aria-label="Trier">
          <option value="price" ${fg.sort === "price" ? "selected" : ""}>Prix ↓</option>
          <option value="cheap" ${fg.sort === "cheap" ? "selected" : ""}>Prix ↑</option>
          <option value="rank" ${fg.sort === "rank" ? "selected" : ""}>Classement</option>
        </select>
      </div>
      <div class="market">${shown.map(t => {
        const picked = fg.draft.includes(t.id);
        const canAdd = fg.draft.length < FOOT.size ? t.price <= left : null;
        return teamCard(t, { picked, canAdd });
      }).join("")}</div>
      ${list.length > shown.length ? `<div class="center more-row"><button class="ghost" data-fmore>Voir ${Math.min(20, list.length - shown.length)} équipes de plus</button></div>` : ""}
      <p class="hint center">${shown.length} équipes affichées sur ${list.length}${fg.league === "all" && !q && fg.sort === "price" ? ", les plus chères d'abord" : ""}. Le prix dépend de plusieurs saisons : résultats en championnat cette saison et la saison passée, niveau du championnat (coefficient UEFA du pays) et résultats européens du club sur 5 ans (coefficient UEFA du club). Il est fixé au moment où tu choisis l'équipe.</p>`;
    // un seul redessin quand de nouvelles formes arrivent (avant : redessin en boucle qui avalait les clics)
    loadForms(shown.slice(0, 24).map(t => t.id)).then(n => { if (n && fg.tab === "market") footDrawSoft(); });
  } else if (fg.tab === "rank") {
    const rows = fg.players.filter(p => (p.history || []).length)
      .map(p => ({ p, s: fg.scores.get(p.id)?.total ?? 0 })).sort((a, b) => b.s - a.s || a.p.pseudo.localeCompare(b.p.pseudo));
    body = `
      <div class="rank-head"><div><h2>Classement ${FOOT.season}</h2><p class="hint">Points depuis le jour où chaque joueur a choisi ses équipes.</p></div><button class="ghost" data-frefresh>Mettre à jour</button></div>
      ${rows.length ? `<ol class="ranking">${rows.map(({ p, s }, i) => `
        <li class="${p.id === fg.me.id ? "me" : ""}">
          <span class="pos">${i + 1}</span>
          <div class="rk-main"><b>${esc(p.pseudo)}</b>
            <div class="rk-riders">${(p.teams || []).map(id => mk.by.get(id)).filter(Boolean).map(t => `<span>${t.logo ? `<img class="tmini" src="${t.logo}" alt="">` : ""}${esc(t.short)}</span>`).join("") || "<span>Pas encore d'équipes</span>"}</div>
          </div>
          <div class="rk-pts"><b>${s}</b><small>pts</small></div>
        </li>`).join("")}</ol>` : `<div class="empty">Personne n'a encore choisi d'équipes. Lance-toi !</div>`}`;
  } else {
    body = footRulesHTML(mk);
  }
  main.innerHTML = modeSwitchHTML() + hero + msg + tabs + body;
}
let softT = null;
function footDrawSoft() { clearTimeout(softT); softT = setTimeout(() => { const y = scrollY; footDraw(); scrollTo(0, y); }, 50); }

async function footClick(e) {
  const t = e.target;
  const tab = t.closest("[data-ftab]");
  if (tab) { fg.tab = tab.dataset.ftab; fg.msg = null; footDraw(); scrollTo(0, 0); return true; }
  const add = t.closest("[data-fadd]");
  if (add) { if (fg.draft.length < FOOT.size) fg.draft.push(add.dataset.fadd); fg.msg = null; footDraw(); loadForms(fg.draft).then(n => { if (n) footDrawSoft(); }); return true; }
  const rm = t.closest("[data-fremove]");
  if (rm) { fg.draft = fg.draft.filter(id => id !== rm.dataset.fremove); fg.msg = null; footDraw(); return true; }
  if (t.closest("[data-fmore]")) { fg.limit += 20; footDrawSoft(); return true; }
  if (t.closest("[data-freset]")) { fg.draft = [...(fg.me.teams || [])]; footDraw(); return true; }
  if (t.closest("[data-frefresh]")) { fscoreCache.clear(); leagueSeasonCache.clear(); await refreshFootPlayers(); return true; }
  if (t.closest("[data-fsave]")) {
    fg.busy = true; footDraw();
    try {
      fg.me = await Backend.saveFoot(applyFootTeams(fg.me, fg.draft, FMARKET));
      fg.draft = [...fg.me.teams];
      fg.msg = { t: "Équipes enregistrées. Les points comptent à partir de maintenant." };
      refreshFootPlayers();
    } catch (err) { fg.msg = { err: true, t: err.message }; }
    fg.busy = false; footDraw();
    return true;
  }
  return false;
}
function footInput(e) {
  if (e.target.id === "f-q") { fg.q = e.target.value; fg.limit = 10; const pos = e.target.selectionStart; footDraw(); const q = $("#f-q"); q.focus(); q.setSelectionRange(pos, pos); return true; }
  if (e.target.id === "f-league") { fg.league = e.target.value; fg.limit = fg.league === "all" ? 10 : 40; footDraw(); return true; }
  if (e.target.id === "f-sort") { fg.sort = e.target.value; fg.limit = 10; footDraw(); return true; }
  return false;
}

/* éléments du jeu foot affichés avant la connexion */
function footLoggedOut() {
  if (!FMARKET) { loadFootMarket().then(() => { if (game.mode === "foot" && !game.me) drawGame(); }); }
  const mk = FMARKET;
  return {
    hero: footHeroHTML(),
    previewTitle: "Les équipes les plus chères",
    preview: mk ? mk.list.slice(0, 10).map(t => teamCard(t, { compact: true })).join("") : `<div class="loading"><div class="spinner"></div>Chargement des équipes…</div>`,
    rules: mk ? footRulesHTML(mk) : "",
  };
}
window.FootGame = { loggedOut: footLoggedOut, init: footInit, draw: footDraw, onClick: footClick, onInput: footInput, footScore, applyFootTeams, loadFootMarket };
