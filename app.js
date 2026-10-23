/* ARENA — résultats foot (API ESPN, temps réel) + palmarès cyclisme 2026 */
"use strict";

const API = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const API_STD = "https://site.api.espn.com/apis/v2/sports/soccer";

// ---------------------------------------------------------------- compétitions
const LEAGUES = [
  // Championnats — première division
  { s: "bel.1", n: "Jupiler Pro League", c: "Belgique", f: "be", g: "d1" },
  { s: "eng.1", n: "Premier League", c: "Angleterre", f: "gb-eng", g: "d1" },
  { s: "esp.1", n: "LaLiga", c: "Espagne", f: "es", g: "d1" },
  { s: "fra.1", n: "Ligue 1", c: "France", f: "fr", g: "d1" },
  { s: "ita.1", n: "Serie A", c: "Italie", f: "it", g: "d1" },
  { s: "ger.1", n: "Bundesliga", c: "Allemagne", f: "de", g: "d1" },
  { s: "ned.1", n: "Eredivisie", c: "Pays-Bas", f: "nl", g: "d1" },
  { s: "por.1", n: "Liga Portugal", c: "Portugal", f: "pt", g: "d1" },
  { s: "tur.1", n: "Süper Lig", c: "Turquie", f: "tr", g: "d1" },
  { s: "sco.1", n: "Premiership", c: "Écosse", f: "gb-sct", g: "d1" },
  { s: "aut.1", n: "Bundesliga", c: "Autriche", f: "at", g: "d1" },
  { s: "sui.1", n: "Super League", c: "Suisse", f: "ch", g: "d1" },
  { s: "gre.1", n: "Super League", c: "Grèce", f: "gr", g: "d1" },
  { s: "den.1", n: "Superliga", c: "Danemark", f: "dk", g: "d1" },
  { s: "nor.1", n: "Eliteserien", c: "Norvège", f: "no", g: "d1" },
  { s: "swe.1", n: "Allsvenskan", c: "Suède", f: "se", g: "d1" },
  { s: "cze.1", n: "Chance Liga", c: "Tchéquie", f: "cz", g: "d1" },
  { s: "rou.1", n: "SuperLiga", c: "Roumanie", f: "ro", g: "d1" },
  { s: "rus.1", n: "Premier Liga", c: "Russie", f: "ru", g: "d1" },
  { s: "cyp.1", n: "First Division", c: "Chypre", f: "cy", g: "d1" },
  { s: "isr.1", n: "Ligat ha'Al", c: "Israël", f: "il", g: "d1" },
  { s: "irl.1", n: "Premier Division", c: "Irlande", f: "ie", g: "d1" },
  { s: "fin.1", n: "Veikkausliiga", c: "Finlande", f: "fi", g: "d1" },
  { s: "wal.1", n: "Cymru Premier", c: "Pays de Galles", f: "gb-wls", g: "d1" },
  { s: "nir.1", n: "Premiership", c: "Irlande du Nord", f: "gb-nir", g: "d1" },
  { s: "mlt.1", n: "Premier League", c: "Malte", f: "mt", g: "d1" },
  // Coupes d'Europe (les qualifications sont dans la compétition, onglet « Qualifications »)
  { s: "uefa.champions", n: "Ligue des Champions", c: "UEFA", f: "eu", g: "euro", sub: [["uefa.champions", "Phase principale"], ["uefa.champions_qual", "Qualifications"]] },
  { s: "uefa.europa", n: "Europa League", c: "UEFA", f: "eu", g: "euro", sub: [["uefa.europa", "Phase principale"], ["uefa.europa_qual", "Qualifications"]] },
  { s: "uefa.europa.conf", n: "Conference League", c: "UEFA", f: "eu", g: "euro", sub: [["uefa.europa.conf", "Phase principale"], ["uefa.europa.conf_qual", "Qualifications"]] },
  { s: "uefa.super_cup", n: "Supercoupe d'Europe", c: "UEFA", f: "eu", g: "euro" },
  { s: "fifa.cwc", n: "Coupe du monde des clubs", c: "FIFA", i: "🌍", g: "euro" },
  // Sélections nationales
  { s: "fifa.world", n: "Coupe du Monde", c: "FIFA", i: "🏆", g: "nat", sub: [
    ["fifa.world", "Phase finale"], ["fifa.worldq.uefa", "Qualifs Europe"], ["fifa.worldq.caf", "Qualifs Afrique"],
    ["fifa.worldq.conmebol", "Qualifs Amérique du Sud"], ["fifa.worldq.concacaf", "Qualifs CONCACAF"], ["fifa.worldq.afc", "Qualifs Asie"],
    ["fifa.worldq.ofc", "Qualifs Océanie"], ["fifa.wcq.ply", "Barrages intercontinentaux"]] },
  { s: "uefa.euro", n: "Euro", c: "UEFA", f: "eu", g: "nat", sub: [["uefa.euro", "Phase finale"], ["uefa.euroq", "Qualifications"]] },
  { s: "uefa.nations", n: "Ligue des Nations", c: "UEFA", f: "eu", g: "nat" },
  { s: "caf.nations", n: "Coupe d'Afrique (CAN)", c: "CAF", i: "🌍", g: "nat", sub: [["caf.nations", "Phase finale"], ["caf.nations_qual", "Qualifications"]] },
  { s: "conmebol.america", n: "Copa América", c: "CONMEBOL", i: "🌎", g: "nat" },
  { s: "concacaf.gold", n: "Gold Cup", c: "CONCACAF", i: "🌎", g: "nat", sub: [["concacaf.gold", "Phase finale"], ["concacaf.gold_qual", "Qualifications"]] },
  { s: "afc.asian.cup", n: "Coupe d'Asie", c: "AFC", i: "🌏", g: "nat", sub: [["afc.asian.cup", "Phase finale"], ["afc.cupq", "Qualifications"]] },
  { s: "global.finalissima", n: "Finalissima", c: "UEFA-CONMEBOL", i: "🏆", g: "nat" },
  { s: "fifa.olympics", n: "Jeux olympiques", c: "FIFA", i: "🏅", g: "nat" },
  { s: "fifa.friendly", n: "Matchs amicaux", c: "International", i: "🤝", g: "nat" },
  // Coupes nationales — "w:" = lue sur Wikipédia ({S} = saison 2026–27, {Y} = année)
  { s: "w:bel", n: "Croky Cup", c: "Belgique", f: "be", g: "cup", wiki: "{S} Belgian Cup" },
  { s: "w:belsc", n: "Supercoupe de Belgique", c: "Belgique", f: "be", g: "cup", wiki: "{Y} Belgian Super Cup" },
  { s: "eng.fa", n: "FA Cup", c: "Angleterre", f: "gb-eng", g: "cup", sub: [["eng.fa", "Tours principaux"], ["eng.fa_qual", "Tours préliminaires"]] },
  { s: "eng.league_cup", n: "Carabao Cup", c: "Angleterre", f: "gb-eng", g: "cup" },
  { s: "eng.charity", n: "Community Shield", c: "Angleterre", f: "gb-eng", g: "cup" },
  { s: "esp.copa_del_rey", n: "Copa del Rey", c: "Espagne", f: "es", g: "cup" },
  { s: "esp.super_cup", n: "Supercopa", c: "Espagne", f: "es", g: "cup" },
  { s: "fra.coupe_de_france", n: "Coupe de France", c: "France", f: "fr", g: "cup" },
  { s: "fra.super_cup", n: "Trophée des Champions", c: "France", f: "fr", g: "cup" },
  { s: "ita.coppa_italia", n: "Coppa Italia", c: "Italie", f: "it", g: "cup" },
  { s: "ita.super_cup", n: "Supercoppa", c: "Italie", f: "it", g: "cup" },
  { s: "ger.dfb_pokal", n: "DFB-Pokal", c: "Allemagne", f: "de", g: "cup" },
  { s: "ger.super_cup", n: "Supercup", c: "Allemagne", f: "de", g: "cup" },
  { s: "ned.cup", n: "KNVB Beker", c: "Pays-Bas", f: "nl", g: "cup" },
  { s: "ned.supercup", n: "Johan Cruijff Schaal", c: "Pays-Bas", f: "nl", g: "cup" },
  { s: "por.taca.portugal", n: "Taça de Portugal", c: "Portugal", f: "pt", g: "cup" },
  { s: "sco.tennents", n: "Scottish Cup", c: "Écosse", f: "gb-sct", g: "cup", sub: [["sco.tennents", "Tours principaux"], ["sco.tennents_qual", "Tours préliminaires"]] },
  { s: "sco.cis", n: "League Cup", c: "Écosse", f: "gb-sct", g: "cup" },
  { s: "w:tur", n: "Coupe de Turquie", c: "Turquie", f: "tr", g: "cup", wiki: "{S} Turkish Cup" },
  { s: "w:gre", n: "Coupe de Grèce", c: "Grèce", f: "gr", g: "cup", wiki: "{S} Greek Football Cup" },
  { s: "w:aut", n: "ÖFB-Cup", c: "Autriche", f: "at", g: "cup", wiki: "{S} Austrian Cup" },
  { s: "w:pol", n: "Puchar Polski", c: "Pologne", f: "pl", g: "cup", wiki: "{S} Polish Cup" },
  { s: "w:cze", n: "Coupe de Tchéquie", c: "Tchéquie", f: "cz", g: "cup", wiki: "{S} Czech Cup" },
  { s: "w:cro", n: "Coupe de Croatie", c: "Croatie", f: "hr", g: "cup", wiki: "{S} Croatian Football Cup" },
  { s: "w:ukr", n: "Coupe d'Ukraine", c: "Ukraine", f: "ua", g: "cup", wiki: "{S} Ukrainian Cup" },
  { s: "w:rus", n: "Coupe de Russie", c: "Russie", f: "ru", g: "cup", wiki: "{S} Russian Cup" },
  { s: "w:rou", n: "Cupa României", c: "Roumanie", f: "ro", g: "cup", wiki: "{S} Cupa României" },
  { s: "w:hun", n: "Magyar Kupa", c: "Hongrie", f: "hu", g: "cup", wiki: "{S} Magyar Kupa" },
  { s: "w:bul", n: "Coupe de Bulgarie", c: "Bulgarie", f: "bg", g: "cup", wiki: "{S} Bulgarian Cup" },
  { s: "w:cyp", n: "Coupe de Chypre", c: "Chypre", f: "cy", g: "cup", wiki: "{S} Cypriot Cup" },
  { s: "w:isr", n: "Coupe d'Israël", c: "Israël", f: "il", g: "cup", wiki: "{S} Israel State Cup" },
  { s: "w:nor", n: "Coupe de Norvège", c: "Norvège", f: "no", g: "cup", wiki: "{S} Norwegian Football Cup" },
  { s: "w:swe", n: "Svenska Cupen", c: "Suède", f: "se", g: "cup", wiki: "{S} Svenska Cupen" },
  { s: "w:fin", n: "Coupe de Finlande", c: "Finlande", f: "fi", g: "cup", wiki: "{Y} Finnish Cup" },
  { s: "w:irl", n: "FAI Cup", c: "Irlande", f: "ie", g: "cup", wiki: "{Y} FAI Cup" },
  { s: "w:nir", n: "Irish Cup", c: "Irlande du Nord", f: "gb-nir", g: "cup", wiki: "{S} Irish Cup" },
  { s: "w:wal", n: "Welsh Cup", c: "Pays de Galles", f: "gb-wls", g: "cup", wiki: "{S} Welsh Cup" },
];
const GROUPS = { d1: "Championnats · Division 1", euro: "Coupes d'Europe & clubs", nat: "Sélections nationales", cup: "Coupes nationales" };
const BY_SLUG = Object.fromEntries(LEAGUES.map(l => [l.s, l]));

// ---------------------------------------------------------------- utils
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const ym = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}`;
const flagImg = (iso, cls = "flag") => iso ? `<img class="${cls}" src="https://flagcdn.com/w40/${iso}.png" alt="" loading="lazy">` : "";
const fmtDay = d => d.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });
const fmtTime = d => d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
const sameDay = (a, b) => ymd(a) === ymd(b);

const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const cache = new Map();
async function getJSON(url, ttl = 60000) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < ttl) return hit.p;
  const p = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  cache.set(url, { t: Date.now(), p });
  p.catch(() => cache.delete(url));
  return p;
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch { out[k] = null; } }
  }));
  return out;
}

// ---------- statistiques de visites (anonymes : ni cookie, ni IP, ni identifiant ; lisibles seulement par l'admin)
const TRACK = (() => {
  const C = window.ARENA_CONFIG || {};
  const off = !C.supabaseUrl || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} } };
  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "tablet"
    : /Mobi|iPhone|Android/i.test(ua) ? "mobile" : "desktop";
  const installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  function visitSource() {
    const p = new URLSearchParams(location.search);
    const tag = (p.get("src") || p.get("utm_source") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
    if (tag) return tag === "ig" || tag === "insta" ? "instagram" : tag;
    if (installed) return "appli installée";
    let host = "";
    try { host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch {}
    if (!host || host === location.hostname) return "direct";
    const known = [["instagram", "instagram"], ["facebook", "facebook"], ["fb.", "facebook"], ["google", "google"], ["bing", "bing"],
      ["tiktok", "tiktok"], ["youtube", "youtube"], ["snapchat", "snapchat"], ["whatsapp", "whatsapp"], ["t.co", "x / twitter"], ["twitter", "x / twitter"], ["duckduckgo", "duckduckgo"]];
    const k = known.find(([s]) => host.includes(s));
    return k ? k[1] : host.slice(0, 40);
  }
  let source = ss.get("arena-src");
  const firstOfVisit = !source;
  if (!source) { source = visitSource(); ss.set("arena-src", source); }
  let sentFirst = !firstOfVisit, last = "", lastAt = 0;
  return function track(section) {
    if (off || !section) return;
    const now = Date.now();
    if (section === last && now - lastAt < 30000) return;   // pas de doublon quand on reclique au même endroit
    last = section; lastAt = now;
    const body = { section: section.slice(0, 40), device, source, first_view: !sentFirst, installed };
    sentFirst = true;
    fetch(`${C.supabaseUrl}/rest/v1/page_views`, {
      method: "POST", keepalive: true,
      headers: { apikey: C.supabaseAnonKey, Authorization: `Bearer ${C.supabaseAnonKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(body),
    }).catch(() => {});
  };
})();
window.arenaTrack = TRACK;
function footSection(v) {
  if (v === "today") return "Foot · matchs du jour";
  if (v === "goals") return "Foot · plus beaux buts";
  if (v === "belges") return "Foot · nos Belges";
  if (v === "uefa") return "Foot · coefficients UEFA";
  if (v === "notifs") return "Foot · notifications";
  const l = BY_SLUG[v];
  return !l ? "Foot" : l.g === "d1" ? "Foot · championnats" : l.g === "cup" ? "Foot · coupes nationales" : l.g === "nat" ? "Foot · sélections" : "Foot · coupes d'Europe";
}

