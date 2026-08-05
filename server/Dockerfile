FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node . .
RUN mkdir -p /app/legacy-db/uploads \
    && chown -R node:node /app/legacy-db
EXPOSE 3001
ENV NODE_ENV=production
USER node
CMD ["node", "index.js"]
