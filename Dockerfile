# Imagen de producción del frontend para Railway (spec docs/specs/proxy-railway.md).
# Caddy sirve la app y reenvía /api/* al gateway por la red privada: el navegador ve
# un solo dominio, así que la cookie de sesión (SameSite=Lax) funciona en todos.

# --- Build: la misma versión de Node que el CI y pnpm desde packageManager ---
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# Con el proxy, la app llama a su propio dominio (/api/...).
ARG VITE_URL_API_BACKEND=/
ENV VITE_URL_API_BACKEND=$VITE_URL_API_BACKEND
RUN pnpm build

# --- Servidor: Caddy con los archivos de dist/ ---
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

# Caddy arranca aunque GATEWAY_URL esté vacía y respondería 502 en silencio: sin ella,
# el contenedor no arranca.
CMD ["sh", "-c", "if [ -z \"$GATEWAY_URL\" ]; then echo 'Falta la variable GATEWAY_URL (URL privada del gateway).' >&2; exit 1; fi; exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile"]
