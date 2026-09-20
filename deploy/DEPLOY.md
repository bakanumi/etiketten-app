# Deployment auf dem Netcup-Server (Ubuntu + nginx)

Ziel: `https://labels.aylins-makerspace.de`. Die App läuft intern auf `127.0.0.1:3001`,
nginx übernimmt Domain und SSL (Let's Encrypt). Der Passwortschutz (nur Passwort, kein
Benutzername) ist in der App eingebaut und wird über `ETIKETTEN_PASSWORD` aktiviert.
Alle Befehle auf dem Server per SSH ausführen. Der DNS-Eintrag existiert bereits.

## 0. Voraussetzungen prüfen

```bash
node -v                       # mindestens 20
which node                    # Pfad muss zu ExecStart in etiketten-app.service passen
ss -tlnp | grep 3001          # darf nichts ausgeben (Port frei)
nginx -v && certbot --version
```

## 1. Benutzer und Ordner

```bash
sudo useradd --system --home-dir /opt/etiketten-app --shell /usr/sbin/nologin etiketten
sudo mkdir -p /opt/etiketten-app /var/lib/etiketten-app
sudo chown etiketten:etiketten /opt/etiketten-app /var/lib/etiketten-app
```

## 2. Code holen und bauen

```bash
sudo -u etiketten git clone https://github.com/bakanumi/etiketten-app.git /opt/etiketten-app
cd /opt/etiketten-app
sudo -u etiketten npm ci
sudo -u etiketten npm run build
```

## 3. Passwort festlegen

```bash
sudo touch /etc/etiketten-app.env
sudo chmod 600 /etc/etiketten-app.env
sudoedit /etc/etiketten-app.env
```

In die Datei eine Zeile schreiben:

```
ETIKETTEN_PASSWORD=dein-passwort
```

Die Datei ist nur für root lesbar. Am einfachsten ist ein Passwort ohne Leerzeichen und ohne die
Zeichen `#`, `"`, `'` und `\`; sonst den ganzen Wert in doppelte Anführungszeichen setzen.

## 4. Als Dienst starten

```bash
sudo cp /opt/etiketten-app/deploy/etiketten-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now etiketten-app
curl -I http://127.0.0.1:3001     # erwartet: 307 (Weiterleitung auf /login)
```

## 5. nginx und Zertifikat

```bash
sudo cp /opt/etiketten-app/deploy/nginx-labels.conf /etc/nginx/sites-available/labels.aylins-makerspace.de
sudo ln -s /etc/nginx/sites-available/labels.aylins-makerspace.de /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d labels.aylins-makerspace.de
```

`certbot` ergänzt den HTTPS-Teil und die Weiterleitung von HTTP auf HTTPS selbst.
Die automatische Erneuerung läuft wie bei den anderen Domains.

## Passwort ändern

```bash
sudoedit /etc/etiketten-app.env
sudo systemctl restart etiketten-app
```

Alle angemeldeten Geräte müssen sich danach mit dem neuen Passwort neu anmelden.
Nach 5 falschen Eingaben pro IP-Adresse ist die Anmeldung 15 Minuten gesperrt
(ein Neustart des Dienstes hebt die Sperre auf).

## Umstellung von einer Installation mit nginx-Passwort (Basic Auth)

Falls die erste Version mit `auth_basic` in nginx läuft:

```bash
# 1. In /etc/nginx/sites-available/labels.aylins-makerspace.de die Zeilen
#    auth_basic ... und auth_basic_user_file ... entfernen
sudoedit /etc/nginx/sites-available/labels.aylins-makerspace.de
sudo nginx -t && sudo systemctl reload nginx

# 2. Passwort festlegen wie in Schritt 3, dann Code und Dienst aktualisieren
cd /opt/etiketten-app
sudo -u etiketten git pull
sudo cp deploy/etiketten-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo -u etiketten npm ci
sudo -u etiketten npm run build
sudo systemctl restart etiketten-app
```

Die nginx-Datei muss außerdem die Zeilen `proxy_set_header X-Real-IP` und
`proxy_set_header X-Forwarded-Proto` enthalten (siehe `deploy/nginx-labels.conf`), sonst
funktionieren die Sperre nach Fehlversuchen und das Cookie-Flag `Secure` nicht richtig.

## Update

```bash
cd /opt/etiketten-app
sudo -u etiketten git pull
sudo -u etiketten npm ci
sudo -u etiketten npm run build
sudo systemctl restart etiketten-app
```

## Backup

Die gespeicherten Vorlagen liegen in `/var/lib/etiketten-app/templates.json` (nicht im Repo).

## Fehlersuche

```bash
sudo journalctl -u etiketten-app -n 50 --no-pager
sudo nginx -t
sudo tail -n 30 /var/log/nginx/error.log
```

Im Journal steht bei jedem PDF-Export eine Zeile mit Anzahl der Etiketten und Dauer
(`PDF: 22 Etiketten in 132 ms`). Dauert die Erstellung länger als 50 Sekunden, bricht die App
ab und zeigt im Browser eine verständliche Meldung statt eines 504-Fehlers.
