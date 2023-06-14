# Base image
FROM node:14

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY fretifyv3/package*.json /app/

# Install dependencies
RUN npm ci --only=production

# Install TensorFlow
RUN pip install tensorflow

# Copy the application code into the container
COPY fretifyv3 /app

# Build the client
WORKDIR /app/src
RUN npm install
RUN npm run build

# Build the server
WORKDIR /app/server
RUN npm install

# Expose ports
EXPOSE 5000

# Set the command to run the server
CMD ["npm", "run", "start"]


# docker build -t fretify-image .

# # /# Run the server container
# docker run -d --name fretifyv3-server -p 5000:5000 fretifyv3-image

# # Run the client container
# docker run -d --name fretifyv3-client -e SERVER_HOSTNAME=fretifyv3-server -p 3000:3000 fretifyv3-image
