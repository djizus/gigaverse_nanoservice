#!/bin/bash

# Script de test d'authentification avec curl
# Usage: ./test-auth-curl.sh [API_URL]

API_URL="${1:-http://localhost:3000}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

echo "🧪 Test d'authentification avec curl"
echo "📍 API URL: $API_URL"
echo "📧 Email de test: $TEST_EMAIL"
echo ""

# Couleurs pour la sortie
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Test de santé de l'API
echo "1️⃣  Test de santé de l'API..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ API accessible${NC}"
    echo "   Réponse: $BODY"
else
    echo -e "${RED}❌ API non accessible (HTTP $HTTP_CODE)${NC}"
    echo "   Réponse: $BODY"
    exit 1
fi

# 2. Test d'inscription
echo -e "\n2️⃣  Test d'inscription..."
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\", \"fullName\": \"Test User\"}")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Inscription réussie${NC}"
    echo "   Réponse: $BODY"
    USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "   User ID: $USER_ID"
else
    echo -e "${RED}❌ Échec de l'inscription (HTTP $HTTP_CODE)${NC}"
    echo "   Réponse: $BODY"
fi

# 3. Test de connexion sans approbation
echo -e "\n3️⃣  Test de connexion sans approbation..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ Connexion correctement refusée (utilisateur non approuvé)${NC}"
    echo "   Message: $BODY"
else
    echo -e "${RED}❌ La connexion aurait dû être refusée (HTTP $HTTP_CODE)${NC}"
    echo "   Réponse: $BODY"
fi

# 4. Test d'accès aux routes protégées
echo -e "\n4️⃣  Test d'accès aux routes protégées..."

echo "   a) Sans token..."
AGENTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/daydreams/agents")
HTTP_CODE=$(echo "$AGENTS_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "   ${GREEN}✅ Accès correctement refusé sans token${NC}"
else
    echo -e "   ${RED}❌ L'accès aurait dû être refusé (HTTP $HTTP_CODE)${NC}"
fi

echo "   b) Avec un faux token..."
AGENTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/daydreams/agents" \
  -H "Authorization: Bearer fake-token-123")
HTTP_CODE=$(echo "$AGENTS_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "   ${GREEN}✅ Accès correctement refusé avec faux token${NC}"
else
    echo -e "   ${RED}❌ L'accès aurait dû être refusé (HTTP $HTTP_CODE)${NC}"
fi

# Instructions finales
echo -e "\n📝 Pour tester la connexion avec approbation:"
echo "1. Connectez-vous à Supabase"
echo "2. Dans SQL Editor, exécutez:"
echo "   SELECT public.approve_user('$TEST_EMAIL');"
echo "3. Testez la connexion:"
echo "   curl -X POST $API_URL/auth/login \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}'"
echo ""
echo "4. Utilisez le token retourné pour accéder aux routes protégées:"
echo "   curl $API_URL/daydreams/agents \\"
echo "     -H \"Authorization: Bearer <votre-token>\""