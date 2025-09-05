# Daydreams Module

Le module Daydreams est le cœur du système d'agents AI de cette application. Il fournit une architecture extensible pour créer, gérer et faire communiquer des agents conversationnels avec différents contextes et capacités.

## Architecture

### Composants Principaux

- **DaydreamsService** - Orchestration centrale des agents
- **ModelService** - Gestion des fournisseurs LLM (Anthropic, OpenAI)
- **MemoryService** - Persistance et stockage (Supabase, MongoDB, in-memory)
- **ContextService** - Gestion des contextes et templates d'agents
- **CommunicationService** - Communication inter-agents

### Concepts Clés

- **Agents** - Assistants AI avec personnalités et capacités spécifiques
- **Contextes** - Environnements d'exécution définissant les comportements des agents
- **Templates** - Configurations pré-définies pour créer des agents rapidement
- **Sessions** - Instances de conversation entre utilisateurs et agents
- **Memory** - Stockage persistant des conversations et de l'état des agents

## Contextes Disponibles

### Chat Context (`chat`)

Contexte de base pour les conversations générales.

**Fonctionnalités:**

- Historique des messages persistant
- Métadonnées de session (titre, tags, timestamps)
- Support multi-tours de conversation

### Notion Context (`notion`) avec MCP

Contexte spécialisé pour l'intégration Notion via Model Context Protocol.

**Configuration requise:**

```env
NOTION_API_KEY=your_notion_api_key
```

**Outils MCP disponibles:**

| Outil                         | Description                            | Paramètres                               |
| ----------------------------- | -------------------------------------- | ---------------------------------------- |
| `notion_search_pages`         | Rechercher des pages dans le workspace | `query`, `filter?`                       |
| `notion_get_page_content`     | Récupérer le contenu d'une page        | `page_id`                                |
| `notion_update_page`          | Mettre à jour une page                 | `page_id`, `properties?`, `content?`     |
| `notion_create_page`          | Créer une nouvelle page                | `parent`, `properties`, `children?`      |
| `notion_get_databases`        | Lister les bases de données            | `query?`                                 |
| `notion_query_database`       | Requêter une base de données           | `database_id`, `filter?`, `sorts?`       |
| `notion_create_database_page` | Créer une entrée en base               | `database_id`, `properties`, `children?` |

**Exemple d'utilisation:**

```typescript
// Créer un agent Notion
const agent = await daydreamsService.createAgent({
  name: 'Assistant Notion',
  model_type: 'anthropic',
  model_id: 'claude-3-5-sonnet-20241022',
  contexts: ['notion'],
  context_args: {
    mcp_tools_available: true,
  },
});
```

## API Endpoints

### Agents

- `GET /daydreams/agents` - Lister tous les agents
- `GET /daydreams/agents/:id` - Récupérer un agent spécifique
- `POST /daydreams/agents` - Créer un nouvel agent
- `DELETE /daydreams/agents/:id` - Supprimer un agent
- `POST /daydreams/agents/:id/send` - Envoyer un message à un agent

### Contextes

- `GET /daydreams/contexts` - Lister les contextes disponibles
- `GET /daydreams/contexts/:id` - Détails d'un contexte
- `POST /daydreams/contexts` - Créer un contexte personnalisé

### Templates

- `GET /daydreams/templates` - Lister les templates disponibles
- `GET /daydreams/templates/:id` - Récupérer un template
- `POST /daydreams/templates` - Créer un nouveau template

### Notion MCP

- `GET /notion-mcp/status` - Vérifier la configuration Notion
- `GET /notion-mcp/tools` - Lister les outils MCP disponibles
- `POST /notion-mcp/execute` - Exécuter un outil MCP
- `GET /notion-mcp/search` - Rechercher des pages Notion
- `GET /notion-mcp/databases` - Lister les bases de données Notion

## Configuration

### Variables d'Environnement

```env
# Fournisseurs LLM
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Base de données
SUPABASE_URL=https://...
SUPABASE_API_KEY=eyJ...
MONGODB_URI=mongodb+srv://...

# Intégrations
NOTION_API_KEY=ntn_...
DISCORD_TOKEN=...

# Stockage
MEMORY_TYPE=supabase  # ou mongodb, in-memory
```

### Base de Données (Supabase)

Les schémas de base de données sont centralisés dans `/supabase/migrations/`.

Pour voir le schéma des agents et autres tables :
- Schéma complet : `/supabase/migrations/00001_initial_schema.sql`
- Mises à jour auth : `/supabase/migrations/00002_auth_updates.sql`
- Documentation : `/supabase/README.md`

Tables principales :
- `agents` - Configuration et état des agents AI
- `templates` - Templates pré-configurés d'agents
- `sessions` - Sessions de conversation
- `documents` - Base de connaissances par agent

## Templates Pré-définis

### Basic Chat

Agent conversationnel général avec historique persistant.

### Tech Support

Assistant technique spécialisé dans le support utilisateur.

### Notion Assistant MCP

Assistant Notion avec accès complet aux outils MCP pour:

- Recherche et navigation dans le workspace
- Création et modification de pages
- Gestion des bases de données
- Automatisation des workflows Notion

## Utilisation Avancée

### Créer un Contexte Personnalisé

```typescript
import { context } from '@daydreamsai/core';
import { z } from 'zod';

export const customContext = context({
  type: 'custom',
  schema: z.object({
    customField: z.string().optional(),
  }),
  create() {
    return { customField: 'default' };
  },
  render({ memory }) {
    return `Custom Context: ${memory.customField}`;
  },
});
```

### Définir des Actions MCP

```typescript
import { action } from '@daydreamsai/core';
import { z } from 'zod';

export const customAction = action({
  name: 'custom:action',
  description: 'Action personnalisée',
  schema: z.object({
    param: z.string(),
  }),
  handler: async (call, ctx) => {
    // Logique de l'action
    return { success: true, data: 'result' };
  },
});
```

## Développement

### Structure des Fichiers

```
src/daydreams/
├── actions/           # Actions disponibles pour les contextes
├── context/          # Définitions des contextes
├── controllers/      # Endpoints API REST
├── dto/             # Objets de transfert de données
├── services/        # Services métier
├── types/           # Types TypeScript
├── utils/           # Utilitaires
└── vendors/         # Intégrations externes
```

### Tests

```bash
# Tests unitaires
pnpm test

# Tests d'intégration
pnpm test:e2e

# Lancer l'API en développement
pnpm run start:dev
```

### Debugging

Les logs sont disponibles avec différents niveaux:

- `[INFO]` - Informations générales
- `[DEBUG]` - Détails de débogage
- `[ERROR]` - Erreurs système

Pour activer les logs détaillés:

```env
NODE_ENV=development
LOG_LEVEL=debug
```

## Support et Contribution

Pour signaler des bugs ou proposer des améliorations:

1. Créer une issue avec le template approprié
2. Fournir les logs et la configuration
3. Décrire les étapes de reproduction

Pour contribuer:

1. Fork le repository
2. Créer une branche feature
3. Ajouter des tests pour les nouvelles fonctionnalités
4. Soumettre une pull request
