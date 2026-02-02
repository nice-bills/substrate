# Substrate Economy Docker Configuration
# Runs the complete economy system

FROM node:22-bookworm

WORKDIR /app

# Copy project files
COPY package*.json ./
COPY api/ ./api/
COPY data/ ./data/
COPY scripts/ ./scripts/

# Install dependencies
RUN npm install --prefix api

# Create directories
RUN mkdir -p /app/logs /app/backups /app/state

# Copy contract artifacts
COPY contracts/out/ ./contracts/out/ 2>/dev/null || true

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV STATE_FILE=/app/data/economy-state.json
ENV TRANSACTIONS_DIR=/app/data/transactions
ENV DISPUTES_DIR=/app/data/disputes

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server
CMD ["npm", "start", "--prefix", "api"]

# Alternative: Run with custom state file
# CMD ["node", "api/src/server.js"]
