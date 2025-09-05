#!/bin/bash

# Script pour configurer HTTPS avec un certificat auto-signé pour une IP

echo "🔐 Configuration HTTPS pour l'API avec certificat auto-signé"
echo "==========================================================="

IP="193.203.191.46"

echo "📌 Configuration pour l'IP: $IP"
echo ""

# 1. Installer Nginx si nécessaire
echo "📦 Installation de Nginx..."
sudo apt update
sudo apt install -y nginx openssl

# 2. Créer un certificat auto-signé
echo "🔐 Création du certificat auto-signé..."
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/api.key \
    -out /etc/nginx/ssl/api.crt \
    -subj "/C=FR/ST=State/L=City/O=Organization/CN=$IP"

# 3. Créer la configuration Nginx
echo "📝 Création de la configuration Nginx..."
sudo tee /etc/nginx/sites-available/api-ssl > /dev/null << EOF
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name $IP;
    return 301 https://\$server_name:8443\$request_uri;
}

# Configuration HTTPS sur le port 8443
server {
    listen 8443 ssl http2;
    server_name $IP;

    # Certificat auto-signé
    ssl_certificate /etc/nginx/ssl/api.crt;
    ssl_certificate_key /etc/nginx/ssl/api.key;

    # Configuration SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS pour Vercel
    add_header 'Access-Control-Allow-Origin' 'https://knowledge-sepia-gamma.vercel.app' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    # Gérer les requêtes OPTIONS (preflight)
    if (\$request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://knowledge-sepia-gamma.vercel.app' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Content-Length' 0;
        add_header 'Content-Type' 'text/plain';
        return 204;
    }

    # Logs
    access_log /var/log/nginx/api-ssl.access.log;
    error_log /var/log/nginx/api-ssl.error.log;

    # Proxy vers l'API NestJS sur le port 3000
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Taille maximale des uploads
    client_max_body_size 10M;
}
EOF

# 4. Activer le site
echo "🔗 Activation du site..."
sudo ln -sf /etc/nginx/sites-available/api-ssl /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Désactiver le site par défaut

# 5. Tester et recharger Nginx
echo "🔄 Test et rechargement de Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl restart nginx
    echo "✅ Nginx configuré avec succès!"
else
    echo "❌ Erreur dans la configuration Nginx"
    exit 1
fi

# 6. Ouvrir le port 8443 dans le firewall si ufw est actif
if command -v ufw &> /dev/null; then
    echo "🔥 Configuration du firewall..."
    sudo ufw allow 8443/tcp
fi

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "🌐 Votre API est maintenant accessible via HTTPS à: https://$IP:8443"
echo ""
echo "⚠️  IMPORTANT: Certificat auto-signé"
echo "   Les navigateurs afficheront un avertissement de sécurité."
echo "   Les utilisateurs devront accepter le certificat."
echo ""
echo "📝 Configuration Vercel:"
echo "   VITE_API_URL=https://$IP:8443"
echo ""
echo "🛠️ Commandes utiles:"
echo "  - Tester: curl -k https://$IP:8443/health"
echo "  - Logs: sudo tail -f /var/log/nginx/api-ssl.error.log"
echo "  - Status: sudo systemctl status nginx"