// ---------------------------------------------------------------- horloge
function tick() { $("#clock").textContent = new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
tick(); setInterval(tick, 1000);

// ---------------------------------------------------------------- switch sport
document.querySelectorAll(".sport-btn").forEach(b => b.addEventListener("click", () => setSport(b.dataset.sport)));
function setSport(sp) {
  document.body.dataset.sport = sp;
  document.querySelectorAll(".sport-btn").forEach(b => b.classList.toggle("active", b.dataset.sport === sp));
  $("#foot").classList.toggle("hidden", sp !== "foot");
  $("#velo").classList.toggle("hidden", sp !== "velo");
  $("#jeu").classList.toggle("hidden", sp !== "jeu");
  store.set("sport", sp);
  arenaTrack(sp === "velo" ? "Cyclisme" : sp === "jeu" ? `Je parie · ${store.get("jeu-mode", "velo") === "foot" ? "foot" : "vélo"}` : footSection(state.view));
  if (sp === "velo" && !$("#velo-main").innerHTML) renderCycling();
  if (sp === "jeu") { const go = () => window.ArenaGame.renderGame(); window.ArenaGame ? go() : window.addEventListener("DOMContentLoaded", go, { once: true }); }
  window.scrollTo(0, 0);
}
$("#menu-fab").addEventListener("click", () => $("#foot-sidebar").classList.toggle("open"));

// ================================================================= FOOTBALL
const state = {
  view: "today",              // "today" | slug
  day: new Date(),
  month: null,
  tab: "results",
  sub: 0,                     // index de la sous-compétition (ex. qualifications)
  favs: store.get("favs", ["bel.1", "uefa.champions"]),
  filter: "",
  logos: store.get("logos", {}),
};
let refreshTimer = null;

function leagueIcon(l) {
  if (state.logos[l.s]) return `<img src="${state.logos[l.s]}" alt="">`;
  if (l.f) return flagImg(l.f, "flag");
  return `<span>${l.i || "⚽"}</span>`;
}

function renderSidebar() {
  const q = state.filter.toLowerCase();
  const match = l => !q || (l.n + " " + l.c).toLowerCase().includes(q);
  const item = l => `
    <button class="league-item ${state.view === l.s ? "active" : ""}" data-slug="${l.s}">
      <span class="ico">${l.f ? flagImg(l.f) : `<span>${l.i}</span>`}</span>
      <span class="lname">${esc(l.n)}<span class="lcountry">${esc(l.c)}</span></span>
      <span class="star ${state.favs.includes(l.s) ? "on" : ""}" data-star="${l.s}" title="Favori">★</span>
    </button>`;
  let html = `
    <button class="league-item today-item ${state.view === "today" ? "active" : ""}" data-slug="today">
      <span class="ico">📅</span><span class="lname">Tous les matchs du jour<span class="lcountry">Toutes compétitions</span></span>
    </button>
    <button class="league-item today-item bel-item ${state.view === "belges" ? "active" : ""}" data-slug="belges">
      <span class="ico">${flagImg("be")}</span><span class="lname">Nos Belges<span class="lcountry">Buteurs et passeurs belges</span></span>
    </button>
    <button class="league-item today-item ${state.view === "uefa" ? "active" : ""}" data-slug="uefa">
      <span class="ico">🏆</span><span class="lname">Coefficients UEFA<span class="lcountry">Pays, clubs et équipes nationales</span></span>
    </button>
    <button class="league-item today-item ${state.view === "notifs" ? "active" : ""}" data-slug="notifs">
      <span class="ico">🔔</span><span class="lname">Mes notifications<span class="lcountry">Buts et résultats de tes équipes</span></span>
    </button>
    <button class="league-item today-item ${state.view === "goals" ? "active" : ""}" data-slug="goals">
      <span class="ico">🎬</span><span class="lname">Plus beaux buts<span class="lcountry">Vidéos des derniers matchs</span></span>
    </button>`;
  const favs = state.favs.map(s => BY_SLUG[s]).filter(Boolean).filter(match);
  if (favs.length) html += `<div class="group-title">★ Favoris</div>` + favs.map(item).join("");
  for (const [g, title] of Object.entries(GROUPS)) {
    const ls = LEAGUES.filter(l => l.g === g && match(l));
    if (ls.length) html += `<div class="group-title">${title}</div>` + ls.map(item).join("");
  }
  $("#league-list").innerHTML = html;
}

$("#league-list").addEventListener("click", e => {
  const star = e.target.closest("[data-star]");
  if (star) {
    e.stopPropagation();
    const s = star.dataset.star;
    state.favs = state.favs.includes(s) ? state.favs.filter(x => x !== s) : [...state.favs, s];
    store.set("favs", state.favs);
    renderSidebar();
    return;
  }
  const it = e.target.closest("[data-slug]");
  if (!it) return;
  openView(it.dataset.slug);
  $("#foot-sidebar").classList.remove("open");
});
$("#league-search").addEventListener("input", e => { state.filter = e.target.value; renderSidebar(); });

function openView(v, sub = 0) {
  arenaTrack(footSection(v));
  state.view = v;
  state.sub = sub;
  state.tab = "results";
  state.month = null;
  store.set("view", v);
  renderSidebar();
  renderFoot();
  window.scrollTo(0, 0);
}

// ---------- parsing ESPN
function parseEvent(e, league = null) {
  const c = e.competitions[0];
  const st = e.status.type;
  const side = h => {
    const x = c.competitors.find(t => t.homeAway === h) || {};
    return {
      id: x.team?.id, name: x.team?.shortDisplayName || x.team?.displayName || "?",
      full: x.team?.displayName, logo: x.team?.logo, score: x.score, winner: x.winner,
      pen: x.shootoutScore,
    };
  };
  const home = side("home"), away = side("away");
  const events = (c.details || []).filter(d => d.scoringPlay || d.redCard || d.yellowCard).map(d => ({
    team: d.team?.id === home.id ? "h" : "a",
    min: d.clock?.displayValue || "",
    who: d.athletesInvolved?.[0]?.shortName || d.athletesInvolved?.[0]?.displayName || "",
    goal: d.scoringPlay, red: d.redCard, yellow: d.yellowCard && !d.redCard,
    pk: d.penaltyKick, og: d.ownGoal, shootout: d.shootout,
  })).filter(x => !x.shootout);
  let label, cls = "";
  if (st.state === "in") {
    cls = "live";
    label = st.name === "STATUS_HALFTIME" ? "Mi-temps" : (e.status.displayClock || st.shortDetail);
  } else if (st.state === "post") {
    label = { STATUS_FULL_TIME: "Terminé", STATUS_FINAL_AET: "Ap. prol.", STATUS_FINAL_PEN: "T.A.B.", STATUS_POSTPONED: "Reporté", STATUS_CANCELED: "Annulé", STATUS_ABANDONED: "Arrêté" }[st.name]
      || (st.shortDetail === "FT" ? "Terminé" : st.shortDetail === "AET" ? "Ap. prol." : st.shortDetail);
  } else {
    label = st.name === "STATUS_POSTPONED" ? "Reporté" : fmtTime(new Date(e.date));
  }
  const notes = (c.notes || []).map(n => n.headline).filter(Boolean).join(" · ");
  return { id: e.id, league, date: new Date(e.date), state: st.state, statusName: st.name, label, cls, home, away, events, venue: c.venue?.fullName, notes };
}

function matchHTML(m) {
  const played = m.state !== "pre" && m.home.score != null && !["STATUS_POSTPONED", "STATUS_CANCELED"].includes(m.statusName);
  const res = side => !played || m.state !== "post" ? "" : (m[side].winner ? "win" : (m.home.winner || m.away.winner) ? "lose" : "");
  const score = played
    ? `<div class="score ${m.cls}"><span class="box">${esc(m.home.score)}</span><span class="box">${esc(m.away.score)}</span></div>`
    : `<div class="score pre">${m.state === "pre" ? esc(m.label) : "–"}</div>`;
  const pen = m.home.pen != null && m.away.pen != null ? `<div class="note">Tirs au but : ${m.home.pen} – ${m.away.pen}</div>` : "";
  const ev = side => m.events.filter(x => x.team === side).map(x => {
    const icon = x.goal ? "⚽" : x.red ? `<i class="card-r"></i>` : `<i class="card-y"></i>`;
    const extra = x.goal ? (x.pk ? " (pén.)" : x.og ? " (c.s.c.)" : "") : "";
    return `<div class="${side} ev">${side === "h" ? `${esc(x.who)}${extra} ${esc(x.min)} ${icon}` : `${icon} ${esc(x.min)} ${esc(x.who)}${extra}`}</div>`;
  }).join("");
  const details = `
    <div class="details">
      <div>${ev("h") || ""}</div><div class="mid">${m.events.length ? "" : "—"}</div><div>${ev("a") || ""}</div>
      ${m.notes ? `<div class="venue">${esc(m.notes)}</div>` : ""}
      <div class="venue">${m.venue ? "🏟 " + esc(m.venue) + " · " : ""}${m.date ? fmtDay(m.date) + (m.noTime ? "" : " " + fmtTime(m.date)) : ""}</div>
    </div>`;
  return `
    <div class="match" data-id="${m.id}" ${m.league ? `data-league="${m.league}"` : ""}>
      <div class="status ${m.cls}">${m.state === "pre" ? "À venir" : esc(m.label)}</div>
      <div class="team home ${res("home")}"><span class="tn" title="${esc(m.home.full)}">${esc(m.home.name)}</span>${m.home.logo ? `<img src="${m.home.logo}" alt="" loading="lazy">` : ""}</div>
      ${score}
      <div class="team away ${res("away")}">${m.away.logo ? `<img src="${m.away.logo}" alt="" loading="lazy">` : ""}<span class="tn" title="${esc(m.away.full)}">${esc(m.away.name)}</span></div>
      <div class="chev">›</div>
      ${pen}
      ${details}
    </div>`;
}

$("#foot-main").addEventListener("click", e => {
  const m = e.target.closest(".match");
  if (m && m.dataset.league) openMatch(m.dataset.league, m.dataset.id);   // fiche complète (ESPN)
  else if (m) m.classList.toggle("open");                                // coupes Wikipédia : détail sur place
});

const loadingHTML = (txt = "Chargement des résultats…") => `<div class="loading"><div class="spinner"></div>${txt}</div>`;

function renderFoot() {
  clearInterval(refreshTimer);
  const fm = $("#foot-main"); fm.onclick = null; fm.oninput = null;   // gestionnaires propres à « Nos Belges »
  if (state.view === "today") renderToday(); else if (state.view === "goals") renderGoals(); else if (state.view === "belges") renderBelges(); else if (state.view === "uefa") renderUefa(); else if (state.view === "notifs") renderNotifs(); else renderLeague();
}

// ---------- vue "matchs du jour"
async function renderToday(silent = false) {
  const main = $("#foot-main");
  const d = state.day;
  const isToday = sameDay(d, new Date());
  if (!silent) main.innerHTML = `
    <div class="page-head">
      <div><h1>Matchs du jour</h1><div class="sub">Toutes les compétitions européennes et internationales</div></div>
      <div class="grow"></div>
      <div class="nav-row">
        <button class="nav-btn" data-day="-1" aria-label="Jour précédent">‹</button>
        <div class="nav-label">${isToday ? "Aujourd'hui" : fmtDay(d)}</div>
        <button class="nav-btn" data-day="1" aria-label="Jour suivant">›</button>
        ${isToday ? "" : `<button class="pill-today" data-day="0">Aujourd'hui</button>`}
      </div>
    </div>
    <div id="today-body">${loadingHTML(`Chargement de ${LEAGUES.length} compétitions…`)}</div>`;

  const key = ymd(d);
  // une entrée par flux : compétition principale, ses qualifications, et la Croky Cup (Wikipédia)
  const order = [];
  for (const s of [...state.favs, ...LEAGUES.map(l => l.s).filter(s => !state.favs.includes(s))]) {
    const l = BY_SLUG[s];
    if (!l) continue;
    if (l.wiki) { if (TODAY_WIKI.includes(l.s)) order.push({ l, wiki: true }); continue; }
    (l.sub || [[l.s, null]]).forEach(([slug, name], i) => order.push({ l, slug, name, i }));
  }
  const results = await pool(order, 10, o => o.wiki
    ? loadWikiCup(o.l).then(r => ({ wiki: r }))
    : getJSON(`${API}/${o.slug}/scoreboard?dates=${key}`, isToday ? 30000 : 300000));
  if (state.view !== "today" || ymd(state.day) !== key) return;

  const blocks = [];
  let total = 0, live = 0, done = 0, goals = 0;
  order.forEach((o, i) => {
    const data = results[i];
    let ms;
    if (o.wiki) ms = (data?.wiki?.matches || []).filter(m => m.date && ymd(m.date) === key).map(wikiToMatch);
    else {
      if (!data?.events?.length) return;
      if (!o.i) rememberLogo(o.l.s, data);
      ms = data.events.map(e => parseEvent(e, o.slug));
    }
    if (!ms.length) return;
    ms.sort((a, b) => a.date - b.date);
    total += ms.length;
    ms.forEach(m => {
      if (m.state === "in") live++;
      if (m.state === "post") done++;
      if (m.state !== "pre") goals += (+m.home.score || 0) + (+m.away.score || 0);
    });
    blocks.push(compBlock(o.l, ms, o.wiki ? null : data, o.name, o.i || 0));
  });
  const body = $("#today-body");
  if (!body) return;
  body.innerHTML = total ? `
    <div class="summary-row">
      <div class="stat"><b>${total}</b><span>matchs</span></div>
      <div class="stat"><b style="color:var(--live)">${live}</b><span>en direct</span></div>
      <div class="stat"><b>${done}</b><span>terminés</span></div>
      <div class="stat"><b>${goals}</b><span>buts marqués</span></div>
      <div class="stat"><b>${blocks.length}</b><span>compétitions</span></div>
    </div>${blocks.join("")}`
    : `<div class="empty">Aucun match ce jour-là dans les compétitions suivies.<br>Utilise les flèches pour changer de date.</div>`;
  if (isToday) refreshTimer = setTimeout(() => renderToday(true), live ? 30000 : 120000);
}

function compBlock(l, ms, data, subName, subIdx = 0) {
  const logo = data?.leagues?.[0]?.logos?.[0]?.href || state.logos[l.s];
  return `
    <div class="comp-block">
      <div class="comp-head" data-open="${l.s}" data-sub="${subIdx}">
        ${logo ? `<img src="${logo}" alt="">` : l.f ? flagImg(l.f) : l.i}
        <span>${esc(l.c)} · ${esc(l.n)}${subIdx ? ` <span class="sub-lbl">${esc(subName)}</span>` : ""}</span>
        <span class="cnt">${ms.length} match${ms.length > 1 ? "s" : ""} ›</span>
      </div>
      <div class="matches">${ms.map(matchHTML).join("")}</div>
    </div>`;
}

function rememberLogo(s, data) {
  const logo = data?.leagues?.[0]?.logos?.[0]?.href;
  if (logo && state.logos[s] !== logo) { state.logos[s] = logo; store.set("logos", state.logos); }
}

$("#foot-main").addEventListener("click", e => {
  const dBtn = e.target.closest("[data-day]");
  if (dBtn) {
    const n = +dBtn.dataset.day;
    state.day = n === 0 ? new Date() : new Date(state.day.getFullYear(), state.day.getMonth(), state.day.getDate() + n);
    renderFoot();
  }
  const open = e.target.closest("[data-open]");
  if (open) openView(open.dataset.open, +(open.dataset.sub || 0));
  const subBtn = e.target.closest("[data-subidx]");
  if (subBtn) { state.sub = +subBtn.dataset.subidx; state.month = null; renderLeague(); }
  const mBtn = e.target.closest("[data-month]");
  if (mBtn) {
    const n = +mBtn.dataset.month;
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() + n, 1);
    renderLeague();
  }
  const tab = e.target.closest("[data-tab]");
  if (tab) { state.tab = tab.dataset.tab; renderLeague(); }
});

// ---------- vue compétition
async function renderLeague(silent = false) {
  const l = BY_SLUG[state.view];
  if (l.wiki) return renderWikiCup(l);
  const slug = l.sub ? l.sub[state.sub]?.[0] || l.s : l.s;
  const main = $("#foot-main");
  if (!silent) main.innerHTML = `
    <div class="page-head">
      ${state.logos[l.s] ? `<img class="logo" src="${state.logos[l.s]}" alt="">` : ""}
      <div><h1>${esc(l.n)}</h1><div class="sub" id="league-sub">${l.f ? flagImg(l.f) : ""} ${esc(l.c)}</div></div>
      <span class="grow"></span>
      ${bellBtn(PUSH.followsLeague(l.s), `data-follow-league="${l.s}" data-name="${esc(l.n)}"`)}
    </div>
    <div class="tabs">
      <button class="tab ${state.tab === "results" ? "active" : ""}" data-tab="results">Résultats & calendrier</button>
      <button class="tab ${state.tab === "table" ? "active" : ""}" data-tab="table">Classement</button>
    </div>
    ${l.sub ? `<div class="subtabs">${l.sub.map(([, n], i) => `<button class="chip ${state.sub === i ? "on" : ""}" data-subidx="${i}">${esc(n)}</button>`).join("")}</div>` : ""}
    <div id="league-body">${loadingHTML()}</div>`;
  if (state.tab === "table") return renderStandings(l, slug);

  // mois initial : mois courant ; s'il est vide (compétition terminée/à venir), on saute au mois du dernier/prochain match
  if (!state.month) {
    const now = new Date();
    state.month = new Date(now.getFullYear(), now.getMonth(), 1);
    try {
      const cur = await getJSON(`${API}/${slug}/scoreboard?dates=${ym(state.month)}`);
      if (!cur.events?.length) {
        const def = await getJSON(`${API}/${slug}/scoreboard`);
        const dt = def.events?.[0] && new Date(def.events[0].date);
        if (dt) state.month = new Date(dt.getFullYear(), dt.getMonth(), 1);
      }
    } catch {}
  }
  const key = ym(state.month);
  let data;
  try { data = await getJSON(`${API}/${slug}/scoreboard?dates=${key}`); }
  catch { $("#league-body").innerHTML = `<div class="empty">Impossible de charger les données. Vérifie ta connexion.</div>`; return; }
  if (state.view !== l.s || state.tab !== "results" || ym(state.month) !== key || (l.sub && l.sub[state.sub][0] !== slug)) return;
  if (slug === l.s) rememberLogo(l.s, data);
  const season = data.leagues?.[0]?.season?.displayName;
  const sub = $("#league-sub");
  if (sub && season) sub.innerHTML = `${l.f ? flagImg(l.f) : ""} ${esc(l.c)} · ${esc(season)}`;
  const head = $(".page-head");
  if (head && !head.querySelector(".logo") && state.logos[l.s]) head.insertAdjacentHTML("afterbegin", `<img class="logo" src="${state.logos[l.s]}" alt="">`);

  const ms = (data.events || []).map(e => parseEvent(e, slug)).sort((a, b) => a.date - b.date);
  const byDay = new Map();
  ms.forEach(m => { const k = ymd(m.date); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(m); });
  const monthName = state.month.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
  const live = ms.some(m => m.state === "in");
  // journées jouées (la plus récente en premier), puis journées à venir
  const days = [...byDay.values()];
  const played = days.filter(list => list.some(m => m.state !== "pre"));
  const upcoming = days.filter(list => list.every(m => m.state === "pre"));
  const sectionHTML = (title, list) => !list.length ? "" : `
    <div class="section-title" style="margin:8px 0 14px"><h2>${title}</h2></div>
    ${list.map(dl => `
      <div class="day-block">
        <div class="day-title">${fmtDay(dl[0].date)}</div>
        <div class="comp-block"><div class="matches">${dl.map(matchHTML).join("")}</div></div>
      </div>`).join("")}`;
  $("#league-body").innerHTML = `
    <div class="nav-row" style="margin-bottom:18px">
      <button class="nav-btn" data-month="-1" aria-label="Mois précédent">‹</button>
      <div class="nav-label">${monthName}</div>
      <button class="nav-btn" data-month="1" aria-label="Mois suivant">›</button>
      <span style="color:var(--muted);font-size:13px;margin-left:8px">${ms.length} match${ms.length > 1 ? "s" : ""}</span>
    </div>
    ${ms.length ? sectionHTML("Résultats", played.reverse()) + sectionHTML("À venir", upcoming)
      : `<div class="empty">Aucun match en ${monthName}.</div>`}`;
  if (live) refreshTimer = setTimeout(() => renderLeague(true), 30000);
}

// ---------- coupes lues sur Wikipédia (Croky Cup, coupes de Turquie, Grèce, Pologne…)
const TODAY_WIKI = ["w:bel"];          // affichées aussi dans « Matchs du jour »
const WIKI_API = "https://en.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&redirects=1&prop=wikitext&origin=*&page=";
const wikiCache = new Map();
function wikiTitles(tpl) {
  const now = new Date(), y = now.getFullYear();
  const start = now.getMonth() >= 6 ? y : y - 1;
  const season = a => `${a}–${String((a + 1) % 100).padStart(2, "0")}`;
  return tpl.includes("{S}")
    ? [tpl.replace("{S}", season(start)), tpl.replace("{S}", season(start - 1))]
    : [tpl.replace("{Y}", y), tpl.replace("{Y}", y - 1)];
}
async function loadWikiCup(l) {
  const hit = wikiCache.get(l.s);
  if (hit && Date.now() - hit.t < 600000) return hit.r;
  for (const title of wikiTitles(l.wiki)) {
    try {
      const d = await getJSON(WIKI_API + encodeURIComponent(title), 600000);
      if (!d.parse?.wikitext) continue;
      const r = { ...WikiCups.parse(d.parse.wikitext), title: d.parse.title };
      wikiCache.set(l.s, { t: Date.now(), r });
      return r;
    } catch {}
  }
  return null;
}
const ROUND_FR = [
  [/quarter[- ]?finals?/i, "Quarts de finale"], [/semi[- ]?finals?/i, "Demi-finales"], [/^final$/i, "Finale"], [/^match$/i, "Finale"],
  [/round of 64/i, "32es de finale"], [/round of 32/i, "16es de finale"], [/round of 16/i, "8es de finale"],
  [/\bfirst\b/i, "1er"], [/\bsecond\b/i, "2e"], [/\bthird\b/i, "3e"], [/\bfourth\b/i, "4e"], [/\bfifth\b/i, "5e"], [/\bsixth\b/i, "6e"],
  [/\bseventh\b/i, "7e"], [/\beighth\b/i, "8e"], [/\bninth\b/i, "9e"], [/qualifying round/i, "tour qualificatif"], [/qualifying/i, "qualifs"],
  [/preliminary round/i, "Tour préliminaire"], [/\bround\b/i, "tour"], [/\bgroup\b/i, "Groupe"], [/matchday/i, "Journée"],
  [/\bnorth\b/i, "Nord"], [/\bsouth\b/i, "Sud"], [/first leg/i, "aller"], [/second leg/i, "retour"],
];
const roundFr = r => { let x = r || "Matchs"; for (const [a, b] of ROUND_FR) x = x.replace(a, b); return x.charAt(0).toUpperCase() + x.slice(1); };
function wikiToMatch(m, i) {
  const sc = m.score;
  const win = m.winner || (sc ? (sc.h > sc.a ? "h" : sc.a > sc.h ? "a" : m.pen ? (m.pen[0] > m.pen[1] ? "h" : "a") : null) : null);
  const ev = (list, team) => (list || []).map(g => ({ team, who: g.who, min: g.min, goal: true, pk: g.pk, og: g.og }));
  return {
    id: "w" + i + m.home, date: m.date || new Date(0), noTime: !m.hasTime, state: sc ? "post" : "pre",
    label: sc ? (m.pen ? "T.A.B." : m.aet ? "Ap. prol." : "Terminé") : (m.date ? (m.hasTime ? fmtTime(m.date) : m.date.toLocaleDateString("fr-BE", { day: "numeric", month: "short" })) : "–"),
    cls: "",
    home: { name: m.home, full: m.home, score: sc?.h, winner: win === "h", pen: m.pen?.[0] },
    away: { name: m.away, full: m.away, score: sc?.a, winner: win === "a", pen: m.pen?.[1] },
    events: [...ev(m.goals1, "h"), ...ev(m.goals2, "a")],
    venue: [m.venue, m.city].filter(Boolean).join(", "), notes: "",
  };
}
async function renderWikiCup(l) {
  const main = $("#foot-main");
  main.innerHTML = `
    <div class="page-head">
      <div><h1>${esc(l.n)}</h1><div class="sub" id="league-sub">${l.f ? flagImg(l.f) : ""} ${esc(l.c)}</div></div>
    </div>
    <div id="league-body">${loadingHTML()}</div>`;
  const r = await loadWikiCup(l);
  if (state.view !== l.s) return;
  if (!r) { $("#league-body").innerHTML = `<div class="empty">Impossible de charger cette coupe pour le moment.</div>`; return; }
  $("#league-sub").innerHTML = `${l.f ? flagImg(l.f) : ""} ${esc(l.c)} · saison ${esc(r.title.match(/\d{4}(–\d{2})?/)?.[0] || "")}`;
  const rounds = new Map();
  r.matches.forEach((m, i) => { if (!rounds.has(m.round)) rounds.set(m.round, []); rounds.get(m.round).push(wikiToMatch(m, i)); });
  const groups = [...rounds].map(([name, ms]) => ({
    name, ms: ms.sort((a, b) => a.date - b.date),
    last: Math.max(0, ...ms.filter(m => m.state === "post").map(m => +m.date)),
    first: Math.min(...ms.map(m => +m.date || Infinity)),
    played: ms.some(m => m.state === "post"),
  }));
  const played = groups.filter(g => g.played).sort((a, b) => b.last - a.last || r.rounds.indexOf(b.name) - r.rounds.indexOf(a.name));
  const upcoming = groups.filter(g => !g.played).sort((a, b) => a.first - b.first);
  const block = g => `
    <div class="day-block">
      <div class="day-title">${esc(roundFr(g.name))} <span class="cnt-sm">${g.ms.length} match${g.ms.length > 1 ? "s" : ""}</span></div>
      <div class="comp-block"><div class="matches">${g.ms.map(matchHTML).join("")}</div></div>
    </div>`;
  const finalPlayed = groups.some(g => /^(final|match)$/i.test(g.name) && g.played);
  const champ = r.champion && finalPlayed ? `<div class="champion">🏆 Vainqueur : <b>${esc(r.champion)}</b></div>` : "";
  $("#league-body").innerHTML = (champ
    + (played.length ? `<div class="section-title" style="margin:8px 0 14px"><h2>Résultats</h2><span>tour le plus récent en premier</span></div>${played.map(block).join("")}` : "")
    + (upcoming.length ? `<div class="section-title" style="margin:8px 0 14px"><h2>À venir</h2></div>${upcoming.map(block).join("")}` : ""))
    || `<div class="empty">Pas encore de match publié pour cette coupe.</div>`;
  $("#league-body").insertAdjacentHTML("beforeend", `<div class="source">Source : Wikipédia — <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}" target="_blank" rel="noopener">${esc(r.title)}</a>, mis à jour par la communauté.</div>`);
}

