#!/bin/sh
set -e
# Migrationen anwenden, Admin anlegen (idempotent), dann Server starten.
node node_modules/prisma/build/index.js migrate deploy
node prisma/seed.mjs
exec "$@"
