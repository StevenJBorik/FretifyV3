# Server build stage
FROM node:14 AS server
WORKDIR /app/server
COPY ./fretifyv3/server/package*.json ./
RUN npm ci --only=production
COPY ./fretifyv3/server ./

# Client build stage
FROM node:14 AS src
WORKDIR /app/src
COPY ./fretifyv3/package*.json ./
RUN npm ci --only=production
COPY ./fretifyv3/src ./

# Production stage
FROM node:14 AS production
WORKDIR /app
COPY --from=server /app/server ./server
COPY --from=src /app/src ./src
RUN npm run build

# Final image
FROM node:14
WORKDIR /app
COPY --from=production /app/server ./server
COPY --from=production /app/src/build ./src/build
RUN npm ci --only=production

EXPOSE 5000
CMD ["node", "./server/index.js"]

# docker build -t fretify-image .

# # /# Run the server container
# docker run -d --name fretifyv3-server -p 5000:5000 fretifyv3-image

# # Run the client container
# docker run -d --name fretifyv3-client -e SERVER_HOSTNAME=fretifyv3-server -p 3000:3000 fretifyv3-image
