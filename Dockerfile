FROM evoapicloud/evolution-api:latest

# Basic Server Config
ENV SERVER_PORT=10000
ENV SERVER_HOST=0.0.0.0

# Authentication
ENV AUTHENTICATION_TYPE=apikey
ENV AUTHENTICATION_API_KEY=vakabot123

EXPOSE 10000

# We force the variables into the startup command itself
CMD ["sh", "-c", "DATABASE_ENABLED=true DATABASE_CONNECTION_TYPE=postgres DATABASE_CONNECTION_URI=$DATABASE_CONNECTION_URI node dist/src/main.js"]
