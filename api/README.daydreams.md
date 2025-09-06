# Daydreams Agents — Quickstart de test (PoC)

Ce document explique comment tester la base “Daydreams Agents” intégrée dans le nanoservice Hono actuel. On itérera ensuite pour ajouter les fonctionnalités avancées (auth, LLMs, front lourd, contexts dynamiques, etc.).

## Contenu du PoC

- Endpoints REST minimalistes pour gérer des agents et converser avec eux
- Persistance Supabase prête (schéma SQL fourni) avec fallback en mémoire
- Contexts pré-enregistrés: `chat`, `gigaverse`
- Réponse d’agent en mode stub (echo contextualisé), sans appel LLM externe pour le moment

## Prérequis

- Bun installé (1.0+): https://bun.sh
- `curl`
- Supabase (si vous voulez tester la persistance réelle)

## Installation

1) Installer les dépendances

```bash
bun install
```

2) Variables d’environnement (copier et adapter)

```bash
# .env (exemple minimal pour démarrer l’API)
PORT=4021

# Supabase (requis si vous n’utilisez pas le mode mémoire)
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=eyJhbGci... (anon key)

# Paiement x402 (utile pour /dungeon, pas nécessaire pour Daydreams PoC)
FACILITATOR_URL=https://facilitator.x402.rs
ADDRESS=0x0000000000000000000000000000000000000001
NETWORK=base-sepolia

# Option: forcer le stockage mémoire (utile pour tester sans DB)
DAYDREAMS_USE_MEMORY=true
```

3) Base de données Supabase (optionnel si `DAYDREAMS_USE_MEMORY=true`)

- Exécuter les scripts SQL dans l’éditeur SQL Supabase (ou via `psql`):
  - `database/daydreams.schema.sql`
  - (optionnel pour le module dungeon) `database/schema.sql`

Chemins utiles:
- `database/daydreams.schema.sql:1`
- `database/schema.sql:1`

## Lancer le serveur

```bash
bun run dev
```

Sortie attendue (extrait):

```
🏰 Initializing services and routes...
🚀 Server starting on port 4021
✅ Real-time Dungeon Nano Service running on port 4021
```

Vérifier la santé:

```bash
curl -s http://localhost:4021/health | jq
```

## Endpoints Daydreams (PoC)

Liste des contexts:

```bash
curl -s http://localhost:4021/daydreams/contexts | jq
```

Créer un agent:

```bash
curl -s -X POST http://localhost:4021/daydreams/agents \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Mon Agent",
    "model": "gpt-4o-mini",
    "context": "gigaverse",
    "instructions": "Sois utile et concis"
  }' | jq
```

Lister les agents:

```bash
curl -s http://localhost:4021/daydreams/agents | jq
```

Envoyer un message à un agent (crée une session si non fournie):

```bash
# Remplacez <AGENT_ID>
curl -s -X POST http://localhost:4021/daydreams/agents/<AGENT_ID>/send \
  -H 'Content-Type: application/json' \
  -d '{ "message": "Bonjour" }' | jq
```

Lister les sessions d’un agent:

```bash
curl -s http://localhost:4021/daydreams/agents/<AGENT_ID>/sessions | jq
```

Lister les messages d’une session:

```bash
curl -s http://localhost:4021/daydreams/sessions/<SESSION_ID>/messages | jq
```

Notes:
- En mode PoC, la réponse de l’agent est un echo enrichi, sans appel LLM.
- Pour persister réellement, désactivez `DAYDREAMS_USE_MEMORY` et configurez Supabase + le schéma `database/daydreams.schema.sql`.

## Tests automatisés

Un test basique couvre la création d’agent et l’envoi de message.

- Fichier: `tests/daydreams.poc.test.ts:1`

Lancer:

```bash
bun test
```

Ce test utilise `DAYDREAMS_USE_MEMORY=true` par défaut pour éviter la DB.

## Structure du code

- Routes: `src/daydreams/routes/daydreams.routes.ts:1`
- Services: `src/daydreams/services/*.ts`
  - `agent.service.ts:1` (agents, sessions, messages)
  - `context-registry.service.ts:1` (catalogue de contexts)
  - `memory-storage.service.ts:1` / `supabase-storage.service.ts:1`
- App factory: `src/api/app.ts:1` (monte Health, Dungeon, Daydreams)

## Prochaines étapes (itérations)

- Auth (OpenRouter/Daydreams router) sur `/daydreams/*`
- Intégration LLM (OpenRouter) derrière le service d’agent
- Portage du front lourd `old/knowledge/llm-front` vers ces endpoints
- Contexts dynamiques “créés à la volée” + gestion de templates
- Sessions persistantes avancées + streaming

---
Besoin d’aide pour brancher l’auth ou le front ? Dites-moi, je l’intègre ensuite.
