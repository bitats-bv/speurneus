# Observatiespellen kleuters

Offline webapp (PWA) voor de iPad waarmee de klasjuf korte audiospelletjes per thema
start. Elk kind kiest zijn foto, beantwoordt de vragen, en de juf ziet de resultaten
per kind, thema en periode. Alle kindgegevens blijven lokaal op de iPad (GDPR).

Zie [docs/README.md](docs/README.md) voor het plan van aanpak.

Online versie: <https://speurneus.pages.dev> (Cloudflare Pages, automatisch bij elke push naar
`main`). Instellen en updaten: [docs/hosting-cloudflare.md](docs/hosting-cloudflare.md).

## Mappen

| Map | Inhoud |
|---|---|
| `app/` | Angular 22-webapp (PWA, lokale opslag met Dexie) |
| `app/public/themas/` | Meegeleverde themapakketten: per thema een `theme.json` met `afbeeldingen/` en `audio/` |
| `prototypes/` | Losse eerste versies, zoals het Jules-gevoelensspel (`prototypes/gevoelens/gevoelens.html`) |
| `bronmateriaal/` | Didactisch materiaal: ontwikkelingsdoelen per leeftijd, zintuigkaartjes |
| `docs/` | Plan, beslissingen en notities |

## Afspraken

- **Geen echte kindgegevens in deze repository**: geen namen, foto's, exports of back-ups.
  Gebruik voor testen verzonnen namen en avatars.
- Afbeeldingen in themapakketten: liefst minstens 512×512 px (de huidige Jules-afbeeldingen
  zijn ~110 px en worden wazig op een iPad).

## Prototype bekijken

Open `prototypes/gevoelens/gevoelens.html` in Safari of Chrome.

## Ontwikkelen

Vereist Node.js 22 of nieuwer.

```bash
cd app
npm install
npm start          # http://localhost:4200
npm test           # unit tests (Vitest)
npm run build      # productiebuild met service worker in app/dist/
```

Testen op de iPad: start met `npx ng serve --host 0.0.0.0` en surf op de iPad naar
`http://<ip-van-de-mac>:4200` (zelfde wifi). De service worker werkt enkel in de productiebuild.

### Testen met microfoon op de iPad

De juf kan vragen inspreken met haar eigen stem (Juf-beheer › Stem opnemen). De browser
geeft de microfoon enkel vrij op `https://` of `localhost`, dus via `http://<ip>:4200`
lukt opnemen **niet** (de app toont dan een melding). Start daarom met https:

```bash
cd app
npx ng serve --host 0.0.0.0 --ssl
```

Surf op de iPad naar `https://<ip-van-de-mac>:4200`. Safari waarschuwt voor het
zelfondertekende certificaat: kies **Toon details › bezoek deze website** en bevestig.
Daarna vraagt Safari bij de eerste opname toestemming voor de microfoon. Geweigerd? Zet
ze terug aan via Instellingen › Apps › Safari › Microfoon.

Opnames blijven enkel op het toestel (IndexedDB, tabel `opnames`) en horen nooit in git.

Het datamodel staat in `app/src/app/data/db.ts`.
