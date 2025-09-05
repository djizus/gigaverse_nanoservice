#!/bin/bash

echo "🔐 Déploiement de l'API avec HTTPS (certificat auto-signé)"
echo "========================================================="

# Arrêter les conteneurs existants
echo "🛑 Arrêt des services existants..."
docker-compose down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.caddy.yml down 2>/dev/null || true

# Vérifier les ports
echo "🔍 Vérification des ports 80 et 443..."
if sudo lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Le port 80 est utilisé. Tentative d'arrêt..."
    sudo systemctl stop apache2 2>/dev/null || true
    sudo systemctl stop nginx 2>/dev/null || true
fi

if sudo lsof -Pi :443 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Le port 443 est utilisé. Tentative d'arrêt..."
    sudo systemctl stop apache2 2>/dev/null || true
    sudo systemctl stop nginx 2>/dev/null || true
fi

# Construire et démarrer
echo "🏗️  Construction des images Docker..."
docker-compose -f docker-compose.ssl.yml build

echo "🚀 Démarrage des services..."
docker-compose -f docker-compose.ssl.yml up -d

# Attendre le démarrage
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le statut
echo "📊 Statut des services:"
docker-compose -f docker-compose.ssl.yml ps

# Test de l'API
echo ""
echo "🧪 Test de l'API..."
echo "HTTP redirect test:"
curl -I http://193.203.191.46

echo ""
echo "HTTPS test (avec certificat auto-signé):"
curl -k https://193.203.191.46/health

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "🌐 Votre API est accessible via HTTPS à: https://193.203.191.46"
echo ""
echo "📝 Configuration Vercel:"
echo "   Dans les paramètres de votre projet Vercel:"
echo "   - Ajoutez: VITE_API_URL=https://193.203.191.46"
echo "   - Redéployez votre application"
echo ""
echo "⚠️  Note: Le navigateur affichera un avertissement de sécurité"
echo "   car le certificat est auto-signé. C'est normal."
echo ""
echo "🛠️  Commandes utiles:"
echo "  - Logs API: docker logs llm-api"
echo "  - Logs Nginx: docker logs nginx-ssl"
echo "  - Arrêter: docker-compose -f docker-compose.ssl.yml down"
echo "  - Redémarrer: docker-compose -f docker-compose.ssl.yml restart"