# Step 1: SSH into your server (if using SSH)
# Replace with your server details
$server = "user@your-server-ip"
$projectDir = "/var/www/rivve-backend"

# Step 2: Pull the latest changes from the repository
ssh $server "cd $projectDir && git pull origin main"

# Step 3: Install dependencies
ssh $server "cd $projectDir && npm install"

# Step 4: Restart the application
ssh $server "cd $projectDir && pm2 restart app.js"  # Replace with your process manager command