/* ARENA — « Je parie » : jeu de cyclisme avec budget fictif.
   Prix des coureurs = leurs résultats des 3 dernières saisons (la plus récente compte le plus) ; points = leurs résultats de la saison jouée, lus en direct sur Wikipédia.
   Stockage : Supabase si configuré (config.js), sinon ce navigateur (mode local, plusieurs joueurs sur le même PC). */
"use strict";

const CFG = window.ARENA_CONFIG || {};
const YEAR = CFG.season || 2027;
const BUDGET = CFG.budget || 500;
const SIZE = CFG.teamSize || 15;
const day = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const LOCK = day(CFG.lockDate || `${YEAR}-01-19`);
const WINDOWS = (CFG.transferWindows || []).map(w => ({ ...w, start: day(w.from), end: new Date(+day(w.to) + 86400000 - 1) }));
const SEASON_START = new Date(YEAR, 0, 1);
const ONLINE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);

// ---------------------------------------------------------------- barème
const BAREME = {
  gt: { label: "Grands Tours (Giro, Tour, Vuelta)", gc: [150, 90, 60], stage: 20, jerseys: { Points: 40, Montagne: 40, Jeune: 20 } },
  monument: { label: "Monuments (Milan-San Remo, Flandres, Roubaix, Liège, Lombardie)", podium: [100, 60, 40] },
  wtOne: { label: "Autres classiques World Tour", podium: [60, 35, 20] },
  wtStage: { label: "Autres courses à étapes World Tour", gc: [70, 40, 25], stage: 10, jerseys: { Points: 15, Montagne: 15 } },
  pro: { label: "UCI ProSeries", win: 30, stage: 5 },
  e1: { label: "Europe Tour .1 (1.1 / 2.1)", win: 15 },
  e2: { label: "Europe Tour .2 (1.2 / 2.2)", win: 8 },
  e2u: { label: "Courses espoirs (1.2U / 2.2U)", win: 4 },
  worldsRR: { label: "Championnat du monde — course en ligne", podium: [120, 70, 45] },
  worldsTT: { label: "Championnat du monde — contre-la-montre", podium: [60, 35, 20] },
  euroRR: { label: "Championnat d'Europe — course en ligne", podium: [50, 30, 15] },
  euroTT: { label: "Championnat d'Europe — contre-la-montre", podium: [30, 18, 10] },
};
const GT_NAMES = ["Giro d'Italia", "Tour de France", "Vuelta a España"];
const MON_NAMES = ["Milan–San Remo", "Tour of Flanders", "Paris–Roubaix", "Liège–Bastogne–Liège", "Il Lombardia"];

