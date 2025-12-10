# Full project Dockerfile (multistage: build frontend, build server)
FROM node:18-alpine AS build-frontend
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --silent
COPY . .
RUN npm run build || true

FROM node:18-alpine AS build-server
WORKDIR /srv
COPY server/package.json server/package-lock.json* ./ 
RUN npm ci --production --silent
COPY server ./server
RUN npm run build || true

FROM node:18-alpine
WORKDIR /app
COPY --from=build-frontend /app/dist ./dist
COPY --from=build-server /srv/server/dist ./server/dist
COPY server/package.json ./server/package.json
EXPOSE 3000 5173
CMD ["node", "server/dist/index.js"]