---
description: Voert het plan uit om vragen op te nemen met de stem van de juf
---

Voer het plan in `docs/plannen/juf-stem.md` uit, stap voor stap.

- Lees eerst `CLAUDE.md` en het volledige plan, en controleer of de beschreven
  uitgangssituatie nog klopt met de code. Wijkt die af, meld dat eerst en stel een
  aanpassing van het plan voor.
- Wijzig nooit een bestaande Dexie-versie; voeg `version(2)` toe.
- Houd na elke stap tests groen. Rond af met `npm test -- --watch=false` en
  `npm run build` in `app/`.
- Vink de acceptatiecriteria in het plan af die je zelf kon nagaan, en zet de status bovenaan
  op "uitgevoerd". Noem wat enkel op een echte iPad te testen valt.
- Commit met het bericht "Juf-stem: vragen opnemen met eigen stem". Push pas na mijn akkoord.
- Rapporteer in het Nederlands: wat gebouwd is, hoe ik het test op de iPad, en open punten.