// copie indépendante des données (sans la version préparée par l'onglet Cyclisme, qui pointe sur elle-même)
const cloneData = D => JSON.parse(JSON.stringify(D, (k, v) => (k === "__prepped" || k === "range") ? undefined : v));
const keyOf = n => String(n || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function stageDate(s, r, year) {
  const m = String(s.date || "").match(/(\d{1,2})\s+([A-Z][a-z]+)/);
  if (m && MONTHS[m[2]] != null) return new Date(year, MONTHS[m[2]], +m[1]);
  return r.range ? r.range.end : new Date(year, 11, 31);
}

/* Liste de tous les points marqués dans une saison : { key, name, nat, pts, date, label } */
function scoreEvents(D) {
  const year = D.season;
  const ev = [];
  const add = (a, pts, date, label) => { if (a && a.name && !a.team && !/^Équipe /.test(a.name) && pts) ev.push({ key: keyOf(a.name), name: a.name, nat: a.nat, pts, date, label }); };
  const podium = (r, tbl, what) => [r.winner, r.second, r.third].forEach((a, i) => add(a, tbl[i], r.range.end, `${what} ${raceName(r.race)}`.replace("{p}", ["1er", "2e", "3e"][i])));
  for (const r of D.worldtour || []) {
    r.range = parseRange(r.date, year);
    if (!r.winner || !r.range) continue;
    const gt = GT_NAMES.includes(r.race), staged = CyclingLive.isStageRace(r);
    const b = gt ? BAREME.gt : MON_NAMES.includes(r.race) ? BAREME.monument : staged ? BAREME.wtStage : BAREME.wtOne;
    if (b.gc) podium(r, b.gc, "{p} au général —"); else podium(r, b.podium, "{p} —");
    (r.stages || []).forEach(s => add(s.winner, b.stage, stageDate(s, r, year), `Étape ${s.n} — ${raceName(r.race)}`));
    (r.jerseys || []).forEach(j => { const p = b.jerseys?.[j.cls]; if (p && !j.name.startsWith("team:")) add({ name: j.name, nat: null }, p, r.range.end, `Maillot ${j.cls} — ${raceName(r.race)}`); });
  }
  for (const r of D.proseries || []) {
    r.range = parseRange(r.date, year);
    if (!r.winner || !r.range) continue;
    add(r.winner, BAREME.pro.win, r.range.end, `Victoire — ${raceName(r.race)}`);
    (r.stages || []).forEach(s => add(s.winner, BAREME.pro.stage, stageDate(s, r, year), `Étape ${s.n} — ${raceName(r.race)}`));
  }
  for (const r of D.europetour || []) {
    r.range = parseRange(r.date, year);
    if (!r.winner || !r.range || !r.rating) continue;
    const b = /U$/.test(r.rating) ? BAREME.e2u : /\.1$/.test(r.rating) ? BAREME.e1 : BAREME.e2;
    add(r.winner, b.win, r.range.end, `Victoire — ${raceName(r.race)} (${r.rating})`);
  }
  for (const c of D.championships || []) {
    if (c.cat !== "Hommes") continue;
    const worlds = c.champ === "Mondiaux", rr = c.event === "Course en ligne";
    const b = worlds ? (rr ? BAREME.worldsRR : BAREME.worldsTT) : (rr ? BAREME.euroRR : BAREME.euroTT);
    const date = worlds ? new Date(year, 8, 27) : new Date(year, 9, 4);
    c.podium.forEach((a, i) => add(a, b.podium[i], date, `${["1er", "2e", "3e"][i]} — ${c.champ} (${c.event.toLowerCase()})`));
  }
  // nationalité manquante (maillots) : reprise depuis les autres résultats
  const nats = {};
  ev.forEach(e => { if (e.nat) nats[e.key] = e.nat; });
  ev.forEach(e => { if (!e.nat) e.nat = nats[e.key] || null; });
  return ev;
}

// ---------------------------------------------------------------- marché (prix = 7 saisons + âge + forme)
/* Saisons passées (cycling-history.json, mêmes données que cycling-data.js) : la plus récente compte le plus.
   Effectifs (cycling-riders.json) : tous les coureurs World Tour et ProTeam, avec équipe et date de naissance. */
const SEASON_WEIGHTS = [1, .7, .5, .35, .25, .15, .1];
let HISTORY = null, ROSTER = null;
async function loadHistory() {
  if (HISTORY) return HISTORY;
  const get = async url => { try { return await (await fetch(url)).json(); } catch { return null; } };
  [HISTORY, ROSTER] = await Promise.all([get("cycling-history.json?v=2"), get("cycling-riders.json?v=1")]);
  HISTORY = HISTORY || {};
  MARKET = null;   // on recalcule les prix avec l'historique
  return HISTORY;
}
const TIERS = [
  { min: 70, id: "legend", name: "Légende" },
  { min: 45, id: "star", name: "Star" },
  { min: 25, id: "pro", name: "Pro" },
  { min: 10, id: "rookie", name: "Outsider" },
  { min: 0, id: "domestique", name: "Équipier" },
];
// âge au 1er janvier de la saison jouée
const ageOf = born => { if (!born) return null; const [y, m, d] = born.split("-").map(Number); return YEAR - y - (m > 1 || d > 1 ? 1 : 0); };
// les jeunes progressent encore, les plus de 33 ans déclinent en moyenne
const ageFactor = a => a == null ? 1 : a <= 22 ? 1.15 : a <= 25 ? 1.08 : a <= 31 ? 1 : a <= 33 ? .92 : a <= 35 ? .82 : .72;
// forme : 2026 au-dessus ou en dessous de la moyenne des deux saisons précédentes (±10 % max)
const formFactor = s => {
  const ref = ((s[1] || 0) + (s[2] || 0)) / 2;
  if (!s[0] && !ref) return 1;
  return 1 + .1 * Math.max(-1, Math.min(1, (s[0] - ref) / Math.max(s[0], ref, 30)));
};
let MARKET = null;
function buildMarket() {
  if (MARKET) return MARKET;
  const D = window.CYCLING;
  const evs = scoreEvents(cloneData(D));
  const teams = {};
  for (const k of ["worldtour", "proseries", "europetour"]) D[k].forEach(r => { if (r.winner && r.team) teams[keyOf(r.winner.name)] = r.team; });
  const years = SEASON_WEIGHTS.map((w, i) => ({ y: D.season - i, w }));
  const blank = () => ({ pts: 0, wins: 0, podiums: 0, seasons: {}, score: 0, best: [] });
  const by = new Map();
  const rider = e => by.get(e.key) || by.set(e.key, { key: e.key, name: e.name, nat: e.nat, ...blank() }).get(e.key);
  // 1. tous les coureurs des équipes World Tour et ProTeam, même sans résultat
  for (const r of ROSTER?.riders || []) {
    const o = rider({ key: keyOf(r.name), name: r.name, nat: r.nat });
    Object.assign(o, { born: r.born, rteam: r.team, level: r.level });
  }
  // 2. résultats saison par saison ; un coureur absent des effectifs doit avoir marqué en 2026 (sinon il a sans doute arrêté)
  const perYear = years.map(({ y, w }, i) => {
    const list = i === 0 ? evs : HISTORY?.[y] ? scoreEvents(cloneData(HISTORY[y])) : [];
    const m = new Map();
    list.forEach(e => (m.get(e.key) || m.set(e.key, []).get(e.key)).push(e));
    return { y, w, m };
  });
  perYear[0].m.forEach(list => rider(list[0]));
  by.forEach(o => {
    perYear.forEach(({ y, w, m }, i) => {
      const list = m.get(o.key) || [];
      const p = list.reduce((s, e) => s + e.pts, 0);
      o.seasons[y] = p;
      o.score += w * p;
      list.forEach(e => {
        if (/^(Victoire|1er|Étape)/.test(e.label)) o.wins++;
        else if (/^(2e|3e)/.test(e.label)) o.podiums++;
        if (!o.nat && e.nat) o.nat = e.nat;
      });
      if (i === 0) { o.pts = p; o.best = list; }
      else if (i <= 2) o.best = o.best.concat(list.map(e => ({ ...e, label: `${e.label} (${y})`, pts: e.pts * w })));
    });
    o.active = Object.values(o.seasons).filter(Boolean).length;
    o.age = ageOf(o.born);
    o.score *= ageFactor(o.age) * formFactor(years.slice(0, 3).map(({ y }) => o.seasons[y]));
  });
  const max = Math.max(...[...by.values()].map(r => r.score));
  const list = [...by.values()].map(r => {
    // de 3 (équipier sans résultat) à 100 (le n°1) ; un jeune sans résultat vaut un peu plus
    const price = r.score > 0 ? Math.max(5, Math.round(5 + 95 * Math.sqrt(r.score / max))) : r.age != null && r.age <= 23 ? 4 : 3;
    r.best.sort((a, b) => b.pts - a.pts);
    return { ...r, team: teams[r.key] || null, price, tier: TIERS.find(t => price >= t.min), best: r.best.slice(0, 4) };
  }).sort((a, b) => b.price - a.price || b.score - a.score || a.name.localeCompare(b.name));
  MARKET = { list, by: new Map(list.map(r => [r.key, r])), events2026: evs, years: years.map(x => x.y) };
  return MARKET;
}
const riderTeam = r => r.rteam || teamName(r.team) || natFr(r.nat);

// ---------------------------------------------------------------- résultats de la saison jouée (Wikipédia, en cache 3 h)
let LIVE = null, LIVE_EVENTS = [];
async function loadLive(force = false) {
  const ck = "arena-live-" + YEAR;
  const cached = store.get(ck, null);
  if (!force && cached && Date.now() - cached.at < 3 * 3600e3) { LIVE = cached.data; }
  else if (Date.now() >= SEASON_START - 30 * 864e5) {
    try {
      const prev = cached?.data;
      LIVE = await CyclingLive.loadSeason(YEAR, {
        onProgress: (d, t) => { const el = document.getElementById("live-progress"); if (el) el.textContent = `Lecture des courses à étapes ${d}/${t}…`; },
        // une course à étapes terminée depuis plus de 10 jours et déjà lue n'est pas relue
        skipStage: r => {
          const old = prev && [...prev.worldtour, ...prev.proseries].find(x => x.race === r.race && x.stages);
          const end = parseRange(r.date, YEAR)?.end;
          if (old && end && Date.now() - end > 10 * 864e5) { r.stages = old.stages; if (old.jerseys) r.jerseys = old.jerseys; return true; }
          return false;
        },
      });
      store.set(ck, { at: Date.now(), data: LIVE });
    } catch { LIVE = cached?.data || null; }
  }
  LIVE_EVENTS = LIVE ? scoreEvents(cloneData(LIVE)) : [];
  return LIVE;
}

/* points d'une équipe : chaque coureur compte pour les résultats obtenus pendant qu'il était dans l'équipe */
function teamScore(entry, events = LIVE_EVENTS) {
  const per = {};
  let total = 0;
  for (const h of entry.history || []) {
    const from = new Date(h.from), to = h.to ? new Date(h.to) : null;
    for (const e of events) {
      if (e.key !== h.k || e.date < from || (to && e.date >= to)) continue;
      (per[h.k] = per[h.k] || { pts: 0, list: [] }).pts += e.pts;
      per[h.k].list.push(e);
      total += e.pts;
    }
  }
  return { total, per };
}
function simulate2026(keys) {
  const evs = buildMarket().events2026;
  return keys.reduce((s, k) => s + evs.filter(e => e.key === k).reduce((a, e) => a + e.pts, 0), 0);
}

// ---------------------------------------------------------------- règles de modification
function phase(now = new Date()) {
  if (now < LOCK) return { open: true, kind: "pre", label: `Équipes modifiables jusqu'au ${LOCK.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}` };
  const w = WINDOWS.find(w => now >= w.start && now <= w.end);
  if (w) return { open: true, kind: "window", window: w, label: `Fenêtre de transferts « ${w.name} » ouverte jusqu'au ${w.end.toLocaleDateString("fr-BE", { day: "numeric", month: "long" })} (${w.max} transferts max)` };
  const next = WINDOWS.find(w => now < w.start);
  return { open: false, kind: "locked", label: next ? `Équipes bloquées · prochaine fenêtre de transferts le ${next.start.toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}` : "Équipes bloquées jusqu'à la fin de la saison" };
}
function applyRoster(entry, riders, now = new Date()) {
  const ph = phase(now);
  if (!ph.open) throw new Error("Les équipes sont bloquées en ce moment.");
  const m = buildMarket();
  if (riders.length > SIZE) throw new Error(`${SIZE} coureurs maximum.`);
  const cost = riders.reduce((s, k) => s + (m.by.get(k)?.price || 0), 0);
  if (cost > BUDGET) throw new Error(`Budget dépassé : ${cost} / ${BUDGET}.`);
  const next = { ...entry, riders: [...riders], history: [...(entry.history || [])].map(h => ({ ...h })), transfers: { ...(entry.transfers || {}) } };
  if (ph.kind === "pre") {
    next.history = riders.map(k => ({ k, from: SEASON_START.toISOString() }));
  } else {
    const old = new Set(entry.riders || []), nw = new Set(riders);
    const added = riders.filter(k => !old.has(k));
    const removed = [...old].filter(k => !nw.has(k));
    const used = next.transfers[ph.window.id] || 0;
    if (added.length + used > ph.window.max) throw new Error(`Seulement ${ph.window.max - used} transfert(s) restant(s) dans cette fenêtre.`);
    const t = now.toISOString();
    removed.forEach(k => { const h = next.history.find(h => h.k === k && !h.to); if (h) h.to = t; });
    added.forEach(k => next.history.push({ k, from: t }));
    next.transfers[ph.window.id] = used + added.length;
  }
  return next;
}

// ---------------------------------------------------------------- stockage : local ou Supabase
const Local = {
  kind: "local",
  _db() { return store.get("arena-game", { players: {}, current: null }); },
  _save(d) { store.set("arena-game", d); },
  async list() { return Object.values(this._db().players); },
  async me() { const d = this._db(); return d.current ? d.players[d.current] || null : null; },
  async signup({ pseudo, pin }) {
    const d = this._db();
    const id = keyOf(pseudo);
    if (!id || pseudo.trim().length < 2) throw new Error("Choisis un pseudo d'au moins 2 caractères.");
    if (d.players[id]) throw new Error("Ce pseudo existe déjà. Connecte-toi avec ton code.");
    if (!/^\d{4}$/.test(pin || "")) throw new Error("Choisis un code de 4 chiffres.");
    d.players[id] = { id, pseudo: pseudo.trim(), pin, riders: [], history: [], transfers: {}, updatedAt: new Date().toISOString() };
    d.current = id; this._save(d);
    return d.players[id];
  },
  async login({ pseudo, pin }) {
    const d = this._db(), p = d.players[keyOf(pseudo)];
    if (!p || p.pin !== pin) throw new Error("Pseudo ou code incorrect.");
    d.current = p.id; this._save(d);
    return p;
  },
  async logout() { const d = this._db(); d.current = null; this._save(d); },
  async save(entry) { const d = this._db(); d.players[entry.id] = { ...entry, updatedAt: new Date().toISOString() }; this._save(d); return d.players[entry.id]; },
  // jeu foot : rangé dans le même joueur
  async myFoot(me) { const p = this._db().players[me.id] || {}; return { id: me.id, pseudo: me.pseudo, teams: [], history: [], changes: 0, ...(p.foot || {}) }; },
  async listFoot() { return Object.values(this._db().players).map(p => ({ id: p.id, pseudo: p.pseudo, teams: [], history: [], changes: 0, ...(p.foot || {}) })); },
  async saveFoot(f) { const d = this._db(); const { id, pseudo, ...rest } = f; d.players[id].foot = { ...rest, updatedAt: new Date().toISOString() }; this._save(d); return { id, pseudo, ...d.players[id].foot }; },
  // groupes : un joueur fait partie d'un seul groupe à la fois
  async groups() {
    const d = this._db();
    return { groups: Object.values(d.groups || {}), members: Object.values(d.players).filter(p => p.group).map(p => ({ user: p.id, group: p.group })) };
  },
  async createGroup(me, name) {
    const d = this._db();
    d.groups = d.groups || {};
    if (Object.values(d.groups).some(g => keyOf(g.name) === keyOf(name))) throw new Error("Ce nom de groupe est déjà pris.");
    const id = "g" + Date.now().toString(36);
    d.groups[id] = { id, name, owner: me.id };
    this._save(d);
    return this.joinGroup(me, id);
  },
  async joinGroup(me, id) { const d = this._db(); d.players[me.id].group = id; this._save(d); },
  async leaveGroup(me) {
    const d = this._db(), id = d.players[me.id].group;
    delete d.players[me.id].group;
    if (id && !Object.values(d.players).some(p => p.group === id)) delete d.groups[id];   // groupe vide : supprimé
    this._save(d);
  },
};

const Online = {
  kind: "online",
  sb: null,
  async init() {
    if (this.sb) return;
    if (!window.supabase) {
      await new Promise((ok, ko) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
        s.onload = ok; s.onerror = () => ko(new Error("Impossible de charger Supabase (connexion internet ?)."));
        document.head.appendChild(s);
      });
    }
    this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });   // reste connecté, renouvelle tout seul
  },
  _row(r) { return { id: r.user_id, pseudo: r.pseudo, riders: r.riders || [], history: r.history || [], transfers: r.transfers || {}, updatedAt: r.updated_at }; },
  async list() {
    await this.init();
    const { data, error } = await this.sb.from("entries").select("*").eq("season", YEAR);
    if (error) throw new Error(error.message);
    return data.map(r => this._row(r));
  },
  async me() {
    await this.init();
    const { data: { user } } = await this.sb.auth.getUser();
    if (!user) return null;
    const { data } = await this.sb.from("entries").select("*").eq("user_id", user.id).maybeSingle();
    return data ? this._row(data) : { id: user.id, pseudo: user.user_metadata?.pseudo || "", riders: [], history: [], transfers: {}, _new: true };
  },
  async signup({ pseudo, email, password }) {
    await this.init();
    if (!pseudo || pseudo.trim().length < 2) throw new Error("Choisis un pseudo d'au moins 2 caractères.");
    const taken = await this.sb.from("entries").select("user_id").ilike("pseudo", pseudo.trim()).maybeSingle();
    if (taken.data) throw new Error("Ce pseudo est déjà pris.");
    const { data, error } = await this.sb.auth.signUp({ email, password, options: { data: { pseudo: pseudo.trim() } } });
    if (error) throw new Error(frAuth(error.message));
    if (!data.session) throw new Error("Compte créé : confirme ton adresse e-mail (lien reçu par e-mail), puis connecte-toi.");
    const entry = { id: data.user.id, pseudo: pseudo.trim(), riders: [], history: [], transfers: {} };
    return this.save(entry);
  },
  async login({ email, password }) {
    await this.init();
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(frAuth(error.message));
    return this.me();
  },
  async logout() { await this.init(); await this.sb.auth.signOut(); },
  async save(entry) {
    await this.init();
    const row = { user_id: entry.id, pseudo: entry.pseudo, season: YEAR, riders: entry.riders, history: entry.history, transfers: entry.transfers, updated_at: new Date().toISOString() };
    const { data, error } = await this.sb.from("entries").upsert(row).select().single();
    if (error) throw new Error(/row-level security/i.test(error.message) ? "Enregistrement refusé : les équipes sont bloquées en ce moment." : error.message);
    return this._row(data);
  },
  _frow(r) { return { id: r.user_id, pseudo: r.pseudo, teams: r.teams || [], history: r.history || [], changes: r.changes || 0 }; },
  async myFoot(me) {
    await this.init();
    const { data } = await this.sb.from("foot_entries").select("*").eq("user_id", me.id).maybeSingle();
    return data ? this._frow(data) : { id: me.id, pseudo: me.pseudo, teams: [], history: [], changes: 0 };
  },
  async listFoot() {
    await this.init();
    const { data, error } = await this.sb.from("foot_entries").select("*").eq("season", "2026-27");
    if (error) throw new Error(error.message);
    return data.map(r => this._frow(r));
  },
  async saveFoot(f) {
    await this.init();
    const row = { user_id: f.id, pseudo: f.pseudo, season: "2026-27", teams: f.teams, history: f.history, changes: f.changes, updated_at: new Date().toISOString() };
    const { data, error } = await this.sb.from("foot_entries").upsert(row).select().single();
    if (error) throw new Error(/row-level security/i.test(error.message) ? "Enregistrement refusé : la saison du jeu est terminée." : error.message);
    return this._frow(data);
  },
  // groupes (tables créées par supabase-groups.sql)
  async groups() {
    await this.init();
    const [g, m] = await Promise.all([this.sb.from("groups").select("id,name,owner"), this.sb.from("group_members").select("user_id,group_id")]);
    const error = g.error || m.error;
    if (error) throw new Error(/does not exist|schema cache/i.test(error.message) ? "Les groupes ne sont pas encore activés sur le serveur (script supabase-groups.sql)." : error.message);
    return { groups: g.data, members: m.data.map(r => ({ user: r.user_id, group: r.group_id })) };
  },
  async createGroup(me, name) {
    await this.init();
    const { data, error } = await this.sb.from("groups").insert({ name, owner: me.id }).select().single();
    if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "Ce nom de groupe est déjà pris." : error.message);
    return this.joinGroup(me, data.id);
  },
  async joinGroup(me, id) {
    await this.init();
    const { error } = await this.sb.from("group_members").upsert({ user_id: me.id, group_id: id });
    if (error) throw new Error(error.message);
  },
  async leaveGroup(me) {
    await this.init();
    const { data } = await this.sb.from("group_members").select("group_id").eq("user_id", me.id).maybeSingle();
    const { error } = await this.sb.from("group_members").delete().eq("user_id", me.id);
    if (error) throw new Error(error.message);
    // groupe vide : son créateur le supprime (les règles du serveur refusent si quelqu'un y est encore)
    if (data) await this.sb.from("groups").delete().eq("id", data.group_id).eq("owner", me.id);
  },
};
const frAuth = m => /invalid login/i.test(m) ? "E-mail ou mot de passe incorrect."
  : /already registered/i.test(m) ? "Un compte existe déjà avec cet e-mail : connecte-toi."
  : /password/i.test(m) && /6/.test(m) ? "Le mot de passe doit faire au moins 6 caractères."
  : /email/i.test(m) && /invalid/i.test(m) ? "Adresse e-mail invalide." : m;
