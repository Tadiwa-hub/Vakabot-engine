FROM evoapicloud/evolution-api:latest

# Server Config
ENV SERVER_PORT=10000
ENV SERVER_HOST=0.0.0.0

# The "Fake" Database Validation Fix
# We set it to postgresql to pass the startup check, even though it's disabled.
ENV DATABASE_ENABLED=false
ENV DATABASE_CONNECTION_TYPE=postgresql
ENV DATABASE_CONNECTION_URI=postgresql://postgres:postgres@localhost:5432/evolution?sslmode=disable

# Authentication
ENV AUTHENTICATION_TYPE=apikey
ENV AUTHENTICATION_API_KEY=vakabot123
ENV AUTHENTICATION_EXPOSE_DOMAIN=true

# Webhook
ENV WEBHOOK_GLOBAL_ENABLED=true
ENV WEBHOOK_GLOBAL_URL=https://vakabot-backend.zimbabwe.workers.dev/webhook/evolution

EXPOSE 10000

CMD ["node", "dist/src/main.js"]
