#!/usr/bin/env bash
# Laeuft als root auf sunds-hub: Stand auschecken, bauen, Migrationen, Standalone nach app/, Neustart, /gesund.
# Bei rotem /gesund wird der vorherige Stand zurueckgelegt.
set -euo pipefail
ORDNER=/opt/sunds-shop
BENUTZER=sundsshop
DIENST=sunds-shop
COMMIT="${1:-main}"
STEMPEL="$(date +%Y%m%d-%H%M%S)"
PORT="$(python3 -c "import json;print(json.load(open('/opt/sunds-hub/projekte.json'))['shop']['port'])")"
export HOME=/root

echo "bauen: auschecken $COMMIT"
git --git-dir="$ORDNER/repo.git" --work-tree="$ORDNER/checkout" checkout -q -f "$COMMIT"
cd "$ORDNER/checkout"
set -a; . "$ORDNER/.env"; set +a
export GIT_COMMIT="$(git --git-dir="$ORDNER/repo.git" rev-parse --short "$COMMIT")"

echo "bauen: npm ci"
npm ci --no-audit --no-fund --loglevel=error
echo "bauen: Migrationen"
npx prisma migrate deploy
echo "bauen: Seed (Admin, idempotent; Demo-Daten nur bei leerer DB)"
node prisma/seed.mjs
# Migration und Seed liefen als root; der Dienst schreibt als $BENUTZER
chown -R "$BENUTZER":"$BENUTZER" "$ORDNER/daten"
echo "bauen: next build"
NODE_OPTIONS=--max-old-space-size=1536 npm run build --silent

echo "bauen: Standalone nach app/ (alter Stand -> app.vor-$STEMPEL)"
NEU="$ORDNER/app.neu"
rm -rf "$NEU"; mkdir -p "$NEU"
cp -a .next/standalone/. "$NEU/"
mkdir -p "$NEU/.next"; cp -a .next/static "$NEU/.next/static"
cp -a public "$NEU/public"
cp -a prisma "$NEU/prisma"
ln -sfn "$ORDNER/daten" "$NEU/data"          # data/uploads und ggf. DB liegen in daten/ (700, sundsshop)
echo "GIT_COMMIT=$GIT_COMMIT" > "$NEU/.commit"
chown -R root:"$BENUTZER" "$NEU"; chmod -R o-rwx "$NEU"
if [ -d "$ORDNER/app" ] && [ -f "$ORDNER/app/server.js" ]; then mv "$ORDNER/app" "$ORDNER/app.vor-$STEMPEL"; else rm -rf "$ORDNER/app"; fi
mv "$NEU" "$ORDNER/app"
# GIT_COMMIT fuer /gesund in die Unit-Umgebung
install -d /etc/systemd/system/$DIENST.service.d
printf '[Service]\nEnvironment=GIT_COMMIT=%s\n' "$GIT_COMMIT" > /etc/systemd/system/$DIENST.service.d/commit.conf
systemctl daemon-reload

echo "bauen: Neustart"
systemctl enable -q "$DIENST" 2>/dev/null || true
systemctl restart "$DIENST"
for i in $(seq 1 30); do
  if curl -sf -m 3 "http://127.0.0.1:$PORT/gesund" | grep -q '"status":"ok"'; then
    echo "bauen: /gesund ok, Commit $GIT_COMMIT"
    ls -d "$ORDNER"/app.vor-* 2>/dev/null | head -n -3 | xargs -r rm -rf   # nur drei alte Staende behalten
    systemctl reload caddy 2>/dev/null || true
    exit 0
  fi
  sleep 1
done
echo "bauen: /gesund bleibt rot, lege vorherigen Stand zurueck" >&2
journalctl -u "$DIENST" -n 30 --no-pager -o cat >&2 || true
LETZTER="$(ls -d "$ORDNER"/app.vor-* 2>/dev/null | tail -1 || true)"
if [ -n "$LETZTER" ]; then rm -rf "$ORDNER/app.kaputt-$STEMPEL"; mv "$ORDNER/app" "$ORDNER/app.kaputt-$STEMPEL"; mv "$LETZTER" "$ORDNER/app"; systemctl restart "$DIENST"; fi
exit 1
