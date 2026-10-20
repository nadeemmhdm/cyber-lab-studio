#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${CYBERLAB_INSTALL_DIR:-$HOME/CyberLab-Studio}"
REPO_URL="${CYBERLAB_REPO_URL:-https://github.com/nadeemmhdm/cyber-lab-studio.git}"
BRANCH="${CYBERLAB_BRANCH:-main}"

step(){ printf '\n==> %s\n' "$1"; }
ok(){ printf '[OK] %s\n' "$1"; }

ensure_git(){
  if command -v git >/dev/null 2>&1; then ok "Git available"; return; fi
  step "Git not found - installing Git"
  local sudo_cmd=""
  if [[ "$(id -u)" -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1; then sudo_cmd="sudo"; else
      echo "Git is missing and sudo is unavailable. Install Git, then run the same command again." >&2
      exit 1
    fi
  fi
  if command -v apt-get >/dev/null 2>&1; then
    $sudo_cmd apt-get update
    $sudo_cmd apt-get install -y git
  elif command -v dnf >/dev/null 2>&1; then
    $sudo_cmd dnf install -y git
  elif command -v yum >/dev/null 2>&1; then
    $sudo_cmd yum install -y git
  elif command -v pacman >/dev/null 2>&1; then
    $sudo_cmd pacman -Sy --noconfirm git
  elif command -v apk >/dev/null 2>&1; then
    $sudo_cmd apk add git
  else
    echo "No supported package manager was found to install Git automatically." >&2
    exit 1
  fi
  command -v git >/dev/null 2>&1 || { echo "Git installation failed." >&2; exit 1; }
  ok "Git installed"
}

printf 'CyberLab Studio Pro - one-line installer\nTarget: %s\n' "$INSTALL_DIR"
if [[ "${CYBERLAB_INSTALL_DRY_RUN:-0}" == "1" ]]; then
  echo "Dry-run OK: installer parsed successfully."
  exit 0
fi

ensure_git
fresh=0
if [[ ! -d "$INSTALL_DIR/.git" ]]; then fresh=1; fi

if [[ "$fresh" == "1" ]]; then
  if [[ -d "$INSTALL_DIR" ]] && find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 | grep -q .; then
    echo "Install directory exists and is not a CyberLab Git checkout: $INSTALL_DIR" >&2
    exit 1
  fi
  step "Cloning CyberLab Studio Pro"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$INSTALL_DIR"
  ok "Repository cloned"
else
  step "Updating existing CyberLab checkout"
  if [[ -n "$(git -C "$INSTALL_DIR" status --porcelain)" ]]; then
    echo "Local changes detected in $INSTALL_DIR. Commit/stash them before running the installer again." >&2
    exit 1
  fi
  git -C "$INSTALL_DIR" fetch origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
  ok "Repository updated"
fi

cd "$INSTALL_DIR"
chmod +x ./cyberlab.sh
if [[ "$fresh" == "1" || ! -f .env ]]; then
  step "Starting complete first-time setup"
  exec ./cyberlab.sh install
else
  step "Checking packages, security audit, database and updates"
  ./cyberlab.sh install --maintenance
  step "Opening CyberLab management menu"
  exec ./cyberlab.sh
fi
