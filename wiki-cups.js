/* Lecture des coupes nationales absentes d'ESPN depuis les pages Wikipédia (en), mises à jour par la communauté.
   Comprend les formats « Football box », « OneLegResult » et les tableaux « équipe || score || équipe ». */
(function (root) {
  "use strict";

  const SKIP = /^(references|notes|external links|see also|calendar|format|schedule|bracket|top ?scorers?|top goalscorers|statistics|teams|participating (clubs|teams)|prize money|broadcasting|sponsorship|qualified teams|round dates|draw)$/i;
  const MONTHS = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };

  // extrait un modèle {{...}} équilibré à partir de l'index i (qui pointe sur "{{")
  function balanced(w, i) {
    let depth = 0;
    for (let j = i; j < w.length - 1; j++) {
      if (w[j] === "{" && w[j + 1] === "{") { depth++; j++; }
      else if (w[j] === "}" && w[j + 1] === "}") { depth--; j++; if (!depth) return w.slice(i, j + 1); }
    }
    return w.slice(i);
  }
  // découpe les paramètres d'un modèle au niveau 0 (ignore les | dans [[...]] et {{...}})
  function params(tpl) {
    const body = tpl.slice(2, -2);
    const out = []; let cur = "", b = 0, s = 0;
    for (let i = 0; i < body.length; i++) {
      const c = body[i], n = body[i + 1];
      if (c === "{" && n === "{") { b++; cur += "{{"; i++; continue; }
      if (c === "}" && n === "}") { b--; cur += "}}"; i++; continue; }
      if (c === "[" && n === "[") { s++; cur += "[["; i++; continue; }
      if (c === "]" && n === "]") { s--; cur += "]]"; i++; continue; }
      if (c === "|" && !b && !s) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  }
  function named(tpl) {
    const o = {};
    for (const p of params(tpl).slice(1)) {
      const m = p.match(/^\s*([\w ]+?)\s*=([\s\S]*)$/);
      if (m) o[m[1].toLowerCase()] = m[2].trim();
    }
    return o;
  }
  function clean(s) {
    return String(s || "")
      .replace(/<ref[^>]*\/>/g, "").replace(/<ref[\s\S]*?<\/ref>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "")
      .replace(/\{\{\s*(?:flagicon|fbaicon|flag)[^}]*\}\}/gi, "")
      .replace(/\{\{[^{}]*\}\}/g, "")
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
      .replace(/'''?/g, "")
      .replace(/\s*\((?:[A-Z]{1,4}|\d{1,2}|\d[A-Z]{1,2}|[IVX]+)\)\s*/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  const isBold = s => /'''/.test(s);
  function score(s) {
    const raw = String(s || "");
    const pso = raw.match(/\{\{\s*pso\s*\|\s*(\d+)\s*[–\-]\s*(\d+)/i) || raw.match(/\((\d+)\s*[–\-]\s*(\d+)\s*p(?:en|\.|\))/i);
    const aet = /\{\{\s*aet|a\.?e\.?t|\(aet\)/i.test(raw);
    const c = clean(raw.replace(/\{\{\s*pso[^}]*\}\}/gi, "").replace(/\{\{\s*aet[^}]*\}\}/gi, ""));
    const m = c.match(/^(\d+)\s*[–\-:]\s*(\d+)/);
    if (!m) return null;
    return { h: +m[1], a: +m[2], aet, pen: pso ? [+pso[1], +pso[2]] : null };
  }
  function parseDate(s) {
    if (!s) return null;
    const sd = s.match(/\{\{\s*start date\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i);
    if (sd) return new Date(+sd[1], +sd[2] - 1, +sd[3]);
    const m = clean(s).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (m && MONTHS[m[2].toLowerCase()] != null) return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
    const m2 = clean(s).match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (m2 && MONTHS[m2[1].toLowerCase()] != null) return new Date(+m2[3], MONTHS[m2[1].toLowerCase()], +m2[2]);
    return null;
  }
  function parseTime(s, d) {
    const m = String(s || "").match(/(\d{1,2})[:.](\d{2})/);
    if (d && m) { const x = new Date(d); x.setHours(+m[1], +m[2]); return { date: x, hasTime: true }; }
    return { date: d, hasTime: false };
  }
  function goalsList(s) {
    if (!s) return [];
    return s.split(/\n|<br\s*\/?>/).map(line => {
      const who = clean(line.replace(/\{\{[\s\S]*?\}\}/g, "").replace(/^\*+/, ""));
      const mins = [...line.matchAll(/\{\{\s*(?:goal|pengoal|own ?goal|og)\s*\|([^}]*)\}\}/gi)]
        .map(m => m[1].split("|").filter(x => /^\s*\d/.test(x)).map(x => x.trim() + "'").join(", ")).filter(Boolean);
      return who && mins.length ? { who, min: mins.join(", "), pk: /pengoal|\|\s*pen/i.test(line), og: /o\.?g\.?|own ?goal/i.test(line) } : null;
    }).filter(Boolean);
  }

  function parse(wikitext) {
    const w = wikitext;
    const matches = [];
    const seen = new Set();
    // sections
    const heads = [...w.matchAll(/^(={2,4})\s*([^=\n]+?)\s*\1\s*$/gm)].map(m => ({ i: m.index, end: m.index + m[0].length, lvl: m[1].length, t: clean(m[2]) }));
    const sections = [{ t: "", i: 0, end: 0 }, ...heads];
    let roundOrder = [];
    let path = [];
    for (let k = 0; k < sections.length; k++) {
      const h = sections[k];
      const body = w.slice(h.end, k + 1 < sections.length ? sections[k + 1].i : w.length);
      if (h.lvl) { path = path.filter(p => p.lvl < h.lvl); path.push(h); }
      if (path.some(p => SKIP.test(p.t))) continue;
      const top = path.find(p => p.lvl === 2);
      let round = (path.length > 1 && /first leg|second leg|^matches$|^summary$|^results$|^details$|^match$/i.test(path[path.length - 1].t))
        ? path[path.length - 2].t : (path[path.length - 1]?.t || "");
      if (top && /^(final|qualifying)/i.test(top.t) && path.length > 1 && !/leg/i.test(path[path.length - 1].t)) round = path[path.length - 1].t;
      if (top && /^final$/i.test(top.t)) round = "Final";
      const leaf = path[path.length - 1];
      if (path.length > 1 && leaf && /^(north|south|east|west|central|north[- ]?\w+|south[- ]?\w+|.*region.*|.*zone.*)$/i.test(leaf.t)) round = path[path.length - 2].t + " — " + leaf.t;
      const add = m => {
        if (!m.home || !m.away || m.home.length > 60 || m.away.length > 60) return;
        const key = (m.home + "|" + m.away + "|" + (m.leg || "")).toLowerCase();
        if (seen.has(key)) {
          // enrichit la version déjà connue (ex. tableau puis football box)
          const prev = matches.find(x => x.key === key);
          if (prev && !prev.goals?.length && m.goals?.length) Object.assign(prev, m, { key });
          return;
        }
        seen.add(key);
        if (!roundOrder.includes(round)) roundOrder.push(round);
        matches.push({ ...m, round, key });
      };

      // 1) football boxes
      for (const fm of body.matchAll(/\{\{\s*football ?box(?: collapsible)?\s*\|/gi)) {
        const tpl = balanced(body, fm.index);
        const p = named(tpl);
        const sc = score(p.score);
        const d = parseDate(p.date);
        const t = parseTime(p.time, d);
        const pen = p.penaltyscore ? score(p.penaltyscore) : null;
        add({
          home: clean(p.team1), away: clean(p.team2), score: sc,
          pen: sc?.pen || (pen ? [pen.h, pen.a] : null), aet: sc?.aet || /yes|y/i.test(p.aet || ""),
          date: t.date, hasTime: t.hasTime, venue: clean(p.stadium), city: clean(p.location),
          goals1: goalsList(p.goals1), goals2: goalsList(p.goals2),
          winner: isBold(p.team1) ? "h" : isBold(p.team2) ? "a" : null,
        });
      }
      // 2) OneLegResult / TwoLegResult + dates en ligne de séparation
      let curDate = null;
      const lines = body.split("\n");
      for (const line of lines) {
        const dl = line.match(/^[|!].*?'''?\s*(?:<small>)?\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/) || line.match(/^[|!]colspan[^|]*\|\s*(?:<small>|''')?\s*(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/);
        if (dl) curDate = parseDate(dl[1]);
        const ol = line.match(/\{\{\s*(One|Two)LegResult\s*\|/i);
        if (ol) {
          const tpl = balanced(line, ol.index);
          const ps = params(tpl).slice(1);
          // OneLegResult|team1|flag1|score|team2|flag2
          const cells = ps.filter((_, i) => i !== 1 && i !== 4);
          const [t1, sc, t2] = [ps[0], ps[2], ps[3]];
          const s = score(sc);
          add({ home: clean(t1), away: clean(t2), score: s, pen: s?.pen, aet: s?.aet, date: curDate, hasTime: false,
            winner: isBold(t1) ? "h" : isBold(t2) ? "a" : null, goals1: [], goals2: [] });
          void cells;
          continue;
        }
        // 3) lignes de tableau : … || équipe || score || équipe
        if (/^\|[^}{-]/.test(line) && line.includes("||")) {
          const cells = line.replace(/^\|/, "").split("||").map(x => x.trim());
          const si = cells.findIndex((c, i) => i > 0 && i < cells.length - 1 && /^(?:'''?)?\s*(\d+\s*[–\-]\s*\d+|[–\-]|v)\b/.test(clean(c.replace(/\{\{\s*(pso|aet)[^}]*\}\}/gi, ""))) && clean(cells[i - 1]).length > 1 && clean(cells[i + 1]).length > 1 && !/^\d+$/.test(clean(cells[i - 1])));
          if (si > 0) {
            const t1 = cells[si - 1], t2 = cells[si + 1];
            if (/^\d+\s*(→|-)/.test(clean(t1))) continue; // tableau de calendrier
            const s = score(cells[si]);
            add({ home: clean(t1), away: clean(t2), score: s, pen: s?.pen, aet: s?.aet, date: curDate, hasTime: false,
              winner: isBold(t1) ? "h" : isBold(t2) ? "a" : null, goals1: [], goals2: [] });
          }
        }
      }
    }
    // final : vainqueur dans l'infobox
    const champ = (w.match(/\|\s*champions?\s*=\s*([^\n]+)/i) || [])[1];
    return { matches, rounds: roundOrder, champion: champ ? clean(champ) : null };
  }

  root.WikiCups = { parse, clean };
  if (typeof module !== "undefined") module.exports = root.WikiCups;
})(typeof window !== "undefined" ? window : globalThis);
