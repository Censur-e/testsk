# Skydrive Panel - Architecture Full-Stack Roblox

Ce document decrit comment connecter le panel Next.js au jeu Roblox.

## Vue d'ensemble

```
+-------------------+        POST /api/heartbeat        +---------------------+
|                   |  <------  (players, logs)  <----- |                     |
|   PANEL Next.js   |                                   |   ROBLOX SERVER     |
|   (v0.app)        |  ------> commands (pending) ---->  |   Script Luau      |
|                   |                                   |                     |
|  SWR refresh 2-5s |        POST /api/commands/ack     |  HeartbeatLoop 3s   |
|  (polling client) |  <------ (success/error) <------- |  DataStoreService   |
+-------------------+                                   +---------------------+
         |                                                       |
         | Panel modifie : trigger, ban, economie                | Persistance locale :
         v                                                       v leaderstats, DataStore
+-------------------+                                   +---------------------+
|  Store API        |  <-------- bi-directional ------> |  DataStoreService   |
|  (in-memory /     |            sync (/api/economy,    |  Skydrive_Bans_v1   |
|   Supabase /      |            /api/bans/...)         |  Skydrive_Economy   |
|   Upstash)        |                                   |  Skydrive_Triggers  |
+-------------------+                                   +---------------------+
```

## Routes API Next.js

Toutes les routes vivent dans `/app/api/*`. Les routes marquees RBLX doivent
inclure l'en-tete `x-skydrive-key: <SKYDRIVE_SERVER_KEY>`.

| Route                       | Method | Qui ?     | Description                                             |
|-----------------------------|--------|-----------|---------------------------------------------------------|
| `/api/heartbeat`            | POST   | RBLX      | Envoie joueurs+logs+stats, recoit commandes en attente  |
| `/api/commands`             | GET    | RBLX/Panel | `?pending=1` pour Roblox, sinon historique pour panel   |
| `/api/commands`             | POST   | Panel     | Enqueue une commande (kick, ban, set_world, etc.)       |
| `/api/commands/ack`         | POST   | RBLX      | Acknowledge les commandes executees                     |
| `/api/players`              | GET    | Panel     | Liste des joueurs en ligne (dernier heartbeat)          |
| `/api/triggers`             | GET    | Panel     | Triggers sauvegardes                                    |
| `/api/triggers`             | POST   | Panel     | Cree un trigger                                         |
| `/api/triggers/[id]`        | PATCH  | Panel     | Active/desactive/modifie                                |
| `/api/triggers/[id]`        | DELETE | Panel     | Supprime                                                |
| `/api/world`                | GET    | Panel/RBLX| Etat du monde (physique, meteo)                         |
| `/api/world`                | PATCH  | Panel     | Modifie + enqueue set_world                             |
| `/api/bans`                 | GET    | Panel     | Liste des bans actifs                                   |
| `/api/bans`                 | POST   | Panel     | Cree un ban + enqueue kick                              |
| `/api/bans`                 | DELETE | Panel     | `?userId=X` pour unban                                  |
| `/api/economy`              | GET    | Panel     | Comptes economiques                                     |
| `/api/economy`              | POST   | RBLX/Panel| `{bulk:[...]}` sync, ou `{userId,delta}` ajustement     |
| `/api/logs`                 | GET    | Panel     | Logs recents (`?limit=N`)                               |
| `/api/logs`                 | POST   | RBLX      | Stream de logs additionnels                             |
| `/api/execute`              | POST   | Panel     | Envoie du Lua a executer via loadstring                 |
| `/api/stats`                | GET    | Panel     | Statistiques agregees pour le dashboard                 |

## Configuration

### 1. Variables d'environnement Vercel

Dans les parametres du projet v0 (bouton Vars dans le coin haut-droit) :

```
SKYDRIVE_SERVER_KEY=<une-chaine-aleatoire-longue-et-secrete>
```

Utilise pour authentifier les requetes du serveur Roblox. Sans cette
variable, l'API est ouverte (mode dev uniquement).

### 2. Configuration Roblox

**Game Settings > Security** :
- `HttpEnabled` = `TRUE`
- `LoadStringEnabled` = `TRUE` (requis pour `/api/execute`)
- `StudioAccessToApis` = `TRUE` (pour tester en Studio)

**Ajout du script** :
1. Copier `roblox/SkydrivePanelServer.server.lua`
2. Le coller dans un `Script` place dans `ServerScriptService`
3. Modifier les constantes en haut :
   - `API_BASE` = URL de votre deploiement Vercel (ex: `https://skydrive.vercel.app`)
   - `SERVER_KEY` = meme valeur que `SKYDRIVE_SERVER_KEY`

