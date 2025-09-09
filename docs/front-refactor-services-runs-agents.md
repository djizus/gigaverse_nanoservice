# Refactor Front — Services, Runs, Agents & Chat

Objectif: unifier Services, Agents et Actions autour du concept de Run pour que chaque exécution (service ou action standalone) apparaisse dans Runs, avec la possibilité d’ouvrir un chat contextuel avec l’agent qui a orchestré ce run.

## Contexte actuel

- UI (Vite + React) expose 5 onglets: Dashboard, Services, Runs, Agents, Settings.
- Services: découverte via `GET /services` (manifests ServiceRegistry + uiSchema), lancement via `POST /ns/:developer/:service/call` (op `startRun`).
- Runs: liste et détails via endpoints spécifiques dungeon: `GET /ui/dungeon/runs`, `GET /ui/dungeon/run/:id`, SSE global via `GET /dungeon/events`.
- Agents: CRUD et chat via `/daydreams/agents/*` (sessions, messages, stream).
- Manque: lien explicite Run → Agent/Session, actions standalone non unifiées sous Runs, SSE générique par service.

## Cible conceptuelle

- Service: nano‑service namespacé, avec un manifest (`developer`, `serviceId`, `capabilities`, `uiSchema`).
- Action: opération unitaire (peut vivre standalone), mais exposée comme un Run (durée courte) pour uniformiser l’historique et le chat contextuel.
- Agent: entité chat (config + sessions). Un run orchestré par un agent doit pointer vers l’agent et la session associée.
- Run: enregistrement pivot, avec métadonnées de namespacing et de conversation.

Schéma minimal Run (API/DB):

- id (string)
- developer (string)
- service_id (string)
- status (enum)
- created_at (timestamp)
- meta (JSONB)
  - agentId?: string
  - sessionId?: string
  - actionId?: string (si action standalone)
  - uiHints?: { title?: string, summary?: string }

Note: la base inclut déjà `service_id`, `developer`, `meta` (cf. migrations ns). On enrichit `meta` avec `agentId` et `sessionId`.

## Changements API (incrémental, rétro‑compatible)

Phase 1 — surfacer le mapping Run → Agent/Session
- Plugins de service (`*.plugin.ts`): lorsque `startRun` crée/choisit un agent d’orchestration, renvoyer `{ runId, agentId?, sessionId? }` et persister dans `DatabaseService` via `meta`.
- `GET /ui/dungeon/runs` et `GET /ui/dungeon/run/:id`: inclure `meta.agentId`, `meta.sessionId` si présents.

Phase 2 — endpoints génériques Runs/SSE
- `GET /ui/runs?status=...&service=...&developer=...` (alias de l’existant dungeon, mais générique et multi‑service).
- `GET /ui/run/:id` (détails + `details[]`).
- SSE par service: `GET /ns/:developer/:service/stream?runId=...` (déjà présent), et SSE global: `GET /ns/events` (optionnel) qui ré-émet tous les events (même utilité que `/dungeon/events`).

Phase 3 — actions standalone = mini‑runs
- Exposer une `op` standard `runAction` sur les services d’actions, qui crée un Run court et publie des events minimalistes.
- Toujours persister un Run avec `meta.actionId` et, si applicable, `meta.agentId/sessionId`.

## Changements UI

Services (Launch modal)
- Inchangé pour la découverte/lancement via manifest/uiSchema.
- À l’invocation, lorsqu’on reçoit `{ runId, agentId?, sessionId? }`, stocker localement le mapping `runId → { serviceId, agentId?, sessionId? }`.

Runs (liste + détail)
- Liste: conserver filtres actuels (service/status/search). Afficher un badge service (`developer:serviceId`).
- Détail: ajouter un panneau “Chat lié au run”:
  - Si `meta.agentId` existe: bouton “Ouvrir le chat” qui bascule vers l’onglet Agents avec l’agent pré‑sélectionné et, si `meta.sessionId`, sélectionne la session.
  - Si pas d’agent mappé: proposer “Créer un agent contextuel” (prérempli avec `model`, `context` selon service) puis créer/ouvrir une session taggée par `runId` dans les `args`.
- SSE: pour les services supportés, si `serviceId` est connu, autoriser le switch “Source SSE”: global (`/dungeon/events`) vs namespacé (`/ns/:dev/:svc/stream?runId=...`).

Agents (gestion + chat)
- Ajouter une “vue liée à un run”: si on arrive depuis Runs avec `agentId/sessionId`, ouvrir directement la session ; sinon, créer une nouvelle session et logguer un message système “Linked to run <runId>”.
- Afficher un chip “linked: <developer>/<serviceId>#<runId>` dans la vue de session.