const Backend = ONLINE ? Online : Local;

// ---------------------------------------------------------------- interface
const game = { mode: store.get("jeu-mode", "velo"), tab: "team", me: null, draft: null, q: "", tier: "all", be: false, young: false, sort: "price", players: [], groups: null, groupErr: null, openGroup: null, msg: null, busy: false, authMode: "signup" };

function modeSwitchHTML() {
  return `<div class="gmode" role="tablist">
    <button class="${game.mode === "velo" ? "on" : ""}" data-gmode="velo">🚴 Cyclisme ${YEAR}</button>
    <button class="${game.mode === "foot" ? "on" : ""}" data-gmode="foot">⚽ Football 2026-27</button>
  </div>`;
}
function tierBadge(t) { return `<span class="tier tier-${t.id}">${t.name}</span>`; }
const NAT_NAMES = (() => { try { return new Intl.DisplayNames(["fr"], { type: "region" }); } catch { return null; } })();
const natFr = n => { const iso = IOC[n]; try { return iso && NAT_NAMES ? NAT_NAMES.of(iso.toUpperCase()) : n || ""; } catch { return n || ""; } };
const initials = n => n.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();

function riderCard(r, { inTeam, canAdd, compact, pts } = {}) {
  return `
    <article class="rcard tier-${r.tier.id} ${inTeam ? "picked" : ""} ${compact ? "compact" : ""}">
      <header>
        ${tierBadge(r.tier)}
        <span class="price"><b>${r.price}</b><small>pts</small></span>
      </header>
      <div class="mono"><span>${esc(initials(r.name))}</span>${r.nat ? cflag(r.nat, "flag lg") : ""}</div>
      <h4 title="${esc(r.name)}">${esc(r.name)}</h4>
      <div class="rteam">${esc(riderTeam(r))}${r.age != null ? ` · ${r.age} ans` : ""}</div>
      <dl class="rstats">
        <div><dt>2026</dt><dd>${r.pts}</dd></div>
        <div><dt>2025</dt><dd>${r.seasons?.[2025] ?? "–"}</dd></div>
        ${compact ? "" : `<div><dt title="Points de 2020 à 2024">20-24</dt><dd>${[2024, 2023, 2022, 2021, 2020].reduce((s, y) => s + (r.seasons?.[y] || 0), 0)}</dd></div>`}
        ${pts != null ? `<div class="live"><dt>${YEAR}</dt><dd>${pts}</dd></div>` : ""}
      </dl>
      ${compact ? "" : `<div class="rcareer">${r.wins ? `<b>${r.wins}</b> victoire${r.wins > 1 ? "s" : ""}` : "Aucune victoire"}${r.podiums ? ` · <b>${r.podiums}</b> podium${r.podiums > 1 ? "s" : ""}` : ""} <span>depuis 2020</span></div>
        <ul class="rbest">${r.best.slice(0, 2).map(e => `<li>${esc(e.label)}</li>`).join("") || `<li>${r.level === "PRT" ? "Équipe ProTeam" : r.level === "WT" ? "Équipe World Tour" : ""}</li>`}</ul>`}
      ${compact ? "" : inTeam ? `<button class="rbtn remove" data-remove="${esc(r.key)}">Retirer</button>`
        : canAdd ? `<button class="rbtn add" data-add="${esc(r.key)}">Ajouter · ${r.price}</button>`
        : `<button class="rbtn" disabled>${canAdd === false ? "Budget insuffisant" : "Équipe complète"}</button>`}
    </article>`;
}