async function renderStandings(l, slug = l.s) {
  let d;
  try { d = await getJSON(`${API_STD}/${slug}/standings`, 300000); }
  catch { $("#league-body").innerHTML = `<div class="empty">Pas de classement disponible pour cette compétition.</div>`; return; }
  if (state.view !== l.s || state.tab !== "table") return;
  const groups = d.children?.length ? d.children : d.standings ? [{ name: d.name, standings: d.standings }] : [];
  const tables = groups.filter(g => g.standings?.entries?.length);
  if (!tables.length) { $("#league-body").innerHTML = `<div class="empty">Pas de classement pour cette compétition (format à élimination directe).</div>`; return; }
  const notes = new Map();
  const html = tables.map(g => {
    const rows = g.standings.entries.map(e => {
      const st = Object.fromEntries(e.stats.map(s => [s.name, s]));
      const v = k => st[k]?.displayValue ?? st[k]?.value ?? "";
      if (e.note) notes.set(e.note.color, e.note.description);
      const gd = +(st.pointDifferential?.value ?? 0);
      return { rank: +v("rank") || 0, e, v, gd };
    }).sort((a, b) => a.rank - b.rank);
    return `
      <div class="table-wrap">
        ${tables.length > 1 ? `<div class="table-title">${esc(g.name)}</div>` : ""}
        <table class="std">
          <thead><tr><th>#</th><th class="t">Équipe</th><th>J</th><th>G</th><th>N</th><th>P</th><th class="hide-sm">BP</th><th class="hide-sm">BC</th><th>Diff</th><th>Pts</th></tr></thead>
          <tbody>${rows.map(({ rank, e, v, gd }) => `
            <tr>
              <td class="rk">${e.note ? `<i style="background:${e.note.color}"></i>` : ""}${rank || ""}</td>
              <td class="t"><div class="tm">${e.team.logos?.[0]?.href ? `<img src="${e.team.logos[0].href}" alt="" loading="lazy">` : ""}${esc(e.team.shortDisplayName || e.team.displayName)}</div></td>
              <td>${v("gamesPlayed")}</td><td>${v("wins")}</td><td>${v("ties")}</td><td>${v("losses")}</td>
              <td class="hide-sm">${v("pointsFor")}</td><td class="hide-sm">${v("pointsAgainst")}</td>
              <td class="${gd > 0 ? "gd-pos" : gd < 0 ? "gd-neg" : ""}">${v("pointDifferential")}</td>
              <td class="pts">${v("points")}</td>
            </tr>`).join("")}</tbody>
        </table>
      </div>`;
  }).join("");
  const legend = notes.size ? `<div class="table-wrap"><div class="legend">${[...notes].map(([c, t]) => `<span><i style="background:${c}"></i>${esc(t)}</span>`).join("")}</div></div>` : "";
  $("#league-body").innerHTML = html + legend;
}

// ================================================================= CYCLISME
const IOC = {
  AUS: "au", SUI: "ch", SWI: "ch", DEN: "dk", GBR: "gb", UAE: "ae", MEX: "mx", ITA: "it", NED: "nl", BEL: "be", SLO: "si", SVN: "si",
  FRA: "fr", COL: "co", GER: "de", USA: "us", ESP: "es", NOR: "no", ECU: "ec", CZE: "cz", AUT: "at", POL: "pl", NZL: "nz", CAN: "ca",
  CHN: "cn", KSA: "sa", OMA: "om", POR: "pt", ALB: "al", AND: "ad", ARM: "am", AZE: "az", BIH: "ba", BUL: "bg", CRO: "hr", EST: "ee",
  GRE: "gr", HUN: "hu", JPN: "jp", KOS: "xk", LTU: "lt", LUX: "lu", MAS: "my", ROU: "ro", SRB: "rs", SVK: "sk", TUR: "tr", BRA: "br",
  ERI: "er", KAZ: "kz", MRI: "mu", SWE: "se", UKR: "ua", URU: "uy", IRL: "ie", LAT: "lv", ISR: "il", RSA: "za", VEN: "ve", ARG: "ar",
  FIN: "fi", RUS: "ru", CHI: "cl", KOR: "kr", ISL: "is", UZB: "uz", RWA: "rw", ETH: "et", MAR: "ma", ALG: "dz", PER: "pe", CRC: "cr",
  GUA: "gt", PAN: "pa", MDA: "md", BLR: "by", GEO: "ge", CYP: "cy", MNE: "me", MKD: "mk", TPE: "tw", THA: "th", IRI: "ir", NAM: "na",
};
const cflag = (ioc, cls) => flagImg(IOC[ioc], cls);
const TEAMS = {
  UAD: "UAE Team Emirates", TVL: "Visma | Lease a Bike", SOQ: "Soudal Quick-Step", LTK: "Lidl-Trek", MOV: "Movistar",
  EFE: "EF Education-EasyPost", TBV: "Bahrain Victorious", JAY: "Jayco AlUla", XAT: "XDS Astana", DCT: "Decathlon CMA CGM",
  RBH: "Red Bull-BORA", APT: "Alpecin-Premier Tech", IGD: "Ineos Grenadiers", UXM: "Uno-X Mobility", COF: "Cofidis",
  TUD: "Tudor", PQT: "Pinarello-Q36.5", TPP: "Picnic PostNL", GFC: "Groupama-FDJ", LOI: "Lotto-Intermarché", NSN: "NSN Cycling",
};
const RACE_FR = {
  "Tour of Flanders": "Tour des Flandres", "Il Lombardia": "Tour de Lombardie", "Milan–San Remo": "Milan-San Remo",
  "Tour of the Basque Country": "Tour du Pays basque", "Volta a Catalunya": "Tour de Catalogne", "Tour of Bruges": "Classic Brugge-De Panne",
  "Tour of Guangxi": "Tour du Guangxi", "Grand Prix Cycliste de Québec": "GP de Québec", "Grand Prix Cycliste de Montréal": "GP de Montréal",
  "Tour Auvergne-Rhône-Alpes": "Tour Auvergne-Rhône-Alpes (ex-Dauphiné)", "Paris–Roubaix": "Paris-Roubaix", "Liège–Bastogne–Liège": "Liège-Bastogne-Liège",
  "Tour of Norway": "Tour de Norvège", "Tour of Oman": "Tour d'Oman", "Tour of Britain": "Tour de Grande-Bretagne",
  "Tour of Flanders for Women": "Tour des Flandres", "Tour of Belgium": "Tour de Belgique", "Baloise Belgium Tour": "Tour de Belgique",
};
const GRAND_TOURS = [
  { k: "Giro d'Italia", fr: "Giro d'Italia", c: "#e8378a" },
  { k: "Tour de France", fr: "Tour de France", c: "#f5c518" },
  { k: "Vuelta a España", fr: "Vuelta a España", c: "#e63946" },
];
const MONUMENTS = ["Milan–San Remo", "Tour of Flanders", "Paris–Roubaix", "Liège–Bastogne–Liège", "Il Lombardia"];
const MONTHS = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function parseRange(s, year) {
  const parts = [...String(s).matchAll(/(\d{1,2})(?:\s+([A-Z][a-z]+))?/g)].map(m => ({ d: +m[1], m: m[2] }));
  if (!parts.length) return null;
  const last = parts[parts.length - 1];
  const lastM = MONTHS[last.m] ?? 0;
  const first = parts[0];
  const firstM = first.m ? MONTHS[first.m] : lastM;
  return { start: new Date(year, firstM, first.d), end: new Date(year, lastM, last.d) };
}
function frDate(r) {
  if (!r) return "";
  const { start: a, end: b } = r;
  if (+a === +b) return `${a.getDate()} ${MONTHS_FR[a.getMonth()]}`;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS_FR[a.getMonth()]}`;
  return `${a.getDate()} ${MONTHS_FR[a.getMonth()]} – ${b.getDate()} ${MONTHS_FR[b.getMonth()]}`;
}
const raceName = n => RACE_FR[n] || n;
const teamName = c => c ? (TEAMS[c] || c) : "";

const cyc = {
  tab: "worldtour",
  q: "",
  be: false,
  ratings: new Set(),
};

function prepCycling() {
  const D = window.CYCLING;
  const Y = D.season;
  const all = ["worldtour", "proseries", "europetour", "womenwt"];
  for (const k of all) D[k].forEach(r => { r.range = parseRange(r.date, Y); });
  return D;
}

function renderCycling() {
  const D = window.CYCLING.__prepped || (window.CYCLING.__prepped = prepCycling());
  const today = new Date();
  const men = [...D.worldtour, ...D.proseries, ...D.europetour];
  const done = men.filter(r => r.winner && r.winner.nat);
  const beWins = done.filter(r => r.winner.nat === "BEL").length;
  const riders = new Set(done.map(r => r.winner.name)).size;
  const gt = name => D.worldtour.find(r => r.race === name);

  // classements vainqueurs
  const wins = new Map();
  for (const r of done) {
    const k = r.winner.name;
    const o = wins.get(k) || { name: k, nat: r.winner.nat, n: 0, wt: 0 };
    o.n++; if (r.level === "WorldTour") o.wt++;
    wins.set(k, o);
  }
  const topRiders = [...wins.values()].sort((a, b) => b.n - a.n || b.wt - a.wt).slice(0, 12);
  const nations = new Map();
  for (const r of done) nations.set(r.winner.nat, (nations.get(r.winner.nat) || 0) + 1);
  const topNations = [...nations].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const NAT_FR = new Intl.DisplayNames(["fr"], { type: "region" });
  const natName = ioc => { try { return NAT_FR.of((IOC[ioc] || "").toUpperCase().replace("XK", "XK")) || ioc; } catch { return ioc; } };

  const medal = i => `<span class="medal m${i + 1}">${i + 1}</span>`;
  const rider = (a, cls) => a ? `${cflag(a.nat, cls)}<span>${esc(a.name)}</span>` : "";

  const gtCards = GRAND_TOURS.map(g => {
    const r = gt(g.k);
    if (!r) return "";
    const jersey = `<svg class="jersey" viewBox="0 0 40 40"><path d="M13 4l-9 6 4 8 4-2v20h16V16l4 2 4-8-9-6c-1 3-4 5-7 5s-6-2-7-5z" fill="${g.c}" stroke="rgba(0,0,0,.25)"/></svg>`;
    return `
      <div class="gt-card ${r.stages ? "has-stages" : ""}" style="--c:${g.c}" data-race="worldtour:${D.worldtour.indexOf(r)}">
        ${jersey}
        <div class="race">${esc(g.fr)}</div>
        <div class="winner">${rider(r.winner, "flag lg")}</div>
        <div class="pod">
          ${r.second ? `<div>${medal(1)} ${cflag(r.second.nat)} ${esc(r.second.name)}</div>` : ""}
          ${r.third ? `<div>${medal(2)} ${cflag(r.third.nat)} ${esc(r.third.name)}</div>` : ""}
        </div>
        <div class="date">${frDate(r.range)} ${D.season}${r.stages ? ` · <span class="see-stages">Voir les ${r.stages.length} étapes ›</span>` : ""}</div>
      </div>`;
  }).join("");
  const monCards = MONUMENTS.map(n => {
    const r = gt(n);
    if (!r) return "";
    return `
      <div class="mon-card">
        <div class="race">${esc(raceName(n))}</div>
        <div class="date">${frDate(r.range)}</div>
        <div class="winner">${rider(r.winner)}</div>
        ${r.second ? `<div class="cobble">2. ${esc(r.second.name)} · 3. ${esc(r.third?.name || "")}</div>` : ""}
      </div>`;
  }).join("");
  const champCards = D.championships.map(c => `
    <div class="champ-card ${c.champ === "Mondiaux" ? "rainbow" : "euro"}">
      <div class="t">${esc(c.champ)} · ${esc(c.cat)}</div>
      <div class="e">${esc(c.event)}</div>
      ${c.podium.map((p, i) => `<div class="p">${medal(i)} ${cflag(p.nat)} ${esc(p.name)}</div>`).join("")}
    </div>`).join("");
  const maxW = topRiders[0]?.n || 1, maxN = topNations[0]?.[1] || 1;

  $("#velo-main").innerHTML = `
    <div class="hero">
      <h1>Saison cycliste <em>${D.season}</em></h1>
      <p>Tous les vainqueurs du World Tour, des UCI ProSeries et des courses .1 / .2 de l'Europe Tour, plus le World Tour féminin et les championnats.</p>
      <div class="hero-stats">
        <div><b>${D.worldtour.length}</b><span>courses World Tour</span></div>
        <div><b>${men.length + D.womenwt.length}</b><span>courses répertoriées</span></div>
        <div><b>${riders}</b><span>vainqueurs différents</span></div>
        <div><b>${beWins}</b><span>${flagImg("be")} victoires belges</span></div>
      </div>
    </div>

    <div class="section-title"><h2>Grands Tours</h2><span>Classement général final</span></div>
    <div class="gt-grid">${gtCards}</div>

    <div class="section-title"><h2>Monuments</h2><span>Les 5 classiques les plus prestigieuses</span></div>
    <div class="mon-grid">${monCards}</div>

    <div class="section-title"><h2>Championnats</h2><span>Mondiaux (Montréal) & Europe</span></div>
    <div class="champ-grid">${champCards}</div>

    <div class="section-title"><h2>Tous les vainqueurs</h2><span id="race-count"></span></div>
    <div class="tabs" id="cyc-tabs">
      <button class="tab" data-ctab="worldtour">World Tour</button>
      <button class="tab" data-ctab="proseries">ProSeries</button>
      <button class="tab" data-ctab="europetour">Europe Tour (.1 / .2)</button>
      <button class="tab" data-ctab="womenwt">World Tour féminin</button>
    </div>
    <div class="toolbar" id="cyc-toolbar"></div>
    <div class="table-wrap"><table class="race-table" id="race-table"></table></div>

    <div class="section-title"><h2>Les plus victorieux</h2><span>Hommes · WT + ProSeries + Europe Tour</span></div>
    <div class="leader-grid">
      <div class="leaders">${topRiders.map((r, i) => `
        <div class="leader">
          <div class="pos">${i + 1}</div>
          <div class="nm">${cflag(r.nat)} ${esc(r.name)} <small>${r.wt ? `· ${r.wt} WT` : ""}</small></div>
          <div class="bar"><i style="--w:${(r.n / maxW).toFixed(3)}"></i><b>${r.n}</b></div>
        </div>`).join("")}</div>
      <div class="nations">
        <div class="table-title" style="margin:-12px -16px 10px;border-radius:14px 14px 0 0">Victoires par nation</div>
        ${topNations.map(([n, c]) => `
          <div class="nation">${cflag(n)}<span>${esc(natName(n))}</span><i style="width:${Math.round(c / maxN * 100)}%"></i><b>${c}</b></div>`).join("")}
      </div>
    </div>
    <div class="source">Données : ${esc(D.source)}, mises à jour au 19 octobre 2026. Football : ESPN, en temps réel.</div>`;

  $("#velo-main").addEventListener("click", e => {
    const el = e.target.closest("[data-race]");
    if (el && el.classList.contains("has-stages")) openRace(el.dataset.race);
  });
  $("#cyc-tabs").addEventListener("click", e => {
    const t = e.target.closest("[data-ctab]");
    if (!t) return;
    cyc.tab = t.dataset.ctab; cyc.ratings.clear();
    renderRaceTable();
  });
  $("#cyc-toolbar").addEventListener("click", onToolbarClick);
  renderRaceTable();
}

function renderRaceTable() {
  const D = window.CYCLING.__prepped;
  const list = D[cyc.tab];
  document.querySelectorAll("#cyc-tabs .tab").forEach(b => b.classList.toggle("active", b.dataset.ctab === cyc.tab));
  const ratings = [...new Set(list.map(r => r.rating).filter(Boolean))].sort();
  const tb = $("#cyc-toolbar");
  tb.innerHTML = `
    <input class="search" id="cyc-q" type="search" placeholder="Course ou coureur…" value="${esc(cyc.q)}">
    <button class="chip be ${cyc.be ? "on" : ""}" data-be>${flagImg("be")} Belgique</button>
    ${ratings.map(r => `<button class="chip ${cyc.ratings.has(r) ? "on" : ""}" data-rating="${r}">${r}</button>`).join("")}`;
  const q = $("#cyc-q");
  q.addEventListener("input", () => { cyc.q = q.value; drawRows(); });
  drawRows();
}

function onToolbarClick(e) {
  const be = e.target.closest("[data-be]");
  if (be) { cyc.be = !cyc.be; be.classList.toggle("on", cyc.be); drawRows(); }
  const r = e.target.closest("[data-rating]");
  if (r) { const v = r.dataset.rating; cyc.ratings.has(v) ? cyc.ratings.delete(v) : cyc.ratings.add(v); r.classList.toggle("on"); drawRows(); }
}

function drawRows() {
  const D = window.CYCLING.__prepped;
  const list = D[cyc.tab];
  const today = new Date();
  const podium = cyc.tab === "worldtour" || cyc.tab === "womenwt";
  const q = cyc.q.trim().toLowerCase();
  const rows = list.filter(r =>
    (!cyc.be || r.country === "BEL" || r.winner?.nat === "BEL") &&
    (!cyc.ratings.size || cyc.ratings.has(r.rating)) &&
    (!q || (r.race + " " + raceName(r.race) + " " + (r.winner?.name || "") + " " + (r.second?.name || "") + " " + (r.third?.name || "")).toLowerCase().includes(q))
  );
  const lvl = cyc.tab === "worldtour" || cyc.tab === "womenwt" ? `<span class="rating wt">WT</span>` : cyc.tab === "proseries" ? `<span class="rating pro">Pro</span>` : "";
  const tag = r => GRAND_TOURS.some(g => g.k === r.race) && cyc.tab === "worldtour" ? `<span class="tag gt">GRAND TOUR</span>`
    : MONUMENTS.includes(r.race) && cyc.tab === "worldtour" ? `<span class="tag mon">MONUMENT</span>` : "";
  $("#race-count").textContent = `${rows.length} course${rows.length > 1 ? "s" : ""}`;
  $("#race-table").innerHTML = `
    <thead><tr><th>Course</th><th class="hide-sm">Date</th><th>Vainqueur</th>${podium ? `<th class="hide-sm">2e / 3e</th>` : `<th class="hide-sm">Équipe</th>`}</tr></thead>
    <tbody>${rows.map(r => {
      const future = !r.winner && !r.status?.includes("Annul") && r.range && r.range.end >= today;
      const cancel = r.status === "Annulée";
      const w = r.winner
        ? `<div class="rw">${r.winner.nat ? cflag(r.winner.nat) : "👥"} ${esc(r.winner.nat ? r.winner.name : teamName(r.winner.name.replace("Équipe ", "")) + " (équipe)")}</div>`
        : `<span class="rt">${cancel ? "Annulée" : future ? "À venir" : "—"}</span>`;
      return `
        <tr class="${future ? "future" : ""} ${cancel ? "cancel" : ""} ${r.stages ? "has-stages" : ""}" ${r.stages ? `data-race="${cyc.tab}:${list.indexOf(r)}"` : ""}>
          <td><div class="rn">${cflag(r.country)} ${esc(raceName(r.race))} ${r.rating ? `<span class="rating">${esc(r.rating)}</span>` : lvl} ${tag(r)}${r.stages ? `<span class="stages-badge">${r.stages.length} étapes ›</span>` : ""}</div>
              <div class="rt only-sm" style="margin-top:2px">${frDate(r.range)}</div></td>
          <td class="rd hide-sm">${frDate(r.range)}</td>
          <td>${w}</td>
          ${podium
            ? `<td class="sm hide-sm">${r.second ? `<div>${cflag(r.second.nat)} ${esc(r.second.name)}</div><div>${cflag(r.third?.nat)} ${esc(r.third?.name || "")}</div>` : ""}</td>`
            : `<td class="sm hide-sm">${esc(teamName(r.team))}</td>`}
        </tr>`;
    }).join("") || `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px">Aucune course ne correspond.</td></tr>`}</tbody>`;
}

// ---------- fiche d'une course à étapes
const STAGE_TYPES = [
  [/team time trial/i, "CLM par équipes", "ttt"], [/time trial|prologue/i, "Contre-la-montre", "tt"],
  [/medium[- ]mountain|hilly|intermediate/i, "Vallonnée", "hill"], [/mountain|summit/i, "Montagne", "mtn"],
  [/flat|plain/i, "Plat", "flat"],
];
const stageType = t => { for (const [re, fr, c] of STAGE_TYPES) if (re.test(t || "")) return { fr, c }; return t ? { fr: t, c: "" } : null; };
const enDateFr = s => String(s || "").replace(/([A-Z][a-z]+)/g, m => MONTHS[m] != null ? MONTHS_FR[MONTHS[m]] : m);
const JERSEY_C = { "Général": "#f5c518", "Points": "#2a9d47", "Montagne": "#e63946", "Jeune": "#ffffff", "Sprints": "#2a7bff", "Combativité": "#d08a4a", "Équipes": "#8a97b4" };
const riderName = n => n.startsWith("team:") ? teamName(n.slice(5)) : n;
function stageWinner(w) {
  if (!w) return `<span class="rt">—</span>`;
  if (w.team) return `👥 <span>${esc(teamName(w.name))}</span>`;
  return `${w.nat ? cflag(w.nat) : ""}<span>${esc(w.name)}</span>`;
}
function openRace(key) {
  arenaTrack("Cyclisme · fiche course");
  const [k, i] = key.split(":");
  const r = window.CYCLING.__prepped[k][+i];
  if (!r?.stages) return;
  const gt = GRAND_TOURS.find(g => g.k === r.race);
  const color = gt?.c || "var(--gold)";
  const tally = new Map();
  r.stages.forEach(s => { const w = s.winner; if (w && !w.team) { const o = tally.get(w.name) || { ...w, n: 0 }; o.n++; tally.set(w.name, o); } });
  const top = [...tally.values()].sort((a, b) => b.n - a.n).filter(x => x.n > 1).slice(0, 6);
  const medal = i => `<span class="medal m${i + 1}">${i + 1}</span>`;
  const podium = [r.winner, r.second, r.third].filter(Boolean);
  const html = `
    <div class="modal-card" role="dialog" aria-modal="true" style="--rc:${color}">
      <button class="modal-x" data-close aria-label="Fermer">✕</button>
      <div class="modal-head">
        <div class="mh-flag">${cflag(r.country, "flag lg")}</div>
        <div>
          <h2>${esc(raceName(r.race))}</h2>
          <div class="sub">${frDate(r.range)} ${window.CYCLING.season} · ${r.stages.length} étapes${r.rating ? " · " + esc(r.rating) : r.level ? " · " + esc(r.level) : ""}</div>
        </div>
      </div>
      <div class="modal-grid">
        <div class="mpanel">
          <div class="mp-title">Classement général final</div>
          ${podium.map((a, j) => `<div class="pod-line">${medal(j)} ${cflag(a.nat)} <b>${esc(a.name)}</b></div>`).join("") || "—"}
        </div>
        ${r.jerseys ? `<div class="mpanel">
          <div class="mp-title">Maillots & classements</div>
          ${r.jerseys.map(j => `<div class="jersey-line"><i style="background:${JERSEY_C[j.cls] || "var(--dim)"}"></i><span class="jc">${esc(j.cls)}</span><b>${esc(riderName(j.name))}</b></div>`).join("")}
        </div>` : ""}
        ${top.length ? `<div class="mpanel">
          <div class="mp-title">Plusieurs victoires d'étape</div>
          ${top.map(t => `<div class="pod-line">${cflag(t.nat)} <b>${esc(t.name)}</b><span class="wins">${t.n}</span></div>`).join("")}
        </div>` : ""}
      </div>
      <div class="table-wrap stage-wrap">
        <table class="race-table stage-table">
          <thead><tr><th>Étape</th><th class="hide-sm">Date</th><th class="hide-sm">Parcours</th><th>Vainqueur</th></tr></thead>
          <tbody>${r.stages.map(s => {
            const t = stageType(s.type);
            return `<tr>
              <td><span class="snum">${s.n === "P" ? "Prol." : esc(s.n)}</span>${t ? `<span class="stype ${t.c}">${esc(t.fr)}</span>` : ""}</td>
              <td class="rd hide-sm">${esc(enDateFr(s.date))}</td>
              <td class="sm hide-sm">${esc(s.course)}${s.km ? `<span class="km">${esc(s.km)} km</span>` : ""}</td>
              <td><div class="rw">${stageWinner(s.winner)}</div>${s.course ? `<div class="rt only-sm">${esc(s.course)}${s.km ? " · " + esc(s.km) + " km" : ""}</div>` : ""}</td>
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>
    </div>`;
  let m = $("#race-modal");
  if (!m) {
    m = document.createElement("div");
    m.id = "race-modal";
    m.className = "modal";
    m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) closeRace(); });
    document.body.appendChild(m);
  }
  m.innerHTML = html;
  m.classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeRace() {
  $("#race-modal")?.classList.remove("show");
  document.body.style.overflow = "";
}
document.addEventListener("keydown", e => { if (e.key === "Escape") closeRace(); });

