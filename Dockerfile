# Use the official Node.js image as the base image
FROM node:20.15.1

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies required for mdns
RUN apt-get update && apt-get install -y libavahi-compat-libdnssd-dev

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Define the command to run your application
CMD ["node", "index.js"]
