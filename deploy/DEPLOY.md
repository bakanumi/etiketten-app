# Deployment auf dem Netcup-Server (Ubuntu + nginx)

Ziel: `https://labels.aylins-makerspace.de`. Die App läuft intern auf `127.0.0.1:3001`,
nginx übernimmt Domain, SSL (Let's Encrypt) und Passwortschutz.
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

## 3. Als Dienst starten

```bash
sudo cp /opt/etiketten-app/deploy/etiketten-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now etiketten-app
curl -I http://127.0.0.1:3001     # erwartet: HTTP/1.1 200 OK
```

## 4. Passwortschutz

```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-labels aylin
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