// ---------- fiche match : résumé, compositions, statistiques (mise à jour toutes les 30 s pendant le match)
const mc = { league: null, id: null, tab: "lineups", timer: null, data: null };
const STAT_ROWS = [
  ["possessionPct", "Possession", "%"], ["totalShots", "Tirs"], ["shotsOnTarget", "Tirs cadrés"], ["wonCorners", "Corners"],
  ["saves", "Arrêts"], ["foulsCommitted", "Fautes"], ["offsides", "Hors-jeu"], ["yellowCards", "Cartons jaunes"],
  ["redCards", "Cartons rouges"], ["totalPasses", "Passes"], ["accuratePasses", "Passes réussies"], ["passPct", "Précision des passes", "%"],
  ["totalTackles", "Tacles"], ["totalClearance", "Dégagements"],
];
const STAT_ALIASES = { possessionPct: ["Possession"], totalShots: ["SHOTS", "Shots"], shotsOnTarget: ["ON GOAL", "Shots on Goal"], wonCorners: ["Corner Kicks"],
  saves: ["Saves"], foulsCommitted: ["Fouls"], offsides: ["Offsides"], yellowCards: ["Yellow Cards"], redCards: ["Red Cards"], totalPasses: ["Passes"],
  accuratePasses: ["Accurate Passes"], passPct: ["Pass Completion %"], totalTackles: ["Tackles"], totalClearance: ["Clearances"] };

