#!/usr/bin/env bash
#
# Launch script for AI Slop Slides.
#
# Usage:
#   ./launch.sh          Start the dev server (default)
#   ./launch.sh dev      Start the Vite dev server
#   ./launch.sh build    Build the production bundle
#   ./launch.sh preview  Build then serve the production bundle
#
set -euo pipefail

# Move to the directory this script lives in so it works from anywhere.
cd "$(dirname "$0")"

MODE="${1:-dev}"

# Ensure Node.js is available.
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Install it from https://nodejs.org/ and retry." >&2
  exit 1
fi

# Install dependencies if node_modules is missing or package.json is newer.
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

case "$MODE" in
  dev)
    echo "Starting dev server on http://localhost:5173/ ..."
    exec npm run dev
    ;;
  build)
    echo "Building production bundle..."
    exec npm run build
    ;;
  preview)
    echo "Building and previewing production bundle..."
    npm run build
    exec npm run preview
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Usage: ./launch.sh [dev|build|preview]" >&2
    exit 1
    ;;
esac
