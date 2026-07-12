#!/bin/sh
set -eu

# Prepare Capacitor dependencies before Xcode Cloud resolves the iOS project.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$REPO_ROOT"

# Capacitor 8's CLI requires Node.js 22 or newer. Xcode Cloud images may expose
# an older preinstalled Node release, so select a compatible Homebrew runtime
# before installing the local Swift-package dependencies under node_modules.
NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
fi

if [ "$NODE_MAJOR" -lt 22 ]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Node.js 22 or newer is required by Capacitor 8, and Homebrew is unavailable."
    exit 1
  fi

  brew list node@22 >/dev/null 2>&1 || brew install node@22
  NODE_PREFIX="$(brew --prefix node@22)"
  export PATH="$NODE_PREFIX/bin:$PATH"
  export LDFLAGS="-L$NODE_PREFIX/lib ${LDFLAGS:-}"
  export CPPFLAGS="-I$NODE_PREFIX/include ${CPPFLAGS:-}"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install Capacitor dependencies for Xcode Cloud."
  exit 1
fi

echo "Using Node.js $(node --version) and npm $(npm --version)"

npm ci --no-audit --no-fund
npx --no-install cap sync ios
