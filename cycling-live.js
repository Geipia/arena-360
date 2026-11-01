/* Lecture en direct des résultats cyclistes d'une saison sur Wikipédia (en).
   Produit la même forme de données que cycling-data.js : { season, worldtour, proseries, europetour, championships }.
   Fonctionne dans le navigateur (window.CyclingLive) et sous Node (module.exports) pour les tests. */
(function (root) {
  "use strict";

  const NAT = { NLD: "NED", SVN: "SLO", DEU: "GER", CHE: "SUI", DNK: "DEN", PRT: "POR", SWI: "SUI" };
  const nat = c => c ? (NAT[c.toUpperCase()] || c.toUpperCase()) : null;

  const linkText = s => String(s).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1");
  function clean(s) {
    s = String(s || "")
      .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>|<!--[\s\S]*?-->/g, "")
      .replace(/\[\[File:[^\]]*\]\]/g, "")
      .replace(/\{\{convert\|([\d.]+)\|km[^}]*\}\}/g, "$1 km");
    let prev;
    do { prev = s; s = s.replace(/\{\{[^{}]*\}\}/g, ""); } while (s !== prev);
    s = linkText(s).replace(/<[^>]+>|'''?/g, "");
    s = s.replace(/^\s*(?:[a-z\-]+="[^"]*"\s*)+\|/, "");
    return s.replace(/\s+/g, " ").trim();
  }
  const stripAttr = c => String(c).replace(/^\s*(?:[\w-]+\s*=\s*"[^"]*"\s*;?\s*)+\|/, "");
  const cleanCell = c => String(c).trim().replace(/^\s*(?:[a-z]+="[^"]*"\s*)+\|/, "").trim();

  function athlete(c) {
    let m = String(c).match(/\{\{\s*flag ?(?:athlete|medalist)\s*\|\s*\[\[([^\]]+)\]\]\s*\|\s*([A-Za-z]{3})/i);
    if (m) return { name: m[1].split("|").pop().trim(), nat: nat(m[2]) };
    m = String(c).match(/\{\{\s*flagicon\s*\|\s*([A-Za-z]{3})[^}]*\}\}\s*\[\[([^\]]+)\]\]/i);
    if (m) return { name: m[2].split("|").pop().trim(), nat: nat(m[1]) };
    return null;
  }
  const teamCode = c => { const m = String(c).match(/\{\{\s*UCI team code\s*\|\s*([^|}]+)/); return m ? m[1].replace(/ (wo)?men$/, "").trim() : null; };

  // ---------------------------------------------------------------- calendriers (World Tour, ProSeries, Europe Tour)
  function parseCalendar(w, level, { rating = false, podium = false, year } = {}) {
    const races = [];
    for (const row of w.split(/\n\|-/)) {
      if (!row.includes('scope="row"')) continue;
      const lines = row.trim().split("\n").filter(l => l.trim());
      const head = lines[0];
      const cflag = head.match(/flagicon\|([A-Za-z]{3})/i);
      const after = head.split('scope="row"')[1] || "";
      let name = (() => { const ls = [...after.matchAll(/\[\[([^\]]+)\]\]/g)]; return ls.length ? ls[ls.length - 1][1].split("|").pop().trim() : clean(after); })();
      name = name.replace(/^\s*\|\s*/, "").replace(new RegExp("^" + year + " "), "");
      const flat = [];
      lines.slice(1).filter(l => l.startsWith("|")).forEach(l => cleanCell(l.slice(1)).split("||").forEach(x => flat.push(x.trim())));
      let i = 0, rt = null;
      if (rating) { rt = (flat[0] || "").trim(); i = 1; }
      const date = (flat[i] || "").replace(/<[^>]+>|\{\{[^}]*\}\}/g, "").trim();
      const rest = flat.slice(i + 1);
      const joined = rest.join(" ");
      const r = { race: name, country: cflag ? nat(cflag[1]) : null, date, level };
      const pg = head.match(new RegExp("\\[\\[(" + year + " [^\\]|]+)"));
      if (pg) r.page = pg[1].trim();
      if (rt) r.rating = rt;
      const aths = rest.map(athlete).filter(Boolean);
      if (/cancelled/i.test(joined) && !aths.length) r.status = "Annulée";
      else if (aths.length) {
        r.winner = aths[0];
        if (podium && aths.length >= 3) { r.second = aths[1]; r.third = aths[2]; }
        const t = rest.map(teamCode).find(Boolean);
        if (t) r.team = t;
      } else {
        const t = teamCode(joined);
        if (t) r.winner = { name: "Équipe " + t, nat: null };
      }
      races.push(r);
    }
    return races;
  }

  // ---------------------------------------------------------------- championnats (podiums élite)
  function parseMedals(w, champ) {
    const out = [];
    const i = w.indexOf("edal summary");
    if (i < 0) return out;
    const j = w.indexOf("Under-23", i);
    let cat = null;
    for (const row of w.slice(i, j > 0 ? j : undefined).split(/\n\|-/)) {
      const h = row.match(/'''(.+?) (?:Elite )?Events'''/);
      if (h) { cat = { "Men's": "Hommes", "Women's": "Femmes" }[h[1].trim()] || h[1]; continue; }
      const ev = row.match(/(road race|time trial)/i);
      const meds = [...row.matchAll(/\{\{\s*Flag medalist\s*\|\s*\[\[([^\]]+)\]\]\s*\|\s*([A-Z]{3})/gi)];
      if (ev && meds.length >= 3 && cat) {
        out.push({ champ, event: /road/i.test(ev[1]) ? "Course en ligne" : "Contre-la-montre", cat,
          podium: meds.slice(0, 3).map(m => ({ name: m[1].split("|").pop(), nat: nat(m[2]) })) });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- étapes + maillots d'une course à étapes
  function cellsOf(row) {
    const out = [];
    for (let line of row.split("\n")) {
      line = line.trimEnd();
      if (!line || !"|!".includes(line[0]) || line.startsWith("|}") || line.startsWith("|+")) continue;
      line.slice(1).split(line[0] === "!" ? "!!" : "||").forEach(c => out.push(c.trim()));
    }
    return out;
  }
  function stageTable(w) {
    for (const m of w.matchAll(/\{\|[^\n]*wikitable[\s\S]*?\n\|\}/g)) {
      const tb = m[0];
      if (!/!\s*(?:scope="col"\s*\|)?\s*Stage/.test(tb) || !tb.includes("Winner")) continue;
      if (!/Date|Course|Route/.test(tb.slice(0, 2000))) continue;
      const stages = [];
      for (const r of tb.split(/\n\|-[^\n]*/).slice(1)) {
        const cs = cellsOf(r);
        if (!cs.length) continue;
        let st = clean(cs[0].includes("[[") ? linkText(cs[0]).split("|").pop() : cs[0].split("|").pop());
        st = st.replace(/^scope="row"\s*/, "").trim();
        if (!/^(P|Prologue|\d{1,2}[ab]?)$/i.test(st)) continue;
        const texts = cs.slice(1).map(clean);
        const date = texts.find(x => /^\d{1,2}\s+[A-Z][a-z]+/.test(x)) || "";
        const kmCell = cs.map(clean).find(x => /[\d.]+ km/.test(x));
        const km = kmCell ? kmCell.match(/([\d.]+) km/)[1] : "";
        const type = cs.find(c => !c.includes("File:") && /stage|time trial|prologue/i.test(clean(c)) && clean(c).length < 40);
        let win = null;
        for (const c of [...cs].reverse()) { win = athlete(c); if (win) break; const t = teamCode(c); if (t) { win = { name: t, nat: null, team: true }; break; } }
        let course = texts.find(x => / to /.test(x)) || "";
        if (!course) { const di = texts.indexOf(date); if (di >= 0 && texts[di + 1] && !/km$/.test(texts[di + 1])) course = texts[di + 1]; }
        stages.push({ n: /^p/i.test(st) ? "P" : st, date, course, km, type: type ? clean(type) : "", winner: win });
      }
      if (stages.length >= 2) return stages;
    }
    return null;
  }
  const CLS_FR = [[/general/i, "Général"], [/point/i, "Points"], [/mountain|climb|kom/i, "Montagne"], [/young/i, "Jeune"],
    [/team/i, "Équipes"], [/combativ|active|aggress|breakaway/i, "Combativité"], [/sprint/i, "Sprints"]];
  const clsFr = c => { for (const [a, b] of CLS_FR) if (a.test(c)) return b; return c.replace(/\(\)$/, "").trim(); };
  function leadership(w) {
    const k = w.indexOf("eadership");
    if (k < 0) return { stages: null, jerseys: null };
    const m = w.slice(k).match(/\{\|[^\n]*\n(?:\|\+[^\n]*\n)?[\s\S]*?\n\|\}/);
    if (!m) return { stages: null, jerseys: null };
    const parts = m[0].split(/\n\|-[^\n]*/);
    const headers = [];
    parts.slice(0, 2).forEach(p => p.split("\n").forEach(line => { if (line.startsWith("!")) line.slice(1).split("!!").forEach(c => headers.push(clean(stripAttr(c)))); }));
    const stages = []; let fin = null;
    for (const p of parts.slice(1)) {
      const lines = p.split("\n").filter(l => l.trim());
      if (!lines.length) continue;
      const h = lines[0].startsWith("!") ? clean(lines[0].slice(1).split("|").pop()) : "";
      if (/^(P|\d{1,2}[ab]?)$/.test(h)) {
        let win = null;
        if (lines[1]) { const c = stripAttr(lines[1].slice(1)); win = athlete(c) || (clean(c) ? { name: clean(c), nat: null } : null); }
        stages.push({ n: h, winner: win });
      } else if (/Final/.test(lines[0])) {
        fin = lines.slice(1).map(l => {
          const c = stripAttr(l.slice(1));
          const fc = c.match(/\{\{\s*font ?colou?r\|[^|]*\|([^|}]+)/);
          const tm = teamCode(c);
          return fc ? fc[1].trim() : tm ? "team:" + tm : clean(c);
        });
      }
    }
    let jerseys = null;
    if (fin) {
      const hs = headers.filter(x => x && !/^(Stage|Winner)$/i.test(x));
      jerseys = fin.map((v, i) => i < hs.length && v ? { cls: clsFr(hs[i]), name: v } : null).filter(Boolean);
      const cls = jerseys.map(j => j.cls);
      if (hs.some(x => /^stage/i.test(x)) || new Set(cls).size !== cls.length) jerseys = null;
      else jerseys = jerseys.filter(j => !/^(\}|not awarded|no winner|none|no award|\{\{.*|)$/i.test(j.name.trim()));
    }
    return { stages: stages.length ? stages : null, jerseys: jerseys && jerseys.length ? jerseys : null };
  }
  function parseStageRace(w) {
    let st = stageTable(w);
    const ld = leadership(w);
    if (!st && ld.stages) st = ld.stages.map(x => ({ n: x.n, date: "", course: "", km: "", type: "", winner: x.winner }));
    else if (st && ld.stages) {
      const by = Object.fromEntries(ld.stages.map(x => [x.n, x.winner]));
      st.forEach(s => { if (!s.winner && by[s.n]) s.winner = by[s.n]; });
    }
    return { stages: st, jerseys: ld.jerseys };
  }

  const isStageRace = r => /\d\s*[–-]\s*\d|[a-z]\s*[–-]\s*\d/.test(r.date || "");

  // ---------------------------------------------------------------- chargement d'une saison complète
  const API = "https://en.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&redirects=1&prop=wikitext&origin=*&page=";
  async function loadSeason(year, opts = {}) {
    const fetchText = opts.fetchText || (async title => {
      const r = await fetch(API + encodeURIComponent(title));
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      return d.parse ? d.parse.wikitext : null;
    });
    const progress = opts.onProgress || (() => {});
    const get = async t => { try { return await fetchText(t); } catch { return null; } };
    const [wt, ps, et, worlds, euro] = await Promise.all([
      get(`${year} UCI World Tour`), get(`${year} UCI ProSeries`), get(`${year} UCI Europe Tour`),
      get(`${year} UCI Road World Championships`), get(`${year} European Road Championships`),
    ]);
    const D = {
      season: year,
      worldtour: wt ? parseCalendar(wt, "WorldTour", { podium: true, year }) : [],
      proseries: ps ? parseCalendar(ps, "ProSeries", { year }) : [],
      europetour: et ? parseCalendar(et, "Europe Tour", { rating: true, year }) : [],
      championships: [...(worlds ? parseMedals(worlds, "Mondiaux") : []), ...(euro ? parseMedals(euro, "Championnats d'Europe") : [])],
      loadedAt: new Date().toISOString(),
    };
    // étapes : courses à étapes World Tour et ProSeries déjà commencées (avec un vainqueur ou en cours)
    const todo = [...D.worldtour, ...D.proseries].filter(r => isStageRace(r) && r.status !== "Annulée" && (r.page || r.race));
    let done = 0;
    const conc = opts.concurrency || 4;
    let idx = 0;
    await Promise.all(Array.from({ length: conc }, async () => {
      while (idx < todo.length) {
        const r = todo[idx++];
        if (opts.skipStage && opts.skipStage(r)) { done++; continue; }
        const w = (r.page && await get(r.page)) || await get(`${year} ${r.race}`);
        if (w) {
          const s = parseStageRace(w);
          if (s.stages) r.stages = s.stages;
          if (s.jerseys) r.jerseys = s.jerseys;
        }
        progress(++done, todo.length);
      }
    }));
    return D;
  }


  // ---------------------------------------------------------------- côtes d'une étape (lues dans le texte de Wikipédia)
  // Les grands tours ont des pages « Stage 1 to Stage 11 » ; les autres courses décrivent parfois leurs étapes sur leur propre page.
  const CLIMB_WORDS = "Côte|Cote|Col|Colle|Cima|Passo|Alto|Puerto|Mont|Montée|Monte|Port|Puy|Plateau|Mur|Muur|Collado|Coll|Sella|Croix|Pic|Pico|Cuitu|Lacets|Hautacam|Tourmalet|Angliru|Oude Kwaremont|Kwaremont|Paterberg|Koppenberg|Kemmelberg|Mortirolo|Stelvio|Zoncolan|Galibier|Ventoux|Alpe|Superbagnères|Peyragudes|Hourquette|Tre Cime|Blockhaus|Etna|Gavia|Finestre|Madeleine|Glandon|Izoard|Joux Plane|Cauberg|Mur de Huy|Redoute|Poggio|Cipressa|Wall|Berg";
  const SOLO = /^(Hautacam|Tourmalet|Angliru|Kwaremont|Paterberg|Koppenberg|Kemmelberg|Mortirolo|Stelvio|Zoncolan|Galibier|Ventoux|Peyragudes|Superbagnères|Blockhaus|Etna|Gavia|Finestre|Madeleine|Izoard|Glandon|Cauberg|Redoute|Poggio|Cipressa)$/;
  const CATS = { "hors catégorie": "HC", "hors-catégorie": "HC", first: "1", second: "2", third: "3", fourth: "4", "1st": "1", "2nd": "2", "3rd": "3", "4th": "4" };
  const CONNECT = "(?:\\s(?:de|du|des|de la|di|del|della|van|à|en|la|le|des|de l'|d'))*\\s?(?:d'|l')?";
  const CLIMB_RE = new RegExp(`((?:hors[ -]catégorie|first|second|third|fourth|1st|2nd|3rd|4th)[- ]category\\s+(?:climbs?\\s+(?:of|to|up)\\s+(?:the\\s+)?)?)?\\b((?:${CLIMB_WORDS})(?:${CONNECT}[A-ZÀ-Ž][\\wÀ-ž'’.-]*){0,4})(\\s*\\(([^)]*?(?:km|%|metres|m\\b)[^)]*)\\))?`, "g");

  function stageSection(w, n) {
    const head = n === "P" ? /^==+\s*Prologue[^=\n]*==+\s*$/m : new RegExp(`^==+\\s*Stage\\s+${n}\\b[^=\\n]*==+\\s*$`, "m");
    const m = String(w || "").match(head);
    if (!m) return null;
    const rest = w.slice(m.index + m[0].length);
    const end = rest.search(/^==[^=]/m);
    return end > 0 ? rest.slice(0, end) : rest;
  }
  function frInfo(s) {
    return s.replace(/,?\s*with (?:the|its) summit at (?:an elevation|an altitude) of\s*/i, " · sommet à ")
      .replace(/at an average (?:gradient )?of|averaging|with an average gradient of|average gradient of/gi, "à").replace(/\bmetres\b/g, "m")
      .replace(/(\d)\.(\d)/g, "$1,$2").replace(/\s+/g, " ").replace(/\s*· sommet à\s*$/, "").trim();
  }
  function stageClimbs(texts, n) {
    const sec = texts.map(t => stageSection(t, n)).find(Boolean);
    if (!sec) return null;
    const t = clean(sec.split(/\n\{\|/)[0].replace(/\{\{convert\|([\d.,]+)\|(m|km)\b[^}]*\}\}/g, "$1 $2")).replace(/&nbsp;/g, " ");
    const out = new Map();
    let m;
    CLIMB_RE.lastIndex = 0;
    while ((m = CLIMB_RE.exec(t))) {
      let name = m[2].replace(/[’']s$/, "").replace(/\s+(?:in|on|at|and|the|with|before|after)$/, "").trim();
      const words = name.split(/\s+/);
      if (words.length < 2 && !SOLO.test(name)) continue;
      if (/^(Mont|Monte|Port|Pla|Alpe|Croix|Wall|Berg)$/.test(name) || /^(Col|Côte|Mur|Alto|Puerto)\s+(?:de|du|des)$/.test(name)) continue;
      const before = t.slice(Math.max(0, m.index - 60), m.index).toLowerCase();
      const cm = (m[1] || "").toLowerCase().match(/hors[ -]catégorie|first|second|third|fourth|1st|2nd|3rd|4th/)
        || before.match(/(hors[ -]catégorie|first|second|third|fourth)[- ]category(?:[^.]{0,25})$/);
      const o = out.get(name) || { name, cat: null, info: null, n: 1 };
      if (!o.cat && cm) o.cat = CATS[(cm[1] || cm[0]).replace(/-/g, " ").replace("hors catégorie", "hors catégorie")] || CATS[cm[1] || cm[0]] || null;
      if (!o.info && m[4]) o.info = frInfo(m[4]);
      out.set(name, o);
    }
    // nombre d'ascensions annoncé (« three ascents of the Côte… »)
    const count = { two: 2, three: 3, four: 4, five: 5, twice: 2 };
    out.forEach(o => { const r = t.match(new RegExp(`(two|three|four|five) (?:ascents|climbs|times)[^.]{0,30}${o.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")); if (r) o.n = Math.max(o.n, count[r[1].toLowerCase()]); });
    const summit = /summit finish|mountain-top finish|uphill finish|finish(?:ed|ing)? (?:was )?(?:located )?(?:at|on) (?:the )?(?:top|summit)|ended (?:at|on) the (?:top|summit)/i.test(t);
    return { climbs: [...out.values()], summit, described: t.trim().length > 200 };
  }
  // pages de la course : la page principale + les pages « Stage X to Stage Y » qu'elle cite
  function stagePages(w) {
    return [...new Set((String(w || "").match(/\[\[(\d{4} [^\]|#]+, Stage \d+ to Stage \d+)/g) || []).map(x => x.slice(2)))];
  }

  const api = { loadSeason, parseCalendar, parseMedals, parseStageRace, isStageRace, clean, stageClimbs, stagePages };
  root.CyclingLive = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