async function renderGame() {
  const main = $("#jeu-main");
  if (!HISTORY) { main.innerHTML = `<div class="loading"><div class="spinner"><i></i><i></i><i></i></div>Chargement du jeu…</div>`; await loadHistory(); }
  const m = buildMarket();
  if (!main.dataset.ready) {
    main.dataset.ready = "1";
    main.addEventListener("click", onGameClick);
    main.addEventListener("input", onGameInput);
    main.addEventListener("submit", onGameSubmit);
  }
  main.innerHTML = `<div class="loading"><div class="spinner"><i></i><i></i><i></i></div>Chargement du jeu…</div>`;
  try { game.me = await Backend.me(); } catch (e) { game.me = null; game.msg = { err: true, t: e.message }; }
  game.draft = game.me ? [...game.me.riders] : [];
  drawGame();
  if (game.me && game.mode === "foot") FootGame.init();
  // résultats de la saison + classement en arrière-plan
  loadLive().then(() => { refreshPlayers(); });
}
async function refreshPlayers() {
  try { game.players = await Backend.list(); } catch (e) { game.players = []; }
  try { game.groups = await Backend.groups(); game.groupErr = null; } catch (e) { game.groups = { groups: [], members: [] }; game.groupErr = e.message; }
  drawGame();
}

