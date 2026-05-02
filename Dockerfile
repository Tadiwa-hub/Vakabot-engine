FROM atendai/evolution-api:v1.6.1

# Render prefers port 10000 for its free tier
ENV SERVER_PORT=10000
ENV SERVER_HOST=0.0.0.0

# Expose the port
EXPOSE 10000

# Run the API
CMD ["node", "dist/src/main.js"]
