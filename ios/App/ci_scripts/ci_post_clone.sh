#!/bin/sh
set -eu

# Prepare Capacitor dependencies before Xcode Cloud resolves the iOS project.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$REPO_ROOT"

# Xcode resolves the committed CapApp-SPM package from the Capacitor packages
# under node_modules. It does not need a web build or a fresh `cap sync` here.
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Node.js and npm are required to install Capacitor packages, and Homebrew is unavailable."
    exit 1
  fi

  brew list node@22 >/dev/null 2>&1 || brew install node@22
  NODE_PREFIX="$(brew --prefix node@22)"
  export PATH="$NODE_PREFIX/bin:$PATH"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install Capacitor dependencies for Xcode Cloud."
  exit 1
fi

echo "Using Node.js $(node --version) and npm $(npm --version)"

# Ignore unrelated package lifecycle scripts (for example native web tooling)
# and dev-only tooling. Capacitor's iOS runtime and plugins are dependencies.
npm ci --omit=dev --ignore-scripts --no-audit --no-fund

for package in core ios app haptics push-notifications; do
  if [ ! -d "$REPO_ROOT/node_modules/@capacitor/$package" ]; then
    echo "Required Capacitor package is missing after npm ci: @capacitor/$package"
    exit 1
  fi
done

echo "Capacitor Swift package dependencies are ready."