/* points de chaque joueur (saison jouée, ou simulation sur 2026 avant le départ) */
function playerRows(started) {
  return game.players.map(p => ({ p, s: started ? teamScore(p).total : 0, sim: simulate2026(p.riders || []) }))
    .map(r => ({ ...r, v: started ? r.s : r.sim }))
    .sort((a, b) => b.v - a.v || b.sim - a.sim || a.p.pseudo.localeCompare(b.p.pseudo));
}
const groupOf = id => { const G = game.groups; const gid = G?.members.find(m => m.user === id)?.group; return gid ? G.groups.find(g => g.id === gid) || null : null; };
/* classement des groupes : moyenne des points de leurs joueurs (un grand groupe n'est pas avantagé) */
function groupRows(rows) {
  const G = game.groups || { groups: [], members: [] };
  return G.groups.map(g => {
    const ids = new Set(G.members.filter(m => m.group === g.id).map(m => m.user));
    const mem = rows.filter(r => ids.has(r.p.id));
    const total = mem.reduce((s, r) => s + r.v, 0);
    const playing = mem.filter(r => r.p.riders?.length).length;   // un joueur sans coureurs ne fait pas baisser la moyenne
    return { g, mem, total, avg: playing ? Math.round(total / playing) : 0 };
  }).filter(r => r.mem.length).sort((a, b) => b.avg - a.avg || b.total - a.total || a.g.name.localeCompare(b.g.name));
}
function playerList(rows, m, started) {
  return `<ol class="ranking">${rows.map(({ p, v }, i) => {
    const g = groupOf(p.id);
    return `
    <li class="${game.me && p.id === game.me.id ? "me" : ""}">
      <span class="pos">${i + 1}</span>
      <div class="rk-main">
        <b>${esc(p.pseudo)}</b>${g ? ` <span class="rk-group">${esc(g.name)}</span>` : ""}
        <div class="rk-riders">${(p.riders || []).map(k => m.by.get(k)).filter(Boolean).map(r => `<span>${cflag(r.nat)}${esc(r.name.split(" ").slice(-1)[0])}</span>`).join("") || "<span>Pas encore de coureurs</span>"}</div>
      </div>
      <div class="rk-pts"><b>${v}</b><small>${started ? "pts" : "pts (simul. 2026)"}</small></div>
    </li>`;
  }).join("")}</ol>`;
}
function groupsHTML(m, started) {
  const rows = playerRows(started);
  const ranked = groupRows(rows);
  const mine = groupOf(game.me.id);
  const unit = started ? "pts" : "pts (simul. 2026)";
  let panel;
  if (game.groupErr) panel = `<div class="g-msg err">${esc(game.groupErr)}</div>`;
  else if (mine) {
    const r = ranked.find(x => x.g.id === mine.id);
    const pos = ranked.indexOf(r) + 1;
    panel = `
      <div class="grp-mine">
        <div class="grp-mine-head">
          <div><div class="eyebrow">Mon groupe</div><h3>${esc(mine.name)}</h3>
            <p class="hint">${pos}<sup>${pos === 1 ? "er" : "e"}</sup> sur ${ranked.length} groupe${ranked.length > 1 ? "s" : ""} · ${r.mem.length} joueur${r.mem.length > 1 ? "s" : ""} · moyenne <b>${r.avg}</b> ${unit}</p></div>
          <button class="ghost" data-gleave>Quitter le groupe</button>
        </div>
        ${playerList(r.mem, m, started)}
      </div>`;
  } else {
    const others = (game.groups?.groups || []).filter(g => ranked.some(r => r.g.id === g.id));
    panel = `
      <div class="grp-join">
        <form id="grp-form" class="grp-create">
          <label>Créer un groupe<input name="gname" required minlength="2" maxlength="30" placeholder="ex. Les copains du club"></label>
          <button class="cta" type="submit" ${game.busy ? "disabled" : ""}>Créer et rejoindre</button>
        </form>
        ${others.length ? `<div class="grp-pick"><div class="mp-title">Ou rejoins un groupe existant</div>
          <div class="grp-chips">${ranked.map(r => `<button class="chip" data-gjoin="${esc(r.g.id)}">${esc(r.g.name)} <small>${r.mem.length}</small></button>`).join("")}</div></div>` : ""}
      </div>`;
  }
  return `
    <div class="rank-head">
      <div><h2>Groupes</h2><p class="hint">Joue avec tes amis, ton club ou ton bureau. Le classement individuel continue : le groupe ajoute un classement en plus. Un groupe est classé sur la <b>moyenne</b> des points de ses joueurs qui ont une équipe, pour qu'un grand groupe ne soit pas avantagé. Un joueur est dans un seul groupe à la fois.</p></div>
      <button class="ghost" data-refresh>Mettre à jour</button>
    </div>
    ${panel}
    <div class="section-title"><h2>Classement des groupes</h2></div>
    ${ranked.length ? `<ol class="ranking grp-ranking">${ranked.map(({ g, mem, total, avg }, i) => `
      <li class="${mine && g.id === mine.id ? "me" : ""}">
        <span class="pos">${i + 1}</span>
        <div class="rk-main">
          <b>${esc(g.name)}</b>
          <div class="rk-riders">${mem.map(r => `<span>${esc(r.p.pseudo)} · ${r.v}</span>`).join("")}</div>
        </div>
        <div class="rk-pts"><b>${avg}</b><small>moyenne · ${mem.length} joueur${mem.length > 1 ? "s" : ""} · total ${total}</small></div>
      </li>`).join("")}</ol>` : `<div class="empty">Aucun groupe pour l'instant. Crée le premier !</div>`}`;
}

