#!/bin/bash
set -e

echo "==> Installing dependencies..."
npm install

echo "==> Building application..."
npx esbuild src/index.ts --bundle --platform=node --format=cjs --outfile=dist/index.js --packages=external --sourcemap

echo "==> Build complete!"
