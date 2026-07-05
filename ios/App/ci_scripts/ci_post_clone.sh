#!/bin/sh
set -eu

# Prepare Capacitor dependencies before Xcode Cloud resolves the iOS project.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$REPO_ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to install Capacitor dependencies for Xcode Cloud."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install Capacitor dependencies for Xcode Cloud."
  exit 1
fi

npm ci
npx cap sync ios
