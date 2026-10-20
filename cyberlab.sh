#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
NODE_VERSION="24.12.0"
RUNTIME_ROOT="$ROOT/.cyberlab/runtime"

node_ok() {
  command -v "$1" >/dev/null 2>&1 || return 1
  "$1" -e 'const a=process.versions.node.split(".").map(Number),b=[24,12,0];process.exit(a[0]>b[0]||a[0]===b[0]&&(a[1]>b[1]||a[1]===b[1]&&a[2]>=b[2])?0:1)' >/dev/null 2>&1
}

NODE_BIN=""
if node_ok node; then
  NODE_BIN="$(command -v node)"
else
  case "$(uname -m)" in
    x86_64|amd64) CPU="x64" ;;
    aarch64|arm64) CPU="arm64" ;;
    *) echo "Unsupported Linux architecture: $(uname -m)" >&2; exit 1 ;;
  esac
  ASSET="node-v${NODE_VERSION}-linux-${CPU}.tar.xz"
  RUNTIME_DIR="$RUNTIME_ROOT/node-v${NODE_VERSION}-linux-${CPU}"
  NODE_BIN="$RUNTIME_DIR/bin/node"
  if ! node_ok "$NODE_BIN"; then
    echo "CyberLab: Node.js 24.12+ not found. Installing a verified repo-local Node runtime..."
    mkdir -p "$RUNTIME_ROOT"
    TMP="$RUNTIME_ROOT/$ASSET"
    SUMS="$RUNTIME_ROOT/SHASUMS256.txt"
    if command -v curl >/dev/null 2>&1; then
      curl -fL "https://nodejs.org/dist/v${NODE_VERSION}/${ASSET}" -o "$TMP"
      curl -fL "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" -o "$SUMS"
    elif command -v wget >/dev/null 2>&1; then
      wget -O "$TMP" "https://nodejs.org/dist/v${NODE_VERSION}/${ASSET}"
      wget -O "$SUMS" "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"
    else
      echo "curl or wget is required to bootstrap Node.js." >&2
      exit 1
    fi
    EXPECTED="$(awk -v f="$ASSET" '$2==f {print $1}' "$SUMS")"
    ACTUAL="$(sha256sum "$TMP" | awk '{print $1}')"
    if [[ -z "$EXPECTED" || "$EXPECTED" != "$ACTUAL" ]]; then
      rm -f "$TMP"
      echo "Node.js download checksum verification failed." >&2
      exit 1
    fi
    tar -xJf "$TMP" -C "$RUNTIME_ROOT"
    rm -f "$TMP"
  fi
  export PATH="$RUNTIME_DIR/bin:$PATH"
fi

if [[ "${1:-}" == "install" ]]; then
  shift
  exec "$NODE_BIN" "$ROOT/scripts/remote-setup.mjs" "$@"
fi
exec "$NODE_BIN" "$ROOT/scripts/cyberlab.mjs" "$@"
