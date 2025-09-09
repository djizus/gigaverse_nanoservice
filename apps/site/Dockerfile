# Build static site
FROM node:20-alpine AS build
WORKDIR /app

# Build args for Vite env
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

COPY package.json package-lock.json* bun.lock* .npmrc* ./
RUN npm install --no-audit --no-fund || true

COPY app ./app
COPY index.html ./index.html
COPY tsconfig.json ./tsconfig.json
COPY vite.config.ts ./vite.config.ts

RUN npm run build

# Serve with nginx
FROM nginx:alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
