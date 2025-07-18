# Dockerfile

# 1. Base Stage: Install dependencies
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install

# 2. Builder Stage: Build the Next.js app
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
# This will create a .next folder with the production build
RUN npm run build

# 3. Runner Stage: Create the final, small image
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
# The app will run on port 3000 by default
ENV PORT=3000

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose the port the app runs on
EXPOSE 3000

# Start the app
# The command should point to the server.js file inside the standalone output
CMD ["node", "server.js"]