Actions standalone
- Exposer dans Services une carte “Actions” (ou un service par domaine d’actions) avec un uiSchema simple. Chaque exécution crée un Run et apparaît dans Runs. Bouton “Chat” suit les mêmes règles que ci‑dessus.

## Flux utilisateur cibles

1) Lancer un run de Gigaverse Dungeon depuis Services → le run apparaît dans Runs, détail visible en temps réel, bouton “Ouvrir le chat” pointe sur l’agent d’orchestration.
2) Ouvrir un ancien run (sans mapping agent) → UI propose de créer/associer un agent contextuel et démarre une session.
3) Exécuter une action standalone → apparaît dans Runs (statut court), permet d’ouvrir un chat post‑action.

## Migration & rétro‑compatibilité

- DB: aucun changement de colonne requis (utiliser `meta.agentId/sessionId`).
- Runs existants: absence de mapping côté UI → fallback “Créer un agent contextuel”.
- SSE: conserver `/dungeon/events` comme défaut; ajouter l’abonnement `/ns/:dev/:svc/stream` si disponible.

## Étapes de livraison

Phase 0 — doc + questions (ce document)

Phase 1 — UI minimale (sans changement API)
- Runs: bouton “Ouvrir le chat” si `runsMeta[runId]` contient `meta.agentId/sessionId` (sinon CTA de création).
- Agents: support “pré‑sélection session par runId”.
- Services: après `call(startRun)`, si réponse inclut `agentId/sessionId`, mettre à jour l’état local et basculer sur Runs.

Phase 2 — API + UI génériques
- Ajouter `GET /ui/runs` et `GET /ui/run/:id` génériques (alias/extension dungeon).
- Exposer SSE `GET /ns/:dev/:svc/stream` et switch côté UI.

Phase 3 — actions standalone
- Implémenter `runAction` côté plugins d’actions; UI “Actions” → crée des mini‑runs visibles dans Runs.

## Points à clarifier

- Sources d’agents pour chaque service: réutiliser un agent global (ex: “Gigaverse Agent”) ou générer un agent éphémère par run ?
- Session policy: 1 session par run ou session réutilisée pour plusieurs runs d’un même service/utilisateur ?
- Actions standalone: on agrège sous un service “actions” unique par domaine, ou plusieurs services d’actions séparés ?
- SSE unifiée: faut‑il un `/ns/events` global (tous services) pour remplacer `/dungeon/events`, ou garder les deux ?
- Sécurité: l’agent lié au run doit‑il être visible uniquement par l’owner du run (userId) ?

## Annexes — Endpoints utilisés côté UI

- Découverte services: `GET /services`, `GET /services/:developer/:service/manifest`
- Appels service: `POST /ns/:developer/:service/call` (body `{ op, data }`)
- SSE: `GET /dungeon/events` (global), `GET /ns/:developer/:service/stream?runId=...` (par service)
- Runs UI: `GET /ui/dungeon/runs`, `GET /ui/dungeon/run/:id` (v1), futurs `GET /ui/runs`, `GET /ui/run/:id`
- Agents & chat: `/daydreams/agents/*`, `/daydreams/sessions/:sessionId/messages`

---

Si tu valides cette approche, je peux:
- Ajouter les petits hooks UI (bouton “Ouvrir le chat” depuis Runs, passage d’un run vers Agents),
- Étendre la réponse `startRun` pour transporter `agentId/sessionId` et les persister en `meta`,
- Puis livrer la passe générique des endpoints Runs.



## TODOs (multi‑services)

- Orchestrateur par service (mapping run → agent/session)
  - [x] gigaverse-dungeon (plugin mis à jour)
  - [ ] gigaverse-fishing — créer "Fishing Orchestrator", persister { agentId, sessionId } en meta, renvoyer mapping
  - [ ] vega-trading — créer "Vega Trading Orchestrator", persister mapping, renvoyer mapping
  - [ ] loot-survivor (read-only) — optionnel: attacher un agent compagnon léger, persister mapping

- UI
  - [x] Run Detail: chat inline + auto-link via /ui/run/:id/companion
  - [x] Service Workspace: Chat sidecar + NS-SSE toggle (activity)
  - [ ] Extraire Service Workspace/Sidecar en composants dédiés

- API
  - [x] /ui/run/:id/companion GET/POST
  - [ ] Protéger companion routes par userAuth (prod), conserver fallback dev
