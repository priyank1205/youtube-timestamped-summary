#!/usr/bin/env bash
#
# Build the release zip: the files Chrome actually loads, and nothing else.
# Tests, the dev harness, the audit folder and the repo's own tooling stay out,
# so the uploaded package matches what the manifest declares.
#
# Run: npm run package   (writes dist/<name>-v<version>.zip)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# The manifest is the single source of truth for the version; check-manifest.mjs
# is what keeps package.json agreeing with it.
node tools/check-manifest.mjs

VERSION="$(node -p "require('./manifest.json').version")"
NAME="timestamped-summary-for-youtube"
STAGE="dist/pkg"
OUT="dist/${NAME}-v${VERSION}.zip"

rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE"

# Everything listed here is either named by the manifest or loaded by something
# that is. Adding a new top-level source directory means adding it here too;
# the check below fails the build if one is forgotten.
cp manifest.json LICENSE "$STAGE/"
cp -R background scripts options popup styles icons "$STAGE/"

find "$STAGE" -name '.DS_Store' -delete

(cd "$STAGE" && zip -qr "../$(basename "$OUT")" .)
rm -rf "$STAGE"

# Check the zip itself rather than trusting the list above: unpack it the way a
# user installs it, and require every file the manifest names, and everything
# those files load, to be inside. v1.4.0 through v1.9.0 shipped without popup/
# because nothing did this.
UNPACKED="dist/unpacked"
rm -rf "$UNPACKED"
unzip -q "$OUT" -d "$UNPACKED"
if ! node tools/check-manifest.mjs "$UNPACKED"; then
  rm -rf "$UNPACKED" "$OUT"
  echo "Deleted $OUT. Add the directories those files live in to the cp line in tools/package.sh." >&2
  exit 1
fi
rm -rf "$UNPACKED"

SIZE="$(du -h "$OUT" | cut -f1)"
echo "Wrote $OUT ($SIZE)"
echo "Load it with Chrome > Extensions > Load unpacked (unzipped), or upload the zip to the Web Store."
