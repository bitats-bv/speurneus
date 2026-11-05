# Plan: de juf neemt de vragen op met haar eigen stem

Status: **klaar om uit te voeren** — wacht op go van Birger (`/juf-stem` in Claude Code).

## Doel

De juf kan per vraag van een thema haar eigen stem opnemen op de iPad. In het spel hoort
het kind die opname. Zonder opname blijft alles werken zoals nu: eerst een meegeleverd
audiobestand uit het themapakket, anders de computerstem (`speechSynthesis`, nl-BE).

## Uitgangssituatie (gecontroleerd in de code)

- Thema's zijn statische pakketten in `app/public/themas/<id>/theme.json`, geladen door
  `app/src/app/spel/themapakket.ts`. Ze staan **niet** in Dexie; de tabel `vragen` in
  `db.ts` wordt nog niet gebruikt.
- `app/src/app/spel/stem.ts` → `speel(tekst, audioUrl?)` speelt al een audio-URL af en
  valt terug op spraak als dat mislukt. Daar hoeft dus weinig te veranderen.
- `app/src/app/spel/speel.ts` laadt het thema met `laadThema()` en roept
  `stem.speel(r.vraag.vraagTekst, r.vraag.vraagAudio)` aan.
- Dexie-schema staat op `version(1)` in `app/src/app/data/db.ts`.

Omdat thema's read-only uit `public/` komen, bewaren we opnames **los van het thema** in
een eigen tabel, gekoppeld via `themaId` + `vraagId`. Zo blijven ze bestaan als een
themapakket later bijgewerkt wordt, en werkt het later ook voor eigen thema's.

## Ontwerp

### Datamodel (Dexie `version(2)`)

```ts
export interface Opname {
  id: string;            // `${themaId}/${vraagId}`
  themaId: string;
  vraagId: string;
  audio: Blob;           // zoals opgenomen (iPad: audio/mp4 met AAC)
  mimeType: string;
  duurMs: number;
  opgenomen: number;     // epoch ms
}
```

```ts
this.version(2).stores({ opnames: 'id, themaId' });
```

`version(1)` blijft ongewijzigd staan (gegevens op de iPad blijven behouden). Later uit te
breiden met `optieId` voor audio bij antwoordopties; nu buiten scope.

### Dataservice `app/src/app/data/opnames.ts`

- `opnameId(themaId, vraagId)`
- `bewaarOpname(themaId, vraagId, blob, mimeType, duurMs)` → `put`, overschrijft een vorige
- `wisOpname(themaId, vraagId)`
- `opnamesVoorThema(themaId): Promise<Map<vraagId, Opname>>`
- Unit tests met `fake-indexeddb` zoals de bestaande `*.spec.ts` in `data/`.

### Opnemen: `app/src/app/juf/recorder.ts`

Kleine wrapper rond `MediaRecorder`, zonder Angular-afhankelijkheden:

- `kiesMimeType()`: eerste ondersteunde uit
  `['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm']`
  via `MediaRecorder.isTypeSupported`. Safari op iPad geeft `audio/mp4` (AAC); Chrome op de
  Mac `audio/webm`. Leeg = laat de browser kiezen en neem `recorder.mimeType` over.
- `start()`: `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true,
  noiseSuppression: true } })`, recorder starten, chunks verzamelen.
- `stop(): Promise<{ blob, mimeType, duurMs }>`; daarna **alle tracks stoppen** zodat het
  microfoonlampje op de iPad uitgaat.
- Maximum 15 s per opname, dan automatisch stoppen.
- Opnames korter dan 300 ms negeren (per ongeluk tikken).
- Fouten vertalen naar Nederlandse meldingen:
  - `NotAllowedError` → "Geef Speurneus toegang tot de microfoon (Instellingen › Safari ›
    Microfoon)."
  - `NotFoundError` → "Geen microfoon gevonden."
  - geen `MediaRecorder` / geen veilige verbinding → "Opnemen kan enkel via https of op
    deze iPad als beginscherm-app."

### Juf-scherm: `app/src/app/juf/stem-opnemen.ts`

Nieuwe routes (lazy, zoals de rest):

- `/juf/stem` → lijst van thema's (`laadAlleThemas()`) met "x van y vragen opgenomen".
- `/juf/stem/:themaId` → per vraag één regel:
  - de vraagtekst (dient als voorleestekst voor de juf)
  - status: ✓ eigen stem / meegeleverd geluid / computerstem
  - knoppen: **● Opnemen** (tik start, tik opnieuw stopt; rode puls + seconden-teller
    tijdens opname), **▶ Beluisteren**, **↻ Opnieuw**, **🗑 Wissen** (met `confirm`)
  - "▶ Computerstem" om te vergelijken
