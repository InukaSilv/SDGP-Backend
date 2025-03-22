# Use the official Node.js image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Install dependencies
RUN npm ci --only=production

# Copy the application code
COPY . .

# Expose the port app runs on
EXPOSE 5001

# Command to run application
CMD ["node", "src/server.js"]