#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

pushd "$ROOT_DIR" >/dev/null
scripts/patch-cws-zip.sh --output-zip "$TMP_DIR/relative-output/upload.zip" >/dev/null
test -f "$TMP_DIR/relative-output/upload.zip"
unzip -Z1 "$TMP_DIR/relative-output/upload.zip" | awk '$0 == "manifest.json" { found = 1 } END { exit !found }'
! unzip -Z1 "$TMP_DIR/relative-output/upload.zip" | awk '$0 ~ /^tests\// { found = 1 } END { exit !found }'

mkdir -p "$TMP_DIR/source/extension"
cp manifest.json constants.js content.js popup.html popup.css popup.js "$TMP_DIR/source/extension/"
cp -R icons "$TMP_DIR/source/extension/"
printf 'metadata' > "$TMP_DIR/source/extension/.hidden"
(
  cd "$TMP_DIR/source"
  zip -qr "$TMP_DIR/input.zip" extension
)

scripts/patch-cws-zip.sh \
  --input-zip "$TMP_DIR/input.zip" \
  --output-zip "$TMP_DIR/patched/upload.zip" \
  --version 1.0.2 >/dev/null

test -f "$TMP_DIR/patched/upload.zip"
unzip -p "$TMP_DIR/patched/upload.zip" manifest.json | awk '/"version": "1.0.2"/ { found = 1 } END { exit !found }'
unzip -Z1 "$TMP_DIR/patched/upload.zip" | awk '$0 == ".hidden" { found = 1 } END { exit !found }'
popd >/dev/null

echo "package tests passed"