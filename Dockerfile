# syntax=docker/dockerfile:1

# Runtime-only image: ships the prebuilt dist/ plus production deps.
# Build dist/ locally first (`npm run build`) — source never enters the image.
FROM node:22-slim

WORKDIR /app

# Pin yarn classic (matches yarn.lock) and install production deps only.
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean

# The built application + its production env file.
COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 8080

# Run from inside dist/ so the cwd-relative paths in .env.production resolve,
# loading that env file from the parent directory (same model as `npm start`).
WORKDIR /app/dist
CMD ["node", "--env-file-if-exists=../.env.production", "index.js"]
