/* ARENA — « Je parie » : jeu de cyclisme avec budget fictif.
   Prix des coureurs = leurs résultats 2026 ; points = leurs résultats de la saison jouée, lus en direct sur Wikipédia.
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

// ---------------------------------------------------------------- marché (prix = saison 2026)
const TIERS = [
  { min: 70, id: "legend", name: "Légende" },
  { min: 45, id: "star", name: "Star" },
  { min: 25, id: "pro", name: "Pro" },
  { min: 0, id: "rookie", name: "Outsider" },
];
let MARKET = null;
function buildMarket() {
  if (MARKET) return MARKET;
  const D = window.CYCLING;
  const evs = scoreEvents(cloneData(D));
  const teams = {};
  for (const k of ["worldtour", "proseries", "europetour"]) D[k].forEach(r => { if (r.winner && r.team) teams[keyOf(r.winner.name)] = r.team; });
  const by = new Map();
  for (const e of evs) {
    const o = by.get(e.key) || { key: e.key, name: e.name, nat: e.nat, pts: 0, wins: 0, best: [] };
    o.pts += e.pts;
    if (/^(Victoire|1er|Étape)/.test(e.label)) o.wins++;
    o.best.push(e);
    if (!o.nat && e.nat) o.nat = e.nat;
    by.set(e.key, o);
  }
  const max = Math.max(...[...by.values()].map(r => r.pts));
  const list = [...by.values()].map(r => {
    const price = Math.round(5 + 95 * Math.sqrt(r.pts / max));   // de 11 (une petite victoire) à 100 (le n°1)
    r.best.sort((a, b) => b.pts - a.pts);
    return { ...r, team: teams[r.key] || null, price, tier: TIERS.find(t => price >= t.min), best: r.best.slice(0, 4) };
  }).sort((a, b) => b.price - a.price || b.pts - a.pts);
  MARKET = { list, by: new Map(list.map(r => [r.key, r])), events2026: evs };
  return MARKET;
}

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
    this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
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
};
const frAuth = m => /invalid login/i.test(m) ? "E-mail ou mot de passe incorrect."
  : /already registered/i.test(m) ? "Un compte existe déjà avec cet e-mail : connecte-toi."
  : /password/i.test(m) && /6/.test(m) ? "Le mot de passe doit faire au moins 6 caractères."
  : /email/i.test(m) && /invalid/i.test(m) ? "Adresse e-mail invalide." : m;
const Backend = ONLINE ? Online : Local;

// ---------------------------------------------------------------- interface
const game = { mode: store.get("jeu-mode", "velo"), tab: "team", me: null, draft: null, q: "", tier: "all", be: false, sort: "price", players: [], msg: null, busy: false, authMode: "signup" };

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
      <div class="rteam">${esc(teamName(r.team) || natFr(r.nat))}</div>
      <dl class="rstats">
        <div><dt>2026</dt><dd>${r.pts}</dd></div>
        <div><dt>Victoires</dt><dd>${r.wins}</dd></div>
        ${pts != null ? `<div class="live"><dt>${YEAR}</dt><dd>${pts}</dd></div>` : ""}
      </dl>
      ${compact ? "" : `<ul class="rbest">${r.best.slice(0, 2).map(e => `<li>${esc(e.label)}</li>`).join("")}</ul>`}
      ${compact ? "" : inTeam ? `<button class="rbtn remove" data-remove="${esc(r.key)}">Retirer</button>`
        : canAdd ? `<button class="rbtn add" data-add="${esc(r.key)}">Ajouter · ${r.price}</button>`
        : `<button class="rbtn" disabled>${canAdd === false ? "Budget insuffisant" : "Équipe complète"}</button>`}
    </article>`;
}

async function renderGame() {
  const main = $("#jeu-main");
  const m = buildMarket();
  if (!main.dataset.ready) {
    main.dataset.ready = "1";
    main.addEventListener("click", onGameClick);
    main.addEventListener("input", onGameInput);
    main.addEventListener("submit", onGameSubmit);
  }
  main.innerHTML = `<div class="loading"><div class="spinner"></div>Chargement du jeu…</div>`;
  try { game.me = await Backend.me(); } catch (e) { game.me = null; game.msg = { err: true, t: e.message }; }
  game.draft = game.me ? [...game.me.riders] : [];
  drawGame();
  if (game.me && game.mode === "foot") FootGame.init();
  // résultats de la saison + classement en arrière-plan
  loadLive().then(() => { refreshPlayers(); });
}
async function refreshPlayers() {
  try { game.players = await Backend.list(); } catch (e) { game.players = []; }
  drawGame();
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
        <h1>Je parie</h1>
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
    let list = m.list.filter(r => (game.tier === "all" || r.tier.id === game.tier) && (!game.be || r.nat === "BEL") && (!q || keyOf(r.name + " " + teamName(r.team)).includes(q)));
    if (game.sort === "pts") list = [...list].sort((a, b) => b.pts - a.pts);
    if (game.sort === "value") list = [...list].sort((a, b) => b.pts / b.price - a.pts / a.price);
    if (game.sort === "cheap") list = [...list].sort((a, b) => a.price - b.price || b.pts - a.pts);
    const shown = list.slice(0, 120);
    body = budgetBar + `
      <div class="toolbar">
        <input class="search" id="g-q" type="search" placeholder="Coureur ou équipe…" value="${esc(game.q)}">
        <button class="chip be ${game.be ? "on" : ""}" data-gbe>${flagImg("be")} Belges</button>
        ${[["all", "Tous"], ...TIERS.map(t => [t.id, t.name])].map(([id, n]) => `<button class="chip ${game.tier === id ? "on" : ""}" data-gtier="${id}">${n}</button>`).join("")}
        <select id="g-sort" class="select" aria-label="Trier">
          <option value="price" ${game.sort === "price" ? "selected" : ""}>Prix ↓</option>
          <option value="cheap" ${game.sort === "cheap" ? "selected" : ""}>Prix ↑</option>
          <option value="pts" ${game.sort === "pts" ? "selected" : ""}>Points 2026 ↓</option>
          <option value="value" ${game.sort === "value" ? "selected" : ""}>Bonnes affaires</option>
        </select>
      </div>
      ${!ph.open ? `<div class="g-msg">${esc(ph.label)}. Tu peux consulter le marché, mais pas modifier ton équipe.</div>` : ""}
      <div class="market">${shown.map(r => {
        const inTeam = game.draft.includes(r.key);
        const canAdd = ph.open && game.draft.length < SIZE ? (r.price <= left ? true : false) : null;
        return riderCard(r, { inTeam: inTeam && ph.open, canAdd: inTeam ? null : canAdd });
      }).join("")}</div>
      <p class="hint center">${list.length} coureurs${list.length > shown.length ? ` · ${shown.length} affichés, affine ta recherche` : ""}. Le prix dépend des résultats de 2026.</p>`;
  } else if (game.tab === "rank") {
    const rows = game.players.map(p => ({ p, s: started ? teamScore(p).total : 0, sim: simulate2026(p.riders || []) }))
      .sort((a, b) => b.s - a.s || b.sim - a.sim || a.p.pseudo.localeCompare(b.p.pseudo));
    body = `
      <div class="rank-head">
        <div><h2>Classement ${YEAR}</h2><p class="hint">${started ? "Points de la saison, mis à jour avec les résultats lus sur Wikipédia." : `La saison n'a pas commencé : en attendant, les équipes sont classées sur ce qu'elles auraient marqué en 2026.`}</p></div>
        <button class="ghost" data-refresh>Mettre à jour</button>
      </div>
      ${rows.length ? `<ol class="ranking">${rows.map(({ p, s, sim }, i) => `
        <li class="${game.me && p.id === game.me.id ? "me" : ""}">
          <span class="pos">${i + 1}</span>
          <div class="rk-main">
            <b>${esc(p.pseudo)}</b>
            <div class="rk-riders">${(p.riders || []).map(k => m.by.get(k)).filter(Boolean).map(r => `<span>${cflag(r.nat)}${esc(r.name.split(" ").slice(-1)[0])}</span>`).join("") || "<span>Pas encore de coureurs</span>"}</div>
          </div>
          <div class="rk-pts"><b>${started ? s : sim}</b><small>${started ? "pts" : "pts (simul. 2026)"}</small></div>
        </li>`).join("")}</ol>` : `<div class="empty">Personne n'a encore créé d'équipe. Sois le premier !</div>`}
      <div id="live-progress" class="hint center"></div>
      ${LIVE ? `<p class="hint center">Résultats ${YEAR} lus le ${new Date(LIVE.loadedAt).toLocaleString("fr-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${LIVE_EVENTS.length} résultats comptés.</p>` : ""}`;
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
        <li><b>${BUDGET} points</b> de budget fictif et <b>${SIZE} coureurs</b> maximum. Le prix d'un coureur dépend de ses résultats en 2026.</li>
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
