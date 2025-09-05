# Vue d'ensemble du schéma de base de données

## Structure des migrations

Tous les scripts SQL sont maintenant centralisés dans `/supabase/migrations/` :

1. **00001_initial_schema.sql**
   - Tables principales : `agents`, `templates`, `sessions`, `documents`
   - Indexes pour la performance
   - Row Level Security (RLS)
   - Triggers pour `updated_at`

2. **00002_auth_updates.sql**
   - Système d'approbation des utilisateurs
   - Table `user_profiles`
   - Fonctions helper pour l'authentification
   - Politiques RLS avec vérification d'approbation

3. **00003_documentation_schemas.sql**
   - Fichier de référence/documentation
   - Exemples de schémas mentionnés dans la documentation

## Tables principales

### agents
- Stockage des configurations d'agents AI
- Support multi-modèles (Anthropic, OpenAI)
- Contextes et capacités configurables

### templates
- Templates pré-configurés pour créer des agents rapidement
- Variables et exemples de prompts
- Système de tags pour l'organisation

### sessions
- Historique des conversations
- Liaison avec les agents
- Métadonnées et statut

### documents
- Base de connaissances par agent
- Support multi-formats (markdown, json, text, yaml)
- Intégration avec ChromaDB pour la recherche vectorielle

### user_profiles
- Profils utilisateurs étendus
- Système d'approbation et permissions
- Préférences utilisateur

## Exécution des migrations

```bash
# Option 1: Script automatique
export SUPABASE_DB_URL='postgresql://...'
./supabase/run-migrations.sh

# Option 2: Dashboard Supabase
# Copier-coller le contenu dans SQL Editor

# Option 3: Supabase CLI
supabase db push
```