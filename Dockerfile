FROM node:22.12.0-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies without cache mount to avoid EBUSY errors
RUN npm ci --prefer-offline --no-audit

# Copy application files
COPY . .

# Declare build-time variables (values come from Railway dashboard)
ARG VITE_GITHUB_CLIENT_ID
ARG VITE_GITHUB_REDIRECT_URI
ARG VITE_HAS_TRIAL
ARG VITE_DEFAULT_AI_PROVIDER
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID
ENV VITE_GITHUB_REDIRECT_URI=$VITE_GITHUB_REDIRECT_URI
ENV VITE_HAS_TRIAL=$VITE_HAS_TRIAL
ENV VITE_DEFAULT_AI_PROVIDER=$VITE_DEFAULT_AI_PROVIDER

# Build the application
RUN npm run build

# Start the application
CMD ["node", "server.js"]
