#!/usr/bin/env bash
set -euo pipefail

SERVER="adfactory"
REMOTE_DIR="/var/www/adfactory"

echo "Deploying to $SERVER..."

ssh $SERVER "cd $REMOTE_DIR && \
  git pull origin main && \
  npm run build && \
  echo '{\"built\":\"'$(date +%Y-%m-%d_%H:%M:%S)'\"}' > public/version.json && \
  php artisan config:cache && \
  php artisan route:cache && \
  echo 'Deployed: '$(cat public/version.json)"
