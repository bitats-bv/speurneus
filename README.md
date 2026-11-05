# Observatiespellen kleuters

Offline webapp (PWA) voor de iPad waarmee de klasjuf korte audiospelletjes per thema
start. Elk kind kiest zijn foto, beantwoordt de vragen, en de juf ziet de resultaten
per kind, thema en periode. Alle kindgegevens blijven lokaal op de iPad (GDPR).

Zie [docs/README.md](docs/README.md) voor het plan van aanpak.

## Mappen

| Map | Inhoud |
|---|---|
| `app/` | Broncode van de webapp (wordt opgezet in fase 1) |
| `themas/` | Meegeleverde themapakketten: per thema een `theme.json` met `afbeeldingen/` en `audio/` |
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
