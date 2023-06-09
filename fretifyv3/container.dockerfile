# Stage 1: Build the client
FROM node:14 AS client
WORKDIR /app/client
COPY package*.json ./
RUN npm install
COPY src ./src
COPY public ./public
RUN npm run build

# Stage 2: Build the server
FROM node:14 AS server
WORKDIR /app/server
COPY package*.json ./
RUN npm install
COPY server ./server
COPY --from=client /app/client/build ./build
COPY --from=client /app/client/public ./public
COPY --from=client /app/client/src /app/src

# Stage 3: Run the client and server
FROM node:14 AS production
WORKDIR /app
COPY --from=client /app/client/build ./client/build
COPY --from=server /app/server ./server
COPY --from=client /app/client/public ./public
COPY --from=server /app/src ./src
COPY package*.json ./
RUN npm install --production
RUN npm install -g npm-run-all
RUN npm install request
CMD ["npm-run-all", "dev"]


# docker run -p 3000:3000 -p 5000:5000 fretify
#docker run -d --name fretify -p 5000:5000 fretify-image
#docker run -d --name fretify-client -p 3000:3000 fretify npm run start --prefix /app/src
#docker run -d --name fretify-server -p 5000:5000 fretify npm run dev --prefix /app/server
