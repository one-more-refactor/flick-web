#!/bin/sh
# flick — self-host installer.
#
#   curl -fsSL https://myflick.app/install.sh | sh
#   # (mirror: https://raw.githubusercontent.com/one-more-refactor/flick/master/install.sh)
#
# Brings up the self-host edition (everything free) with Docker or Podman
# Compose. Your library lives in a named volume; re-running upgrades in place.
# This script is served verbatim at https://myflick.app/install.sh (a copy
# lives in flick-landing/public/); the canonical source is this file.
set -eu

REPO="https://github.com/one-more-refactor/flick.git"
DIR="${FLICK_DIR:-flick}"
PORT="8484"
WITH_ADMIN=0
for arg in "$@"; do
  case "$arg" in
    --with-admin) WITH_ADMIN=1 ;;
    *) printf 'unknown flag: %s\n' "$arg" >&2; exit 1 ;;
  esac
done

say() { printf '\033[1m%s\033[0m\n' "$*"; }
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# --- pick a compose command ------------------------------------------------
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman-compose >/dev/null 2>&1; then
  COMPOSE="podman-compose"
elif podman compose version >/dev/null 2>&1; then
  COMPOSE="podman compose"
else
  die "Need Docker or Podman Compose. Install one, then re-run.
  Docker:  https://docs.docker.com/get-docker/
  Podman:  https://podman.io  (plus podman-compose)"
fi
command -v git >/dev/null 2>&1 || die "git is required."

# --- fetch / update the repo ----------------------------------------------
if [ -d "$DIR/.git" ]; then
  say "› Updating $DIR"
  git -C "$DIR" pull --ff-only
else
  say "› Cloning flick into ./$DIR"
  git clone --depth 1 "$REPO" "$DIR"
fi
cd "$DIR"

# --- admin panel (optional) ------------------------------------------------
if [ "$WITH_ADMIN" = 1 ]; then
  # persist the profile + a bootstrap token in .env so plain `compose up` keeps them
  touch .env
  grep -q '^COMPOSE_PROFILES=' .env || echo 'COMPOSE_PROFILES=admin' >> .env
  if ! grep -q '^FLICK_ADMIN_TOKEN=' .env; then
    if command -v openssl >/dev/null 2>&1; then
      TOKEN=$(openssl rand -hex 24)
    else
      TOKEN=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
    fi
    echo "FLICK_ADMIN_TOKEN=$TOKEN" >> .env
  fi
  grep -q '^FLICK_ADMIN_URL=' .env || echo 'FLICK_ADMIN_URL=http://localhost:8485' >> .env
fi

# --- build & run -----------------------------------------------------------
say "› Building and starting flick (first build compiles Rust — grab a coffee)"
$COMPOSE up -d --build

cat <<EOF

  flick is up.  →  http://localhost:${PORT}

  logs:     (cd $DIR && $COMPOSE logs -f)
  stop:     (cd $DIR && $COMPOSE down)
  upgrade:  re-run this installer

  Everything is free in the self-host edition. Read the docs at
  https://github.com/one-more-refactor/flick
EOF

if [ "$WITH_ADMIN" = 1 ]; then
  cat <<ADMEOF
  admin panel  →  http://localhost:8485
  Sign in with "use an admin token instead" and the token from $DIR/.env,
  then open users and promote your own account.

ADMEOF
fi
