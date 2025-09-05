# Guide de Déploiement - LLM API

Ce guide explique comment déployer automatiquement l'application sur votre VPS Hostinger via GitHub Actions.

## 🔧 Pré-requis sur le VPS

### 1. Installation de Docker et Docker Compose

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installation de Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Vérification
docker --version
docker-compose --version
```

### 2. Configuration de l'utilisateur

```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Créer le répertoire du projet
sudo mkdir -p /home/llm-api
sudo chown -R $USER:$USER /home/llm-api
```

> **Note** : Le repository Git sera automatiquement cloné par la GitHub Action lors du premier déploiement. Aucune configuration Git manuelle n'est nécessaire !

## 🔐 Configuration des Secrets GitHub

Dans votre repository GitHub, allez dans Settings → Secrets and variables → Actions, et ajoutez les secrets suivants :

### Secrets Obligatoires

- **`VPS_IP`** : L'adresse IP de votre VPS (ex: `192.168.1.100`)
- **`VPS_USERNAME`** : Le nom d'utilisateur SSH (généralement `root` ou votre utilisateur)
- **`VPS_SSH_KEY`** : La clé SSH privée pour se connecter au VPS (voir ci-dessous)

### Secrets Optionnels

- **`VPS_PORT`** : Le port SSH si différent de 22 (par défaut: 22)
- **`PROJECT_PATH`** : Le chemin du projet sur le VPS (par défaut: `/home/llm-api`)

### Générer et Configurer la Clé SSH

1. **Sur votre machine locale**, générez une nouvelle paire de clés SSH :

**Windows (PowerShell)** :

```powershell
ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$env:USERPROFILE\.ssh\vps_deploy_key"
```

**Linux/Mac** :

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_key
```

2. **Copiez la clé publique sur votre VPS** :

**Windows (PowerShell)** :

```powershell
# Afficher la clé publique
Get-Content "$env:USERPROFILE\.ssh\vps_deploy_key.pub"

# Connectez-vous au VPS et ajoutez la clé manuellement
ssh username@vps_ip

# Sur le VPS, ajoutez la clé (collez le contenu affiché précédemment)
echo "COLLEZ_ICI_LE_CONTENU_DE_LA_CLE_PUBLIQUE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

**Alternative Windows (en une commande)** :

```powershell
# Copier la clé en une seule commande
type "$env:USERPROFILE\.ssh\vps_deploy_key.pub" | ssh username@vps_ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**Linux/Mac** :

```bash
ssh-copy-id -i ~/.ssh/vps_deploy_key.pub username@vps_ip
```

3. **Ajoutez la clé privée comme secret GitHub** :

**Windows (PowerShell)** :

```powershell
# Afficher la clé privée
Get-Content "$env:USERPROFILE\.ssh\vps_deploy_key"
# Copiez tout le contenu et collez-le dans le secret VPS_SSH_KEY
```

**Linux/Mac** :

```bash
cat ~/.ssh/vps_deploy_key
# Copiez tout le contenu et collez-le dans le secret VPS_SSH_KEY
```

## 📝 Configuration de l'Application

### 1. Fichier `.env.production`

Créez un fichier `.env.production` sur votre VPS dans `/home/llm-api/` :

```bash
# Core API Keys
ANTHROPIC_API_KEY=sk-ant-...
DISCORD_TOKEN=...
DISCORD_BOT_NAME=...

# Database
SUPABASE_URL=https://...
SUPABASE_API_KEY=...

# Optional
OPENAI_API_KEY=...
NOTION_API_KEY=...
USE_CHROMA=true
MEMORY_TYPE=supabase
PORT=80

# GitHub Package Registry (si utilisation d'images privées)
GITHUB_USERNAME=votre-username
VERSION=latest
```

### 2. Configuration SSL (HTTPS)

Si vous souhaitez activer HTTPS avec Nginx :

```bash
# Créer les répertoires nécessaires
mkdir -p /home/llm-api/nginx/ssl
mkdir -p /home/llm-api/nginx/conf.d

# Utiliser Let's Encrypt pour les certificats SSL
sudo apt install certbot
sudo certbot certonly --standalone -d votre-domaine.com
```

## 🚀 Déploiement

### Déploiement Automatique

Chaque push sur la branche `main` ou `master` déclenchera automatiquement le déploiement.

### Déploiement Manuel

1. Via GitHub Actions : Allez dans Actions → Deploy to VPS → Run workflow
2. Via SSH direct :

```bash
ssh username@vps_ip
cd /home/llm-api
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 🔍 Vérification et Monitoring

### Vérifier le statut des conteneurs

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

### Vérifier la santé de l'application

```bash
curl http://localhost/health
```

### Redémarrer l'application

```bash
docker compose -f docker-compose.prod.yml restart
```

## 🛑 Dépannage

### Problèmes courants

1. **Erreur de permission Docker** :

```bash
sudo usermod -aG docker $USER
newgrp docker
```

2. **Port déjà utilisé** :

```bash
sudo lsof -i :80
sudo systemctl stop apache2  # ou nginx si installé
```

3. **Problème de mémoire** :

```bash
docker system prune -a
```

4. **Logs d'erreur** :

```bash
docker compose -f docker-compose.prod.yml logs llm-api --tail=100
```

## 📋 Checklist de Déploiement

- [ ] Docker et Docker Compose installés sur le VPS
- [ ] Clé SSH configurée et ajoutée aux secrets GitHub
- [ ] Fichier `.env.production` créé sur le VPS
- [ ] Secrets GitHub configurés (VPS_IP, VPS_USERNAME, VPS_SSH_KEY)
- [ ] Premier `git pull` effectué manuellement sur le VPS
- [ ] Ports nécessaires ouverts dans le firewall (80, 443, 3000)
- [ ] Test de connexion SSH depuis GitHub Actions réussi
