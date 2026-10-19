/* Championnats européens absents d'ESPN, lus sur Wikipédia (en) : classement actuel et classement à une date passée
   (grâce à l'historique des versions de la page). Utilisé par le jeu « Je parie » Football. */
(function (root) {
  "use strict";

  // {S} = saison à cheval (2026–27), {Y} = saison sur une année civile (2027)
  const WIKI_LEAGUES = [
    { s: "w:pol", n: "Ekstraklasa", c: "Pologne", f: "pl", t: "{S} Ekstraklasa" },
    { s: "w:ukr", n: "Premier League", c: "Ukraine", f: "ua", t: "{S} Ukrainian Premier League" },
    { s: "w:cro", n: "HNL", c: "Croatie", f: "hr", t: "{S} Croatian Football League" },
    { s: "w:srb", n: "SuperLiga", c: "Serbie", f: "rs", t: "{S} Serbian SuperLiga" },
    { s: "w:hun", n: "NB I", c: "Hongrie", f: "hu", t: "{S} Nemzeti Bajnokság I" },
    { s: "w:svk", n: "Niké liga", c: "Slovaquie", f: "sk", t: "{S} Slovak First Football League" },
    { s: "w:svn", n: "PrvaLiga", c: "Slovénie", f: "si", t: "{S} Slovenian PrvaLiga" },
    { s: "w:bul", n: "First League", c: "Bulgarie", f: "bg", t: "{S} First Professional Football League (Bulgaria)" },
    { s: "w:bih", n: "Premijer Liga", c: "Bosnie-Herzégovine", f: "ba", t: "{S} Premier League of Bosnia and Herzegovina" },
    { s: "w:mkd", n: "Prva Liga", c: "Macédoine du Nord", f: "mk", t: "{S} Macedonian First Football League" },
    { s: "w:alb", n: "Kategoria Superiore", c: "Albanie", f: "al", t: "{S} Kategoria Superiore" },
    { s: "w:kos", n: "Superliga", c: "Kosovo", f: "xk", t: "{S} Football Superleague of Kosovo" },
    { s: "w:arm", n: "Premier League", c: "Arménie", f: "am", t: "{S} Armenian Premier League" },
    { s: "w:aze", n: "Premier League", c: "Azerbaïdjan", f: "az", t: "{S} Azerbaijan Premier League" },
    { s: "w:mda", n: "Liga", c: "Moldavie", f: "md", t: "{S} Moldovan Liga" },
    { s: "w:lux", n: "BGL Ligue", c: "Luxembourg", f: "lu", t: "{S} Luxembourg National Division" },
    { s: "w:gib", n: "Football League", c: "Gibraltar", f: "gi", t: "{S} Gibraltar Football League" },
    { s: "w:geo", n: "Erovnuli Liga", c: "Géorgie", f: "ge", t: "{Y} Erovnuli Liga" },
    { s: "w:kaz", n: "Premier League", c: "Kazakhstan", f: "kz", t: "{Y} Kazakhstan Premier League" },
    { s: "w:blr", n: "Premier League", c: "Biélorussie", f: "by", t: "{Y} Belarusian Premier League" },
    { s: "w:ltu", n: "Toplyga", c: "Lituanie", f: "lt", t: "{Y} Toplyga" },
    { s: "w:lva", n: "Virslīga", c: "Lettonie", f: "lv", t: "{Y} Latvian Higher League" },
    { s: "w:est", n: "Meistriliiga", c: "Estonie", f: "ee", t: "{Y} Meistriliiga" },
    { s: "w:isl", n: "Besta deild", c: "Islande", f: "is", t: "{Y} Besta deild karla" },
  ];

  const API = "https://en.wikipedia.org/w/api.php?format=json&formatversion=2&origin=*&redirects=1";
  const season = a => `${a}–${String((a + 1) % 100).padStart(2, "0")}`;
  function titlesFor(l, date = new Date()) {
    const y = date.getFullYear();
    if (l.t.includes("{Y}")) return [l.t.replace("{Y}", y), l.t.replace("{Y}", y - 1)];
    const start = date.getMonth() >= 6 ? y : y - 1;
    return [l.t.replace("{S}", season(start)), l.t.replace("{S}", season(start - 1))];
  }

  const linkText = s => String(s || "").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/'''?|<[^>]+>|\{\{[^}]*\}\}/g, "").trim();

  /* lit le premier module « Sports table » de la page (classement du championnat) */
  function parseTable(w) {
    const i = w.search(/\{\{\s*#invoke:\s*Sports table/i);
    if (i < 0) return null;
    // fin du modèle : accolades équilibrées
    let depth = 0, j = i;
    for (; j < w.length - 1; j++) {
      if (w[j] === "{" && w[j + 1] === "{") { depth++; j++; }
      else if (w[j] === "}" && w[j + 1] === "}") { depth--; j++; if (!depth) break; }
    }
    const body = w.slice(i + 2, j - 1).replace(/<!--[\s\S]*?-->/g, "");
    // découpe sur les | de premier niveau (pas ceux des liens [[a|b]] ni des modèles {{…}})
    const parts = []; let cur = "", b = 0, s = 0;
    for (let k = 0; k < body.length; k++) {
      const c = body[k], n = body[k + 1];
      if (c === "{" && n === "{") { b++; cur += "{{"; k++; continue; }
      if (c === "}" && n === "}") { b--; cur += "}}"; k++; continue; }
      if (c === "[" && n === "[") { s++; cur += "[["; k++; continue; }
      if (c === "]" && n === "]") { s--; cur += "]]"; k++; continue; }
      if (c === "|" && !b && !s) { parts.push(cur); cur = ""; continue; }
      cur += c;
    }
    parts.push(cur);
    const p = {};
    for (const part of parts) { const m = part.match(/^\s*([^=]+?)\s*=([\s\S]*)$/); if (m) p[m[1].trim()] = m[2].trim(); }
    const order = (p.team_order || "").split(",").map(x => x.trim()).filter(Boolean);
    const codes = order.length ? order : Object.keys(p).filter(k => k.startsWith("win_")).map(k => k.slice(4));
    const teams = codes.map(code => {
      const n = k => +(p[`${k}_${code}`] || 0);
      const w_ = n("win"), d = n("draw"), l = n("loss");
      return { code, name: linkText(p[`name_${code}`] || code), w: w_, d, l, gf: n("gf"), ga: n("ga"), gp: w_ + d + l,
        pts: 3 * w_ + d + n("adjust_points") };
    }).filter(t => t.name);
    teams.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    teams.forEach((t, k) => { t.rank = k + 1; });
    return teams.length ? teams : null;
  }

  const mem = new Map();
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  /* classement actuel (cache 30 min) */
  async function current(l) {
    const key = "wl-now-" + l.s;
    const hit = mem.get(key) || lsGet(key);
    if (hit && Date.now() - hit.at < 30 * 60e3) return hit.v;
    for (const t of titlesFor(l)) {
      try {
        const d = await fetch(`${API}&action=parse&prop=wikitext&page=${encodeURIComponent(t)}`).then(r => r.json());
        const teams = d.parse?.wikitext && parseTable(d.parse.wikitext);
        if (teams) { const v = { title: d.parse.title, teams }; const e = { at: Date.now(), v }; mem.set(key, e); lsSet(key, e); return v; }
      } catch {}
    }
    return hit?.v || null;
  }

  /* classement tel qu'il était à une date passée (version de la page à cette date ; gardé pour toujours) */
  async function at(l, date) {
    if (date > new Date()) return current(l);
    const day = date.toISOString().slice(0, 10);
    const key = `wl-at-${l.s}-${day}`;
    const hit = mem.get(key) || lsGet(key);
    if (hit) return hit;
    for (const t of titlesFor(l, date)) {
      try {
        const u = `${API}&action=query&prop=revisions&rvprop=content&rvslots=main&rvlimit=1&rvdir=older&rvstart=${encodeURIComponent(date.toISOString())}&titles=${encodeURIComponent(t)}`;
        const d = await fetch(u).then(r => r.json());
        const pg = d.query?.pages?.[0];
        if (!pg || pg.missing) continue;
        const rev = pg.revisions?.[0];
        if (!rev) { const v = { title: pg.title, teams: [] }; mem.set(key, v); lsSet(key, v); return v; }   // la page n'existait pas encore : saison pas commencée
        const teams = parseTable(rev.slots?.main?.content || rev.content || "") || [];
        const v = { title: pg.title, teams };
        mem.set(key, v); lsSet(key, v);
        return v;
      } catch {}
    }
    return null;
  }

  const api = { WIKI_LEAGUES, current, at, parseTable, titlesFor };
  root.WikiLeagues = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