### 3. Pre-requis de votre jeu

Le script suppose la structure suivante (a adapter) :
- Chaque joueur a un dossier `leaderstats` avec un `IntValue` nomme `Cash` ou `Money`
- Les equipes sont dans `game.Teams`
- L'Admin est detecte via `game.CreatorId` (a ameliorer avec un groupe Roblox)

Si votre jeu differe, modifiez `getPlayerSnapshot` et `commandHandlers.set_money`.

## Synchronisation DataStore <-> API

### Principes

1. **Source de verite** :
   - **Bans/Triggers** : API (le panel est maitre). Roblox les charge au demarrage et cache en DataStore pour survivre aux pannes API.
   - **Economie** : DataStore Roblox (le jeu est maitre). Le panel recoit des updates via `/api/economy` POST bulk.

2. **Reconciliation** : a chaque connexion de joueur, Roblox :
   - Verifie le DataStore `Skydrive_Bans_v1` (si banni, kick immediat)
   - Charge l'economie depuis `Skydrive_Economy_v1`
   - A la deconnexion, sauvegarde l'economie

3. **Pourquoi ne pas tout stocker cote API uniquement ?**
   - Le DataStore Roblox est garantti meme si votre API est down
   - Les DataStores Roblox sont gratuits, fiables, integres
   - L'API fournit la vue moderateur, les triggers, et les commandes en temps reel

### Schema de base de donnees recommande (production)

Pour la persistance cote API, remplacer l'in-memory store (`lib/store.ts`) par
une vraie base (Supabase/Neon) :

```sql
-- bans : persistence des bans (meme pour joueurs offline)
CREATE TABLE bans (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  reason TEXT,
  banned_by TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- triggers : regles automatiques
CREATE TABLE triggers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  triggered INT DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- commands : file de commandes + historique
CREATE TABLE commands (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  target_id TEXT,
  payload JSONB,
  status TEXT DEFAULT 'pending',  -- pending | acked | failed
  issued_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acked_at TIMESTAMPTZ,
  error TEXT
);
CREATE INDEX idx_cmd_pending ON commands(status, created_at) WHERE status = 'pending';

-- economy : miroir de l'economie (mise a jour bulk par Roblox)
CREATE TABLE economy (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  balance BIGINT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- world : singleton (une seule ligne, id=1)
CREATE TABLE world_state (
  id INT PRIMARY KEY DEFAULT 1,
  gravity REAL DEFAULT 196.2,
  jump_height REAL DEFAULT 7.2,
  walk_speed REAL DEFAULT 16,
  time_of_day REAL DEFAULT 14,
  auto_cycle BOOLEAN DEFAULT TRUE,
  weather TEXT DEFAULT 'clear',
  pvp_enabled BOOLEAN DEFAULT TRUE,
  friendly_fire BOOLEAN DEFAULT FALSE,
  CHECK (id = 1)
);

-- logs : stream de logs (TTL via cron ou Upstash Redis)
CREATE TABLE logs (
  id BIGSERIAL PRIMARY KEY,
  type TEXT,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_logs_time ON logs(created_at DESC);
```

## Securite

1. **Clef partagee** : toujours garder `SKYDRIVE_SERVER_KEY` secrete. Ne jamais la commit.
2. **loadstring** : tres puissant. En production, ajouter une whitelist d'UserId autorises a emettre des `execute_lua`.
3. **Rate limiting** : ajouter un middleware Next.js (Upstash Ratelimit) sur `/api/execute` et `/api/commands`.
4. **Authentification panel** : ajouter NextAuth ou Supabase Auth pour proteger l'UI. La fonction `verifyPanelRequest` dans `lib/auth.ts` est le point d'injection.
5. **Validation** : utiliser Zod pour valider les payloads entrants.

## Migration : Polling -> WebSockets / SSE

Le polling HTTP (3s) est simple et fiable mais latence ~3s. Pour du temps
reel sous 100ms :

- **Server-Sent Events** : `/api/stream` renvoie un stream text/event-stream. Le script Roblox n'en tire pas profit (pas de support SSE natif).
- **WebSockets** : Roblox n'a pas de WebSocket client natif. Necessiterait un relai externe (ex: fly.io + ws) qui pousserait vers Roblox via `MessagingService`.
- **Solution pragmatique** : garder le polling pour Roblox, ajouter SSE pour le panel afin d'eviter les 2s de latence SWR sur les logs.

## Etape suivante : un vrai DB

Pour passer de l'in-memory store a une vraie persistance, demandez l'ajout
de l'integration Supabase ou Neon. Le seul fichier a modifier est
`lib/store.ts` - les routes API n'ont pas besoin de changer grace a
l'abstraction.
