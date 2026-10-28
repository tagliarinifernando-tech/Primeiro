#!/bin/bash
# Installs the /efeito skill's dependencies (Remotion via npm, numpy in .venv) in cloud sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}/.claude/skills/efeito"

# Run the install only if a listed file has changed since the install last succeeded
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"

  # npm ci keeps package-lock.json untouched (npm install rewrites it)
  npm ci --no-audit --no-fund --loglevel=error
  mkdir -p assets
  sed 's/<path /<path fill="#D97757" /' node_modules/simple-icons/icons/claude.svg > assets/spark.svg

  [ -d .venv ] || python3 -m venv .venv
  .venv/bin/pip install -q numpy

  sha256sum "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh" package.json package-lock.json > "$hashes" || rm -f "$hashes"
fi

# Remotion can't download its own Chrome here, and the browser must go through the proxy to fetch Google Fonts
chrome=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux64/chrome 2>/dev/null | tail -1)
if [ -n "$chrome" ]; then
  printf '#!/bin/bash\nexec %s --proxy-server="$HTTPS_PROXY" "$@"\n' "$chrome" > node_modules/.chrome-proxy.sh
  chmod +x node_modules/.chrome-proxy.sh
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export REMOTION_BROWSER_EXECUTABLE=$PWD/node_modules/.chrome-proxy.sh" >> "$CLAUDE_ENV_FILE"
  fi
fi

mkdir -p trabalhos saidas
[ -f config.json ] || cp config.exemplo.json config.json