function openMatch(league, id) {
  arenaTrack("Foot · fiche match");
  mc.league = league; mc.id = id; mc.data = null; mc.tab = null;
  let m = $("#match-modal");
  if (!m) {
    m = document.createElement("div");
    m.id = "match-modal";
    m.className = "modal";
    m.addEventListener("click", e => {
      if (e.target === m || e.target.closest("[data-mclose]")) return closeMatch();
      const t = e.target.closest("[data-mctab]");
      if (t) { mc.tab = t.dataset.mctab; drawMatch(); }
    });
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="modal-card mc-card"><button class="modal-x" data-mclose aria-label="Fermer">✕</button>${loadingHTML("Chargement de la fiche du match…")}</div>`;
  m.classList.add("show");
  document.body.style.overflow = "hidden";
  loadMatch();
}
function closeMatch() {
  clearTimeout(mc.timer);
  mc.id = null;
  $("#match-modal")?.classList.remove("show");
  document.body.style.overflow = "";
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && mc.id) closeMatch(); });

async function loadMatch() {
  clearTimeout(mc.timer);
  const { league, id } = mc;
  try {
    const d = await getJSON(`${API}/${league}/summary?event=${id}`, 15000);
    if (mc.id !== id) return;
    mc.data = d;
    drawMatch();
    const st = d.header?.competitions?.[0]?.status?.type?.state;
    if (st === "in") mc.timer = setTimeout(loadMatch, 30000);          // en direct : toutes les 30 s
    else if (st === "pre") mc.timer = setTimeout(loadMatch, 120000);   // avant le match : les compos peuvent tomber
  } catch {
    if (mc.id !== id) return;
    $("#match-modal .mc-card").innerHTML = `<button class="modal-x" data-mclose aria-label="Fermer">✕</button><div class="empty">Impossible de charger ce match. Réessaie dans un instant.</div>`;
    mc.timer = setTimeout(loadMatch, 30000);
  }
}

/* --- avant-match : pronostic Arena (force au classement + forme + avantage du terrain → loi de Poisson) --- */
function teamForm(d, tid) {
  const t = (d.lastFiveGames || []).find(x => x.team?.id === tid);
  const evs = (t?.events || []).filter(e => !/friendly/i.test(e.leagueName || e.competitionName || "")).slice(0, 5);
  const res = evs.map(e => e.gameResult).filter(Boolean);
  const pts = res.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
  let gf = 0, ga = 0;
  evs.forEach(e => {
    const home = e.homeTeamId === tid, hs = +e.homeTeamScore || 0, as = +e.awayTeamScore || 0;
    gf += home ? hs : as; ga += home ? as : hs;
  });
  return { evs, res, ppg: res.length ? pts / res.length : null, gfpg: evs.length ? gf / evs.length : null, gapg: evs.length ? ga / evs.length : null };
}
function teamTable(d, tid) {
  for (const g of d.standings?.groups || []) {
    const e = (g.standings?.entries || []).find(x => x.id === tid);
    if (e) {
      const st = Object.fromEntries(e.stats.map(s => [s.name, s.value]));
      return { rank: st.rank, gp: st.gamesPlayed || 0, pts: st.points || 0, gd: st.pointDifferential || 0, w: st.wins, dr: st.ties, l: st.losses,
        size: g.standings.entries.length, league: g.header || d.standings?.header || "" };
    }
  }
  return null;
}
function poisson(l, k) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
function predictMatch(d, H, A) {
  const side = t => {
    const tb = teamTable(d, t.team.id), f = teamForm(d, t.team.id);
    const avg = 1.37;
    let s = 0, have = false;
    if (tb && tb.gp) {
      const w = tb.gp / (tb.gp + 4);               // peu de matchs joués → on reste prudent
      s += w * (0.55 * (tb.pts / tb.gp - avg) + 0.22 * (tb.gd / tb.gp));
      have = true;
    }
    if (f.ppg != null) {
      s += 0.3 * (f.ppg - avg) + 0.12 * ((f.gfpg || 0) - (f.gapg || 0));
      have = true;
    }
    return { s, tb, f, have };
  };
  const h = side(H), a = side(A);
  if (!h.have && !a.have) return null;
  const diff = h.s - a.s;
  const lh = Math.max(.2, 1.3 * Math.exp(0.42 * diff) * 1.13);   // avantage du terrain
  const la = Math.max(.2, 1.3 * Math.exp(-0.42 * diff) * 0.9);
  let ph = 0, pd = 0, pa = 0, best = { p: 0, h: 0, a: 0 };
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
    const p = poisson(lh, i) * poisson(la, j);
    if (i > j) ph += p; else if (i === j) pd += p; else pa += p;
    if (p > best.p) best = { p, h: i, a: j };
  }
  const t = ph + pd + pa;
  return { ph: ph / t, pd: pd / t, pa: pa / t, lh, la, best, h, a };
}
function prematchHTML(d, H, A) {
  const pr = predictMatch(d, H, A);
  const nameH = H.team.shortDisplayName || H.team.displayName, nameA = A.team.shortDisplayName || A.team.displayName;
  const pct = x => Math.round(x * 100);
  let fav = "";
  if (pr) {
    const top = Math.max(pr.ph, pr.pd, pr.pa);
    fav = top === pr.pd || top < .42 ? "Match très serré : aucun favori net"
      : `Favori : <b>${esc(top === pr.ph ? nameH : nameA)}</b>${top > .6 ? " (large favori)" : ""}`;
  }
  const formBadges = f => f.res.length ? f.res.map(r => `<i class="fm-${r === "W" ? "w" : r === "D" ? "d" : "l"}">${r === "W" ? "V" : r === "D" ? "N" : "D"}</i>`).join("") : `<span class="muted">—</span>`;
  const row = (label, vh, va, better = "high") => {
    if (vh == null && va == null) return "";
    const nh = parseFloat(vh), na = parseFloat(va);
    const hb = !isNaN(nh) && !isNaN(na) && (better === "high" ? nh > na : nh < na), ab = !isNaN(nh) && !isNaN(na) && (better === "high" ? na > nh : na < nh);
    return `<div class="pm-row"><b class="${hb ? "lead" : ""}">${vh ?? "—"}</b><span>${label}</span><b class="${ab ? "lead" : ""}">${va ?? "—"}</b></div>`;
  };
  const th = pr?.h.tb, ta = pr?.a.tb, fh = pr?.h.f || teamForm(d, H.team.id), fa = pr?.a.f || teamForm(d, A.team.id);
  const r1 = x => x == null ? null : (Math.round(x * 10) / 10).toString().replace(".", ",");
  const last5 = (f, tid) => f.evs.length ? f.evs.map(e => `
      <div class="l5"><i class="fm-${e.gameResult === "W" ? "w" : e.gameResult === "D" ? "d" : "l"}">${e.gameResult === "W" ? "V" : e.gameResult === "D" ? "N" : "D"}</i>
        <span>${e.atVs === "@" ? "à" : "vs"} ${esc(e.opponent?.displayName || "")}</span><b>${esc(e.score || "")}</b></div>`).join("") : `<p class="muted">Pas de match récent.</p>`;
  const h2h = (d.seasonseries || []).find(x => /head/i.test(x.type || "")) || d.seasonseries?.[0];
  const h2hEvs = (h2h?.events || []).filter(e => e.statusType?.completed !== false && e.status !== "pre").slice(0, 5);
  let wH = 0, wA = 0, dr = 0;
  h2hEvs.forEach(e => { const w = (e.competitors || []).find(c => c.winner); if (!w) dr++; else if (w.team?.id === H.team.id) wH++; else wA++; });
  return `
    ${pr ? `<section class="pm-card">
      <div class="pm-title">Pronostic Arena</div>
      <div class="pm-probs">
        <div><b>${pct(pr.ph)}%</b><span>${esc(nameH)}</span></div>
        <div><b>${pct(pr.pd)}%</b><span>Nul</span></div>
        <div><b>${pct(pr.pa)}%</b><span>${esc(nameA)}</span></div>
      </div>
      <div class="pm-bar"><i class="h" style="width:${pct(pr.ph)}%"></i><i class="d" style="width:${pct(pr.pd)}%"></i><i class="a" style="width:${pct(pr.pa)}%"></i></div>
      <p class="pm-fav">${fav} · score le plus probable : <b>${pr.best.h}-${pr.best.a}</b></p>
      <p class="hint">Calculé par Arena à partir du classement, de la forme sur 5 matchs et de l'avantage du terrain. Ce n'est qu'une estimation, pas une certitude.</p>
    </section>` : ""}
    <section class="pm-card">
      <div class="pm-title">Face à face</div>
      <div class="pm-head"><span>${esc(nameH)}</span><span></span><span>${esc(nameA)}</span></div>
      ${th || ta ? row("Classement", th ? th.rank + (th.rank === 1 ? "er" : "e") : null, ta ? ta.rank + (ta.rank === 1 ? "er" : "e") : null, "low") : ""}
      ${row("Points", th?.pts, ta?.pts)}
      ${row("Points par match", r1(th && th.gp ? th.pts / th.gp : null), r1(ta && ta.gp ? ta.pts / ta.gp : null))}
      ${row("Différence de buts", th ? (th.gd > 0 ? "+" : "") + th.gd : null, ta ? (ta.gd > 0 ? "+" : "") + ta.gd : null)}
      ${row("Victoires / nuls / défaites", th ? `${th.w}/${th.dr}/${th.l}` : null, ta ? `${ta.w}/${ta.dr}/${ta.l}` : null, "none")}
      ${row("Buts marqués (5 derniers)", r1(fh.gfpg), r1(fa.gfpg))}
      ${row("Buts encaissés (5 derniers)", r1(fh.gapg), r1(fa.gapg), "low")}
      <div class="pm-row"><b class="pm-form">${formBadges(fh)}</b><span>Forme</span><b class="pm-form">${formBadges(fa)}</b></div>
    </section>
    <div class="pm-grid">
      <section class="pm-card"><div class="pm-title">${esc(nameH)} · 5 derniers matchs</div>${last5(fh)}</section>
      <section class="pm-card"><div class="pm-title">${esc(nameA)} · 5 derniers matchs</div>${last5(fa)}</section>
    </div>
    ${h2hEvs.length ? `<section class="pm-card">
      <div class="pm-title">Confrontations directes · ${h2hEvs.length} dernières</div>
      <div class="pm-h2h"><div><b>${wH}</b><span>${esc(nameH)}</span></div><div><b>${dr}</b><span>nuls</span></div><div><b>${wA}</b><span>${esc(nameA)}</span></div></div>
      ${h2hEvs.map(e => { const ch = (e.competitors || []).find(c => c.homeAway === "home"), ca = (e.competitors || []).find(c => c.homeAway === "away");
        return `<div class="l5"><span>${new Date(e.date).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })}</span><span>${esc(ch?.team?.displayName || "")}</span><b>${esc(ch?.score ?? "")}-${esc(ca?.score ?? "")}</b><span>${esc(ca?.team?.displayName || "")}</span></div>`; }).join("")}
    </section>` : ""}`;
}

function drawMatch() {
  const d = mc.data;
  if (!d) return;
  const comp = d.header.competitions[0];
  const side = ha => comp.competitors.find(c => c.homeAway === ha);
  const H = side("home"), A = side("away");
  const st = comp.status.type;
  const live = st.state === "in";
  if (!mc.tab) mc.tab = st.state === "pre" ? "prematch" : "lineups";
  const ev = parseEvent({ id: mc.id, date: comp.date, status: comp.status, competitions: [{ ...comp, details: [] }] }, mc.league);
  const l = Object.values(BY_SLUG).find(x => x.s === mc.league || x.sub?.some(s => s[0] === mc.league));
  const keyEv = d.keyEvents || [];
  const goals = tid => keyEv.filter(k => k.scoringPlay && k.team?.id === tid && !/shootout/i.test(k.type?.type || ""))
    .map(k => `${esc(shortName(k.participants?.[0]?.athlete?.displayName || ""))} ${esc(k.clock?.displayValue || "")}${k.type?.type === "own-goal" ? " (c.s.c.)" : /penalty/i.test(k.type?.text || "") ? " (pén.)" : ""}`);
  const logo = t => t.team.logos?.[0]?.href || t.team.logo;
  const followTeamBtn = t => bellBtn(PUSH.followsTeam(t.team.id), `data-follow-team="${esc(t.team.id)}" data-name="${esc(t.team.shortDisplayName || t.team.displayName)}" data-logo="${esc(logo(t) || "")}" data-leagues="${esc(mc.league)}"`);
  const scoreBox = played => played
    ? `<div class="mc-score ${live ? "live" : ""}"><span>${esc(H.score)}</span><i>:</i><span>${esc(A.score)}</span></div>`
    : `<div class="mc-score pre"><span class="kick">${fmtTime(new Date(comp.date))}</span></div>`;
  const played = st.state !== "pre";
  const pens = H.shootoutScore != null ? `<div class="mc-pens">T.A.B. ${H.shootoutScore} – ${A.shootoutScore}</div>` : "";
  const venue = d.gameInfo?.venue?.fullName;
  const att = d.gameInfo?.attendance;
  const ref = (d.gameInfo?.officials || []).find(o => /referee/i.test(o.position?.name || o.position?.displayName || ""))?.displayName;

  const head = `
    <div class="mc-league">${l ? `${l.f ? flagImg(l.f) : ""} ${esc(l.c)} · ${esc(l.n)}` : ""} · ${fmtDay(new Date(comp.date))}</div>
    <div class="mc-head">
      <div class="mc-team">${logo(H) ? `<img src="${logo(H)}" alt="">` : ""}<b>${esc(H.team.displayName)}</b>${followTeamBtn(H)}<div class="mc-goals">${goals(H.team.id).join("<br>")}</div></div>
      <div class="mc-mid">
        ${scoreBox(played)}
        <div class="mc-status ${live ? "live" : ""}">${live ? `<i></i>${esc(ev.label)}` : played ? esc(ev.label) : "Coup d'envoi"}</div>
        ${pens}
      </div>
      <div class="mc-team">${logo(A) ? `<img src="${logo(A)}" alt="">` : ""}<b>${esc(A.team.displayName)}</b>${followTeamBtn(A)}<div class="mc-goals">${goals(A.team.id).join("<br>")}</div></div>
    </div>
    <div class="mc-info">${[venue && "🏟 " + esc(venue), att ? `${Number(att).toLocaleString("fr-BE")} spectateurs` : "", ref && "Arbitre : " + esc(ref)].filter(Boolean).join(" · ")}
      ${played ? `<a class="yt" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${H.team.displayName} ${A.team.displayName} résumé ${new Date(comp.date).getFullYear()}`)}" target="_blank" rel="noopener">▶ Résumé sur YouTube</a>` : ""}</div>
    <div class="tabs mc-tabs">
      <button class="tab ${mc.tab === "prematch" ? "active" : ""}" data-mctab="prematch">${played ? "Pronostic & forme" : "Avant-match"}</button>
      <button class="tab ${mc.tab === "lineups" ? "active" : ""}" data-mctab="lineups">Compositions</button>
      <button class="tab ${mc.tab === "stats" ? "active" : ""}" data-mctab="stats">Statistiques</button>
      <button class="tab ${mc.tab === "events" ? "active" : ""}" data-mctab="events">Temps forts</button>
      ${(d.videos || []).length ? `<button class="tab ${mc.tab === "videos" ? "active" : ""}" data-mctab="videos">Vidéos · ${d.videos.length}</button>` : ""}
      ${live ? `<span class="mc-auto">Mise à jour automatique toutes les 30 s</span>` : ""}
    </div>`;

  let body = "";
  if (mc.tab === "prematch") body = prematchHTML(d, H, A);
  else if (mc.tab === "lineups") body = lineupsHTML(d, H, A);
  else if (mc.tab === "stats") body = statsHTML(d, H, A);
  else if (mc.tab === "videos") body = `<div class="clips">${(d.videos || []).map(v => clipFrom(v, { name: "", date: comp.date }, mc.league)).filter(Boolean).map(clipCard).join("")}</div>`;
  else body = eventsHTML(keyEv, H, A);

  const card = $("#match-modal .mc-card");
  if (card) card.innerHTML = `<button class="modal-x" data-mclose aria-label="Fermer">✕</button>${head}<div class="mc-body">${body}</div>`;
}
const shortName = n => { const p = String(n).split(" "); return p.length > 1 ? p[0][0] + ". " + p.slice(1).join(" ") : n; };

/* --- compositions : terrain + remplaçants --- */
function lineRank(ab) {
  ab = ab || "";
  if (ab === "G") return 0;
  if (/^(CD|LB|RB|D|SW|LWB|RWB|WB)/.test(ab)) return 1;
  if (/^DM/.test(ab)) return 2;
  if (/^(CM|LM|RM|M)/.test(ab)) return 3;
  if (/^AM/.test(ab)) return 4;
  return 5;
}
const lateral = ab => /(^L|-L$)/.test(ab || "") ? 0 : /(^R|-R$)/.test(ab || "") ? 2 : 1;
function playerMarks(p) {
  const s = Object.fromEntries((p.stats || []).map(x => [x.name, +x.value || 0]));
  const plays = p.plays || [];
  const subMin = plays.find(x => x.substitution)?.clock?.displayValue;
  let m = "";
  if (s.totalGoals) m += `<span class="pm goal">${"⚽".repeat(Math.min(s.totalGoals, 3))}</span>`;
  if (s.ownGoals) m += `<span class="pm og" title="But contre son camp">⚽</span>`;
  if (s.goalAssists) m += `<span class="pm ast" title="Passe décisive">A${s.goalAssists > 1 ? s.goalAssists : ""}</span>`;
  if (s.redCards) m += `<i class="card-r"></i>`; else if (s.yellowCards) m += `<i class="card-y"></i>`;
  if (p.subbedOut) m += `<span class="pm out" title="Remplacé">▼${esc(subMin || "")}</span>`;
  if (p.subbedIn) m += `<span class="pm in" title="Entré en jeu">▲${esc(subMin || "")}</span>`;
  return m;
}
function teamLines(r) {
  const starters = (r.roster || []).filter(p => p.starter);
  const form = (r.formation || "").split("-").map(Number).filter(Boolean);
  const sorted = [...starters].sort((a, b) => lineRank(a.position?.abbreviation) - lineRank(b.position?.abbreviation)
    || lateral(a.position?.abbreviation) - lateral(b.position?.abbreviation));
  const lines = [sorted.slice(0, 1)];
  let i = 1;
  if (form.length && form.reduce((a, b) => a + b, 0) === starters.length - 1) {
    for (const n of form) { lines.push(sorted.slice(i, i + n)); i += n; }
  } else {
    const groups = {};
    sorted.slice(1).forEach(p => { const k = lineRank(p.position?.abbreviation); (groups[k] = groups[k] || []).push(p); });
    Object.keys(groups).sort().forEach(k => lines.push(groups[k]));
  }
  return lines;
}
/* Note Arena sur 10, calculée à partir des stats du joueur et du résultat de son équipe
   (ESPN ne publie pas de notes : base 6, bonus/malus par action, comme les sites de notes). */
function playerRating(p, teamGoals, oppGoals) {
  const played = p.starter || p.subbedIn;
  if (!played) return null;
  const s = Object.fromEntries((p.stats || []).map(x => [x.name, +x.value || 0]));
  const line = lineRank(p.position?.abbreviation === "SUB" ? "" : p.position?.abbreviation);
  const gk = p.position?.abbreviation === "G";
  const w = p.subbedIn ? 0.5 : 1;   // un remplaçant joue moins longtemps : effets d'équipe réduits
  let r = 6;
  r += 1.15 * (s.totalGoals || 0) + 0.8 * (s.goalAssists || 0);
  r += 0.2 * (s.shotsOnTarget || 0) + 0.05 * Math.max(0, (s.totalShots || 0) - (s.shotsOnTarget || 0));
  r += 0.08 * (s.foulsSuffered || 0) - 0.08 * (s.foulsCommitted || 0);
  r -= 0.4 * (s.yellowCards || 0) + 1.5 * (s.redCards || 0) + 1 * (s.ownGoals || 0);
  if (gk) {
    r += 0.35 * (s.saves || 0) - 0.45 * (s.goalsConceded ?? oppGoals);
    if (!oppGoals && p.starter) r += 0.8;
  } else if (line === 1) {
    r += oppGoals ? -Math.min(1, 0.2 * oppGoals) * w : 0.6 * w;
  }
  r += (teamGoals > oppGoals ? 0.4 : teamGoals < oppGoals ? -0.3 : 0) * w;
  return Math.max(3, Math.min(10, Math.round(r * 10) / 10));
}
const ratingClass = r => r >= 8 ? "r-top" : r >= 7 ? "r-good" : r >= 6 ? "r-mid" : "r-low";
const ratingBadge = r => r == null ? "" : `<span class="rating-b ${ratingClass(r)}">${r.toFixed(1)}</span>`;

function lineupsHTML(d, H, A) {
  const rosters = d.rosters || [];
  const rH = rosters.find(r => r.homeAway === "home"), rA = rosters.find(r => r.homeAway === "away");
  if (!rH?.roster?.length || !rA?.roster?.length)
    return `<div class="empty">Les compositions ne sont pas encore publiées.<br>Elles arrivent en général une heure avant le coup d'envoi ; la fiche se met à jour toute seule.</div>`;
  const color = (t, fb) => "#" + (t.team.color && t.team.color !== "000000" ? t.team.color : fb);
  const cH = color(H, "38d6ff");
  let cA = color(A, "ff4f8b");
  // deux maillots trop proches (ex. rouge contre rouge) : l'équipe à l'extérieur prend sa couleur secondaire
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const dist = (x, y) => Math.hypot(...rgb(x).map((v, i) => v - rgb(y)[i]));
  if (dist(cH, cA) < 140) {
    const alt = A.team.alternateColor && "#" + A.team.alternateColor;
    cA = alt && /^#[0-9a-f]{6}$/i.test(alt) && dist(cH, alt) >= 140 && dist(alt, "#ffffff") > 60 ? alt : dist(cH, "#2a6df4") >= 140 ? "#2a6df4" : "#e9edf5";
  }
  const started = d.header?.competitions?.[0]?.status?.type?.state !== "pre";
  const gH = +H.score || 0, gA = +A.score || 0;
  const rate = (p, home) => started ? playerRating(p, home ? gH : gA, home ? gA : gH) : null;
  const best = (r, home) => (r.roster || []).map(p => ({ p, v: rate(p, home) })).filter(x => x.v != null).sort((a, b) => b.v - a.v)[0];
  const chip = (p, c, home) => `
    <div class="pl">
      <span class="pl-num" style="--tc:${c}">${esc(p.jersey || "")}${ratingBadge(rate(p, home))}</span>
      <span class="pl-name">${esc(p.athlete?.lastName || shortName(p.athlete?.displayName || ""))}</span>
      <span class="pl-marks">${playerMarks(p)}</span>
    </div>`;
  const half = (r, c, flip) => {
    const lines = teamLines(r);
    return `<div class="half ${flip ? "top" : "bottom"}">${(flip ? lines : [...lines].reverse()).map(line =>
      `<div class="pl-line">${(flip ? [...line].reverse() : line).map(p => chip(p, c, !flip)).join("")}</div>`).join("")}</div>`;
  };
  const bench = (r, c, t, home) => `
    <div class="bench">
      <div class="mp-title">${esc(t.team.shortDisplayName || t.team.displayName)} · remplaçants</div>
      ${(r.roster || []).filter(p => !p.starter).map(p => `
        <div class="bench-row ${p.subbedIn ? "played" : ""}">
          <span class="pl-num sm" style="--tc:${c}">${esc(p.jersey || "")}</span>
          <span class="bn">${esc(p.athlete?.displayName || "")}</span>
          <span class="pl-marks">${playerMarks(p)}</span>
          ${ratingBadge(rate(p, home))}
        </div>`).join("")}
    </div>`;
  const bH = best(rH, true), bA = best(rA, false);
  const motm = (b, t) => b ? `<div class="motm"><img src="${t.team.logos?.[0]?.href || ""}" alt=""><div><small>Meilleur joueur · ${esc(t.team.shortDisplayName || t.team.displayName)}</small><b>${esc(b.p.athlete?.displayName || "")}</b></div>${ratingBadge(b.v)}</div>` : "";
  return `
    ${started && (bH || bA) ? `<div class="motms">${motm(bH, H)}${motm(bA, A)}</div><p class="hint center rating-note">Notes sur 10 calculées par Arena à partir des stats du match (buts, passes décisives, tirs, arrêts, cartons, résultat).</p>` : ""}
    <div class="lineups">
      <div class="pitch-wrap">
        <div class="form-tag top"><img src="${A.team.logos?.[0]?.href || ""}" alt=""> ${esc(A.team.shortDisplayName || A.team.displayName)} <b>${esc(rA.formation || "")}</b></div>
        <div class="pitch">
          <div class="pitch-lines"><i class="c"></i><i class="box t"></i><i class="box b"></i><i class="six t"></i><i class="six b"></i><i class="mid"></i></div>
          ${half(rA, cA, true)}
          ${half(rH, cH, false)}
        </div>
        <div class="form-tag"><img src="${H.team.logos?.[0]?.href || ""}" alt=""> ${esc(H.team.shortDisplayName || H.team.displayName)} <b>${esc(rH.formation || "")}</b></div>
      </div>
      <div class="benches">${bench(rH, cH, H, true)}${bench(rA, cA, A, false)}</div>
    </div>`;
}

/* --- statistiques --- */
function statsHTML(d, H, A) {
  const teams = d.boxscore?.teams || [];
  const get = (tid, key) => {
    const t = teams.find(x => x.team.id === tid);
    if (!t) return null;
    const s = (t.statistics || []).find(x => x.name === key) || (t.statistics || []).find(x => (STAT_ALIASES[key] || []).includes(x.label));
    if (!s) return null;
    let v = parseFloat(s.displayValue);
    if (isNaN(v)) return null;
    if (key === "passPct" && v <= 1) v = Math.round(v * 100);
    return v;
  };
  const rows = STAT_ROWS.map(([k, label, unit]) => {
    const h = get(H.team.id, k), a = get(A.team.id, k);
    if (h == null || a == null || (h === 0 && a === 0 && k !== "possessionPct" && k !== "redCards")) return "";
    if (k === "redCards" && !h && !a) return "";
    const tot = h + a || 1;
    const fmt = v => (k === "possessionPct" ? Math.round(v) : v) + (unit || "");
    return `
      <div class="st-row">
        <b class="${h > a ? "lead" : ""}">${fmt(h)}</b>
        <span class="st-label">${label}</span>
        <b class="${a > h ? "lead" : ""}">${fmt(a)}</b>
        <div class="st-bar"><i class="h" style="width:${h / tot * 100}%"></i><i class="a" style="width:${a / tot * 100}%"></i></div>
      </div>`;
  }).join("");
  return rows ? `<div class="stats">${rows}</div>` : `<div class="empty">Pas encore de statistiques pour ce match.</div>`;
}