function drawGame() {
  const main = $("#jeu-main");
  document.body.classList.toggle("jeu-foot", game.mode === "foot");
  if (game.mode === "foot" && game.me) return FootGame.draw();
  const m = buildMarket();
  const ph = phase();
  const now = new Date();
  const started = now >= LOCK;
  const cost = game.draft.reduce((s, k) => s + (m.by.get(k)?.price || 0), 0);
  const left = BUDGET - cost;
  const dirty = game.me && JSON.stringify(game.draft) !== JSON.stringify(game.me.riders);
  const myScore = game.me ? teamScore(game.me) : { total: 0, per: {} };
  const daysLeft = Math.ceil((LOCK - now) / 864e5);

  const hero = `
    <section class="g-hero">
      <div class="g-hero-text">
        <div class="eyebrow">Jeu · saison ${YEAR}</div>
        <h1>Mes équipes</h1>
        <p>Compose une équipe de ${SIZE} coureurs avec ${BUDGET} points de budget fictif. Pendant la saison ${YEAR}, chaque victoire, podium, étape ou maillot de tes coureurs te rapporte des points. Le meilleur total à la fin de l'année gagne.</p>
      </div>
      <div class="g-hero-side">
        <div class="countdown">${started ? `<b>${myScore.total}</b><span>points ${YEAR}</span>` : `<b>${daysLeft}</b><span>jour${daysLeft > 1 ? "s" : ""} avant le départ</span>`}</div>
        <div class="phase ${ph.open ? "open" : "shut"}">${esc(ph.label)}</div>
        <div class="mode">${ONLINE ? "🌐 Classement en ligne" : "💻 Mode local · ce PC"}</div>
      </div>
    </section>`;

  const msg = game.msg ? `<div class="g-msg ${game.msg.err ? "err" : "ok"}">${esc(game.msg.t)}</div>` : "";

  if (!game.me) {
    const signup = game.authMode === "signup";
    const foot = game.mode === "foot" ? FootGame.loggedOut() : null;
    main.innerHTML = modeSwitchHTML() + (foot ? foot.hero : hero) + msg + `
      <section class="auth">
        <div class="auth-card">
          <div class="auth-tabs">
            <button class="${signup ? "on" : ""}" data-auth="signup">Créer mon équipe</button>
            <button class="${!signup ? "on" : ""}" data-auth="login">Me connecter</button>
          </div>
          <form id="auth-form" autocomplete="on">
            ${signup || !ONLINE ? `<label>Pseudo<input id="f-pseudo" name="pseudo" required maxlength="20" placeholder="ex. Matteo_BE"></label>` : ""}
            ${ONLINE ? `
              <label>E-mail<input id="f-email" name="email" type="email" required placeholder="toi@exemple.be"></label>
              <label>Mot de passe<input id="f-pass" name="password" type="password" required minlength="6" placeholder="6 caractères minimum"></label>`
            : `<label>Code secret (4 chiffres)<input id="f-pin" name="pin" inputmode="numeric" pattern="\\d{4}" maxlength="4" required placeholder="••••"></label>`}
            <button class="cta" type="submit" ${game.busy ? "disabled" : ""}>${signup ? "Créer mon équipe" : "Me connecter"}</button>
          </form>
          <p class="hint">${ONLINE ? "Ton e-mail sert seulement à te reconnecter. Les autres joueurs voient uniquement ton pseudo." : "Mode local : les équipes restent sur ce PC. Le code évite qu'un autre joueur modifie ton équipe."}</p>
        </div>
        <div class="auth-preview">
          <div class="mp-title">${foot ? foot.previewTitle : "Les coureurs les plus chers"}</div>
          <div class="mini-cards">${foot ? foot.preview : m.list.slice(0, 3).map(r => riderCard(r, { compact: true, canAdd: null })).join("")}</div>
        </div>
      </section>
      ${foot ? foot.rules : rulesHTML()}`;
    return;
  }

  // onglets
  const tabs = `
    <nav class="tabs g-tabs">
      <button class="tab ${game.tab === "team" ? "active" : ""}" data-gtab="team">Mon équipe</button>
      <button class="tab ${game.tab === "market" ? "active" : ""}" data-gtab="market">Marché des coureurs</button>
      <button class="tab ${game.tab === "rank" ? "active" : ""}" data-gtab="rank">Classement</button>
      <button class="tab ${game.tab === "groups" ? "active" : ""}" data-gtab="groups">Groupes</button>
      <button class="tab ${game.tab === "rules" ? "active" : ""}" data-gtab="rules">Règles & barème</button>
      <span class="grow"></span>
      <span class="who">${esc(game.me.pseudo)} · <button class="linkbtn" data-logout>Déconnexion</button></span>
    </nav>`;

  const budgetBar = `
    <div class="budget">
      <div class="b-row">
        <span>Budget</span>
        <b class="${left < 0 ? "neg" : ""}">${left} <small>/ ${BUDGET} restants</small></b>
        <span class="b-count">${game.draft.length}/${SIZE} coureurs</span>
      </div>
      <div class="b-track"><i style="width:${Math.min(100, cost / BUDGET * 100)}%"></i></div>
      ${dirty ? `<div class="b-actions"><button class="cta" data-save ${game.busy || !ph.open ? "disabled" : ""}>Valider mon équipe</button><button class="ghost" data-reset>Annuler les changements</button></div>` : ""}
    </div>`;

  let body = "";
  if (game.tab === "team") {
    const sim = simulate2026(game.draft);
    const slots = Array.from({ length: SIZE }, (_, i) => {
      const r = m.by.get(game.draft[i]);
      return r ? riderCard(r, { inTeam: ph.open, pts: started ? (myScore.per[r.key]?.pts || 0) : null })
        : `<button class="slot" data-gtab="market"><span>+</span>Choisir un coureur</button>`;
    }).join("");
    const myEvents = Object.values(myScore.per).flatMap(p => p.list).sort((a, b) => b.date - a.date).slice(0, 12);
    body = budgetBar + `
      <div class="team-head">
        <h2>${esc(game.me.pseudo)}</h2>
        <div class="sim">Avec les résultats de 2026, cette équipe aurait marqué <b>${sim}</b> points.</div>
      </div>
      <div class="slots">${slots}</div>
      ${started ? `<div class="section-title"><h2>Derniers points marqués</h2></div>
        ${myEvents.length ? `<div class="table-wrap"><table class="race-table">${myEvents.map(e => `<tr><td class="rd">${e.date.toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}</td><td><div class="rw">${cflag(e.nat)} ${esc(e.name)}</div></td><td class="sm">${esc(e.label)}</td><td class="pts-cell">+${e.pts}</td></tr>`).join("")}</table></div>`
        : `<div class="empty">Tes coureurs n'ont pas encore marqué de points cette saison.</div>`}` : ""}`;
  } else if (game.tab === "market") {
    const q = keyOf(game.q);
    let list = m.list.filter(r => (game.tier === "all" || r.tier.id === game.tier) && (!game.be || r.nat === "BEL") && (!game.young || (r.age != null && r.age <= 23)) && (!q || keyOf(r.name + " " + riderTeam(r)).includes(q)));
    if (game.sort === "pts") list = [...list].sort((a, b) => b.pts - a.pts);
    if (game.sort === "value") list = [...list].sort((a, b) => b.pts / b.price - a.pts / a.price);
    if (game.sort === "cheap") list = [...list].sort((a, b) => a.price - b.price || b.pts - a.pts);
    if (game.sort === "young") list = [...list].sort((a, b) => (a.age ?? 99) - (b.age ?? 99) || b.price - a.price);
    if (game.sort === "wins") list = [...list].sort((a, b) => b.wins - a.wins || b.price - a.price);
    const shown = list.slice(0, 120);
    body = budgetBar + `
      <div class="toolbar">
        <input class="search" id="g-q" type="search" placeholder="Coureur ou équipe…" value="${esc(game.q)}">
        <button class="chip be ${game.be ? "on" : ""}" data-gbe>${flagImg("be")} Belges</button>
        <button class="chip ${game.young ? "on" : ""}" data-gyoung>Jeunes (23 ans et moins)</button>
        ${[["all", "Tous"], ...TIERS.map(t => [t.id, t.name])].map(([id, n]) => `<button class="chip ${game.tier === id ? "on" : ""}" data-gtier="${id}">${n}</button>`).join("")}
        <select id="g-sort" class="select" aria-label="Trier">
          <option value="price" ${game.sort === "price" ? "selected" : ""}>Prix ↓</option>
          <option value="cheap" ${game.sort === "cheap" ? "selected" : ""}>Prix ↑</option>
          <option value="pts" ${game.sort === "pts" ? "selected" : ""}>Points 2026 ↓</option>
          <option value="value" ${game.sort === "value" ? "selected" : ""}>Bonnes affaires</option>
          <option value="wins" ${game.sort === "wins" ? "selected" : ""}>Victoires depuis 2020</option>
          <option value="young" ${game.sort === "young" ? "selected" : ""}>Plus jeunes</option>
        </select>
      </div>
      ${!ph.open ? `<div class="g-msg">${esc(ph.label)}. Tu peux consulter le marché, mais pas modifier ton équipe.</div>` : ""}
      <div class="market">${shown.map(r => {
        const inTeam = game.draft.includes(r.key);
        const canAdd = ph.open && game.draft.length < SIZE ? (r.price <= left ? true : false) : null;
        return riderCard(r, { inTeam: inTeam && ph.open, canAdd: inTeam ? null : canAdd });
      }).join("")}</div>
      <p class="hint center">${list.length} coureurs${list.length > shown.length ? ` · ${shown.length} affichés, affine ta recherche` : ""}. Le prix dépend des résultats de 2020 à 2026 (la saison la plus récente compte le plus), de l'âge et de la forme du moment.</p>`;
  } else if (game.tab === "rank") {
    const rows = playerRows(started);
    body = `
      <div class="rank-head">
        <div><h2>Classement ${YEAR}</h2><p class="hint">${started ? "Points de la saison, mis à jour avec les résultats lus sur Wikipédia." : `La saison n'a pas commencé : en attendant, les équipes sont classées sur ce qu'elles auraient marqué en 2026.`} Le classement des groupes est dans l'onglet <button class="linkbtn" data-gtab="groups">Groupes</button>.</p></div>
        <button class="ghost" data-refresh>Mettre à jour</button>
      </div>
      ${rows.length ? playerList(rows, m, started) : `<div class="empty">Personne n'a encore créé d'équipe. Sois le premier !</div>`}
      <div id="live-progress" class="hint center"></div>
      ${LIVE ? `<p class="hint center">Résultats ${YEAR} lus le ${new Date(LIVE.loadedAt).toLocaleString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${LIVE_EVENTS.length} résultats comptés.</p>` : ""}`;
  } else if (game.tab === "groups") {
    body = groupsHTML(m, started);
  } else {
    body = rulesHTML();
  }
  main.innerHTML = modeSwitchHTML() + hero + msg + tabs + body;
}

function rulesHTML() {
  const row = (b, cols) => `<tr><td>${esc(b.label)}</td><td>${cols}</td></tr>`;
  const pod = p => `${p[0]} / ${p[1]} / ${p[2]}`;
  return `
    <section class="rules">
      <div class="section-title"><h2>Règles</h2></div>
      <ul class="rule-list">
        <li><b>${BUDGET} points</b> de budget fictif et <b>${SIZE} coureurs</b> maximum. Le prix d'un coureur dépend de ses points sur 7 saisons : 2026 compte en entier, puis 2025 à 70 %, 2024 à 50 %, 2023 à 35 %, 2022 à 25 %, 2021 à 15 % et 2020 à 10 %. Il est ensuite ajusté selon l'<b>âge</b> (+15 % jusqu'à 22 ans, +8 % jusqu'à 25 ans, −8 % à 32-33 ans, −18 % à 34-35 ans, −28 % au-delà) et la <b>forme</b> (jusqu'à ±10 % selon que 2026 est meilleure ou moins bonne que les deux saisons d'avant). Tous les coureurs des équipes World Tour et ProTeam sont au marché, à partir de 3 points.</li>
        <li>Tu peux changer ton équipe librement jusqu'au <b>${LOCK.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}</b>.</li>
        <li>Ensuite, ${WINDOWS.length} fenêtre${WINDOWS.length > 1 ? "s" : ""} de transferts : ${WINDOWS.map(w => `<b>${esc(w.name)}</b> (${w.start.toLocaleDateString("fr-BE", { day: "numeric", month: "long" })} – ${w.end.toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}, ${w.max} transferts)`).join(", ")}.</li>
        <li>Un coureur ne rapporte que les points marqués <b>pendant qu'il est dans ton équipe</b>.</li>
        <li>Les résultats sont lus automatiquement sur Wikipédia. Le joueur avec le plus de points au dernier jour de la saison gagne.</li>
      </ul>
      <div class="section-title"><h2>Barème</h2><span>points par résultat</span></div>
      <div class="table-wrap"><table class="race-table bareme">
        <thead><tr><th>Course</th><th>Points</th></tr></thead>
        <tbody>
          ${row(BAREME.gt, `Général ${pod(BAREME.gt.gc)} · étape ${BAREME.gt.stage} · maillot points / montagne ${BAREME.gt.jerseys.Points} · jeune ${BAREME.gt.jerseys.Jeune}`)}
          ${row(BAREME.monument, `Podium ${pod(BAREME.monument.podium)}`)}
          ${row(BAREME.wtOne, `Podium ${pod(BAREME.wtOne.podium)}`)}
          ${row(BAREME.wtStage, `Général ${pod(BAREME.wtStage.gc)} · étape ${BAREME.wtStage.stage} · maillot points / montagne ${BAREME.wtStage.jerseys.Points}`)}
          ${row(BAREME.pro, `Victoire ${BAREME.pro.win} · étape ${BAREME.pro.stage}`)}
          ${row(BAREME.e1, `Victoire ${BAREME.e1.win}`)}
          ${row(BAREME.e2, `Victoire ${BAREME.e2.win}`)}
          ${row(BAREME.e2u, `Victoire ${BAREME.e2u.win}`)}
          ${row(BAREME.worldsRR, `Podium ${pod(BAREME.worldsRR.podium)}`)}
          ${row(BAREME.worldsTT, `Podium ${pod(BAREME.worldsTT.podium)}`)}
          ${row(BAREME.euroRR, `Podium ${pod(BAREME.euroRR.podium)}`)}
          ${row(BAREME.euroTT, `Podium ${pod(BAREME.euroTT.podium)}`)}
        </tbody>
      </table></div>
    </section>`;
}

async function onGameClick(e) {
  const t = e.target;
  const gm = t.closest("[data-gmode]");
  if (gm) {
    game.mode = gm.dataset.gmode; store.set("jeu-mode", game.mode); game.msg = null;
    arenaTrack(`Je parie · ${game.mode === "foot" ? "foot" : "vélo"}`);
    drawGame();
    if (game.me && game.mode === "foot") FootGame.init();
    return;
  }
  if (game.mode === "foot" && game.me && !t.closest("[data-logout]") && await FootGame.onClick(e)) return;
  const g = t.closest("[data-gtab]");
  if (g) { game.tab = g.dataset.gtab; game.msg = null; drawGame(); window.scrollTo(0, 0); return; }
  const au = t.closest("[data-auth]");
  if (au) { game.authMode = au.dataset.auth; game.msg = null; drawGame(); return; }
  const add = t.closest("[data-add]");
  if (add) {
    const k = add.dataset.add;
    if (!game.draft.includes(k) && game.draft.length < SIZE) game.draft.push(k);
    game.msg = null; drawGame(); return;
  }
  const rm = t.closest("[data-remove]");
  if (rm) { game.draft = game.draft.filter(k => k !== rm.dataset.remove); game.msg = null; drawGame(); return; }
  if (t.closest("[data-reset]")) { game.draft = [...game.me.riders]; game.msg = null; drawGame(); return; }
  if (t.closest("[data-gbe]")) { game.be = !game.be; drawGame(); return; }
  if (t.closest("[data-gyoung]")) { game.young = !game.young; drawGame(); return; }
  const join = t.closest("[data-gjoin]");
  if (join || t.closest("[data-gleave]")) {
    game.busy = true; game.msg = null;
    try {
      if (join) { await Backend.joinGroup(game.me, join.dataset.gjoin); game.msg = { t: "Tu as rejoint le groupe." }; }
      else { await Backend.leaveGroup(game.me); game.msg = { t: "Tu as quitté le groupe." }; }
    } catch (err) { game.msg = { err: true, t: err.message }; }
    game.busy = false; await refreshPlayers(); return;
  }
  const tier = t.closest("[data-gtier]");
  if (tier) { game.tier = tier.dataset.gtier; drawGame(); return; }
  if (t.closest("[data-logout]")) { await Backend.logout(); window.checkAdmin?.(); game.me = null; game.draft = []; game.msg = null; drawGame(); return; }
  if (t.closest("[data-refresh]")) {
    const b = t.closest("[data-refresh]"); b.disabled = true; b.textContent = "Mise à jour…";
    await loadLive(true); await refreshPlayers(); return;
  }
  if (t.closest("[data-save]")) {
    game.busy = true; drawGame();
    try {
      const next = applyRoster(game.me, game.draft);
      game.me = await Backend.save(next);
      game.draft = [...game.me.riders];
      game.msg = { t: "Équipe enregistrée." };
      refreshPlayers();
    } catch (err) { game.msg = { err: true, t: err.message }; }
    game.busy = false; drawGame();
  }
}
function onGameInput(e) {
  if (game.mode === "foot" && FootGame.onInput(e)) return;
  if (e.target.id === "g-q") {
    game.q = e.target.value;
    const pos = e.target.selectionStart;
    drawGame();
    const q = document.getElementById("g-q"); q.focus(); q.setSelectionRange(pos, pos);
  }
  if (e.target.id === "g-sort") { game.sort = e.target.value; drawGame(); }
}
async function onGameSubmit(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const v = Object.fromEntries(f.entries());
  if (e.target.id === "grp-form") {
    game.busy = true; game.msg = null;
    try { await Backend.createGroup(game.me, v.gname.trim()); game.msg = { t: `Groupe « ${v.gname.trim()} » créé.` }; }
    catch (err) { game.msg = { err: true, t: err.message }; }
    game.busy = false; await refreshPlayers(); return;
  }
  game.busy = true; game.msg = null; drawGame();
  try {
    game.me = game.authMode === "signup" ? await Backend.signup(v) : await Backend.login(v);
    game.draft = [...(game.me?.riders || [])];
    game.tab = game.me?.riders?.length ? "team" : "market";
    refreshPlayers();
    setTimeout(() => window.checkAdmin?.(), 300);   // compte admin : le bouton « Admin » apparaît tout de suite
    if (game.mode === "foot") { drawGame(); FootGame.init(); game.busy = false; return; }
  } catch (err) { game.msg = { err: true, t: err.message }; }
  game.busy = false; drawGame();
}

window.ArenaGame = { renderGame, buildMarket, scoreEvents, teamScore, applyRoster, phase };
