# Documentatie

- [Plan van aanpak – Observatiespellen kleuters (iPad)](https://claude.ai/artifact/VKG8Ex2CDapV8cQkqg2Ucz):
  architectuur, GDPR, datamodel, flows en planning.
- Smartschool: geen API-koppeling. Klaslijst importeren via CSV-export, resultaten
  exporteren als PDF/CSV en met de hand in Smartschool zetten.

## Beslissingen

- 2026-11-05: Angular 22 als frontend.
- 2026-11-05: We starten volledig offline. Enkel lokale opslag met Dexie (IndexedDB),
  geen backend. Synchronisatie tussen toestellen is voor later (fase 5).

## Plannen

- [Juf-stem](plannen/juf-stem.md): vragen opnemen met de eigen stem van de juf.
  Klaar om uit te voeren met `/juf-stem` in Claude Code.
