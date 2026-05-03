FROM evoapicloud/evolution-api:latest

# Basic Server Config
ENV SERVER_PORT=10000
ENV SERVER_HOST=0.0.0.0
ENV AUTHENTICATION_TYPE=apikey

EXPOSE 10000

CMD ["node", "dist/src/main.js"]
