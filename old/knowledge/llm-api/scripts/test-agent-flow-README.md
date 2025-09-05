# Test Agent Flow - Guide d'utilisation

Ce script permet de tester l'ensemble du flux de création et d'utilisation des agents via des requêtes curl.

## Installation

```bash
chmod +x test-agent-flow.sh
```

## Utilisation

### Mode interactif (recommandé)

```bash
./test-agent-flow.sh
```

Cela affichera un menu avec toutes les options disponibles :

```
=== Agent API Test Suite ===
1. Run all tests
2. Test login
3. Create agent (direct)
4. List agents
5. Get specific agent
6. Send message (non-streaming)
7. Send message (streaming)
8. Get conversations
9. Get messages
10. Create agent (template)
11. Delete agent
12. Test validation errors
0. Exit
Select test:
```

### Mode ligne de commande

Pour exécuter un test spécifique directement :

```bash
./test-agent-flow.sh 3  # Créer un agent
./test-agent-flow.sh 6  # Envoyer un message
./test-agent-flow.sh 1  # Exécuter tous les tests
```

## Tests disponibles

### 1. Run all tests

Exécute une suite complète de tests dans l'ordre :

- Login
- Création d'agent
- Liste des agents
- Récupération d'un agent spécifique
- Envoi de message
- Récupération des conversations
- Récupération des messages
- Suppression de l'agent

### 2. Test login

Teste l'authentification avec les credentials par défaut :

- Email: test@example.com
- Password: password123

### 3. Create agent (direct)

Crée un nouvel agent avec :

- ModelType: anthropic
- ModelId: claude-3-5-sonnet-latest
- Contexte: chat

### 4. List agents

Récupère la liste de tous les agents disponibles.

### 5. Get specific agent

Récupère les détails d'un agent spécifique (nécessite un agent créé).

### 6. Send message (non-streaming)

Envoie un message simple à l'agent et récupère la réponse complète.

### 7. Send message (streaming)

Envoie un message avec réponse en streaming (SSE).

### 8. Get conversations

Récupère toutes les conversations de l'agent.

### 9. Get messages

Récupère tous les messages d'une conversation spécifique.

### 10. Create agent (template)

Crée un agent à partir d'un template existant.

### 11. Delete agent

Supprime l'agent de test.

### 12. Test validation errors

Teste les erreurs de validation :

- ModelType manquant
- ModelType invalide
- Content manquant dans un message

## Fichiers temporaires

Le script crée des fichiers temporaires pour stocker les IDs :

- `.test_agent_id` : ID de l'agent créé
- `.test_session_id` : ID de la session active

Ces fichiers sont automatiquement nettoyés lors de la suppression de l'agent.

## Exemples d'utilisation

### Test rapide de création et message

```bash
# Créer un agent
./test-agent-flow.sh 3

# Envoyer un message
./test-agent-flow.sh 6

# Voir les conversations
./test-agent-flow.sh 8

# Nettoyer
./test-agent-flow.sh 11
```

### Test de validation

```bash
# Tester les erreurs de validation
./test-agent-flow.sh 12
```

### Test complet avec streaming

```bash
# Créer agent
./test-agent-flow.sh 3

# Message streaming (observe les événements SSE)
./test-agent-flow.sh 7

# Nettoyer
./test-agent-flow.sh 11
```

## Dépannage

### Erreur "No agent ID found"

Certains tests nécessitent qu'un agent soit créé au préalable. Exécutez d'abord le test 3.

### Erreur d'authentification

Si vous obtenez des erreurs 401, vérifiez que :

- L'API est bien lancée
- Les endpoints ont les décorateurs `@Public()` pour les tests
- Les credentials sont corrects

### Format JSON illisible

Le script utilise `jq` si disponible pour formater le JSON. Installez-le avec :

```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq
```
