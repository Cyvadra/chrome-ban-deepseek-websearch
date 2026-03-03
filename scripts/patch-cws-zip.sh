#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT_ZIP=""
OUTPUT_ZIP="$ROOT_DIR/dist/chrome-web-store-upload.zip"
VERSION_OVERRIDE=""

usage() {
  cat <<'EOF'
Patch/package a Chrome extension ZIP for Chrome Web Store upload.

Usage:
  scripts/patch-cws-zip.sh [options]

Options:
  -i, --input-zip <path>   Existing zip to patch (optional)
  -o, --output-zip <path>  Output zip path (default: dist/chrome-web-store-upload.zip)
  -v, --version <x.y.z>    Override manifest.json version in output zip
  -h, --help               Show this help

Examples:
  scripts/patch-cws-zip.sh
  scripts/patch-cws-zip.sh --version 1.0.1
  scripts/patch-cws-zip.sh --input-zip ./build/my.zip --output-zip ./dist/upload.zip
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i|--input-zip)
      INPUT_ZIP="$2"
      shift 2
      ;;
    -o|--output-zip)
      OUTPUT_ZIP="$2"
      shift 2
      ;;
    -v|--version)
      VERSION_OVERRIDE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: 'zip' command not found." >&2
  exit 1
fi

if [[ -n "$INPUT_ZIP" && ! -f "$INPUT_ZIP" ]]; then
  echo "Error: input zip not found: $INPUT_ZIP" >&2
  exit 1
fi

if [[ -n "$VERSION_OVERRIDE" ]]; then
  if [[ ! "$VERSION_OVERRIDE" =~ ^[0-9]+(\.[0-9]+){0,3}$ ]]; then
    echo "Error: version must be 1-4 numeric segments (e.g., 1.2.3 or 1.2.3.4)." >&2
    exit 1
  fi
fi

STAGING_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

if [[ -n "$INPUT_ZIP" ]]; then
  unzip -q "$INPUT_ZIP" -d "$STAGING_DIR"
else
  rsync -a \
    --exclude '.git/' \
    --exclude '.github/' \
    --exclude '.vscode/' \
    --exclude '.venv/' \
    --exclude 'dist/' \
    --exclude 'scripts/' \
    --exclude '__MACOSX/' \
    --exclude '.DS_Store' \
    --exclude '*.md' \
    --exclude '*.zip' \
    --exclude '*.pem' \
    "$ROOT_DIR/" "$STAGING_DIR/"
fi

# If zip contains a single top-level directory, flatten it.
if [[ ! -f "$STAGING_DIR/manifest.json" ]]; then
  shopt -s dotglob nullglob
  entries=("$STAGING_DIR"/*)
  shopt -u dotglob nullglob
  if [[ ${#entries[@]} -eq 1 && -d "${entries[0]}" && -f "${entries[0]}/manifest.json" ]]; then
    TOP_DIR="${entries[0]}"
    mv "$TOP_DIR"/* "$STAGING_DIR"/
    rmdir "$TOP_DIR"
  fi
fi

if [[ ! -f "$STAGING_DIR/manifest.json" ]]; then
  echo "Error: manifest.json not found at zip root." >&2
  exit 1
fi

if [[ -n "$VERSION_OVERRIDE" ]]; then
  perl -0777 -i -pe "s/\"version\"\s*:\s*\"[^\"]+\"/\"version\": \"$VERSION_OVERRIDE\"/" "$STAGING_DIR/manifest.json"
fi

find "$STAGING_DIR" -name '.DS_Store' -delete
find "$STAGING_DIR" -name '__MACOSX' -type d -prune -exec rm -rf {} +

mkdir -p "$(dirname "$OUTPUT_ZIP")"
(
  cd "$STAGING_DIR"
  rm -f "$OUTPUT_ZIP"
  zip -qr "$OUTPUT_ZIP" .
)

echo "Created upload zip: $OUTPUT_ZIP"
if [[ -n "$VERSION_OVERRIDE" ]]; then
  echo "Patched manifest version to: $VERSION_OVERRIDE"
fi
