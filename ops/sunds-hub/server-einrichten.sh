#!/usr/bin/env bash
# Laeuft als root AUF sunds-hub (wird von ausrollen.sh kopiert und aufgerufen). Idempotent.
# Ergaenzt das von neues-projekt.sh angelegte Projekt 'shop' um das, was ein Node-Dienst braucht.
set -euo pipefail
ORDNER=/opt/sunds-shop
BENUTZER=sundsshop
DIENST=sunds-shop
DOMAIN="${DOMAIN:-shop.sundshub.de}"
PORT="$(python3 -c "import json;print(json.load(open('/opt/sunds-hub/projekte.json'))['shop']['port'])")"

echo "   Port aus dem Register: $PORT"

# --- Node 22 (NodeSource), nur wenn fehlt oder zu alt
if ! command -v node >/dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 22 ]; then
  echo "   Node 22 installieren"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "   node $(node -v), npm $(npm -v)"
command -v git >/dev/null || apt-get install -y -qq git >/dev/null

# --- Swap, damit `next build` auf einer kleinen Maschine nicht stirbt (nur wenn < 3 GB RAM und kein Swap)
if [ "$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)" -lt 3000 ] && [ "$(swapon --noheadings | wc -l)" -eq 0 ]; then
  echo "   2 GB Swap anlegen (Build-Reserve)"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- Ordner: repo.git (nackt), checkout, app (laufender Stand), daten (DB + Bilder)
install -d -m 755 "$ORDNER/checkout" "$ORDNER/app"
install -d -m 700 -o "$BENUTZER" -g "$BENUTZER" "$ORDNER/daten" "$ORDNER/daten/uploads"
if [ ! -d "$ORDNER/repo.git" ]; then
  git init -q --bare "$ORDNER/repo.git"
fi
install -m 755 /tmp/post-receive "$ORDNER/repo.git/hooks/post-receive"
install -m 755 /tmp/bauen.sh "$ORDNER/bauen.sh"
# Der Push kommt als normaler Benutzer (ssh-Alias) an; er darf in repo.git schreiben, bauen.sh laeuft via sudo im Hook.
PUSHER="${SUDO_USER:-root}"
chown -R "$PUSHER":"$PUSHER" "$ORDNER/repo.git"
if [ "$PUSHER" != "root" ] && ! grep -qs "bauen.sh" /etc/sudoers.d/sunds-shop; then
  echo "$PUSHER ALL=(root) NOPASSWD: $ORDNER/bauen.sh" > /etc/sudoers.d/sunds-shop
  chmod 440 /etc/sudoers.d/sunds-shop
fi

# --- .env (einmalig; Werte danach nur ueber zugang-eintragen.sh oder von Hand aendern)
if ! grep -qs '^DATABASE_URL=' "$ORDNER/.env"; then
  ADMIN_PASSWORD="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)"
  cat >> "$ORDNER/.env" <<ENV
DATABASE_URL="file:$ORDNER/daten/shop.db?connection_limit=1&socket_timeout=30"
APP_URL="https://$DOMAIN"
NEXT_PUBLIC_BRAND_NAME="trifuse.store"
ADMIN_EMAIL="admin@sundsconnect.de"
ADMIN_PASSWORD="$ADMIN_PASSWORD"
PAYMENTS_MODE="test"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
DEFAULT_COMMISSION_PERCENT="15"
SHIPPING_FLAT_CENTS="490"
FREE_SHIPPING_FROM_CENTS="7500"
ENV
  echo "   .env angelegt, Admin-Passwort erzeugt"
fi
chown root:"$BENUTZER" "$ORDNER/.env"; chmod 640 "$ORDNER/.env"

# --- systemd: Node statt python3, Umgebung aus .env, Schreibrecht nur auf daten/
install -d /etc/systemd/system/$DIENST.service.d
cat > /etc/systemd/system/$DIENST.service.d/node.conf <<UNIT
[Service]
ExecStart=
ExecStart=/usr/bin/node $ORDNER/app/server.js
WorkingDirectory=$ORDNER/app
EnvironmentFile=$ORDNER/.env
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOSTNAME=127.0.0.1
Environment=PYTHONUNBUFFERED=
# V8 braucht ausfuehrbaren Speicher (JIT); die Vorgabe der Konvention verbietet ihn
MemoryDenyWriteExecute=no
MemoryMax=768M
ReadWritePaths=$ORDNER/daten
UNIT
systemctl daemon-reload
echo "   systemd-Drop-in fuer Node geschrieben"
echo "   Einrichtung fertig. Jetzt pushen; der Hook baut und startet."
