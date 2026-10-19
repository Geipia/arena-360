/* Réglages du jeu « Je parie ».
   Pour jouer en ligne avec tout le monde : crée un projet gratuit sur https://supabase.com,
   lance le script supabase-setup.sql, puis colle ici l'URL du projet et la clé « anon public »
   (Project Settings → API). Tant que ces deux lignes sont vides, le jeu fonctionne en mode local sur ce PC. */
window.ARENA_CONFIG = {
  supabaseUrl: "",          // ex. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "",      // ex. "eyJhbGciOiJIUzI1NiIs..."

  season: 2027,             // saison jouée
  budget: 500,              // budget de départ (points fictifs)
  teamSize: 15,             // nombre de coureurs maximum
  lockDate: "2027-01-19",   // équipes bloquées à partir de cette date (veille du Tour Down Under)
  transferWindows: [        // fenêtres de transferts pendant la saison (dates incluses)
    { id: "printemps", name: "Printemps", from: "2027-04-26", to: "2027-05-02", max: 5 },
    { id: "ete", name: "Été", from: "2027-07-26", to: "2027-08-01", max: 5 },
  ],
};
