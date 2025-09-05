# Tâches d'Amélioration API Daydreams

## 🔄 État de la Refactorisation (Mis à jour: 2025-01-08)

### ✅ Tâches Complétées

#### Phase 1 - Stabilisation

##### 1. Validation des DTOs ✅

- [x] Créé le dossier `/dto/` avec sous-dossiers par module (agents, messages, contexts, templates)
- [x] Ajouté class-validator et class-transformer aux dépendances
- [x] Créé `SendMessageDto` avec validation complète
- [x] Créé `CreateAgentDto` avec validation des champs requis
- [x] Créé `UpdateAgentDto` avec validation des champs optionnels
- [x] Appliqué `ValidationPipe` globalement dans `main.ts`
- [x] Testé toutes les validations avec script bash

**Améliorations apportées**:

- Validation stricte des types (ModelType enum)
- Defaults automatiques pour éviter les erreurs null
- Rétrocompatibilité message/content
- Messages d'erreur détaillés

##### Frontend - Intégration ✅

- [x] Mis à jour AgentService pour utiliser les DTOs validés
- [x] Corrigé l'affichage des agents (structure { id, config })
- [x] Restauré la fonctionnalité d'historique des sessions
- [x] Corrigé le styling dark mode des messages
- [x] Ajouté composant MessageDetails avec événements expandables

##### Templates vs Contextes ✅

- [x] Clarifié la distinction entre templates (BDD) et contextes (types)
- [x] Mis à jour NewAgentModal avec sélection RadioGroup
- [x] Templates maintenant correctement liés à la base de données
- [x] Créé script d'import pour les templates context-proposals

### 🚧 En Cours

#### Consolidation des Contrôleurs

- [ ] Supprimer la route dépréciée dans DaydreamsController
- [ ] Migrer toutes les opérations agents vers AgentsController
- [ ] Nettoyer les DTOs dupliqués

### 📋 Tâches Restantes

## Phase 1 - Stabilisation (Priorité Haute)

### 2. Gestion d'Erreurs Standardisée

- [ ] Créer `GlobalExceptionFilter` dans `/filters/`
- [ ] Créer exceptions personnalisées : `AgentNotFoundException`, `InvalidContextException`
- [ ] Implémenter interface `ApiResponse<T>` standard
- [ ] Remplacer tous les `try-catch` par le nouveau système
- [ ] Configurer le filter global dans `main.ts`
- [ ] Tester les erreurs avec Postman/Insomnia

### 3. Tests Unitaires Critiques

- [ ] Installer Jest et supertest si manquants
- [ ] Créer tests pour `DaydreamsService.createAgent()`
- [ ] Créer tests pour `DaydreamsService.sendMessage()`
- [ ] Créer tests pour validation des DTOs
- [ ] Créer tests pour gestion d'erreurs
- [ ] Configurer coverage minimum à 80%

### 4. Documentation Swagger Basique

- [x] @nestjs/swagger installé
- [ ] Ajouter décorateurs `@ApiTags()` sur chaque contrôleur
- [ ] Documenter endpoints critiques avec `@ApiOperation()`
- [x] DTOs documentés avec `@ApiProperty()`
- [ ] Configurer Swagger dans `main.ts`
- [ ] Vérifier documentation sur `/api/docs`

## Phase 2 - Architecture (Priorité Moyenne)

### 5. Refactoring DaydreamsController

- [ ] Créer `StreamingService` pour la logique de streaming
- [ ] Créer `AgentOrchestrationService` pour la logique métier
- [ ] Extraire méthode `streamMessage` vers `StreamingService`
- [ ] Réduire chaque méthode du contrôleur à < 20 lignes
- [ ] Supprimer toute logique métier du contrôleur
- [ ] Tester les endpoints après refactoring

### 6. Séparation des Endpoints

- [ ] Créer `TemplatesController` dédié
- [ ] Migrer endpoints `/templates` vers nouveau contrôleur
- [x] Résolu duplication agents entre contrôleurs
- [ ] Standardiser préfixe `/api/v1/daydreams/`
- [ ] Mettre à jour documentation des routes
- [ ] Tester tous les endpoints migrés

### 7. Services Spécialisés

- [ ] Créer `AgentManagementService` (CRUD agents)
- [ ] Créer `MessageHandlingService` (envoi/stream messages)
- [x] `TemplateService` existe déjà
- [ ] Diviser `DaydreamsService` en services focalisés
- [ ] Limiter chaque service à une responsabilité
- [ ] Maintenir compatibilité avec code existant

### 8. Interfaces et Abstractions

- [ ] Créer interface `IAgentRepository`
- [ ] Créer interface `IMessageService`
- [ ] Créer interface `IStorageService`
- [ ] Remplacer dépendances directes par interfaces
- [ ] Configurer injection avec tokens dans module
- [ ] Tester découplage avec mocks

## Phase 3 - Optimisations (Priorité Basse)

### 9. Performance Base de Données

- [ ] Identifier queries N+1 dans les logs
- [ ] Implémenter batch loading pour `getAgentsWithConfigs()`
- [ ] Paralléliser `initializeAgents()` avec Promise.all
- [ ] Ajouter indices sur colonnes fréquemment requêtées
- [ ] Mesurer temps de réponse avant/après
- [ ] Documenter gains de performance

### 10. Système de Cache

- [ ] Installer @nestjs/cache-manager
- [ ] Configurer Redis ou cache mémoire
- [ ] Implémenter cache sur `getAgentConfig()` (TTL 5min)
- [ ] Invalider cache sur updates agents
- [ ] Ajouter métriques de hit/miss ratio
- [ ] Tester invalidation du cache

### 11. Rate Limiting

- [ ] Installer @nestjs/throttler
- [ ] Configurer limite globale (100 req/min)
- [ ] Ajouter limites spécifiques sur endpoints critiques
- [ ] Implémenter rate limit par IP
- [ ] Tester avec outils de charge
- [ ] Documenter limites dans Swagger

### 12. Monitoring et Logs

- [ ] Standardiser format des logs avec contexte
- [ ] Ajouter correlation ID aux requêtes
- [ ] Logger durée des opérations longues
- [ ] Configurer alertes sur erreurs critiques
- [ ] Créer dashboard de monitoring
- [ ] Documenter métriques clés

## Scripts et Outils Créés

### Test de Validation API

```bash
# Test complet du flux agent
./test-agent-flow.sh

# Options:
# 1. Run all tests
# 2. Test login
# 3. Create agent (direct)
# 4. List agents
# 5. Send message (streaming/non-streaming)
# 6. Get conversations
# 7. Test validation errors
```

### Import des Templates

```bash
# Importer les templates depuis context-proposals
cd llm-api/scripts
./import-templates.sh
```

## Fichiers de Documentation

- `REFACTO-SUMMARY.md` - Résumé des améliorations
- `MIGRATION-GUIDE.md` - Guide de migration pour les développeurs
- `test-agent-flow-README.md` - Documentation du script de test

## Commandes Utiles

```bash
# Tests
pnpm test                    # Lancer tous les tests
pnpm test:watch             # Tests en mode watch
pnpm test:cov               # Coverage

# Qualité
pnpm lint                   # Linter
pnpm format                 # Prettier

# Documentation
pnpm run build && pnpm start:prod  # Voir Swagger en production
```

## Notes

- Chaque tâche doit être testée individuellement
- Faire des commits atomiques par tâche
- Créer une branche par phase
- Review code avant merge dans master

## Prochaines Priorités

1. Finaliser la consolidation des contrôleurs
2. Implémenter GlobalExceptionFilter
3. Ajouter tests unitaires pour la validation
4. Configurer Swagger UI
