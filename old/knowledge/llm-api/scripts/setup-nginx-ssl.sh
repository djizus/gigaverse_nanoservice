#!/bin/bash

# Script d'installation Nginx avec Let's Encrypt pour l'API

echo "🔐 Configuration HTTPS pour l'API avec Nginx et Let's Encrypt"
echo "============================================================="

# Vérifier si un domaine est fourni
if [ -z "$1" ]; then
    echo "❌ Erreur: Veuillez fournir votre domaine"
    echo "Usage: ./setup-nginx-ssl.sh api.votre-domaine.com [email@example.com]"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@${DOMAIN#api.}"}

echo "📌 Domaine: $DOMAIN"
echo "📧 Email: $EMAIL"
echo ""

# 1. Installer Nginx et Certbot
echo "📦 Installation de Nginx et Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Créer la configuration Nginx
echo "📝 Création de la configuration Nginx..."
sudo tee /etc/nginx/sites-available/api > /dev/null << EOF
# Configuration temporaire pour obtenir le certificat
server {
    listen 80;
    server_name $DOMAIN;

    location ~ /.well-known/acme-challenge {
        allow all;
        root /var/www/html;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

# 3. Activer le site
echo "🔗 Activation du site..."
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 4. Obtenir le certificat SSL
echo "🔐 Obtention du certificat Let's Encrypt..."
sudo certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# 5. Mettre à jour la configuration avec SSL
echo "🔧 Configuration finale avec SSL..."
sudo tee /etc/nginx/sites-available/api > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

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
    access_log /var/log/nginx/$DOMAIN.access.log;
    error_log /var/log/nginx/$DOMAIN.error.log;

    # Proxy vers l'API NestJS
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

# 6. Recharger Nginx
echo "🔄 Rechargement de Nginx..."
sudo nginx -t && sudo systemctl reload nginx

# 7. Configuration du renouvellement automatique
echo "⏰ Configuration du renouvellement automatique..."
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx") | crontab -

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "🌐 Votre API est maintenant accessible via HTTPS à: https://$DOMAIN"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Assurez-vous que votre API NestJS tourne sur le port 3000"
echo "2. Configurez VITE_API_URL dans Vercel: https://$DOMAIN"
echo "3. Redéployez votre application Vercel"
echo ""
echo "🛠️ Commandes utiles:"
echo "  - Tester Nginx: sudo nginx -t"
echo "  - Voir les logs: sudo tail -f /var/log/nginx/$DOMAIN.error.log"
echo "  - Recharger: sudo systemctl reload nginx"
echo "  - Status SSL: sudo certbot certificates"