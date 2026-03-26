#!/bin/bash

set -e

DEPLOY_DIR="/var/www/image_kit"
BUILD_DIR="./dist"

echo "=== Starting deployment ==="

echo "Step 1: Installing dependencies..."
npm install

echo "Step 2: Building project..."
npm run build

echo "Step 3: Copying build artifacts to $DEPLOY_DIR..."
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Creating directory $DEPLOY_DIR..."
    sudo mkdir -p "$DEPLOY_DIR"
fi

sudo cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"

echo "=== Deployment completed successfully ==="
echo "Application deployed to $DEPLOY_DIR"
