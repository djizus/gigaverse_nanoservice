# Dockerfile pour Nginx avec SSL auto-signé
FROM nginx:alpine

# Installer certbot pour Let's Encrypt
RUN apk add --no-cache certbot certbot-nginx openssl

# Créer les répertoires pour les certificats et webroot
RUN mkdir -p /etc/nginx/ssl /var/www/certbot

# Générer un certificat auto-signé avec TOUS les noms possibles
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/cert.key \
    -out /etc/nginx/ssl/cert.pem \
    -subj "/C=FR/ST=State/L=City/O=Organization/CN=aifred.cloud" && \
    cp /etc/nginx/ssl/cert.key /etc/nginx/ssl/key.pem && \
    cp /etc/nginx/ssl/cert.key /etc/nginx/ssl/api.key && \
    cp /etc/nginx/ssl/cert.pem /etc/nginx/ssl/api.crt

# Supprimer complètement le répertoire conf.d et le recréer
RUN rm -rf /etc/nginx/conf.d && mkdir -p /etc/nginx/conf.d
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/api-ssl.conf /etc/nginx/conf.d/api-ssl.conf

# Exposer les ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]