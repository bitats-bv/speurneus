# Speurneus – observatiespellen voor kleuters

Offline webapp (PWA) voor de iPad. De klasjuf kiest een thema, het aantal antwoordopties
en het aantal vragen; daarna kiest elk kind zijn foto en beantwoordt audiovragen door op
een afbeelding te tikken. Elk antwoord (juist/fout) wordt bewaard zodat de juf per kind,
thema en periode kan observeren.

Plan van aanpak: https://claude.ai/artifact/VKG8Ex2CDapV8cQkqg2Ucz
Beslissingen: `docs/README.md`

## Taal

- Communiceer met Birger in het **Nederlands** (Vlaams).
- UI-teksten, domeinnamen en commitberichten in het Nederlands
  (`Kind`, `Klas`, `Periode`, `Thema`, `Vraag`, `Spelsessie`, `Antwoord`).
- Technische termen en Angular-API's blijven Engels.

## Harde regels

- **Volledig offline.** Geen backend, geen externe API's, geen analytics, geen CDN's tijdens
  runtime. Alle data in IndexedDB via Dexie (`app/src/app/data/db.ts`).
- **GDPR / kindgegevens.** Nooit echte namen, foto's, exports of back-ups in git of in
  testdata. Gebruik verzonnen voornamen en avatars. Foto's worden verkleind (± 256 px JPEG)
  voor ze opgeslagen worden. Enkel voornaam, geen achternaam of geboortedatum.
- **Kleutervriendelijk.** Tikdoelen ≥ 120 pt, geen tekst nodig in kind-modus, geen
  tijdsdruk, animaties < 1 s, antwoordvolgorde altijd willekeurig. Geluid pas na een eerste
  tik (iOS-beperking).
- **Eén poging per vraag.** Een antwoord wordt meteen opgeslagen en is niet meer te wijzigen.
- **Kind ziet nooit het resultaat.** Feedback in kind-modus is gelijk bij juist en fout;
  scores enkel in juf-schermen.
- Doelplatform: Safari op iPad, liggend, als beginscherm-app.

## Stack

- Angular 22, standalone components, **zoneless**, signals; geen NgModules.
- Dexie 4 voor opslag, `@angular/service-worker` voor offline.
- Tests met Vitest (`ng test`), formattering met Prettier (`app/.prettierrc`).
- SCSS; component-stijlen klein houden (budget 4 kB waarschuwing / 8 kB fout).

## Mappen

| Map | Inhoud |
|---|---|
| `app/` | Angular-project (alle npm-commando's hier uitvoeren) |
| `app/src/app/data/` | Dexie-database, datamodel en dataservices |
| `app/src/app/juf/` | Juf-beheer (klas, kinderen, thema's, pincode) |
| `app/src/app/spel/` | Kindflow en spelvormen |
| `app/src/app/resultaten/` | Overzichten en export |
| `app/public/themas/<id>/` | Meegeleverde themapakketten: `theme.json` + `afbeeldingen/` + `audio/` |
| `prototypes/` | Originele losse prototypes (referentie, niet aanpassen) |
| `bronmateriaal/` | Didactisch bronmateriaal (doelen per leeftijd, zintuigkaartjes) |
| `docs/` | Plan, beslissingen |

## Commando's (in `app/`)

```bash
npm start                         # dev-server op http://localhost:4200
npx ng serve --host 0.0.0.0       # bereikbaar vanaf de iPad op hetzelfde wifi
npm test -- --watch=false         # unit tests
npm run build                     # productiebuild met service worker
```

Voor je een taak afrondt: `npm test -- --watch=false` en `npm run build` moeten slagen.

## Werkwijze

- Kleine, gerichte commits op `main` (of een feature-branch als Birger dat vraagt).
- Datamodel wijzigen = nieuwe `this.version(n)` in `db.ts`, nooit een bestaande versie
  aanpassen (gegevens op de iPad moeten blijven).
- Nieuw thema: map onder `app/public/themas/` met `theme.json` in hetzelfde formaat als
  `app/public/themas/gevoelens/theme.json`.
