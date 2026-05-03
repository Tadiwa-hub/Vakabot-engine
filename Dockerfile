FROM evoapicloud/evolution-api:latest

# Server Config
ENV SERVER_PORT=10000
ENV SERVER_HOST=0.0.0.0

# Database Configuration (Real Neon)
ENV DATABASE_ENABLED=true
ENV DATABASE_CONNECTION_TYPE=postgresql
# We leave the URI empty here so we can add it safely in Render
ENV DATABASE_CONNECTION_URI=""
ENV DATABASE_CONNECTION_CLIENT_NAME=evolution_prod

# Authentication
ENV AUTHENTICATION_TYPE=apikey
ENV AUTHENTICATION_API_KEY=vakabot123
ENV AUTHENTICATION_EXPOSE_DOMAIN=true

# Webhook
ENV WEBHOOK_GLOBAL_ENABLED=true
ENV WEBHOOK_GLOBAL_URL=https://vakabot-backend.zimbabwe.workers.dev/webhook/evolution
ENV WEBHOOK_EVENTS_ERRORS=true

EXPOSE 10000

CMD ["node", "dist/src/main.js"]