/* --- temps forts --- */
function eventsHTML(keyEv, H, A) {
  const items = keyEv.filter(k => /goal|card|substitution|penalty/i.test(k.type?.type || "") || k.scoringPlay);
  if (!items.length) return `<div class="empty">Aucun temps fort pour le moment.</div>`;
  return `<div class="timeline">${items.map(k => {
    const t = k.type?.type || "";
    const home = k.team?.id === H.team.id;
    const names = (k.participants || []).map(p => p.athlete?.displayName).filter(Boolean);
    const icon = k.scoringPlay ? "⚽" : /red/.test(t) ? `<i class="card-r"></i>` : /yellow/.test(t) ? `<i class="card-y"></i>` : /substitution/.test(t) ? "⇄" : "•";
    const txt = /substitution/.test(t) && names.length > 1
      ? `<span class="in">▲ ${esc(names[0])}</span> <span class="out">▼ ${esc(names[1])}</span>`
      : `<b>${esc(names[0] || "")}</b>${t === "own-goal" ? " (c.s.c.)" : /penalty/i.test(k.type?.text || "") ? " (pén.)" : ""}${names[1] && k.scoringPlay ? ` <span class="ast">passe : ${esc(names[1])}</span>` : ""}`;
    return `<div class="tl-row ${home ? "h" : "a"} ${k.scoringPlay ? "goal" : ""}">
      <div class="tl-side">${home ? txt : ""}</div>
      <div class="tl-min"><span>${esc(k.clock?.displayValue || "")}</span><em>${icon}</em></div>
      <div class="tl-side">${home ? "" : txt}</div>
    </div>`;
  }).join("")}</div>`;
}

// ---------- plus beaux buts : clips vidéo publiés par ESPN (LaLiga) sur les 14 derniers jours
const GOAL_LEAGUES = ["esp.1"];
const clipKind = h => /spectacular|stunning|incredible|great goal|wonder|brilliant|amazing|screamer|golazo/i.test(h) ? "top"
  : /game highlights/i.test(h) ? "hl" : /save/i.test(h) ? "save" : /scores|goal|back of the net|penalty/i.test(h) ? "goal" : "other";
const CLIP_LABEL = { top: "⭐ But spectaculaire", goal: "⚽ But", hl: "🎬 Résumé du match", save: "🧤 Arrêt", other: "🎥 Vidéo" };
function clipFrom(v, ev, slug) {
  const src = v.links?.source?.HD?.href || v.links?.source?.href;
  if (!src) return null;
  return { id: v.id, title: v.headline, kind: clipKind(v.headline || ""), src, thumb: v.thumbnail, dur: v.duration,
    date: new Date(v.originalPublishDate || v.lastModified || ev?.date || Date.now()), match: ev?.name || "", league: slug, eventId: ev?.id };
}
const fmtDur = s => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "";
function clipCard(c) {
  return `
    <article class="clip clip-${c.kind}" data-clip="${esc(c.src)}">
      <div class="clip-media">
        ${c.thumb ? `<img src="${esc(c.thumb)}" alt="" loading="lazy">` : ""}
        <span class="clip-play">▶</span>
        ${c.dur ? `<span class="clip-dur">${fmtDur(c.dur)}</span>` : ""}
        <span class="clip-tag">${CLIP_LABEL[c.kind]}</span>
      </div>
      <div class="clip-body">
        <b>${esc(c.title)}</b>
        <small>${esc(c.match)} · ${c.date.toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}</small>
      </div>
    </article>`;
}
/* fil vertical infini (façon Reels) : une vidéo par écran, lecture auto, chargement des semaines précédentes en bas du fil */
const feed = { filter: "all", items: [], seen: new Set(), win: 0, loading: false, done: false, sound: false, playObs: null, moreObs: null };
const FEED_FILTERS = [["all", "Tout"], ["top", "⭐ Spectaculaires"], ["goal", "⚽ Buts"], ["hl", "🎬 Résumés"], ["save", "🧤 Arrêts"]];
const FEED_WINDOW_DAYS = 7, FEED_MAX_WINDOWS = 52;   // on remonte semaine par semaine, jusqu'à un an

async function loadGoalWindow(k) {
  const now = new Date();
  const to = new Date(+now - k * FEED_WINDOW_DAYS * 864e5), from = new Date(+to - FEED_WINDOW_DAYS * 864e5);
  const months = [...new Set([ym(from), ym(to)])];
  const boards = await pool(GOAL_LEAGUES.flatMap(s => months.map(m => [s, m])), 4,
    ([s, m]) => getJSON(`${API}/${s}/scoreboard?dates=${m}`, 10 * 60e3).then(d => ({ s, d })));
  const evs = boards.flatMap(b => (b?.d?.events || []).map(e => ({ s: b.s, e })))
    .filter(({ e }) => e.status?.type?.completed && new Date(e.date) >= from && new Date(e.date) < to);
  const sums = await pool(evs, 6, ({ s, e }) => getJSON(`${API}/${s}/summary?event=${e.id}`, 30 * 60e3).then(d => ({ s, e, d })));
  const out = [];
  sums.forEach(x => (x?.d?.videos || []).forEach(v => { const c = clipFrom(v, x.e, x.s); if (c) out.push(c); }));
  return out.sort((a, b) => b.date - a.date);
}

const feedMatch = c => feed.filter === "all" || c.kind === feed.filter;
function reelHTML(c) {
  return `
    <section class="reel reel-${c.kind}" data-src="${esc(c.src)}">
      <div class="reel-video">
        <video poster="${esc(c.thumb || "")}" playsinline loop preload="none" ${feed.sound ? "" : "muted"}></video>
        <span class="reel-tag">${CLIP_LABEL[c.kind]}</span>
        ${c.dur ? `<span class="clip-dur">${fmtDur(c.dur)}</span>` : ""}
        <span class="reel-paused">▶</span>
      </div>
      <div class="reel-info">
        <b>${esc(c.title)}</b>
        <small>${esc(c.match)} · ${c.date.toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })}</small>
        ${c.eventId ? `<button class="ghost reel-match" data-reel-match="${esc(c.league)}|${esc(c.eventId)}">Fiche du match ›</button>` : ""}
      </div>
    </section>`;
}

function renderGoals() {
  const main = $("#foot-main");
  Object.assign(feed, { items: [], seen: new Set(), win: 0, loading: false, done: false });
  main.innerHTML = `
    <div class="feed-head">
      <div><h1>Plus beaux buts</h1><div class="sub">LaLiga · vidéos ESPN · fais défiler vers le bas</div></div>
      <button class="ghost feed-sound" id="feed-sound">${feed.sound ? "🔊 Son activé" : "🔇 Son coupé"}</button>
    </div>
    <div class="tabs feed-filters">${FEED_FILTERS.map(([k, n]) => `<button class="tab ${feed.filter === k ? "active" : ""}" data-ffilter="${k}">${n}</button>`).join("")}</div>
    <div class="feed" id="feed"><div class="feed-more" id="feed-more">${loadingHTML("Recherche des vidéos…")}</div></div>`;
  const box = $("#feed");
  feed.playObs?.disconnect(); feed.moreObs?.disconnect();
  // lecture automatique de la vidéo visible, pause des autres
  feed.playObs = new IntersectionObserver(entries => entries.forEach(en => {
    const v = en.target.querySelector("video");
    if (en.isIntersecting && en.intersectionRatio > .6) {
      if (!v.src) v.src = en.target.dataset.src;
      v.muted = !feed.sound;
      v.play().catch(() => {});
      en.target.classList.remove("paused");
    } else if (v.src) v.pause();
  }), { root: box, threshold: [0, .6, 1] });
  // chargement de la suite quand on approche du bas
  feed.moreObs = new IntersectionObserver(en => { if (en[0].isIntersecting) loadMoreGoals(); }, { root: box, rootMargin: "0px 0px 150% 0px" });
  feed.moreObs.observe($("#feed-more"));
  main.querySelector(".feed-filters").onclick = e => {
    const f = e.target.closest("[data-ffilter]");
    if (!f) return;
    feed.filter = f.dataset.ffilter;
    main.querySelectorAll("[data-ffilter]").forEach(b => b.classList.toggle("active", b === f));
    box.querySelectorAll(".reel").forEach(r => r.remove());
    box.scrollTop = 0;
    appendReels(feed.items.filter(feedMatch));
    loadMoreGoals();
  };
  $("#feed-sound").onclick = () => {
    feed.sound = !feed.sound;
    $("#feed-sound").textContent = feed.sound ? "🔊 Son activé" : "🔇 Son coupé";
    box.querySelectorAll("video").forEach(v => { v.muted = !feed.sound; });
  };
  box.onclick = e => {
    const m = e.target.closest("[data-reel-match]");
    if (m) { const [lg, id] = m.dataset.reelMatch.split("|"); openMatch(lg, id); return; }
    const r = e.target.closest(".reel");
    if (!r) return;
    const v = r.querySelector("video");
    if (!v.src) v.src = r.dataset.src;
    if (v.paused) { v.play().catch(() => {}); r.classList.remove("paused"); } else { v.pause(); r.classList.add("paused"); }
  };
  loadMoreGoals();
}
function appendReels(list) {
  const box = $("#feed"), more = $("#feed-more");
  if (!box || !list.length) return;
  more.insertAdjacentHTML("beforebegin", list.map(reelHTML).join(""));
  box.querySelectorAll(".reel:not([data-obs])").forEach(r => { r.dataset.obs = "1"; feed.playObs.observe(r); });
}
async function loadMoreGoals() {
  if (feed.loading || feed.done || state.view !== "goals") return;
  feed.loading = true;
  let added = 0;
  while (!feed.done && added < 4) {
    const k = feed.win++;
    if (k >= FEED_MAX_WINDOWS) { feed.done = true; break; }
    const clips = await loadGoalWindow(k);
    if (state.view !== "goals") { feed.loading = false; return; }
    const fresh = clips.filter(c => !feed.seen.has(c.id));
    fresh.forEach(c => { feed.seen.add(c.id); feed.items.push(c); });
    const show = fresh.filter(feedMatch);
    appendReels(show);
    added += show.length;
  }
  feed.loading = false;
  const more = $("#feed-more");
  if (more) more.innerHTML = feed.done
    ? `<div class="empty">Tu as tout vu : plus aucune vidéo sur les 12 derniers mois.</div>`
    : loadingHTML("Chargement des vidéos plus anciennes…");
  // si la suite est déjà visible (peu de vidéos), on continue
  if (!feed.done && more && more.getBoundingClientRect().top < window.innerHeight * 2) setTimeout(loadMoreGoals, 50);
}

/* lecture d'un clip : la vignette devient le lecteur vidéo */
document.addEventListener("click", e => {
  const c = e.target.closest("[data-clip]");
  if (!c || c.classList.contains("playing")) return;
  e.stopPropagation();
  document.querySelectorAll(".clip.playing video").forEach(v => v.pause());
  c.classList.add("playing");
  c.querySelector(".clip-media").innerHTML = `<video src="${c.dataset.clip}" controls autoplay playsinline></video>`;
}, true);

// ---------- installation sur téléphone (bouton « Installer », visible uniquement sur mobile)
const UA = navigator.userAgent;
const IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/i.test(UA);
const IS_STANDALONE = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
// navigateurs intégrés aux applis (lien en bio Instagram, TikTok…) : ils ne savent pas installer d'appli
const IN_APP = (/Instagram/i.test(UA) && "Instagram") || (/FBAN|FBAV|FB_IAB|FBIOS/i.test(UA) && "Facebook") || (/TikTok|musical_ly|BytedanceWebview/i.test(UA) && "TikTok")
  || (/Snapchat/i.test(UA) && "Snapchat") || (/LinkedInApp/i.test(UA) && "LinkedIn") || (/Pinterest/i.test(UA) && "Pinterest") || (/\bLine\//i.test(UA) && "Line") || null;
const IOS_BROWSER = IS_IOS ? (/CriOS/.test(UA) ? "Chrome" : /FxiOS/.test(UA) ? "Firefox" : /EdgiOS/.test(UA) ? "Edge" : /OPT\//.test(UA) ? "Opera" : "Safari") : null;
const IS_SAMSUNG = /SamsungBrowser/i.test(UA);
const IN_FRAME = (() => { try { return window.top !== window.self; } catch { return true; } })();
const SITE_URL = "https://arena.eraz.ovh/";
let installPrompt = null;
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; if ($("#install-modal")?.classList.contains("show")) drawInstall(); });
window.addEventListener("appinstalled", () => { $("#install-btn").hidden = true; closeInstall(); });
if ((IS_IOS || IS_ANDROID) && !IS_STANDALONE) $("#install-btn").hidden = false;
if (IN_FRAME) document.body.insertAdjacentHTML("afterbegin", `<a class="frame-warn" href="${SITE_URL}" target="_top">Arena 360 est affiché dans un cadre. Appuie ici pour l'ouvrir directement (et pouvoir l'installer).</a>`);

const ICON_SHARE = `<svg class="ii" viewBox="0 0 24 24"><path d="M12 3v12M12 3L8 7M12 3l4 4M7 10H5v11h14V10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PLUS = `<svg class="ii" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const ICON_DOTS = `<svg class="ii" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>`;
let installTab = IS_IOS ? "ios" : "android";

