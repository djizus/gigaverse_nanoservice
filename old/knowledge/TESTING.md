# Guide de Test et Déploiement

## 🚀 Quick Start

### Tester une branche localement
```bash
# Tester la branche courante
./test-branch.sh

# Tester une branche spécifique sur un port spécifique
./test-branch.sh develop 3002
```

### Déployer et tester plusieurs branches
```bash
# Déployer toutes les branches configurées
./deploy-and-test.sh deploy

# Tester toutes les branches
./deploy-and-test.sh test

# Voir le statut
./deploy-and-test.sh status
```

## 🔄 Workflow Git

### Automatique sur GitHub

1. **Tests automatiques** sur chaque push
   - Branches : master, develop, contextfactory
   - Lance les tests automatiquement
   - Commente les PR avec les résultats

2. **Déploiement sur GitHub Registry**
   - Push sur master/develop = déploiement automatique
   - Images Docker disponibles sur `ghcr.io`

### Tester une image déployée
```bash
# Se connecter à GitHub Registry (une fois)
docker login ghcr.io -u YOUR_GITHUB_USERNAME

# Tester l'image déployée
./test-deployed.sh develop
./test-deployed.sh master
```

## 📋 Configuration

### Variables d'environnement requises
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export SUPABASE_URL="https://..."
export SUPABASE_API_KEY="..."
```

### Ports par défaut
- master : 3001
- develop : 3002
- contextfactory : 3003
- feature : 3004+

## 🎯 Cas d'usage

### 1. Développer une feature
```bash
git checkout -b feature/ma-feature
# ... coder ...
./test-branch.sh                    # Test local
git push                            # Tests auto sur GitHub
```

### 2. Comparer les branches
```bash
./deploy-and-test.sh deploy        # Déploie toutes les branches
./deploy-and-test.sh test          # Compare les résultats
```

### 3. Tester avant merge
```bash
# Sur une PR, les tests se lancent automatiquement
# Ou manuellement :
./test-branch.sh feature/xyz 3005
```

### 4. Déploiement manuel sur GitHub
1. Aller sur GitHub → Actions → "Deploy to Staging"
2. Cliquer "Run workflow"
3. Choisir la branche
4. L'image Docker sera disponible sur ghcr.io

## 📊 Résultats des tests

### Localement
- Logs dans le terminal
- Résultats dans `/tmp/test-*.log`

### Sur GitHub
- Voir l'onglet Actions
- Les PR sont commentées automatiquement
- Artifacts téléchargeables

## 🛠 Troubleshooting

### API ne démarre pas
```bash
# Voir les logs
docker logs llm-api-3001

# Vérifier les variables d'env
env | grep -E "ANTHROPIC|SUPABASE"
```

### Tests échouent
```bash
# Tester manuellement un endpoint
curl http://localhost:3001/health

# Voir les logs détaillés
cd llm-api/scripts/test
./test-agents.sh
```

### Nettoyer les containers
```bash
# Arrêter tous les containers de test
docker stop $(docker ps -q --filter "name=llm-api-")
docker rm $(docker ps -aq --filter "name=llm-api-")
```

## 📝 Structure des tests

```
llm-api/scripts/test/
├── run-all-tests.sh      # Lance tous les tests
├── test-auth.sh          # Authentification
├── test-health.sh        # Endpoints de base
├── test-agents.sh        # CRUD agents
├── test-agent-chat.sh    # Interactions chat
├── test-templates.sh     # Gestion templates
└── test-factories.sh     # Factory systems
```