- Maar één opname of afspeling tegelijk; navigeren weg stopt de opname zonder te bewaren.
- Ingang: knop "Stem opnemen" in `juf.ts` (header) en op `home.ts` enkel onder juf-beheer.
- Object-URL's (`URL.createObjectURL`) bij het verlaten opruimen (`revokeObjectURL`).

### Afspelen in het spel

- In `speel.ts` na `laadThema()`: `opnamesVoorThema(themaId)` ophalen en per vraag een
  object-URL maken. Volgorde van voorrang voor `vraagAudio`:
  **eigen opname → audio uit het themapakket → computerstem**.
- Netste plek: functie `metOpnames(pakket, opnames)` in `opnames.ts` die een nieuw
  `ThemaPakket` teruggeeft met `vraagAudio` vervangen; `maakRondes` blijft onaangeroerd.
- Object-URL's opruimen in `ngOnDestroy`.
- `stem.ts` hoeft niet te wijzigen; enkel nakijken dat de `pause`-listener in `wachtOp`
  een korte opname niet te vroeg als "klaar" ziet.

### Back-up

De opnames zitten in Dexie en gaan dus mee in de latere back-up/export (fase 3). Noteer in
dat plan dat de tabel `opnames` erbij hoort (Blob → base64 of losse bestanden in de zip).

## Aandachtspunten

- **Microfoon vraagt een veilige verbinding.** `getUserMedia` werkt enkel op `https://` of
  `localhost`. Testen vanaf de iPad via `http://<ip-mac>:4200` werkt dus **niet** voor
  opnemen. Opties: `npx ng serve --host 0.0.0.0 --ssl` (certificaat eenmalig vertrouwen op
  de iPad) of testen op de gehoste https-versie. Documenteer dit in de README.
- **iPad Safari**: `MediaRecorder` is beschikbaar sinds iOS 14.3, formaat `audio/mp4`.
  In een beginscherm-app (standalone PWA) vraagt iOS de microfoontoestemming soms bij elke
  start opnieuw; dat is normaal gedrag.
- **Privacy**: de stem van de juf is een persoonsgegeven van de juf. Ze blijft enkel op de
  iPad (zelfde regel als de rest). Geen opnames in git, geen voorbeeldopnames van echte
  mensen in `public/`.
- **Opslag**: ± 10–20 kB per seconde AAC; 40 vragen × 3 s ≈ 2 MB. Geen probleem.
- **Geluidsniveau**: geen normalisatie in v1; wel een tip in het scherm ("houd de iPad op
  een handbreedte, spreek rustig").

## Stappen

1. `db.ts`: interface `Opname`, tabel `opnames`, `version(2)`.
2. `data/opnames.ts` + `opnames.spec.ts` (bewaren, overschrijven, wissen, ophalen per thema,
   `metOpnames` voorrangsregel).
3. `juf/recorder.ts` (+ spec voor `kiesMimeType` en de foutvertalingen met een mock).
4. `juf/stem-opnemen.ts` (themalijst) en `juf/stem-thema.ts` (vragenlijst met knoppen),
   routes toevoegen in `app.routes.ts`, knop in `juf.ts`.
5. `spel/speel.ts`: opnames inladen, object-URL's beheren.
6. README: sectie "Testen met microfoon op de iPad" (`--ssl`).
7. `npm test -- --watch=false` en `npm run build` groen; commit
   "Juf-stem: vragen opnemen met eigen stem".

## Acceptatiecriteria

- [ ] In juf-beheer staat "Stem opnemen"; per thema zie ik alle vragen met hun status.
- [ ] Ik kan een vraag opnemen, beluisteren, opnieuw opnemen en wissen.
- [ ] Een opname stopt vanzelf na 15 s; de microfoon gaat uit na elke opname.
- [ ] Weigert de juf de microfoon, dan verschijnt een duidelijke Nederlandse uitleg en
      crasht er niets.
- [ ] In het spel hoort het kind de eigen opname; zonder opname het meegeleverde geluid,
      anders de computerstem.
- [ ] "Nog eens luisteren" (het oor) speelt de opname opnieuw.
- [ ] Opnames blijven na herladen en na een app-update bestaan (Dexie `version(2)`, oude
      gegevens intact).
- [ ] Werkt in Safari op iPad (audio/mp4) en in Chrome op de Mac (audio/webm).
- [ ] Tests en productiebuild slagen; geen opnames in git.

## Buiten scope (later)

- Audio bij antwoordopties ("de rode bal").
- Opnames delen tussen iPads of collega's.
- Bijknippen van stilte, volume-normalisatie.
- Eigen thema's maken in de app.
