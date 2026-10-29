#!/usr/bin/env bash
# Marktplatz-Shop auf sunds-hub ausrollen, vom PC aus (braucht den ssh-Alias "sunds-hub" mit Schluessel
# und sudo ohne Passwort dort, wie bei connect/ops/deploy.sh und ss-messebau-website/ops/sunds-hub/).
#
#   bash ops/sunds-hub/ausrollen.sh                       Domain shop.sundshub.de, aktueller Zweig
#   DOMAIN=markt.example.de bash ops/sunds-hub/ausrollen.sh
#
# Muster wie die Connect-Website (Galabau-Muster): auf dem Server ein nacktes Repo
# /opt/sunds-shop/repo.git, ein post-receive-Hook baut und startet den Dienst. Der Server braucht
# dafuer keinen GitHub-Zugang. Idempotent: der zweite Lauf aendert nur, was sich geaendert hat.
set -euo pipefail
HIER="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HIER/../.." && pwd)"
HOST="${HOST:-sunds-hub}"
DOMAIN="${DOMAIN:-shop.sundshub.de}"
ZWEIG="${ZWEIG:-$(git -C "$REPO" branch --show-current)}"
[ -n "$ZWEIG" ] || { echo "Kein Zweig ausgecheckt." >&2; exit 2; }

echo "== 1/4 Projekt 'shop' nach Konvention anlegen (Benutzer, Ordner, systemd, Caddy, Register)"
ssh "$HOST" "sudo /opt/sunds-hub/neues-projekt.sh shop '$DOMAIN' 'Marktplatz: Haendler listen Produkte, zentrale Kasse, Auszahlung je Haendler' personenbezogen" | sed 's/^/   /'

echo "== 2/4 Server-Seite einrichten (Node 22, nacktes Repo, Hook, Node-Unit, .env)"
scp -q "$HIER/server-einrichten.sh" "$HIER/post-receive" "$HIER/bauen.sh" "$HOST:/tmp/"
ssh "$HOST" "sudo DOMAIN='$DOMAIN' bash /tmp/server-einrichten.sh && rm -f /tmp/server-einrichten.sh /tmp/post-receive /tmp/bauen.sh"

echo "== 3/4 Stand pushen: $ZWEIG -> sunds-hub:/opt/sunds-shop/repo.git (main); der Hook baut synchron"
git -C "$REPO" remote get-url hub >/dev/null 2>&1 || git -C "$REPO" remote add hub "$HOST:/opt/sunds-shop/repo.git"
git -C "$REPO" push hub "$ZWEIG:main"

echo "== 4/4 Probe"
ssh "$HOST" "systemctl is-active sunds-shop; P=\$(python3 -c \"import json;print(json.load(open('/opt/sunds-hub/projekte.json'))['shop']['port'])\"); curl -s -m 10 http://127.0.0.1:\$P/gesund; echo"
echo "   von aussen (sobald DNS $DOMAIN -> 169.58.211.51 steht, Strato: leadmaschine/zentrale/server/ANLEITUNG-STRATO-DNS.md):"
echo "   curl -s https://$DOMAIN/gesund"
echo
echo "Admin-Zugang: steht in /opt/sunds-shop/.env (ADMIN_EMAIL, ADMIN_PASSWORD), wurde beim ersten Lauf erzeugt:"
ssh "$HOST" "sudo grep -E '^ADMIN_(EMAIL|PASSWORD)=' /opt/sunds-shop/.env"
echo "Danach: Waechter-Ziel https://$DOMAIN/gesund in /opt/sunds-waechter/ziele.json ergaenzen."
