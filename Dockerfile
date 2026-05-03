FROM evoapicloud/evolution-api:v2.1.1

# Server Config
ENV SERVER_PORT=10000
ENV SERVER_HOST=0.0.0.0

# Database - Satisfying v2 validation even though it's disabled
ENV DATABASE_ENABLED=false
ENV DATABASE_CONNECTION_TYPE=sqlite
ENV DATABASE_CONNECTION_CLIENT_NAME=evolution_local

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