function openInstall() {
  let m = $("#install-modal");
  if (!m) {
    m = document.createElement("div");
    m.id = "install-modal";
    m.className = "modal";
    m.addEventListener("click", async e => {
      if (e.target === m || e.target.closest("[data-iclose]")) return closeInstall();
      const t = e.target.closest("[data-itab]");
      if (t) { installTab = t.dataset.itab; drawInstall(); }
      if (e.target.closest("[data-icopy]")) {
        const b = e.target.closest("[data-icopy]");
        try { await navigator.clipboard.writeText(SITE_URL); b.textContent = "Lien copié ✓"; } catch { b.textContent = SITE_URL; }
        return;
      }
      if (e.target.closest("[data-inow]") && installPrompt) {
        installPrompt.prompt();
        const r = await installPrompt.userChoice.catch(() => null);
        installPrompt = null;
        if (r?.outcome === "accepted") closeInstall(); else drawInstall();
      }
    });
    document.body.appendChild(m);
  }
  drawInstall();
  m.classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeInstall() { $("#install-modal")?.classList.remove("show"); document.body.style.overflow = ""; }
function drawInstall() {
  const step = (n, html) => `<li><span class="istep">${n}</span><div>${html}</div></li>`;
  const copyBtn = `<button class="ghost icopy" data-icopy>Copier le lien du site</button>`;
  const warn = IN_APP ? `
    <div class="iwarn">
      <b>Tu es dans le navigateur d'${esc(IN_APP)}.</b> Il ne permet pas d'installer d'appli : ouvre d'abord le site dans ${IS_IOS ? "Safari" : "Chrome"}.
      ${IS_ANDROID ? `<a class="cta iopen" href="intent://arena.eraz.ovh/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(SITE_URL)};end">Ouvrir dans Chrome</a>` : ""}
      ${IS_IOS ? `<a class="cta iopen" href="x-safari-https://arena.eraz.ovh/">Ouvrir dans Safari</a>` : ""}
      <span>Si le bouton ne marche pas : appuie sur <b>⋯</b> en haut à droite, puis <b>« Ouvrir dans le navigateur »</b> (ou « Ouvrir dans ${IS_IOS ? "Safari" : "Chrome"} »). Tu peux aussi copier le lien et le coller dans ${IS_IOS ? "Safari" : "Chrome"}.</span>
      ${copyBtn}
    </div>` : IN_FRAME ? `
    <div class="iwarn"><b>Le site est affiché dans un cadre.</b> <a href="${SITE_URL}" target="_top">Ouvre directement arena.eraz.ovh</a>, puis installe-le.</div>` : "";
  const android = `
    ${installPrompt && !IN_APP ? `<button class="cta inow" data-inow>Installer Arena 360 maintenant</button><p class="hint center">Ou à la main :</p>` : ""}
    ${IS_SAMSUNG ? `<ol class="isteps">
      ${step(1, `Dans <b>Samsung Internet</b>, appuie sur le menu <b>☰</b> en bas à droite.`)}
      ${step(2, `Choisis <b>« Ajouter la page à »</b>, puis <b>« Écran d'accueil »</b>.`)}
      ${step(3, `Confirme avec <b>« Ajouter »</b>. L'icône Arena 360 apparaît sur ton écran d'accueil.`)}
    </ol>` : `<ol class="isteps">
      ${step(1, `Ouvre <b>arena.eraz.ovh</b> dans <b>Chrome</b> (pas dans Instagram ni TikTok).`)}
      ${step(2, `Appuie sur les <b>trois points</b> ${ICON_DOTS} en haut à droite.`)}
      ${step(3, `Choisis <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>, puis <b>« Installer »</b>.`)}
      ${step(4, `L'icône Arena 360 apparaît sur ton écran d'accueil (parfois après quelques secondes).`)}
    </ol>`}`;
  const ios = `
    <ol class="isteps">
      ${step(1, IOS_BROWSER && IOS_BROWSER !== "Safari" && !IN_APP ? `Tu es dans <b>${IOS_BROWSER}</b> : ça marche aussi, le bouton Partager ${ICON_SHARE} est dans la barre d'adresse. Sinon, ouvre le site dans <b>Safari</b>.` : `Ouvre <b>arena.eraz.ovh</b> dans <b>Safari</b> (pas dans Instagram ni TikTok).`)}
      ${step(2, `Appuie sur le bouton <b>Partager</b> ${ICON_SHARE} en bas de l'écran (en haut sur iPad).`)}
      ${step(3, `Fais défiler et choisis <b>« Sur l'écran d'accueil »</b> ${ICON_PLUS}.`)}
      ${step(4, `Appuie sur <b>« Ajouter »</b> en haut à droite. L'icône Arena 360 apparaît sur ton écran d'accueil.`)}
    </ol>
    <p class="hint">Sur iPhone, l'installation passe par Safari. Avec Chrome, le bouton Partager ${ICON_SHARE} est en haut à droite, puis « Ajouter à l'écran d'accueil ».</p>`;
  $("#install-modal").innerHTML = `
    <div class="modal-card install-card" role="dialog" aria-modal="true">
      <button class="modal-x" data-iclose aria-label="Fermer">✕</button>
      <div class="install-head">
        <img src="icons/icon-192.png" alt="">
        <div><h2>Installer Arena 360</h2><p>Ajoute l'appli sur ton écran d'accueil : elle s'ouvre en plein écran, comme une vraie application.</p></div>
      </div>
      <div class="tabs install-tabs">
        <button class="tab ${installTab === "android" ? "active" : ""}" data-itab="android">Android</button>
        <button class="tab ${installTab === "ios" ? "active" : ""}" data-itab="ios">iPhone / iPad</button>
      </div>
      ${warn}
      ${installTab === "ios" ? ios : android}
    </div>`;
}
$("#install-btn").addEventListener("click", openInstall);

// ---------- Nos Belges : buteurs et passeurs belges de tous les clubs suivis (belges.json, mis à jour chaque jour)
const bel = { tab: "goals", kind: "all", q: "", period: "season" };
const slugKind = sl => sl.startsWith("uefa.") ? "europe" : /\.[12]$/.test(sl) ? "league" : "cup";
/* joueurs « de la semaine » : mêmes champs que la saison, calculés à partir des buts et passes depuis lundi */
function weekPlayers(d, byId) {
  const m = new Map();
  const add = (ev, k) => {
    const base = byId.get(ev.playerId); if (!base) return;
    const p = m.get(ev.playerId) || { ...base, comps: [], goals: 0, assists: 0, apps: 0, events: [] };
    p[k]++;
    let c = p.comps.find(x => x.slug === ev.league);
    if (!c) { c = { slug: ev.league, name: ev.comp, kind: slugKind(ev.league), goals: 0, assists: 0, apps: 0 }; p.comps.push(c); }
    c[k]++;
    p.events.push({ ...ev, type: k });
    m.set(ev.playerId, p);
  };
  (d.week?.goals || []).forEach(e => add(e, "goals"));
  (d.week?.assists || []).forEach(e => add(e, "assists"));
  return [...m.values()];
}
const BEL_TABS = [["goals", "⚽ Buteurs"], ["assists", "🅰️ Passeurs"], ["recent", "🔥 Derniers buts"], ["all", "👥 Tous les Belges"]];
const BEL_KINDS = [["all", "Toutes compétitions"], ["league", "Championnats"], ["europe", "Coupes d'Europe"], ["cup", "Coupes nationales"]];

function belStat(p, key) {
  if (bel.kind === "all") return p[key];
  return p.comps.filter(c => c.kind === bel.kind).reduce((s, c) => s + (c[key] || 0), 0);
}
function belAvatar(p, size = "") {
  return p.photo
    ? `<img class="bel-photo ${size}" src="${esc(p.photo)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'bel-photo ${size} mono',textContent:'${esc(belInitials(p.name))}'}))">`
    : `<span class="bel-photo ${size} mono">${esc(belInitials(p.name))}</span>`;
}
const belInitials = n => String(n).split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();

async function renderBelges() {
  const main = $("#foot-main");
  main.innerHTML = `<div class="loading"><div class="spinner"></div>Chargement de nos Belges…</div>`;
  let d;
  try { d = await getJSON("belges.json?v=" + new Date().toISOString().slice(0, 13), 30 * 60e3); }
  catch { main.innerHTML = `<div class="empty">Impossible de charger les Belges pour le moment.</div>`; return; }
  if (state.view !== "belges") return;
  const byId = new Map(d.players.map(p => [p.id, p]));
  const weekList = weekPlayers(d, byId);
  const weekFrom = d.week ? new Date(d.week.from) : null;
  const draw = () => {
    const isWeek = bel.period === "week";
    const src = isWeek ? weekList : d.players;
    const key = bel.tab === "assists" ? "assists" : "goals";
    const q = bel.q.trim().toLowerCase();
    const match = p => !q || (p.name + " " + p.team + " " + p.leagueName).toLowerCase().includes(q);
    const totGoals = src.reduce((s, p) => s + belStat(p, "goals"), 0);
    const totAssists = src.reduce((s, p) => s + belStat(p, "assists"), 0);
    const scorers = src.filter(p => belStat(p, "goals") > 0).length;
    const upd = new Date(d.generatedAt).toLocaleString("fr-BE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

    let body = "";
    if (bel.tab === "recent") {
      const evs = isWeek ? [...(d.week?.goals || []).map(e => ({ ...e, type: "goals" })), ...(d.week?.assists || []).map(e => ({ ...e, type: "assists" }))]
        .sort((a, b) => new Date(b.date) - new Date(a.date)) : d.recent;
      const list = evs.filter(r => byId.has(r.playerId) && match(byId.get(r.playerId)));
      body = list.length ? `<div class="bel-recent">${list.map(r => {
        const p = byId.get(r.playerId), m = r.match;
        return `<button class="bel-goal" data-bel-match="${esc(r.league)}|${esc(r.eventId)}">
          ${belAvatar(p, "sm")}
          <div class="bg-main"><b>${esc(p.name)}</b><span>${r.type === "assists" ? `🅰️ Passe D pour ${esc(r.scorer || "")} · ` : "⚽ "}${esc(r.minute)}${r.pen ? " · pénalty" : ""} · ${esc(r.comp)}</span></div>
          <div class="bg-match"><img src="${esc(m.homeLogo || "")}" alt=""><span>${esc(m.home)}</span><b>${esc(m.hs)}-${esc(m.as)}</b><span>${esc(m.away)}</span><img src="${esc(m.awayLogo || "")}" alt=""></div>
          <time>${new Date(r.date).toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short" })}</time>
        </button>`;
      }).join("")}</div>` : `<div class="empty">${isWeek ? "Aucun but ni passe décisive belge depuis lundi pour l'instant." : "Aucun but belge ces 10 derniers jours."}</div>`;
    } else {
      const sortKey = bel.tab === "all" ? "apps" : key;
      const list = src.filter(match).map(p => ({ p, g: belStat(p, "goals"), a: belStat(p, "assists"), apps: belStat(p, "apps") }))
        .filter(x => bel.tab === "all" ? (isWeek ? x.g + x.a > 0 : x.apps > 0 || bel.kind === "all") : x[key === "goals" ? "g" : "a"] > 0)
        .sort((x, y) => bel.tab === "all" ? (y.g + y.a) - (x.g + x.a) || y.apps - x.apps
          : (key === "goals" ? y.g - x.g || y.a - x.a : y.a - x.a || y.g - x.g) || y.apps - x.apps);
      const big = x => key === "goals" || bel.tab === "all" ? x.g : x.a;
      const card = (x, i) => {
        const comps = x.p.comps.filter(c => (bel.kind === "all" || c.kind === bel.kind) && (c.goals || c.assists));
        return `
        <article class="bel-row ${i < 3 && bel.tab !== "all" && !q ? "top top" + (i + 1) : ""}">
          <span class="bel-rank">${i + 1}</span>
          ${belAvatar(x.p)}
          <div class="bel-id">
            <b>${esc(x.p.name)}</b>
            <span class="bel-club">${x.p.teamLogo ? `<img src="${esc(x.p.teamLogo)}" alt="">` : ""}${esc(x.p.team)}<em>${esc(x.p.leagueName)}</em></span>
            <span class="bel-comps">${isWeek
              ? (x.p.events || []).filter(ev => bel.kind === "all" || slugKind(ev.league) === bel.kind).map(ev => `<i class="k-${slugKind(ev.league)} ev" data-bel-match="${esc(ev.league)}|${esc(ev.eventId)}">${ev.type === "goals" ? "⚽" : "🅰️"} ${esc(ev.minute)} · ${esc(ev.match.home)} ${esc(ev.match.hs)}-${esc(ev.match.as)} ${esc(ev.match.away)}</i>`).join("")
              : comps.map(c => `<i class="k-${c.kind}">${esc(c.name)} · ${c.goals ? c.goals + " but" + (c.goals > 1 ? "s" : "") : ""}${c.goals && c.assists ? ", " : ""}${c.assists ? c.assists + " passe" + (c.assists > 1 ? "s" : "") + " D" : ""}</i>`).join("")}</span>
          </div>
          <div class="bel-nums">
            ${bel.tab === "all"
              ? `<div><b>${x.g}</b><small>buts</small></div><div><b>${x.a}</b><small>passes D</small></div>${isWeek ? "" : `<div class="bn-dim"><b>${x.apps}</b><small>matchs</small></div>`}`
              : `<div class="bn-main"><b>${big(x)}</b><small>${key === "goals" ? "but" + (big(x) > 1 ? "s" : "") : "passe" + (big(x) > 1 ? "s" : "") + " D"}</small></div>
                 <div class="bn-dim"><b>${key === "goals" ? x.a : x.g}</b><small>${key === "goals" ? "passes D" : "buts"}</small></div>
                 ${isWeek ? "" : `<div class="bn-dim"><b>${x.apps}</b><small>matchs</small></div>`}`}
          </div>
        </article>`;
      };
      body = list.length ? `<div class="bel-list">${list.slice(0, 150).map(card).join("")}</div>`
        : `<div class="empty">${isWeek ? "Pas encore de Belge dans ce classement depuis lundi. Reviens après les matchs du week-end !" : "Aucun Belge ne correspond."}</div>`;
    }
    main.innerHTML = `
      <section class="bel-hero">
        <div class="bel-flag" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="bel-hero-text">
          <div class="eyebrow">${isWeek ? `Cette semaine · depuis lundi ${weekFrom ? weekFrom.toLocaleDateString("fr-BE", { day: "numeric", month: "long", timeZone: "Europe/Brussels" }) : ""}` : `Saison ${esc(d.season)} · ${d.players.length} Belges suivis`}</div>
          <h1>Nos Belges</h1>
          <p>Tous les buts et passes décisives des joueurs belges, dans tous les clubs suivis par Arena : championnats, coupes d'Europe et coupes nationales.</p>
        </div>
        <div class="bel-kpis">
          <div><b>${totGoals}</b><span>buts</span></div>
          <div><b>${totAssists}</b><span>passes D</span></div>
          <div><b>${scorers}</b><span>buteurs</span></div>
        </div>
      </section>
      <div class="gmode bel-period" role="tablist">
        <button class="${!isWeek ? "on" : ""}" data-bel-period="season">Toute la saison</button>
        <button class="${isWeek ? "on" : ""}" data-bel-period="week">Cette semaine</button>
      </div>
      <div class="tabs bel-tabs">${BEL_TABS.map(([k, n]) => `<button class="tab ${bel.tab === k ? "active" : ""}" data-bel-tab="${k}">${n}</button>`).join("")}</div>
      <div class="toolbar">
        <input class="search" id="bel-q" type="search" placeholder="Joueur, club ou championnat…" value="${esc(bel.q)}">
        ${bel.tab !== "recent" ? BEL_KINDS.map(([k, n]) => `<button class="chip ${bel.kind === k ? "on" : ""}" data-bel-kind="${k}">${n}</button>`).join("") : ""}
      </div>
      ${body}
      <p class="source">Données ESPN, mises à jour automatiquement chaque jour · dernière mise à jour ${esc(upd)}. Comprend aussi les deuxièmes divisions anglaise, française, allemande, espagnole, italienne et néerlandaise. Les championnats lus sur Wikipédia (Pologne, Croatie…) ne sont pas inclus.</p>`;
  };
  draw();
  main.onclick = e => {
    const pr = e.target.closest("[data-bel-period]");
    if (pr) { bel.period = pr.dataset.belPeriod; draw(); return; }
    const t = e.target.closest("[data-bel-tab]");
    if (t) { bel.tab = t.dataset.belTab; draw(); return; }
    const k = e.target.closest("[data-bel-kind]");
    if (k) { bel.kind = k.dataset.belKind; draw(); return; }
    const g = e.target.closest("[data-bel-match]");
    if (g) { const [lg, id] = g.dataset.belMatch.split("|"); openMatch(lg, id); }
  };
  main.oninput = e => {
    if (e.target.id !== "bel-q") return;
    bel.q = e.target.value;
    const pos = e.target.selectionStart;
    draw();
    const q = $("#bel-q"); q.focus(); q.setSelectionRange(pos, pos);
  };
}

// ---------- Coefficients UEFA : classement des pays et des clubs (uefa.json, mis à jour chaque jour)
const uefa = { tab: "assoc", period: "5y", country: "all", q: "", zone: "europe" };
const UEFA_ISO = { ...IOC, ENG: "gb-eng", SCO: "gb-sct", WAL: "gb-wls", NIR: "gb-nir", LVA: "lv", LIE: "li", FRO: "fo", MLT: "mt", GIB: "gi", SMR: "sm" };
const UEFA_FR = { ENG: "Angleterre", SCO: "Écosse", WAL: "Pays de Galles", NIR: "Irlande du Nord", KOS: "Kosovo" };
const REGION_FR = new Intl.DisplayNames(["fr"], { type: "region" });
const uefaName = code => { if (UEFA_FR[code]) return UEFA_FR[code]; try { return REGION_FR.of(UEFA_ISO[code].toUpperCase()) || code; } catch { return code; } };
const uefaSeason = y => `${String(y - 1).slice(2)}-${String(y).slice(2)}`;
const fmtCoef = (v, d = 3) => v == null ? "–" : v.toLocaleString("fr-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
let UEFA_DATA = null;
const loadUefa = async () => UEFA_DATA = UEFA_DATA || await getJSON("uefa.json?v=" + new Date().toISOString().slice(0, 13), 60 * 60e3);
window.loadUefa = loadUefa;
// classement « cette saison » : on retrie sur les points de la saison en cours (ex aequo = même place)
function rankBy(list, key) {
  const s = list.map(x => ({ ...x })).sort((a, b) => key(b) - key(a));
  s.forEach((x, i) => x._p = i > 0 && key(s[i - 1]) === key(x) ? s[i - 1]._p : i + 1);
  return s;
}

async function renderUefa() {
  const main = $("#foot-main");
  main.innerHTML = `<div class="loading"><div class="spinner"></div>Chargement des coefficients UEFA…</div>`;
  let d;
  try { d = await loadUefa(); } catch { main.innerHTML = `<div class="empty">Impossible de charger les coefficients UEFA pour le moment.</div>`; return; }
  if (state.view !== "uefa") return;
  const cur = d.season;
  const years = Array.from({ length: 5 }, (_, i) => cur - 4 + i);
  const bel = d.assoc.find(a => a.code === "BEL");
  const belNow = rankBy(d.assoc, a => a.seasons[cur] || 0).find(a => a.code === "BEL")._p;
  const brugge = d.clubs.find(c => c.name === "Club Brugge");
  const belFifa = d.fifa?.teams.find(t => t.code === "BEL");
  const flag = c => flagImg(UEFA_ISO[c]);
  const trend = t => t === "UP" ? `<i class="tr up" title="en hausse">▲</i>` : t === "DOWN" ? `<i class="tr down" title="en baisse">▼</i>` : "";

  const draw = () => {
    const isNow = uefa.period === "now";
    const val = x => isNow ? x.seasons[cur] || 0 : x.total;
    const yearCols = x => isNow ? "" : years.map(y => `<td class="yr ${y === cur ? "cur" : ""}">${fmtCoef(x.seasons[y], uefa.tab === "assoc" ? 3 : x.seasons[y] % 1 ? 2 : 0)}</td>`).join("");
    const head = first => `<thead><tr><th>#</th><th class="l">${first}</th>${isNow ? "" : years.map(y => `<th class="yr ${y === cur ? "cur" : ""}">${uefaSeason(y)}</th>`).join("")}<th>${isNow ? `Points ${uefaSeason(cur)}` : "Total"}</th>${uefa.tab === "assoc" ? `<th class="clubs">Clubs</th>` : ""}</tr></thead>`;
    const bar = (v, max) => `<div class="ubar"><i style="width:${Math.max(2, v / max * 100)}%"></i></div>`;
    let body = "";
    if (uefa.tab === "assoc") {
      const list = isNow ? rankBy(d.assoc, val) : d.assoc.map(a => ({ ...a, _p: a.pos }));
      const max = val(list[0]) || 1;
      body = `<div class="table-wrap"><table class="uefa-table">${head("Pays")}
        <tbody>${list.map(a => `
          <tr class="${a.code === "BEL" ? "me" : ""} ${a._p <= 5 ? "zone-top" : ""}">
            <td class="pos">${a._p}${isNow ? "" : trend(a.trend)}</td>
            <td class="l"><div class="uc">${flag(a.code)}<b>${esc(uefaName(a.code))}</b></div>${bar(val(a), max)}</td>
            ${yearCols(a)}
            <td class="tot">${fmtCoef(val(a))}</td>
            <td class="clubs" title="clubs encore en course / clubs engagés cette saison">${a.inPlay}/${a.teams}</td>
          </tr>`).join("")}</tbody></table></div>
        <p class="hint">${isNow ? "Les 2 meilleurs pays de la saison gagnent une place de plus en Ligue des Champions la saison suivante." : "Les 5 premiers pays (en surbrillance) envoient 4 clubs directement en Ligue des Champions."} « Clubs » : clubs encore en course cette saison / clubs engagés.</p>`;
    } else {
      const q = uefa.q.trim().toLowerCase();
      const countries = [...new Set(d.clubs.map(c => c.country))].sort((a, b) => uefaName(a).localeCompare(uefaName(b), "fr"));
      let list = isNow ? rankBy(d.clubs.filter(c => c.seasons[cur] != null), val) : d.clubs.map(c => ({ ...c, _p: c.pos }));
      list = list.filter(c => (uefa.country === "all" || c.country === uefa.country) && (!q || c.name.toLowerCase().includes(q)));
      const max = Math.max(...list.map(val), 1);
      const pts = v => fmtCoef(v, v % 1 ? 2 : 0);
      body = `
      <div class="toolbar">
        <input class="search" id="uefa-q" type="search" placeholder="Club…" value="${esc(uefa.q)}">
        <select id="uefa-country" class="select" aria-label="Pays">
          <option value="all">Tous les pays</option>
          ${countries.map(c => `<option value="${c}" ${uefa.country === c ? "selected" : ""}>${esc(uefaName(c))}</option>`).join("")}
        </select>
      </div>
      ${list.length ? `<div class="table-wrap"><table class="uefa-table clubs-t">${head("Club")}
        <tbody>${list.slice(0, 200).map(c => `
          <tr class="${c.country === "BEL" ? "me" : ""}">
            <td class="pos">${c._p}${isNow ? "" : trend(c.trend)}</td>
            <td class="l"><div class="uc"><img class="ulogo" src="https://img.uefa.com/imgml/TP/teams/logos/70x70/${esc(c.id)}.png" alt="" loading="lazy"><b>${esc(c.name)}</b>${flag(c.country)}${isNow && c.comp ? `<em>${esc(c.comp.replace(/^UEFA /, ""))}</em>` : ""}</div>${bar(val(c), max)}</td>
            ${yearCols(c)}
            <td class="tot">${pts(val(c))}</td>
          </tr>`).join("")}</tbody></table></div>`
        : `<div class="empty">Aucun club ne correspond.</div>`}`;
    }
    if (uefa.tab === "nat") {
      const F = d.fifa;
      if (!F) body = `<div class="empty">Le classement FIFA n'est pas disponible pour le moment.</div>`;
      else {
        const list = F.teams.filter(t => uefa.zone === "world" || t.conf === "UEFA");
        const max = list[0]?.pts || 1, min = Math.min(...list.map(t => t.pts));
        const move = t => { const m = (t.prev || t.rank) - t.rank; return m > 0 ? `<i class="tr up">▲${m}</i>` : m < 0 ? `<i class="tr down">▼${-m}</i>` : ""; };
        const diff = t => { const v = Math.round((t.pts - t.prevPts) * 100) / 100; return v ? `<span class="${v > 0 ? "plus" : "minus"}">${v > 0 ? "+" : ""}${fmtCoef(v, 2)}</span>` : `<span class="dim">=</span>`; };
        body = `
        <div class="toolbar">
          <button class="chip ${uefa.zone === "europe" ? "on" : ""}" data-uefa-zone="europe">${flagImg("eu")} Europe</button>
          <button class="chip ${uefa.zone === "world" ? "on" : ""}" data-uefa-zone="world">🌍 Monde</button>
        </div>
        <div class="table-wrap"><table class="uefa-table nat-t">
          <thead><tr><th>#</th><th class="l">Équipe nationale</th>${uefa.zone === "europe" ? `<th>Monde</th>` : `<th>Zone</th>`}<th>Points</th><th>Évolution</th></tr></thead>
          <tbody>${list.map((t, i) => `
            <tr class="${t.code === "BEL" ? "me" : ""}">
              <td class="pos">${uefa.zone === "europe" ? i + 1 : t.rank}${move(t)}</td>
              <td class="l"><div class="uc"><img class="flag" src="https://api.fifa.com/api/v3/picture/flags-sq-2/${esc(t.code)}" alt="" loading="lazy"><b>${esc(t.name)}</b></div><div class="ubar"><i style="width:${Math.max(2, (t.pts - min * .9) / (max - min * .9) * 100)}%"></i></div></td>
              <td class="clubs">${uefa.zone === "europe" ? `${t.rank}<sup>e</sup>` : esc(t.conf)}</td>
              <td class="tot">${fmtCoef(t.pts, 2)}</td>
              <td class="clubs nat-diff">${diff(t)}</td>
            </tr>`).join("")}</tbody></table></div>
        <p class="hint">Classement mondial FIFA des équipes nationales, publié le ${new Date(F.date).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}${F.next ? ` · prochain classement le ${new Date(F.next).toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}` : ""}. Les points montent ou descendent après chaque match officiel, selon le résultat et la force de l'adversaire. « Évolution » : points gagnés ou perdus depuis le classement précédent.</p>`;
      }
    }
    const how = `
      <section class="nt-card uefa-how">
        <div class="pm-title">Les points d'un club, à chaque match européen</div>
        <ul>
          <li><b>Victoire : 2 points</b>, <b>match nul : 1 point</b> (Ligue des Champions, Europa League, Conference League).</li>
          <li>En qualifications, les points comptent à moitié, et seulement pour le pays.</li>
          <li><b>Bonus</b> : la participation à la phase de ligue, une bonne place dans cette phase et chaque tour franchi (8es, quarts, demies, finale) rapportent des points en plus. La Ligue des Champions rapporte le plus.</li>
        </ul>
        <div class="pm-title">Le coefficient d'un club</div>
        <p>La somme de ses points des 5 dernières saisons.${brugge ? ` Exemple : Club Brugge a ${fmtCoef(brugge.total, 2)} points, dont ${fmtCoef(brugge.seasons[cur] || 0, 2)} cette saison.` : ""}</p>
        <div class="pm-title">Le coefficient d'un pays</div>
        <p>Chaque saison, on additionne les points des clubs du pays (sans les bonus de participation) et on <b>divise par le nombre de clubs engagés</b>. Puis on additionne les 5 dernières saisons. Quand Bruges, l'Union ou Anderlecht gagnent, toute la Belgique monte.</p>
        <div class="pm-title">À quoi ça sert ?</div>
        <p>Le classement des pays fixe le nombre de places en coupe d'Europe de chaque championnat : les 5 premiers ont 4 places directes en Ligue des Champions. Les 2 meilleurs pays de la saison gagnent une place en plus la saison suivante. Le coefficient des clubs sert à placer les équipes dans les chapeaux des tirages au sort.</p>
      </section>`;
    const upd = new Date(d.updated).toLocaleString("fr-BE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    main.innerHTML = `
      <section class="bel-hero uefa-hero">
        <div class="uefa-star" aria-hidden="true">★</div>
        <div class="bel-hero-text">
          <div class="eyebrow">Saison ${uefaSeason(cur)} · classement officiel UEFA</div>
          <h1>Coefficients UEFA</h1>
          <p>Chaque victoire d'un club en coupe d'Europe rapporte des points à son club et à son pays. Le classement des pays décide combien de clubs chaque pays envoie en coupe d'Europe. Et pour les équipes nationales : le classement FIFA.</p>
        </div>
        <div class="bel-kpis">
          <div><b>${bel.pos}<sup>e</sup></b><span>${flagImg("be")} UEFA 5 saisons</span></div>
          <div><b>${belNow}<sup>e</sup></b><span>UEFA cette saison</span></div>
          ${belFifa ? `<div><b>${belFifa.rank}<sup>e</sup></b><span>Diables rouges · FIFA</span></div>` : `<div><b>${fmtCoef(bel.seasons[cur] || 0, 1)}</b><span>pts ${uefaSeason(cur)}</span></div>`}
        </div>
      </section>
      ${uefa.tab === "how" || uefa.tab === "nat" ? "" : `<div class="gmode bel-period" role="tablist">
        <button class="${!isNow ? "on" : ""}" data-uefa-period="5y">Sur 5 saisons</button>
        <button class="${isNow ? "on" : ""}" data-uefa-period="now">Cette saison</button>
      </div>`}
      <div class="tabs bel-tabs">
        <button class="tab ${uefa.tab === "assoc" ? "active" : ""}" data-uefa-tab="assoc">🌍 Pays</button>
        <button class="tab ${uefa.tab === "clubs" ? "active" : ""}" data-uefa-tab="clubs">🛡️ Clubs</button>
        <button class="tab ${uefa.tab === "nat" ? "active" : ""}" data-uefa-tab="nat">🏳️ Équipes nationales</button>
        <button class="tab ${uefa.tab === "how" ? "active" : ""}" data-uefa-tab="how">❓ Comment ça marche</button>
      </div>
      ${uefa.tab === "how" ? how : body}
      <p class="source">${uefa.tab === "nat" ? "Données officielles FIFA" : `Données officielles UEFA · dernière mise à jour UEFA ${esc(upd)}`}, vérifiées automatiquement chaque jour.</p>`;
  };
  draw();
  main.onclick = e => {
    const p = e.target.closest("[data-uefa-period]");
    if (p) { uefa.period = p.dataset.uefaPeriod; draw(); return; }
    const t = e.target.closest("[data-uefa-tab]");
    if (t) { uefa.tab = t.dataset.uefaTab; draw(); return; }
    const z = e.target.closest("[data-uefa-zone]");
    if (z) { uefa.zone = z.dataset.uefaZone; draw(); }
  };
  main.onchange = e => { if (e.target.id === "uefa-country") { uefa.country = e.target.value; draw(); } };
  main.oninput = e => {
    if (e.target.id !== "uefa-q") return;
    uefa.q = e.target.value;
    const pos = e.target.selectionStart;
    draw();
    const q = $("#uefa-q"); q.focus(); q.setSelectionRange(pos, pos);
  };
}

// ---------- notifications : suivre des équipes / championnats (coup d'envoi, buts, résultat)
const PUSH = (() => {
  const C = window.ARENA_CONFIG || {};
  const DEF = { leagues: [], teams: [], types: { kickoff: true, goals: true, final: true } };
  const b64 = s => { const p = "=".repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  const rpc = (fn, body) => fetch(`${C.supabaseUrl}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: C.supabaseAnonKey, Authorization: `Bearer ${C.supabaseAnonKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const api = {
    follows() { const f = store.get("arena-follows", null) || {}; return { ...DEF, ...f, types: { ...DEF.types, ...(f.types || {}) } }; },
    on() { return store.get("arena-push-on", false) && "Notification" in window && Notification.permission === "granted"; },
    supported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!C.vapidPublicKey; },
    status() {
      if (IS_IOS && !IS_STANDALONE) return "ios-install";
      if (!api.supported()) return "unsupported";
      if (Notification.permission === "denied") return "denied";
      return api.on() ? "on" : "off";
    },
    async subscription(create = false) {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(C.vapidPublicKey) });
      return sub;
    },
    async sync() {
      if (!api.on()) return;
      try {
        const sub = await api.subscription(true);
        const j = sub.toJSON();
        await rpc("arena_push_subscribe", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_follows: api.follows() });
      } catch {}
    },
    async enable() {
      const st = api.status();
      if (st === "ios-install") { toast("Sur iPhone, installe d'abord Arena sur l'écran d'accueil (bouton ⬇ en haut), puis active les notifications depuis l'appli."); openInstall(); return false; }
      if (st === "unsupported") { toast("Ce navigateur ne gère pas les notifications. Essaie avec Chrome ou Safari."); return false; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast("Notifications refusées. Tu peux les autoriser dans les réglages du navigateur pour arena.eraz.ovh."); return false; }
      store.set("arena-push-on", true);
      try { await api.subscription(true); } catch { toast("Impossible d'activer les notifications sur cet appareil."); store.set("arena-push-on", false); return false; }
      await api.sync();
      return true;
    },
    async disable() {
      try { const sub = await api.subscription(false); if (sub) { await rpc("arena_push_unsubscribe", { p_endpoint: sub.endpoint }); await sub.unsubscribe(); } } catch {}
      store.set("arena-push-on", false);
    },
    save(f) { store.set("arena-follows", f); api.sync(); },
    followsTeam: id => api.follows().teams.some(t => t.id === id),
    followsLeague: slug => api.follows().leagues.includes(slug),
    async toggleTeam(team) {
      const f = api.follows();
      if (f.teams.some(t => t.id === team.id)) { f.teams = f.teams.filter(t => t.id !== team.id); api.save(f); return false; }
      // compétitions de l'équipe cette saison (championnat + coupes), pour que le robot sache où regarder
      try {
        const s = await getJSON(`${API}/all/teams/${team.id}/schedule`, 6 * 3600e3);
        team.leagues = [...new Set([...(team.leagues || []), ...(s.events || []).map(e => e.league?.slug).filter(x => x && !/friendly/.test(x))])];
      } catch {}
      f.teams.push(team); api.save(f);
      if (!api.on()) await api.enable();
      return true;
    },
    async toggleLeague(slug) {
      const f = api.follows();
      if (f.leagues.includes(slug)) { f.leagues = f.leagues.filter(x => x !== slug); api.save(f); return false; }
      f.leagues.push(slug); api.save(f);
      if (!api.on()) await api.enable();
      return true;
    },
  };
  return api;
})();
window.PUSH = PUSH;

function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 5200);
}
const bellBtn = (on, attrs, label = "") => `<button class="follow-btn ${on ? "on" : ""}" ${attrs}>${on ? "🔔 Suivi" : "🔔 Suivre"}${label}</button>`;

// boutons « Suivre » (championnat dans l'en-tête, équipes dans la fiche match)
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-follow-league], [data-follow-team]");
  if (!b) return;
  e.stopPropagation();
  b.disabled = true;
  let on;
  if (b.dataset.followLeague) on = await PUSH.toggleLeague(b.dataset.followLeague);
  else on = await PUSH.toggleTeam({ id: b.dataset.followTeam, name: b.dataset.name, logo: b.dataset.logo, leagues: b.dataset.leagues ? b.dataset.leagues.split(",") : [] });
  document.querySelectorAll(b.dataset.followLeague ? `[data-follow-league="${b.dataset.followLeague}"]` : `[data-follow-team="${b.dataset.followTeam}"]`)
    .forEach(x => { x.classList.toggle("on", on); x.textContent = on ? "🔔 Suivi" : "🔔 Suivre"; });
  b.disabled = false;
  if (on) toast(PUSH.on() ? `Tu recevras les buts et résultats de ${b.dataset.name || "ce championnat"}.` : "Suivi enregistré. Active les notifications pour être prévenu.");
  if (state.view === "notifs") renderNotifs();
}, true);

// page « Mes notifications »
function renderNotifs() {
  const main = $("#foot-main");
  const f = PUSH.follows(), st = PUSH.status();
  const statusCard = {
    "on": `<div class="nt-status on"><b>🔔 Notifications activées</b><span>Tu reçois les alertes des équipes et championnats que tu suis.</span><div class="nt-actions"><button class="ghost" data-nt="test">Envoyer une notification de test</button><button class="ghost" data-nt="off">Désactiver</button></div></div>`,
    "off": `<div class="nt-status"><b>Notifications désactivées</b><span>Active-les pour être prévenu des coups d'envoi, des buts et des résultats.</span><div class="nt-actions"><button class="cta" data-nt="on">Activer les notifications</button></div></div>`,
    "denied": `<div class="nt-status warn"><b>Notifications bloquées</b><span>Tu les as refusées pour ce site. Autorise-les dans les réglages de ton navigateur (Paramètres du site → Notifications → arena.eraz.ovh), puis reviens ici.</span></div>`,
    "ios-install": `<div class="nt-status warn"><b>Sur iPhone : installe d'abord l'appli</b><span>Apple n'autorise les notifications que pour les sites ajoutés à l'écran d'accueil. Installe Arena 360, ouvre-le depuis l'icône, puis reviens sur cette page.</span><div class="nt-actions"><button class="cta" data-nt="install">Installer Arena 360</button></div></div>`,
    "unsupported": `<div class="nt-status warn"><b>Non disponible ici</b><span>Ce navigateur ne gère pas les notifications. Essaie avec Chrome (Android, ordinateur) ou avec l'appli installée sur iPhone.</span></div>`,
  }[st];
  const types = [["kickoff", "Coup d'envoi"], ["goals", "Buts (avec le buteur)"], ["final", "Résultat final"]];
  const lname = slug => { const l = BY_SLUG[slug]; return l ? `${l.c} · ${l.n}` : slug; };
  main.innerHTML = `
    <div class="page-head"><div><h1>Mes notifications</h1><div class="sub">Buts, coups d'envoi et résultats des équipes et championnats que tu suis</div></div></div>
    ${statusCard}
    <section class="nt-card">
      <div class="pm-title">Me prévenir pour…</div>
      ${types.map(([k, n]) => `<label class="nt-toggle"><input type="checkbox" id="nt-${k}" data-nt-type="${k}" ${f.types[k] ? "checked" : ""}><span>${n}</span></label>`).join("")}
    </section>
    <section class="nt-card">
      <div class="pm-title">Équipes suivies · ${f.teams.length}</div>
      ${f.teams.length ? f.teams.map(t => `<div class="nt-item">${t.logo ? `<img src="${esc(t.logo)}" alt="">` : ""}<b>${esc(t.name || t.id)}</b>${bellBtn(true, `data-follow-team="${esc(t.id)}" data-name="${esc(t.name || "")}"`)}</div>`).join("")
        : `<p class="muted">Ouvre la fiche d'un match et appuie sur <b>🔔 Suivre</b> sous une équipe.</p>`}
    </section>
    <section class="nt-card">
      <div class="pm-title">Championnats et coupes suivis · ${f.leagues.length}</div>
      ${f.leagues.length ? f.leagues.map(s => `<div class="nt-item"><b>${esc(lname(s))}</b>${bellBtn(true, `data-follow-league="${esc(s)}" data-name="${esc(lname(s))}"`)}</div>`).join("")
        : `<p class="muted">Ouvre un championnat (Jupiler Pro League, Ligue des Champions…) et appuie sur <b>🔔 Suivre</b> en haut.</p>`}
    </section>
    <p class="source">Les alertes arrivent en général moins de 2 minutes après le but. Arena ne garde aucune donnée personnelle : seulement l'adresse technique de ton appareil et ce que tu suis.</p>`;
  main.onclick = async e => {
    const a = e.target.closest("[data-nt]");
    if (!a) return;
    if (a.dataset.nt === "on") { await PUSH.enable(); renderNotifs(); }
    if (a.dataset.nt === "off") { await PUSH.disable(); renderNotifs(); }
    if (a.dataset.nt === "install") openInstall();
    if (a.dataset.nt === "test") {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification("⚽ BUT ! Club Brugge 1-0 Anderlecht", { body: "Exemple de notification Arena 360 · 23'", icon: "icons/icon-192.png", badge: "icons/favicon-48.png", tag: "test" });
    }
  };
  main.oninput = e => {
    const k = e.target.dataset?.ntType;
    if (!k) return;
    const f2 = PUSH.follows(); f2.types[k] = e.target.checked; PUSH.save(f2);
  };
}

// lien d'une notification : arena.eraz.ovh/#m-<compétition>-<match> → ouvre la fiche du match
function openFromHash() {
  const m = location.hash.match(/^#m-([a-z0-9._]+)-(\d+)$/i);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  setTimeout(() => openMatch(m[1], m[2]), 300);
}
window.addEventListener("hashchange", openFromHash);
navigator.serviceWorker?.addEventListener("message", e => { if (e.data?.type === "open" && e.data.url) { location.hash = new URL(e.data.url).hash; } });

// ---------- bouton « Admin » : visible seulement si ce téléphone est connecté avec un compte admin
// (vérifié à l'ouverture, après une connexion dans « Je parie », et à chaque retour sur l'appli)
async function checkAdmin() {
  const C = window.ARENA_CONFIG || {};
  if (!C.supabaseUrl) return;
  let stored = null;
  try { stored = localStorage.getItem(`sb-${new URL(C.supabaseUrl).hostname.split(".")[0]}-auth-token`); } catch {}
  if (!stored) { $("#admin-btn").hidden = true; return; }   // personne n'est connecté sur cet appareil
  try {
    // c'est la bibliothèque Supabase (la même que le jeu) qui garde et renouvelle la connexion :
    // un seul gestionnaire, donc aucun risque de déconnexion par jetons en double
    if (typeof Online === "undefined") await new Promise(r => window.addEventListener("load", r, { once: true }));
    await Online.init();
    const { data: { session } } = await Online.sb.auth.getSession();
    if (!session) { $("#admin-btn").hidden = true; return; }
    const { data, error } = await Online.sb.rpc("arena_is_admin");
    if (!error) $("#admin-btn").hidden = data !== true;   // en cas de souci réseau, on ne cache rien
  } catch {}
}
window.checkAdmin = checkAdmin;
checkAdmin();
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkAdmin(); });

// ================================================================= init
renderSidebar();
const savedView = store.get("view", "today");
if (savedView !== "today" && (BY_SLUG[savedView] || savedView === "belges" || savedView === "uefa" || savedView === "notifs")) state.view = savedView;
renderSidebar();
renderFoot();
if (["velo", "jeu"].includes(store.get("sport", "foot"))) setSport(store.get("sport"));
else arenaTrack(footSection(state.view));
openFromHash();
PUSH.sync();
