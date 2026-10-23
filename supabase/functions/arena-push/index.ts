// ARENA 360 · robot des notifications (Supabase Edge Function « arena-push », lancée chaque minute par pg_cron).
// Regarde les matchs des équipes et championnats suivis, détecte coup d'envoi / but / fin, et envoie les notifications.
// Secrets à définir dans Supabase : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (voir NOTIFICATIONS.md).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const API = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const EUROPE = ["uefa.champions", "uefa.europa", "uefa.europa.conf"];
const SITE = "https://arena.eraz.ovh/";

type Follows = { leagues?: string[]; teams?: { id: string; name?: string; leagues?: string[] }[]; types?: { kickoff?: boolean; goals?: boolean; final?: boolean } };
type Sub = { endpoint: string; p256dh: string; auth: string; follows: Follows };

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:admin@arena.eraz.ovh", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

  const { data: subs } = await db.from("push_subs").select("endpoint,p256dh,auth,follows");
  if (!subs?.length) return new Response(JSON.stringify({ ok: true, subs: 0 }));

  // championnats à surveiller : ceux suivis + ceux des équipes suivies (+ coupes d'Europe si on suit des équipes)
  const leagues = new Set<string>();
  for (const s of subs as Sub[]) {
    (s.follows.leagues || []).forEach(l => leagues.add(l));
    (s.follows.teams || []).forEach(t => (t.leagues || []).forEach(l => leagues.add(l)));
    if ((s.follows.teams || []).length) EUROPE.forEach(l => leagues.add(l));
  }
  const now = new Date();
  const days = [ymd(new Date(now.getTime() - 6 * 3600e3)), ymd(now)];   // matchs du soir qui finissent après minuit (UTC)
  const events: { slug: string; e: any }[] = [];
  await Promise.all([...leagues].flatMap(slug => [...new Set(days)].map(async day => {
    try {
      const r = await fetch(`${API}/${slug}/scoreboard?dates=${day}`);
      if (!r.ok) return;
      const d = await r.json();
      for (const e of d.events || []) events.push({ slug, e });
    } catch { /* on réessaiera la minute suivante */ }
  })));
  const seen = new Map<string, { slug: string; e: any }>();
  events.forEach(x => seen.set(x.e.id, x));

  const ids = [...seen.keys()];
  const { data: rows } = ids.length ? await db.from("push_match_state").select("*").in("event_id", ids) : { data: [] };
  const prev = new Map((rows || []).map((r: any) => [r.event_id, r]));
  const updates: any[] = [];
  const notes: { slug: string; home: any; away: any; kind: "kickoff" | "goals" | "final"; title: string; body: string; url: string }[] = [];

  for (const [id, { slug, e }] of seen) {
    const c = e.competitions?.[0];
    if (!c) continue;
    const home = c.competitors.find((x: any) => x.homeAway === "home"), away = c.competitors.find((x: any) => x.homeAway === "away");
    const st = c.status?.type?.state || e.status?.type?.state;
    const hs = +home.score || 0, as = +away.score || 0;
    const p = prev.get(id);
    const hn = home.team.shortDisplayName || home.team.displayName, an = away.team.shortDisplayName || away.team.displayName;
    const url = `${SITE}#m-${slug}-${id}`;
    if (p) {
      if (p.state === "pre" && st === "in")
        notes.push({ slug, home, away, kind: "kickoff", title: `⚽ C'est parti : ${hn} - ${an}`, body: "Le match vient de commencer.", url });
      if (st !== "pre" && (hs > p.home_score || as > p.away_score)) {
        const goals = (c.details || []).filter((d: any) => d.scoringPlay && !d.shootout);
        const last = goals[goals.length - 1];
        const who = last?.athletesInvolved?.[0]?.displayName;
        const min = last?.clock?.displayValue || "";
        const team = last?.team?.id === home.team.id ? hn : last?.team?.id === away.team.id ? an : "";
        notes.push({ slug, home, away, kind: "goals",
          title: `⚽ BUT${team ? " pour " + team : ""} ! ${hn} ${hs}-${as} ${an}`,
          body: who ? `${who}${last?.ownGoal ? " (contre son camp)" : last?.penaltyKick ? " (pénalty)" : ""} · ${min}` : "Nouveau score.", url });
      }
      if (p.state !== "post" && st === "post")
        notes.push({ slug, home, away, kind: "final", title: `🏁 Terminé : ${hn} ${hs}-${as} ${an}`,
          body: hs > as ? `Victoire de ${hn}.` : as > hs ? `Victoire de ${an}.` : "Match nul.", url });
    }
    if (!p || p.state !== st || p.home_score !== hs || p.away_score !== as)
      updates.push({ event_id: id, league: slug, state: st, home_score: hs, away_score: as, updated_at: now.toISOString() });
  }
  if (updates.length) await db.from("push_match_state").upsert(updates);
  // ménage : on oublie les matchs de plus de 3 jours
  await db.from("push_match_state").delete().lt("updated_at", new Date(now.getTime() - 3 * 864e5).toISOString());

  // envoi : chaque personne ne reçoit que ce qu'elle suit
  let sent = 0, removed = 0;
  for (const n of notes) {
    for (const s of subs as Sub[]) {
      const f = s.follows || {};
      const types = f.types || {};
      if (types[n.kind] === false) continue;
      const followsLeague = (f.leagues || []).includes(n.slug);
      const followsTeam = (f.teams || []).some(t => t.id === n.home.team.id || t.id === n.away.team.id);
      if (!followsLeague && !followsTeam) continue;
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: n.title, body: n.body, url: n.url, tag: `${n.kind}-${n.home.team.id}-${n.away.team.id}` }), { TTL: 3600 });
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) { await db.from("push_subs").delete().eq("endpoint", s.endpoint); removed++; }
      }
    }
  }
  return new Response(JSON.stringify({ ok: true, subs: subs.length, leagues: leagues.size, matches: seen.size, notifications: notes.length, sent, removed }),
    { headers: { "Content-Type": "application/json" } });
});
