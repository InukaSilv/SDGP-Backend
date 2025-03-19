# Use the official Node.js image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Set environment variables
ENV NODE_ENV=production

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 5001

# Command to run your application
CMD ["node", "src/server.js"]