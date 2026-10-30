# Shop auf sunds-hub ausrollen

Ein Befehl vom PC (ssh-Alias `sunds-hub` mit Schlüssel, sudo ohne Passwort dort):

```bash
bash ops/sunds-hub/ausrollen.sh                     # Domain shop.sundshub.de, aktueller Zweig
DOMAIN=marktplatz.example.de bash ops/sunds-hub/ausrollen.sh
```

Was passiert, in dieser Reihenfolge (alles idempotent):

1. `neues-projekt.sh shop <domain> … personenbezogen` nach `/opt/sunds-hub/KONVENTION.md`: Benutzer
   `sundsshop`, Ordner `/opt/sunds-shop`, Port aus dem Register, systemd-Unit, Caddy-Block, Registereintrag.
2. `server-einrichten.sh`: Node 22 (falls fehlt), Swap-Reserve für den Build, nacktes Repo
   `/opt/sunds-shop/repo.git` mit `post-receive`-Hook, `.env` mit erzeugtem Admin-Passwort, systemd-Drop-in
   für Node (`MemoryDenyWriteExecute=no`, Schreibrecht nur auf `daten/`).
3. `git push hub <zweig>:main` — der Hook baut synchron (`bauen.sh`: npm ci, Migrationen, Seed, next build,
   Standalone nach `app/`, Neustart, `/gesund`). Rot nach dem Neustart → vorheriger Stand zurück.
4. Probe innen; außen, sobald der DNS-Eintrag steht.

Danach von Hand:

- **DNS** bei Strato: `A <domain> -> 169.58.211.51` (Anleitung `leadmaschine/zentrale/server/ANLEITUNG-STRATO-DNS.md`).
  Caddy holt das Zertifikat selbst, sobald der Name auflöst.
- **Wächter-Ziel** `https://<domain>/gesund` in `/opt/sunds-waechter/ziele.json`.
- **Stripe**: `PAYMENTS_MODE=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in `/opt/sunds-shop/.env`,
  Webhook auf `https://<domain>/api/webhooks/stripe`; dann `systemctl restart sunds-shop`.

Jeder weitere Stand: `git push hub <zweig>:main`. Datenbank und Bilder liegen in `/opt/sunds-shop/daten/`
(700, `sundsshop`) und werden von `sicherung.sh` des Hubs mitgesichert.

## Sicherung und Wiederherstellung

Eine Dateikopie von `shop.db` ist keine Sicherung: im WAL-Modus liegen die letzten Änderungen in `shop.db-wal`,
die Kopie wäre alt oder kaputt. Deshalb schreibt `scripts/sicherung.mjs` mit `VACUUM INTO` einen konsistenten
Schnappschuss nach `daten/sicherung/shop-<stempel>.db` und prüft ihn (`PRAGMA integrity_check`). Zwei Timer:
täglich 03:17 nur die Datenbank, sonntags zusätzlich `uploads-<stempel>.tar.gz`; 14 Datenbankstände und 4
Bildarchive bleiben. Der Hub sichert `daten/` samt diesem Ordner nach außen.

```bash
ssh sunds-hub "systemctl list-timers 'sunds-shop-*'"                       # läuft der Timer?
ssh sunds-hub "sudo -u sundsshop ls -lh /opt/sunds-shop/daten/sicherung"  # was liegt da?
ssh sunds-hub "sudo systemctl start sunds-shop-sicherung.service"         # jetzt sichern
```

Zurückholen (der Dienst muss stehen, sonst verweigert das Skript):

```bash
ssh sunds-hub "sudo systemctl stop sunds-shop && cd /opt/sunds-shop/app && \
  sudo -u sundsshop env \$(sudo grep ^DATABASE_URL /opt/sunds-shop/.env) node scripts/wiederherstellen.mjs /opt/sunds-shop/daten/sicherung/shop-<stempel>.db && \
  sudo systemctl start sunds-shop"
```

Der vorherige Stand bleibt als `shop.db.vor-<stempel>` liegen. Geprüft wird der Weg mit `npm run test:sicherung`
(Sicherung im laufenden Betrieb, Wiederherstellung in einen Probepfad, Zählwerte, Sperre).

Warum nicht aus der Cloud-Session heraus: Von dort ist Port 22 nicht erreichbar, und Schlüssel liegen
nach Hausregel nie im Repo. Der Server braucht umgekehrt keinen GitHub-Zugang (Push direkt in `repo.git`,
Galabau-Muster wie bei der Connect-Website).
