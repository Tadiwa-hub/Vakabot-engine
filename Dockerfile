FROM atendai/evolution-api:v1.8.2

# Baking all config directly into the image - guaranteed to work
ENV SERVER_PORT=10000
ENV SERVER_HOST=0.0.0.0
ENV AUTHENTICATION_TYPE=apikey
ENV AUTHENTICATION_API_KEY=vakabot123
ENV CACHE_REDIS_ENABLED=false
ENV CORS_ORIGIN=*
ENV CLEANUP_IGNORE_CONNECTED=true
ENV DATABASE_ENABLED=false

EXPOSE 10000

CMD ["node", "dist/src/main.js"]
