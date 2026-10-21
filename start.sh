#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"
BUILD_DIR="$PROJECT_DIR/dist"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
PORT="${PORT:-3000}"
export PORT

/usr/bin/time -p mkdir -p "$BUILD_DIR" "$WEB_DIR"

if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
fi

/usr/bin/time -p node "$PROJECT_DIR/build.mjs"
/usr/bin/time -p test -f "$BUILD_DIR/index.html"
/usr/bin/time -p /usr/bin/printf '{"project":"%s","directory":"%s"}\n' "$PROJECT_DIR" "$BUILD_DIR" > "$WEB_DIR/deployment-output.json"
/usr/bin/time -p /usr/bin/cat "$WEB_DIR/deployment-output.json"

echo "Starting preview on port $PORT from $BUILD_DIR"
exec /usr/bin/time -p node "$PROJECT_DIR/serve.mjs"
