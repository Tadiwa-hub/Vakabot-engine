# We are moving to the new official v2.1 image repository
FROM evoapicloud/evolution-api:v2.1.1

# Configuration for v2
ENV SERVER_PORT=10000
ENV SERVER_HOST=0.0.0.0

# Authentication
ENV AUTHENTICATION_TYPE=apikey
ENV AUTHENTICATION_API_KEY=vakabot123
ENV AUTHENTICATION_EXPOSE_DOMAIN=true

# Disable internal database/cache for now to match your previous setup
ENV DATABASE_ENABLED=false
ENV CACHE_REDIS_ENABLED=false

# Webhook Settings
ENV WEBHOOK_GLOBAL_ENABLED=true
ENV WEBHOOK_GLOBAL_URL=https://vakabot-backend.zimbabwe.workers.dev/webhook/evolution
ENV WEBHOOK_EVENTS_ERRORS=true

EXPOSE 10000

CMD ["node", "dist/src/main.js"]
