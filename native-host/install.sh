#!/usr/bin/env bash
#
# Install the subscription helper on this Mac, so the extension can summarise
# with your Claude, ChatGPT and Gemini subscriptions instead of API credits.
#
# It copies bridge.mjs to ~/Library/Application Support/TimestampedSummary,
# records where node, claude, codex and agy live (the browser starts the helper
# with a bare PATH that finds none of them), and registers the helper with every
# Chromium browser found here: Arc, Chrome, Chromium, Brave, Edge, Aside.
#
#   bash native-host/install.sh [extension-id ...]   install (or update)
#   bash native-host/install.sh --uninstall          remove it again
#
# With no id it allows this folder's unpacked extension. Pass the Web Store id
# too if you also run the store build.

set -euo pipefail

HOST_NAME="com.timestamped_summary.bridge"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
APP_DIR="$HOME/Library/Application Support/TimestampedSummary"

BROWSER_DIRS=(
  "$HOME/Library/Application Support/Arc/User Data"
  "$HOME/Library/Application Support/Google/Chrome"
  "$HOME/Library/Application Support/Google/Chrome Beta"
  "$HOME/Library/Application Support/Chromium"
  "$HOME/Library/Application Support/BraveSoftware/Brave-Browser"
  "$HOME/Library/Application Support/Microsoft Edge"
  "$HOME/Library/Application Support/Aside"
)

if [[ "${1:-}" == "--uninstall" ]]; then
  for dir in "${BROWSER_DIRS[@]}"; do
    rm -f "$dir/NativeMessagingHosts/$HOST_NAME.json"
  done
  rm -rf "$APP_DIR"
  echo "Removed the subscription helper."
  exit 0
fi

# An unpacked extension's id is derived from its folder: the first 32 hex
# digits of SHA-256 over the path, spelled with the letters a-p.
unpacked_id() {
  printf '%s' "$1" | shasum -a 256 | cut -c1-32 | tr '0-9a-f' 'a-p'
}

IDS=("$@")
if [[ ${#IDS[@]} -eq 0 ]]; then
  IDS=("$(unpacked_id "$REPO")")
fi

# Resolve tools the way your own terminal would.
resolve() {
  /bin/zsh -lic "command -v $1" 2>/dev/null | tail -n1 || true
}
NODE_BIN="$(resolve node)"
CLAUDE_BIN="$(resolve claude)"
CODEX_BIN="$(resolve codex)"
if [[ -z "$CODEX_BIN" ]]; then
  for candidate in "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex" \
                   "/Applications/Codex.app/Contents/Resources/codex"; do
    if [[ -x "$candidate" ]]; then CODEX_BIN="$candidate"; break; fi
  done
fi
# Prefer the app-bundled agy binary when present so a stale ~/.local/bin/agy
# left from an older CLI install does not shadow Gemini.app updates.
AGY_BIN=""
for candidate in "/Applications/Gemini.app/Contents/Helpers/agy" \
                 "/Applications/Antigravity.app/Contents/Helpers/agy"; do
  if [[ -x "$candidate" ]]; then AGY_BIN="$candidate"; break; fi
done
if [[ -z "$AGY_BIN" ]]; then
  AGY_BIN="$(resolve agy)"
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "Node.js was not found. Install it (18 or newer), then run this again." >&2
  exit 1
fi

mkdir -p "$APP_DIR"
cp "$HERE/bridge.mjs" "$APP_DIR/bridge.mjs"

NODE_BIN="$NODE_BIN" CLAUDE_BIN="$CLAUDE_BIN" CODEX_BIN="$CODEX_BIN" AGY_BIN="$AGY_BIN" "$NODE_BIN" -e '
  const config = {};
  if (process.env.CLAUDE_BIN) config.claude = process.env.CLAUDE_BIN;
  if (process.env.CODEX_BIN) config.codex = process.env.CODEX_BIN;
  if (process.env.AGY_BIN) config.agy = process.env.AGY_BIN;
  process.stdout.write(JSON.stringify(config, null, 2) + "\n");
' > "$APP_DIR/bridge-config.json"

# The browser runs this file directly, so it names node by its full path.
# Claude Code finds its sign-in in the Keychain by user name; without USER it
# reports itself signed out, so the launcher makes sure it is set.
cat > "$APP_DIR/run-bridge.sh" <<EOF
#!/bin/bash
export USER="\${USER:-\$(/usr/bin/id -un)}"
export LOGNAME="\${LOGNAME:-\$USER}"
# One line per launch, plus anything the helper prints on stderr: the first
# place to look when the extension says the helper did not answer.
LOG="$APP_DIR/bridge.log"
[ -f "\$LOG" ] && [ "\$(/usr/bin/wc -l < "\$LOG")" -gt 500 ] && /usr/bin/tail -n 200 "\$LOG" > "\$LOG.tmp" && /bin/mv "\$LOG.tmp" "\$LOG"
echo "\$(/bin/date '+%F %T') launched for \$1 (user \$USER)" >> "\$LOG"
exec "$NODE_BIN" "$APP_DIR/bridge.mjs" "\$@" 2>> "\$LOG"
EOF
chmod +x "$APP_DIR/run-bridge.sh"

ORIGINS=""
for id in "${IDS[@]}"; do
  ORIGINS+="${ORIGINS:+, }\"chrome-extension://$id/\""
done

MANIFEST="{
  \"name\": \"$HOST_NAME\",
  \"description\": \"Timestamped Summary for YouTube: summaries through your Claude, ChatGPT and Gemini subscriptions\",
  \"path\": \"$APP_DIR/run-bridge.sh\",
  \"type\": \"stdio\",
  \"allowed_origins\": [ $ORIGINS ]
}"

REGISTERED=()
for dir in "${BROWSER_DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    mkdir -p "$dir/NativeMessagingHosts"
    printf '%s\n' "$MANIFEST" > "$dir/NativeMessagingHosts/$HOST_NAME.json"
    REGISTERED+=("$(basename "${dir%/User Data}")")
  fi
done

echo "Installed the subscription helper."
echo "  node:   $NODE_BIN"
echo "  claude: ${CLAUDE_BIN:-not found}"
echo "  codex:  ${CODEX_BIN:-not found}"
echo "  agy:    ${AGY_BIN:-not found}"
echo "  allowed extension ids: ${IDS[*]}"
echo "  registered with: ${REGISTERED[*]:-no browsers found}"
echo "Now open the extension's settings and connect Claude, ChatGPT or Gemini (subscription)."
